"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

type Product = {
  _id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  reorderLevel?: number;
  gstRate: number;
  hsnCode?: string;
  createdAt?: string;
};

type ProductForm = {
  name: string;
  category: string;
  price: string;
  stock: string;
  reorderLevel: string;
  gstRate: string;
  hsnCode: string;
};

const emptyForm: ProductForm = {
  name: "",
  category: "",
  price: "",
  stock: "0",
  reorderLevel: "10",
  gstRate: "18",
  hsnCode: "",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function getProducts(data: any): Product[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.products)) return data.products;
  if (Array.isArray(data.data)) return data.data;
  return [];
}

function getProduct(data: any): Product | null {
  return data?.product || data?.data || (data?._id ? data : null);
}

export default function InventoryPage() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [stockFilter, setStockFilter] = useState("ALL");

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadProducts() {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      if (!token) {
        router.replace("/login");
        return;
      }

      const response = await fetch(`${API_URL}/products`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load products");
      }

      setProducts(getProducts(data));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load products"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  const categories = useMemo(() => {
    return [
      "ALL",
      ...Array.from(
        new Set(
          products
            .map((product) => product.category?.trim())
            .filter(Boolean)
        )
      ).sort(),
    ];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.category?.toLowerCase().includes(query) ||
        product.hsnCode?.toLowerCase().includes(query);

      const matchesCategory =
        categoryFilter === "ALL" ||
        product.category === categoryFilter;

      const reorderLevel = Number(product.reorderLevel ?? 10);
      const isOut = Number(product.stock) <= 0;
      const isLow = Number(product.stock) > 0 &&
        Number(product.stock) <= reorderLevel;

      const matchesStock =
        stockFilter === "ALL" ||
        (stockFilter === "LOW" && isLow) ||
        (stockFilter === "OUT" && isOut) ||
        (stockFilter === "IN" && !isLow && !isOut);

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, search, categoryFilter, stockFilter]);

  const stats = useMemo(() => {
    const lowStock = products.filter((product) => {
      const reorderLevel = Number(product.reorderLevel ?? 10);
      return Number(product.stock) > 0 && Number(product.stock) <= reorderLevel;
    }).length;

    const outOfStock = products.filter(
      (product) => Number(product.stock) <= 0
    ).length;

    const totalUnits = products.reduce(
      (sum, product) => sum + Math.max(Number(product.stock) || 0, 0),
      0
    );

    const inventoryValue = products.reduce(
      (sum, product) =>
        sum +
        Math.max(Number(product.stock) || 0, 0) *
          (Number(product.price) || 0),
      0
    );

    return {
      total: products.length,
      lowStock,
      outOfStock,
      totalUnits,
      inventoryValue,
    };
  }, [products]);

  function openAddForm() {
    setEditingProduct(null);
    setForm(emptyForm);
    setError("");
    setMessage("");
    setShowForm(true);
  }

  function openEditForm(product: Product) {
    setEditingProduct(product);
    setForm({
      name: product.name || "",
      category: product.category || "",
      price: String(product.price ?? ""),
      stock: String(product.stock ?? 0),
      reorderLevel: String(product.reorderLevel ?? 10),
      gstRate: String(product.gstRate ?? 0),
      hsnCode: product.hsnCode || "",
    });
    setError("");
    setMessage("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;
    setShowForm(false);
    setEditingProduct(null);
    setForm(emptyForm);
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      if (!form.name.trim()) {
        setError("Product name is required.");
        return;
      }

      if (!form.category.trim()) {
        setError("Category is required.");
        return;
      }

      const price = Number(form.price);
      const stock = Number(form.stock);
      const reorderLevel = Number(form.reorderLevel);
      const gstRate = Number(form.gstRate);

      if (!Number.isFinite(price) || price < 0) {
        setError("Enter a valid non-negative MRP.");
        return;
      }

      if (!Number.isFinite(stock) || stock < 0) {
        setError("Enter a valid stock quantity.");
        return;
      }

      if (!Number.isFinite(reorderLevel) || reorderLevel < 0) {
        setError("Enter a valid reorder level.");
        return;
      }

      if (![0, 5, 12, 18, 28].includes(gstRate)) {
        setError("Please select a valid GST rate.");
        return;
      }

      const token = localStorage.getItem("token");

      const payload = {
        name: form.name.trim(),
        category: form.category.trim(),
        price,
        stock,
        reorderLevel,
        gstRate,
        hsnCode: form.hsnCode.trim(),
      };

      const url = editingProduct
        ? `${API_URL}/products/${editingProduct._id}`
        : `${API_URL}/products`;

      const response = await fetch(url, {
        method: editingProduct ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            `Failed to ${editingProduct ? "update" : "create"} product`
        );
      }

      const savedProduct = getProduct(data);

      if (savedProduct) {
        setProducts((previous) => {
          if (editingProduct) {
            return previous.map((product) =>
              product._id === savedProduct._id ? savedProduct : product
            );
          }

          return [savedProduct, ...previous];
        });
      } else {
        await loadProducts();
      }

      setMessage(
        editingProduct
          ? "Product updated successfully."
          : "Product added successfully."
      );

      closeForm();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save product"
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(product: Product) {
    const confirmed = window.confirm(
      `Delete "${product.name}"? This cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setDeletingId(product._id);
      setError("");
      setMessage("");

      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_URL}/products/${product._id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete product");
      }

      setProducts((previous) =>
        previous.filter((item) => item._id !== product._id)
      );

      setMessage("Product deleted successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete product"
      );
    } finally {
      setDeletingId("");
    }
  }

  function stockStatus(product: Product) {
    const stock = Number(product.stock) || 0;
    const reorder = Number(product.reorderLevel ?? 10);

    if (stock <= 0) {
      return { label: "Out of stock", className: "inventory-status-out" };
    }

    if (stock <= reorder) {
      return { label: "Low stock", className: "inventory-status-low" };
    }

    return { label: "In stock", className: "inventory-status-good" };
  }

  if (loading) {
    return (
      <main className="inventory-page">
        <div className="inventory-loading">Loading inventory...</div>
      </main>
    );
  }

  return (
    <main className="inventory-page">
      <div className="inventory-shell">
        <div className="inventory-header">
          <div>
            <p className="inventory-eyebrow">INVENTORY MANAGEMENT</p>
            <h1>Inventory</h1>
            <p className="inventory-subtitle">
              Manage products, MRP, GST and available stock.
            </p>
          </div>

          <div className="inventory-header-actions">
            <button
              className="inventory-secondary-button"
              onClick={loadProducts}
            >
              ↻ Refresh
            </button>

            <button
              className="inventory-primary-button"
              onClick={openAddForm}
            >
              + Add Product
            </button>
          </div>
        </div>

        {message && <div className="inventory-message">{message}</div>}
        {error && <div className="inventory-error">{error}</div>}

        <section className="inventory-stats">
          <article className="inventory-stat-card">
            <span className="inventory-stat-icon">📦</span>
            <div>
              <p>Total Products</p>
              <strong>{stats.total}</strong>
            </div>
          </article>

          <article className="inventory-stat-card">
            <span className="inventory-stat-icon inventory-icon-green">▤</span>
            <div>
              <p>Total Units</p>
              <strong>{stats.totalUnits}</strong>
            </div>
          </article>

          <article className="inventory-stat-card">
            <span className="inventory-stat-icon inventory-icon-orange">⚠</span>
            <div>
              <p>Low Stock</p>
              <strong>{stats.lowStock}</strong>
            </div>
          </article>

          <article className="inventory-stat-card">
            <span className="inventory-stat-icon inventory-icon-red">!</span>
            <div>
              <p>Out of Stock</p>
              <strong>{stats.outOfStock}</strong>
            </div>
          </article>

          <article className="inventory-stat-card inventory-value-card">
            <span className="inventory-stat-icon inventory-icon-purple">₹</span>
            <div>
              <p>Stock Value at MRP</p>
              <strong>{formatCurrency(stats.inventoryValue)}</strong>
            </div>
          </article>
        </section>

        {showForm && (
          <section className="inventory-form-card">
            <div className="inventory-form-heading">
              <div>
                <h2>{editingProduct ? "Edit Product" : "Add Product"}</h2>
                <p>
                  MRP is treated as the customer-facing price including GST.
                </p>
              </div>

              <button
                type="button"
                className="inventory-close-button"
                onClick={closeForm}
              >
                ×
              </button>
            </div>

            <form
              className="inventory-form-grid"
              onSubmit={saveProduct}
            >
              <label>
                Product Name *
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="e.g. Amul Milk 1L"
                  required
                />
              </label>

              <label>
                Category *
                <input
                  value={form.category}
                  onChange={(event) =>
                    setForm({ ...form, category: event.target.value })
                  }
                  placeholder="e.g. Dairy"
                  required
                />
              </label>

              <label>
                MRP (Including GST) *
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(event) =>
                    setForm({ ...form, price: event.target.value })
                  }
                  placeholder="30.00"
                  required
                />
              </label>

              <label>
                Stock Quantity *
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.stock}
                  onChange={(event) =>
                    setForm({ ...form, stock: event.target.value })
                  }
                  required
                />
              </label>

              <label>
                Reorder Level
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.reorderLevel}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      reorderLevel: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                GST Rate
                <select
                  value={form.gstRate}
                  onChange={(event) =>
                    setForm({ ...form, gstRate: event.target.value })
                  }
                >
                  <option value="0">0%</option>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18%</option>
                  <option value="28">28%</option>
                </select>
              </label>

              <label>
                HSN Code
                <input
                  value={form.hsnCode}
                  onChange={(event) =>
                    setForm({ ...form, hsnCode: event.target.value })
                  }
                  placeholder="Optional"
                />
              </label>

              <div className="inventory-form-actions">
                <button
                  type="button"
                  className="inventory-secondary-button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="inventory-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingProduct
                      ? "Update Product"
                      : "Save Product"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="inventory-table-card">
          <div className="inventory-table-heading">
            <div>
              <h2>Products</h2>
              <p>{filteredProducts.length} products shown</p>
            </div>

            <div className="inventory-filters">
              <div className="inventory-search">
                <span>⌕</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search products..."
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category === "ALL" ? "All Categories" : category}
                  </option>
                ))}
              </select>

              <select
                value={stockFilter}
                onChange={(event) => setStockFilter(event.target.value)}
              >
                <option value="ALL">All Stock</option>
                <option value="IN">In Stock</option>
                <option value="LOW">Low Stock</option>
                <option value="OUT">Out of Stock</option>
              </select>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="inventory-empty">
              <div>📦</div>
              <h3>No products found</h3>
              <p>
                {products.length === 0
                  ? "Add your first product to start managing inventory."
                  : "Try changing your search or filters."}
              </p>

              {products.length === 0 && (
                <button
                  className="inventory-primary-button"
                  onClick={openAddForm}
                >
                  + Add Product
                </button>
              )}
            </div>
          ) : (
            <div className="inventory-table-wrap">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>MRP (Incl. GST)</th>
                    <th>GST</th>
                    <th>Stock</th>
                    <th>Reorder</th>
                    <th>Status</th>
                    <th>HSN</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredProducts.map((product) => {
                    const status = stockStatus(product);

                    return (
                      <tr key={product._id}>
                        <td>
                          <div className="inventory-product-cell">
                            <div className="inventory-product-avatar">
                              {product.name.charAt(0).toUpperCase()}
                            </div>

                            <div>
                              <strong>{product.name}</strong>
                              <span>
                                {product._id.slice(-6).toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>{product.category || "—"}</td>

                        <td className="inventory-price">
                          {formatCurrency(product.price)}
                        </td>

                        <td>{product.gstRate ?? 0}%</td>

                        <td>
                          <strong>{product.stock ?? 0}</strong>
                        </td>

                        <td>{product.reorderLevel ?? 10}</td>

                        <td>
                          <span
                            className={`inventory-status ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </td>

                        <td>{product.hsnCode || "—"}</td>

                        <td>
                          <div className="inventory-actions">
                            <button
                              type="button"
                              className="inventory-edit-button"
                              onClick={() => openEditForm(product)}
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              className="inventory-delete-button"
                              onClick={() => deleteProduct(product)}
                              disabled={deletingId === product._id}
                            >
                              {deletingId === product._id
                                ? "..."
                                : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
