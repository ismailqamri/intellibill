"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5001/api";

type Product = {
  _id: string;
  name: string;
  category?: string;
  price: number;
  stock: number | string;
  reorderLevel?: number | string;
  reorder_level?: number | string;
};

type Invoice = {
  _id: string;
  invoiceNumber?: string;
  customerName?: string;
  totalAmount?: number;
  grandTotal?: number;
  status?: string;
  createdAt?: string;
};

type DashboardStats = {
  totalSales: number;
  totalInvoices: number;
  totalProducts: number;
  lowStock: number;
};

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value || 0);

export default function DashboardPage() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [salesRange, setSalesRange] = useState(30);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.push("/login");
      return;
    }

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    Promise.all([
      fetch(`${API_URL}/products`, {
        headers,
      }).then((response) =>
        response.ok
          ? response.json()
          : Promise.reject(
              new Error("Could not load products")
            )
      ),

      fetch(`${API_URL}/invoices`, {
        headers,
      }).then((response) =>
        response.ok
          ? response.json()
          : Promise.reject(
              new Error("Could not load invoices")
            )
      ),
    ])
      .then(([productData, invoiceData]) => {
        const productList = Array.isArray(productData)
          ? productData
          : productData.products ||
            productData.data ||
            [];

        const invoiceList = Array.isArray(invoiceData)
          ? invoiceData
          : invoiceData.invoices ||
            invoiceData.data ||
            [];

        setProducts(productList);
        setInvoices(invoiceList);
      })
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : "Could not load dashboard data."
        )
      )
      .finally(() => setLoading(false));
  }, [router]);

  /*
   * STOCK HELPERS
   *
   * Uses reorderLevel from the product.
   * Falls back to 10 if the product does not have one.
   */
  const getStock = (product: Product) =>
    Number(product.stock ?? 0);

  const getReorderLevel = (product: Product) => {
    const value =
      product.reorderLevel ??
      product.reorder_level;

    const reorderLevel = Number(value);

    return Number.isFinite(reorderLevel)
      ? reorderLevel
      : 10;
  };

  const stats = useMemo<DashboardStats>(() => {
    const totalSales = invoices.reduce(
      (sum, invoice) =>
        sum +
        Number(
          invoice.grandTotal ??
            invoice.totalAmount ??
            0
        ),
      0
    );

    const lowStock = products.filter((product) => {
      const stock = getStock(product);
      const reorderLevel =
        getReorderLevel(product);

      return (
        stock > 0 &&
        stock <= reorderLevel
      );
    }).length;

    return {
      totalSales,
      totalInvoices: invoices.length,
      totalProducts: products.length,
      lowStock,
    };
  }, [products, invoices]);

  const recentInvoices = useMemo(
    () => invoices.slice(0, 5),
    [invoices]
  );

  /*
   * STOCK ALERTS
   *
   * Shows products when:
   *
   * stock <= reorder level
   *
   * Out-of-stock products are also included.
   */
  const stockAlerts = useMemo(() => {
    return products
      .filter((product) => {
        const stock = getStock(product);
        const reorderLevel =
          getReorderLevel(product);

        return stock <= reorderLevel;
      })
      .sort(
        (a, b) =>
          getStock(a) - getStock(b)
      )
      .slice(0, 5);
  }, [products]);

  /*
   * SALES OVERVIEW
   *
   * Groups invoices by the day they were created.
   */
  const salesChart = useMemo(() => {
    const today = new Date();

    today.setHours(23, 59, 59, 999);

    const start = new Date(today);

    start.setDate(
      start.getDate() - (salesRange - 1)
    );

    start.setHours(0, 0, 0, 0);

    const daily = new Map<string, number>();

    for (const invoice of invoices) {
      if (!invoice.createdAt) {
        continue;
      }

      const date = new Date(invoice.createdAt);

      if (
        Number.isNaN(date.getTime()) ||
        date < start ||
        date > today
      ) {
        continue;
      }

      const key = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}-${String(
        date.getDate()
      ).padStart(2, "0")}`;

      daily.set(
        key,
        (daily.get(key) || 0) +
          Number(
            invoice.grandTotal ??
              invoice.totalAmount ??
              0
          )
      );
    }

    const points = Array.from(
      { length: salesRange },
      (_, index) => {
        const date = new Date(start);

        date.setDate(
          start.getDate() + index
        );

        const key = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}-${String(
          date.getDate()
        ).padStart(2, "0")}`;

        return {
          key,
          date,
          amount: daily.get(key) || 0,
        };
      }
    );

    const total = points.reduce(
      (sum, point) => sum + point.amount,
      0
    );

    const max = Math.max(
      ...points.map((point) => point.amount),
      0
    );

    return {
      points,
      total,
      max,
    };
  }, [invoices, salesRange]);

  const chartHasSales =
    salesChart.total > 0;

  const chartGeometry = useMemo(() => {
    if (!chartHasSales) {
      return null;
    }

    const width = 760;
    const height = 230;

    const paddingX = 22;
    const paddingTop = 18;
    const paddingBottom = 30;

    const chartHeight =
      height -
      paddingTop -
      paddingBottom;

    const chartWidth =
      width - paddingX * 2;

    const max =
      salesChart.max || 1;

    const points =
      salesChart.points.map(
        (point, index) => {
          const x =
            salesChart.points.length === 1
              ? width / 2
              : paddingX +
                (index /
                  (salesChart.points.length - 1)) *
                  chartWidth;

          const y =
            paddingTop +
            chartHeight -
            (point.amount / max) *
              chartHeight;

          return {
            ...point,
            x,
            y,
          };
        }
      );

    const line = points
      .map(
        (point, index) =>
          `${index === 0 ? "M" : "L"} ${
            point.x
          } ${point.y}`
      )
      .join(" ");

    return {
      width,
      height,
      paddingX,
      paddingTop,
      paddingBottom,
      points,
      line,
    };
  }, [chartHasSales, salesChart]);

  const chartLabels = useMemo(() => {
    if (!salesChart.points.length) {
      return [];
    }

    const count =
      salesChart.points.length;

    const labelCount =
      salesRange <= 7 ? count : 6;

    const indexes = Array.from(
      { length: labelCount },
      (_, index) =>
        labelCount === 1
          ? 0
          : Math.round(
              (index /
                (labelCount - 1)) *
                (count - 1)
            )
    );

    return indexes.map((index) => {
      const point =
        salesChart.points[index];

      return {
        ...point,
        label:
          point.date.toLocaleDateString(
            "en-IN",
            {
              day: "2-digit",
              month: "short",
            }
          ),
      };
    });
  }, [salesChart.points, salesRange]);

  const salesDays = salesChart.points.filter(
    (point) => point.amount > 0
  ).length;

  return (
    <>
      <section className="ib-hero">
        <div>
          <div className="ib-hello">
            Good afternoon
          </div>

          <h1>
            Here&apos;s how business looks today
          </h1>

          <p>
            {stats.totalInvoices} invoices
            recorded · {stats.lowStock} items
            running low on stock
          </p>
        </div>

        <button
          className="ib-btn-primary"
          onClick={() =>
            router.push("/sales")
          }
        >
          ＋ Create invoice
        </button>
      </section>

      {error && (
        <div className="ib-error">
          {error}
        </div>
      )}

      <section className="ib-kpis">
        <article className="ib-kpi good">
          <div className="ib-kpi-top">
            <div className="ib-kpi-icon">
              ₹
            </div>

            <span className="ib-kpi-badge good">
              Sales
            </span>
          </div>

          <div className="ib-kpi-label">
            Total sales
          </div>

          <div className="ib-kpi-value ib-num">
            {loading
              ? "—"
              : money(stats.totalSales)}
          </div>

          <div className="ib-kpi-sub">
            Across recorded invoices
          </div>
        </article>

        <article className="ib-kpi">
          <div className="ib-kpi-top">
            <div className="ib-kpi-icon">
              ▣
            </div>

            <span className="ib-kpi-badge">
              Invoices
            </span>
          </div>

          <div className="ib-kpi-label">
            Total invoices
          </div>

          <div className="ib-kpi-value ib-num">
            {loading
              ? "—"
              : stats.totalInvoices}
          </div>

          <div className="ib-kpi-sub">
            All recorded invoices
          </div>
        </article>

        <article className="ib-kpi good">
          <div className="ib-kpi-top">
            <div className="ib-kpi-icon">
              ▤
            </div>

            <span className="ib-kpi-badge good">
              Stock
            </span>
          </div>

          <div className="ib-kpi-label">
            Products
          </div>

          <div className="ib-kpi-value ib-num">
            {loading
              ? "—"
              : stats.totalProducts}
          </div>

          <div className="ib-kpi-sub">
            Products in inventory
          </div>
        </article>

        <article
          className={`ib-kpi ${
            stats.lowStock > 0
              ? "warn"
              : "good"
          }`}
        >
          <div className="ib-kpi-top">
            <div className="ib-kpi-icon">
              !
            </div>

            <span
              className={`ib-kpi-badge ${
                stats.lowStock > 0
                  ? "warn"
                  : "good"
              }`}
            >
              {stats.lowStock > 0
                ? "Attention"
                : "Healthy"}
            </span>
          </div>

          <div className="ib-kpi-label">
            Low stock
          </div>

          <div className="ib-kpi-value ib-num">
            {loading
              ? "—"
              : stats.lowStock}
          </div>

          <div className="ib-kpi-sub">
            Items at reorder level
          </div>
        </article>
      </section>

      <section className="ib-grid2">
        <article className="ib-card">
          <div className="ib-card-head">
            <div>
              <h3>Sales overview</h3>
              <p>
                Sales activity will appear
                here as invoices are recorded.
              </p>
            </div>

            <select
              className="ib-range"
              value={salesRange}
              onChange={(event) =>
                setSalesRange(
                  Number(event.target.value)
                )
              }
            >
              <option value={7}>
                7 days
              </option>

              <option value={30}>
                30 days
              </option>

              <option value={90}>
                90 days
              </option>
            </select>
          </div>

          {chartHasSales &&
          chartGeometry ? (
            <div className="ib-chart">
              <div className="ib-chart-summary">
                <div>
                  <span>
                    Sales in selected period
                  </span>

                  <strong className="ib-num">
                    {money(
                      salesChart.total
                    )}
                  </strong>
                </div>

                <span className="ib-chart-note">
                  {salesDays}{" "}
                  {salesDays === 1
                    ? "day"
                    : "days"}{" "}
                  with sales
                </span>
              </div>

              <div className="ib-chart-canvas">
                <svg
                  viewBox={`0 0 ${chartGeometry.width} ${chartGeometry.height}`}
                  role="img"
                  aria-label={`Sales for the last ${salesRange} days`}
                >
                  {[0, 0.5, 1].map(
                    (ratio) => {
                      const y =
                        chartGeometry.paddingTop +
                        (chartGeometry.height -
                          chartGeometry.paddingTop -
                          chartGeometry.paddingBottom) *
                          ratio;

                      return (
                        <line
                          key={ratio}
                          x1={
                            chartGeometry.paddingX
                          }
                          x2={
                            chartGeometry.width -
                            chartGeometry.paddingX
                          }
                          y1={y}
                          y2={y}
                          className="ib-chart-gridline"
                        />
                      );
                    }
                  )}

                  <path
                    d={chartGeometry.line}
                    fill="none"
                    stroke="var(--ib-primary)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {chartGeometry.points
                    .filter(
                      (point) =>
                        point.amount > 0
                    )
                    .map((point) => (
                      <circle
                        key={point.key}
                        cx={point.x}
                        cy={point.y}
                        r="4"
                        fill="var(--ib-primary)"
                      >
                        <title>
                          {`${point.date.toLocaleDateString(
                            "en-IN",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            }
                          )}: ${money(
                            point.amount
                          )}`}
                        </title>
                      </circle>
                    ))}
                </svg>

                <div className="ib-chart-labels">
                  {chartLabels.map(
                    (point) => (
                      <span key={point.key}>
                        {point.label}
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="ib-chart-empty">
              <div className="ib-chart-icon">
                ⌁
              </div>

              <b>
                No sales trend to
                display yet
              </b>

              <span>
                Create an invoice to
                start building your
                sales history.
              </span>
            </div>
          )}
        </article>

        <article className="ib-card">
          <div className="ib-card-head">
            <div>
              <h3>Quick actions</h3>
              <p>Common tasks</p>
            </div>
          </div>

          <div className="ib-qa">
            <button
              onClick={() =>
                router.push("/sales")
              }
            >
              <span className="ib-qa-icon teal">
                ＋
              </span>

              <span>
                <b>New invoice</b>
                <small>
                  Create a customer
                  invoice
                </small>
              </span>
            </button>

            <button
              onClick={() =>
                router.push("/purchases")
              }
            >
              <span className="ib-qa-icon amber">
                ↙
              </span>

              <span>
                <b>New purchase</b>
                <small>
                  Record stock
                  purchases
                </small>
              </span>
            </button>

            <button
              onClick={() =>
                router.push("/inventory")
              }
            >
              <span className="ib-qa-icon green">
                ▤
              </span>

              <span>
                <b>Add product</b>
                <small>
                  Add an item to
                  inventory
                </small>
              </span>
            </button>

            <button
              onClick={() =>
                router.push("/accounting")
              }
            >
              <span className="ib-qa-icon red">
                ₹
              </span>

              <span>
                <b>Record payment</b>
                <small>
                  Update a customer
                  payment
                </small>
              </span>
            </button>
          </div>
        </article>
      </section>

      <section className="ib-grid2">
        <article className="ib-card">
          <div className="ib-card-head">
            <div>
              <h3>Recent invoices</h3>
              <p>Latest sales activity</p>
            </div>

            <button
              className="ib-link"
              onClick={() =>
                router.push("/sales")
              }
            >
              View all →
            </button>
          </div>

          {recentInvoices.length === 0 ? (
            <div className="ib-empty">
              No invoices have been
              recorded yet.
            </div>
          ) : (
            <div className="ib-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Amount</th>
                  </tr>
                </thead>

                <tbody>
                  {recentInvoices.map(
                    (invoice) => {
                      const amount =
                        Number(
                          invoice.grandTotal ??
                            invoice.totalAmount ??
                            0
                        );

                      const status =
                        String(
                          invoice.status ||
                            "Pending"
                        ).toLowerCase();

                      const paid =
                        status === "paid" ||
                        status ===
                          "completed";

                      return (
                        <tr
                          key={invoice._id}
                        >
                          <td className="ib-inv-id">
                            {invoice.invoiceNumber ||
                              `#${invoice._id.slice(
                                -6
                              )}`}
                          </td>

                          <td>
                            {invoice.customerName ||
                              "Walk-in customer"}
                          </td>

                          <td>
                            <span
                              className={`ib-status ${
                                paid
                                  ? "paid"
                                  : "pending"
                              }`}
                            >
                              {paid
                                ? "Paid"
                                : "Pending"}
                            </span>
                          </td>

                          <td className="ib-amt">
                            {money(amount)}
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="ib-card">
          <div className="ib-card-head">
            <div>
              <h3>Stock alerts</h3>
              <p>Items needing attention</p>
            </div>

            <button
              className="ib-link"
              onClick={() =>
                router.push("/inventory")
              }
            >
              Inventory →
            </button>
          </div>

          {stockAlerts.length === 0 ? (
            <div className="ib-empty">
              All products are above
              their reorder levels.
            </div>
          ) : (
            stockAlerts.map(
              (product) => {
                const stock =
                  getStock(product);

                const reorderLevel =
                  getReorderLevel(product);

                return (
                  <div
                    className="ib-stock-row"
                    key={product._id}
                  >
                    <div className="ib-stock-icon">
                      ▤
                    </div>

                    <div className="ib-stock-text">
                      <b>{product.name}</b>

                      <span>
                        {stock === 0
                          ? "Out of stock"
                          : `${stock} units remaining · Reorder at ${reorderLevel}`}
                      </span>
                    </div>
                  </div>
                );
              }
            )
          )}
        </article>
      </section>
    </>
  );
}