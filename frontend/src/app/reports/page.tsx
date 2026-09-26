"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  FileText,
  IndianRupee,
  RefreshCw,
  Receipt,
  TrendingUp,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

type ReportTab = "sales" | "purchases" | "gst";

type SalesSummary = {
  invoiceCount: number;
  taxableAmount: number;
  totalTax: number;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
};

type PurchaseSummary = {
  purchaseCount: number;
  taxableAmount: number;
  totalTax: number;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
};

type PaymentStatus = {
  PAID: number;
  PARTIAL: number;
  PENDING: number;
};

type Customer = {
  name?: string;
  phone?: string;
};

type Invoice = {
  _id: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  grandTotal?: number;
  paidAmount?: number;
  balanceAmount?: number;
  paymentStatus?: string;
  customer?: Customer;
};

type Supplier = {
  name?: string;
  phone?: string;
};

type Purchase = {
  _id: string;
  billNumber?: string;
  purchaseDate?: string;
  grandTotal?: number;
  paidAmount?: number;
  balanceAmount?: number;
  paymentStatus?: string;
  supplier?: Supplier;
};

type GSTBlock = {
  invoiceCount?: number;
  purchaseCount?: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  grandTotal: number;
};

type GSTReport = {
  sales: GSTBlock;
  purchases: GSTBlock;
  netGST: {
    taxableAmount: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalTax: number;
  };
  note?: string;
};

function formatCurrency(value: number | undefined) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value?: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusClass(status?: string) {
  switch (status) {
    case "PAID":
      return "reports-status reports-status-paid";
    case "PARTIAL":
      return "reports-status reports-status-partial";
    case "PENDING":
      return "reports-status reports-status-pending";
    default:
      return "reports-status";
  }
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>("sales");

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [salesSummary, setSalesSummary] =
    useState<SalesSummary | null>(null);

  const [salesStatus, setSalesStatus] =
    useState<PaymentStatus | null>(null);

  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const [purchaseSummary, setPurchaseSummary] =
    useState<PurchaseSummary | null>(null);

  const [purchaseStatus, setPurchaseStatus] =
    useState<PaymentStatus | null>(null);

  const [purchases, setPurchases] = useState<Purchase[]>([]);

  const [gstReport, setGstReport] = useState<GSTReport | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    if (from) params.set("from", from);
    if (to) params.set("to", to);

    const query = params.toString();

    return query ? `?${query}` : "";
  }, [from, to]);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Authentication token not found.");
      }

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [salesResponse, purchasesResponse, gstResponse] =
        await Promise.all([
          fetch(`${API_URL}/reports/sales${queryString}`, { headers }),
          fetch(`${API_URL}/reports/purchases${queryString}`, {
            headers,
          }),
          fetch(`${API_URL}/reports/gst${queryString}`, { headers }),
        ]);

      const [salesData, purchasesData, gstData] =
        await Promise.all([
          salesResponse.json(),
          purchasesResponse.json(),
          gstResponse.json(),
        ]);

      if (!salesResponse.ok || !salesData.success) {
        throw new Error(
          salesData.message || "Failed to load sales report."
        );
      }

      if (!purchasesResponse.ok || !purchasesData.success) {
        throw new Error(
          purchasesData.message || "Failed to load purchase report."
        );
      }

      if (!gstResponse.ok || !gstData.success) {
        throw new Error(
          gstData.message || "Failed to load GST report."
        );
      }

      setSalesSummary(salesData.summary);
      setSalesStatus(salesData.paymentStatus);
      setInvoices(salesData.invoices || []);

      setPurchaseSummary(purchasesData.summary);
      setPurchaseStatus(purchasesData.paymentStatus);
      setPurchases(purchasesData.purchases || []);

      setGstReport({
        sales: gstData.sales,
        purchases: gstData.purchases,
        netGST: gstData.netGST,
        note: gstData.note,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load reports."
      );
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleReset = () => {
    setFrom("");
    setTo("");
  };

  const netGST = Number(gstReport?.netGST?.totalTax || 0);

  return (
    <main className="reports-page">
      <div className="reports-header">
        <div>
          <div className="reports-eyebrow">
            <BarChart3 size={15} />
            Business Intelligence
          </div>

          <h1>Reports</h1>

          <p>
            Review sales, purchases and GST performance across your
            business.
          </p>
        </div>

        <button
          type="button"
          className="reports-refresh-btn"
          onClick={fetchReports}
          disabled={loading}
        >
          <RefreshCw
            size={16}
            className={loading ? "reports-spin" : ""}
          />
          Refresh
        </button>
      </div>

      <section className="reports-filter-card">
        <div className="reports-filter-title">
          <CalendarDays size={17} />
          Report Period
        </div>

        <div className="reports-filters">
          <label>
            <span>From</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>

          <label>
            <span>To</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>

          <button
            type="button"
            className="reports-apply-btn"
            onClick={fetchReports}
            disabled={loading}
          >
            Apply Filter
          </button>

          <button
            type="button"
            className="reports-reset-btn"
            onClick={handleReset}
          >
            Reset
          </button>
        </div>
      </section>

      {error && (
        <div className="reports-error">
          <strong>Unable to load reports.</strong>
          <span>{error}</span>
        </div>
      )}

      <section className="reports-kpi-grid">
        <div className="reports-kpi-card">
          <div className="reports-kpi-icon">
            <TrendingUp size={19} />
          </div>

          <div>
            <span>Sales</span>
            <strong>
              {formatCurrency(salesSummary?.grandTotal)}
            </strong>
            <small>
              {salesSummary?.invoiceCount || 0} invoices
            </small>
          </div>
        </div>

        <div className="reports-kpi-card">
          <div className="reports-kpi-icon">
            <Receipt size={19} />
          </div>

          <div>
            <span>Purchases</span>
            <strong>
              {formatCurrency(purchaseSummary?.grandTotal)}
            </strong>
            <small>
              {purchaseSummary?.purchaseCount || 0} purchases
            </small>
          </div>
        </div>

        <div className="reports-kpi-card">
          <div className="reports-kpi-icon">
            <IndianRupee size={19} />
          </div>

          <div>
            <span>Net GST</span>
            <strong>{formatCurrency(netGST)}</strong>
            <small>Output GST − Input GST</small>
          </div>
        </div>

        <div className="reports-kpi-card">
          <div className="reports-kpi-icon">
            <FileText size={19} />
          </div>

          <div>
            <span>Outstanding</span>
            <strong>
              {formatCurrency(
                (salesSummary?.balanceAmount || 0) +
                  (purchaseSummary?.balanceAmount || 0)
              )}
            </strong>
            <small>Sales + purchase balances</small>
          </div>
        </div>
      </section>

      <div className="reports-tabs">
        <button
          type="button"
          className={activeTab === "sales" ? "active" : ""}
          onClick={() => setActiveTab("sales")}
        >
          <TrendingUp size={16} />
          Sales Report
        </button>

        <button
          type="button"
          className={activeTab === "purchases" ? "active" : ""}
          onClick={() => setActiveTab("purchases")}
        >
          <Receipt size={16} />
          Purchase Report
        </button>

        <button
          type="button"
          className={activeTab === "gst" ? "active" : ""}
          onClick={() => setActiveTab("gst")}
        >
          <IndianRupee size={16} />
          GST Report
        </button>
      </div>

      {loading ? (
        <section className="reports-loading">
          <RefreshCw size={22} className="reports-spin" />
          <span>Loading reports...</span>
        </section>
      ) : (
        <>
          {activeTab === "sales" && (
            <section className="reports-section">
              <div className="reports-section-heading">
                <div>
                  <h2>Sales Report</h2>
                  <p>
                    Sales invoices and payment collection for the
                    selected period.
                  </p>
                </div>

                <span className="reports-record-count">
                  {invoices.length} records
                </span>
              </div>

              <div className="reports-summary-grid">
                <SummaryCard
                  label="Invoices"
                  value={String(salesSummary?.invoiceCount || 0)}
                />

                <SummaryCard
                  label="Taxable Amount"
                  value={formatCurrency(
                    salesSummary?.taxableAmount
                  )}
                />

                <SummaryCard
                  label="Total GST"
                  value={formatCurrency(salesSummary?.totalTax)}
                />

                <SummaryCard
                  label="Grand Total"
                  value={formatCurrency(salesSummary?.grandTotal)}
                  highlight
                />

                <SummaryCard
                  label="Paid Amount"
                  value={formatCurrency(salesSummary?.paidAmount)}
                />

                <SummaryCard
                  label="Outstanding"
                  value={formatCurrency(
                    salesSummary?.balanceAmount
                  )}
                />
              </div>

              <PaymentStatusCards status={salesStatus} />

              <div className="reports-table-card">
                <div className="reports-table-heading">
                  <h3>Invoices</h3>
                  <span>{invoices.length} invoices</span>
                </div>

                <div className="reports-table-wrap">
                  <table className="reports-table">
                    <thead>
                      <tr>
                        <th>Invoice</th>
                        <th>Date</th>
                        <th>Customer</th>
                        <th>Total</th>
                        <th>Paid</th>
                        <th>Balance</th>
                        <th>Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {invoices.length === 0 ? (
                        <tr>
                          <td colSpan={7}>
                            <EmptyState text="No invoices found for this period." />
                          </td>
                        </tr>
                      ) : (
                        invoices.map((invoice) => (
                          <tr key={invoice._id}>
                            <td>
                              <strong>
                                {invoice.invoiceNumber || "—"}
                              </strong>
                            </td>

                            <td>{formatDate(invoice.invoiceDate)}</td>

                            <td>
                              <div className="reports-person">
                                <strong>
                                  {invoice.customer?.name || "Walk-in"}
                                </strong>

                                {invoice.customer?.phone && (
                                  <span>
                                    {invoice.customer.phone}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td>
                              {formatCurrency(invoice.grandTotal)}
                            </td>

                            <td>
                              {formatCurrency(invoice.paidAmount)}
                            </td>

                            <td>
                              {formatCurrency(invoice.balanceAmount)}
                            </td>

                            <td>
                              <span
                                className={statusClass(
                                  invoice.paymentStatus
                                )}
                              >
                                {invoice.paymentStatus || "—"}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {activeTab === "purchases" && (
            <section className="reports-section">
              <div className="reports-section-heading">
                <div>
                  <h2>Purchase Report</h2>
                  <p>
                    Supplier purchases and payment obligations for
                    the selected period.
                  </p>
                </div>

                <span className="reports-record-count">
                  {purchases.length} records
                </span>
              </div>

              <div className="reports-summary-grid">
                <SummaryCard
                  label="Purchases"
                  value={String(
                    purchaseSummary?.purchaseCount || 0
                  )}
                />

                <SummaryCard
                  label="Taxable Amount"
                  value={formatCurrency(
                    purchaseSummary?.taxableAmount
                  )}
                />

                <SummaryCard
                  label="Total GST"
                  value={formatCurrency(
                    purchaseSummary?.totalTax
                  )}
                />

                <SummaryCard
                  label="Grand Total"
                  value={formatCurrency(
                    purchaseSummary?.grandTotal
                  )}
                  highlight
                />

                <SummaryCard
                  label="Paid Amount"
                  value={formatCurrency(
                    purchaseSummary?.paidAmount
                  )}
                />

                <SummaryCard
                  label="Outstanding"
                  value={formatCurrency(
                    purchaseSummary?.balanceAmount
                  )}
                />
              </div>

              <PaymentStatusCards status={purchaseStatus} />

              <div className="reports-table-card">
                <div className="reports-table-heading">
                  <h3>Purchases</h3>
                  <span>{purchases.length} purchases</span>
                </div>

                <div className="reports-table-wrap">
                  <table className="reports-table">
                    <thead>
                      <tr>
                        <th>Bill Number</th>
                        <th>Date</th>
                        <th>Supplier</th>
                        <th>Total</th>
                        <th>Paid</th>
                        <th>Balance</th>
                        <th>Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {purchases.length === 0 ? (
                        <tr>
                          <td colSpan={7}>
                            <EmptyState text="No purchases found for this period." />
                          </td>
                        </tr>
                      ) : (
                        purchases.map((purchase) => (
                          <tr key={purchase._id}>
                            <td>
                              <strong>
                                {purchase.billNumber || "—"}
                              </strong>
                            </td>

                            <td>
                              {formatDate(purchase.purchaseDate)}
                            </td>

                            <td>
                              <div className="reports-person">
                                <strong>
                                  {purchase.supplier?.name || "—"}
                                </strong>

                                {purchase.supplier?.phone && (
                                  <span>
                                    {purchase.supplier.phone}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td>
                              {formatCurrency(purchase.grandTotal)}
                            </td>

                            <td>
                              {formatCurrency(purchase.paidAmount)}
                            </td>

                            <td>
                              {formatCurrency(
                                purchase.balanceAmount
                              )}
                            </td>

                            <td>
                              <span
                                className={statusClass(
                                  purchase.paymentStatus
                                )}
                              >
                                {purchase.paymentStatus || "—"}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {activeTab === "gst" && gstReport && (
            <section className="reports-section">
              <div className="reports-section-heading">
                <div>
                  <h2>GST Report</h2>
                  <p>
                    GST collected on sales compared with GST paid on
                    purchases.
                  </p>
                </div>
              </div>

              <div className="gst-report-grid">
                <GSTColumn
                  title="Sales GST"
                  subtitle={`${gstReport.sales.invoiceCount || 0} invoices`}
                  data={gstReport.sales}
                />

                <GSTColumn
                  title="Purchase GST"
                  subtitle={`${gstReport.purchases.purchaseCount || 0} purchases`}
                  data={gstReport.purchases}
                />

                <div className="gst-column gst-column-net">
                  <div className="gst-column-header">
                    <div>
                      <h3>Net GST</h3>
                      <span>Output − Input</span>
                    </div>
                  </div>

                  <div className="gst-value-list">
                    <GSTRow
                      label="Taxable Amount"
                      value={formatCurrency(
                        gstReport.netGST.taxableAmount
                      )}
                    />

                    <GSTRow
                      label="CGST"
                      value={formatCurrency(
                        gstReport.netGST.cgst
                      )}
                    />

                    <GSTRow
                      label="SGST"
                      value={formatCurrency(
                        gstReport.netGST.sgst
                      )}
                    />

                    <GSTRow
                      label="IGST"
                      value={formatCurrency(
                        gstReport.netGST.igst
                      )}
                    />

                    <GSTRow
                      label="Total GST"
                      value={formatCurrency(
                        gstReport.netGST.totalTax
                      )}
                      strong
                    />
                  </div>
                </div>
              </div>

              {gstReport.note && (
                <div className="reports-note">
                  <strong>Note:</strong> {gstReport.note}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}

function SummaryCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`reports-summary-card ${
        highlight ? "reports-summary-highlight" : ""
      }`}
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PaymentStatusCards({
  status,
}: {
  status: PaymentStatus | null;
}) {
  return (
    <div className="reports-payment-grid">
      <div className="reports-payment-card reports-payment-paid">
        <span>PAID</span>
        <strong>{status?.PAID || 0}</strong>
        <small>Fully settled</small>
      </div>

      <div className="reports-payment-card reports-payment-partial">
        <span>PARTIAL</span>
        <strong>{status?.PARTIAL || 0}</strong>
        <small>Partially paid</small>
      </div>

      <div className="reports-payment-card reports-payment-pending">
        <span>PENDING</span>
        <strong>{status?.PENDING || 0}</strong>
        <small>Payment pending</small>
      </div>
    </div>
  );
}

function GSTColumn({
  title,
  subtitle,
  data,
}: {
  title: string;
  subtitle: string;
  data: GSTBlock;
}) {
  return (
    <div className="gst-column">
      <div className="gst-column-header">
        <div>
          <h3>{title}</h3>
          <span>{subtitle}</span>
        </div>
      </div>

      <div className="gst-value-list">
        <GSTRow
          label="Taxable Amount"
          value={formatCurrency(data.taxableAmount)}
        />

        <GSTRow
          label="CGST"
          value={formatCurrency(data.cgst)}
        />

        <GSTRow
          label="SGST"
          value={formatCurrency(data.sgst)}
        />

        <GSTRow
          label="IGST"
          value={formatCurrency(data.igst)}
        />

        <GSTRow
          label="Total GST"
          value={formatCurrency(data.totalTax)}
          strong
        />

        <GSTRow
          label="Grand Total"
          value={formatCurrency(data.grandTotal)}
          strong
        />
      </div>
    </div>
  );
}

function GSTRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className={`gst-row ${strong ? "gst-row-strong" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="reports-empty">
      <FileText size={25} />
      <span>{text}</span>
    </div>
  );
}