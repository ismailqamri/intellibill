"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  FileText,
  Package,
  Plus,
  RefreshCw,
  Receipt,
  Search,
  Trash2,
  Truck,
  X,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

type Supplier = {
  _id: string;
  name: string;
  phone?: string;
  whatsappNumber?: string;
  email?: string;
  gstNumber?: string;
  creditDays?: number;
};

type Product = {
  _id: string;
  name: string;
  category?: string;
  price: number;
  stock: number;
  gstRate?: number;
  hsnCode?: string;
};

type PurchaseItem = {
  product: string;
  productName: string;
  quantity: number;
  rate: number;
  gstRate: number;
  amount: number;
  hsnCode: string;
};

type Purchase = {
  _id: string;
  supplier?: Supplier;
  billNumber: string;
  purchaseDate?: string;
  items: PurchaseItem[];
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  grandTotal: number;
  paidAmount: number;
  creditUsed?: number;
  balanceAmount: number;
  paymentStatus: string;
  dueDate?: string;
  notes?: string;
};

type PaymentMethod = "cash" | "upi" | "bank" | "card";

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

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function statusClass(status?: string) {
  switch (status) {
    case "PAID":
      return "purchases-status purchases-status-paid";
    case "PARTIAL":
      return "purchases-status purchases-status-partial";
    case "PENDING":
      return "purchases-status purchases-status-pending";
    default:
      return "purchases-status";
  }
}

export default function PurchasesPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");

  const [supplierId, setSupplierId] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(getToday());
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [rate, setRate] = useState("");
  const [gstRate, setGstRate] = useState("18");
  const [hsnCode, setHsnCode] = useState("");

  const [items, setItems] = useState<PurchaseItem[]>([]);

  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("cash");
  const [paymentReference, setPaymentReference] = useState("");

  const [viewPurchase, setViewPurchase] = useState<Purchase | null>(null);

  const fetchData = useCallback(async () => {
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

      const [supplierResponse, productResponse, purchaseResponse] =
        await Promise.all([
          fetch(`${API_URL}/suppliers`, { headers }),
          fetch(`${API_URL}/products`, { headers }),
          fetch(`${API_URL}/purchases`, { headers }),
        ]);

      const [supplierData, productData, purchaseData] =
        await Promise.all([
          supplierResponse.json(),
          productResponse.json(),
          purchaseResponse.json(),
        ]);

      if (!supplierResponse.ok || !supplierData.success) {
        throw new Error(
          supplierData.message || "Failed to load suppliers."
        );
      }

      if (!productResponse.ok || !productData.success) {
        throw new Error(
          productData.message || "Failed to load products."
        );
      }

      if (!purchaseResponse.ok || !purchaseData.success) {
        throw new Error(
          purchaseData.message || "Failed to load purchases."
        );
      }

      setSuppliers(supplierData.suppliers || []);
      setProducts(productData.products || []);
      setPurchases(purchaseData.purchases || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load purchase data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedSupplier = useMemo(
    () => suppliers.find((supplier) => supplier._id === supplierId),
    [suppliers, supplierId]
  );

  const filteredPurchases = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return purchases;

    return purchases.filter((purchase) => {
      return (
        purchase.billNumber?.toLowerCase().includes(query) ||
        purchase.supplier?.name?.toLowerCase().includes(query) ||
        purchase.supplier?.phone?.toLowerCase().includes(query) ||
        purchase.paymentStatus?.toLowerCase().includes(query)
      );
    });
  }, [purchases, search]);

  const totalPurchases = purchases.length;

  const purchaseValue = useMemo(
    () =>
      purchases.reduce(
        (total, purchase) => total + Number(purchase.grandTotal || 0),
        0
      ),
    [purchases]
  );

  const totalPaid = useMemo(
    () =>
      purchases.reduce(
        (total, purchase) => total + Number(purchase.paidAmount || 0),
        0
      ),
    [purchases]
  );

  const totalOutstanding = useMemo(
    () =>
      purchases.reduce(
        (total, purchase) =>
          total + Number(purchase.balanceAmount || 0),
        0
      ),
    [purchases]
  );

  const taxableAmount = useMemo(
    () =>
      items.reduce((total, item) => total + Number(item.amount || 0), 0),
    [items]
  );

  const totalTax = useMemo(
    () =>
      items.reduce((total, item) => {
        const amount = Number(item.amount || 0);
        const tax = amount * (Number(item.gstRate || 0) / 100);
        return total + tax;
      }, 0),
    [items]
  );

  const cgst = Math.round((totalTax / 2) * 100) / 100;
  const sgst =
    Math.round((totalTax - cgst) * 100) / 100;

  const calculatedGrandTotal =
    Math.round((taxableAmount + totalTax) * 100) / 100;

  const paid = Math.max(Number(paidAmount) || 0, 0);

  const balance = Math.max(
    calculatedGrandTotal - paid,
    0
  );

  const resetForm = () => {
    setSupplierId("");
    setBillNumber("");
    setPurchaseDate(getToday());
    setDueDate("");
    setNotes("");

    setSelectedProduct("");
    setQuantity("1");
    setRate("");
    setGstRate("18");
    setHsnCode("");

    setItems([]);

    setPaidAmount("");
    setPaymentMethod("cash");
    setPaymentReference("");

    setError("");
    setSuccess("");
  };

  const closeForm = () => {
    if (saving) return;

    resetForm();
    setShowForm(false);
  };

  const handleProductChange = (productId: string) => {
    setSelectedProduct(productId);

    const product = products.find(
      (item) => item._id === productId
    );

    if (!product) {
      setRate("");
      setGstRate("18");
      setHsnCode("");
      return;
    }

    setRate(String(product.price ?? 0));
    setGstRate(String(product.gstRate ?? 18));
    setHsnCode(product.hsnCode || "");
  };

  const addItem = () => {
    setError("");

    if (!selectedProduct) {
      setError("Please select a product.");
      return;
    }

    const product = products.find(
      (item) => item._id === selectedProduct
    );

    if (!product) {
      setError("Selected product was not found.");
      return;
    }

    const itemQuantity = Number(quantity);
    const itemRate = Number(rate);
    const itemGstRate = Number(gstRate);

    if (!Number.isFinite(itemQuantity) || itemQuantity <= 0) {
      setError("Quantity must be greater than zero.");
      return;
    }

    if (!Number.isFinite(itemRate) || itemRate < 0) {
      setError("Purchase rate cannot be negative.");
      return;
    }

    if (!Number.isFinite(itemGstRate) || itemGstRate < 0) {
      setError("GST rate cannot be negative.");
      return;
    }

    const amount =
      Math.round(itemQuantity * itemRate * 100) / 100;

    const newItem: PurchaseItem = {
      product: product._id,
      productName: product.name,
      quantity: itemQuantity,
      rate: itemRate,
      gstRate: itemGstRate,
      amount,
      hsnCode: hsnCode || product.hsnCode || "",
    };

    setItems((current) => [...current, newItem]);

    setSelectedProduct("");
    setQuantity("1");
    setRate("");
    setGstRate("18");
    setHsnCode("");
  };

  const removeItem = (index: number) => {
    setItems((current) =>
      current.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  const handleSavePurchase = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Authentication token not found.");
      }

      if (!supplierId) {
        throw new Error("Please select a supplier.");
      }

      if (!billNumber.trim()) {
        throw new Error("Please enter the supplier bill number.");
      }

      if (!purchaseDate) {
        throw new Error("Please select a purchase date.");
      }

      if (items.length === 0) {
        throw new Error("Please add at least one product.");
      }

      if (paid > calculatedGrandTotal) {
        throw new Error(
          "Paid amount cannot be greater than the purchase total."
        );
      }

      const payments =
        paid > 0
          ? [
              {
                amount: paid,
                method: paymentMethod,
                reference: paymentReference.trim(),
              },
            ]
          : [];

      const payload = {
        supplier: supplierId,
        billNumber: billNumber.trim(),
        purchaseDate,
        items: items.map((item) => ({
          product: item.product,
          productName: item.productName,
          quantity: item.quantity,
          rate: item.rate,
          gstRate: item.gstRate,
          amount: item.amount,
          hsnCode: item.hsnCode,
        })),
        taxableAmount: Number(taxableAmount.toFixed(2)),
        cgst: Number(cgst.toFixed(2)),
        sgst: Number(sgst.toFixed(2)),
        igst: 0,
        totalTax: Number(totalTax.toFixed(2)),
        grandTotal: Number(calculatedGrandTotal.toFixed(2)),
        payments,
        dueDate: dueDate || undefined,
        notes: notes.trim(),
      };

      const response = await fetch(`${API_URL}/purchases`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to create purchase."
        );
      }

      setSuccess("Purchase created successfully.");

      await fetchData();

      resetForm();
      setShowForm(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create purchase."
      );
    } finally {
      setSaving(false);
    }
  };

  const openPurchase = async (purchaseId: string) => {
    try {
      setError("");

      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Authentication token not found.");
      }

      const response = await fetch(
        `${API_URL}/purchases/${purchaseId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to load purchase."
        );
      }

      setViewPurchase(data.purchase);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load purchase."
      );
    }
  };

  return (
    <main className="purchases-page">
      <div className="purchases-header">
        <div>
          <div className="purchases-eyebrow">
            <Package size={15} />
            Purchase Management
          </div>

          <h1>Purchases</h1>

          <p>
            Record supplier purchases, manage payments and keep
            inventory updated.
          </p>
        </div>

        <div className="purchases-header-actions">
          <button
            type="button"
            className="purchases-refresh-btn"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw
              size={16}
              className={loading ? "purchases-spin" : ""}
            />
            Refresh
          </button>

          <button
            type="button"
            className="purchases-primary-btn"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            <Plus size={17} />
            New Purchase
          </button>
        </div>
      </div>

      {error && (
        <div className="purchases-alert purchases-alert-error">
          <strong>Error:</strong>
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Close error"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="purchases-alert purchases-alert-success">
          <strong>Success:</strong>
          <span>{success}</span>

          <button
            type="button"
            onClick={() => setSuccess("")}
            aria-label="Close success"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <section className="purchases-kpi-grid">
        <div className="purchases-kpi-card">
          <div className="purchases-kpi-icon">
            <Receipt size={19} />
          </div>

          <div>
            <span>Total Purchases</span>
            <strong>{totalPurchases}</strong>
            <small>Purchase records</small>
          </div>
        </div>

        <div className="purchases-kpi-card">
          <div className="purchases-kpi-icon">
            <Package size={19} />
          </div>

          <div>
            <span>Purchase Value</span>
            <strong>{formatCurrency(purchaseValue)}</strong>
            <small>Total purchase value</small>
          </div>
        </div>

        <div className="purchases-kpi-card">
          <div className="purchases-kpi-icon">
            <Truck size={19} />
          </div>

          <div>
            <span>Paid Amount</span>
            <strong>{formatCurrency(totalPaid)}</strong>
            <small>Amount paid to suppliers</small>
          </div>
        </div>

        <div className="purchases-kpi-card purchases-kpi-highlight">
          <div className="purchases-kpi-icon">
            <FileText size={19} />
          </div>

          <div>
            <span>Outstanding</span>
            <strong>{formatCurrency(totalOutstanding)}</strong>
            <small>Supplier balance</small>
          </div>
        </div>
      </section>

      <section className="purchases-toolbar">
        <div className="purchases-search">
          <Search size={17} />
          <input
            type="text"
            placeholder="Search bill number, supplier or status..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="purchases-toolbar-count">
          {filteredPurchases.length} records
        </div>
      </section>

      <section className="purchases-table-card">
        <div className="purchases-table-heading">
          <div>
            <h2>Purchase History</h2>
            <p>
              Supplier purchases and payment status.
            </p>
          </div>

          <span>{filteredPurchases.length} purchases</span>
        </div>

        {loading ? (
          <div className="purchases-loading">
            <RefreshCw size={22} className="purchases-spin" />
            <span>Loading purchases...</span>
          </div>
        ) : (
          <div className="purchases-table-wrap">
            <table className="purchases-table">
              <thead>
                <tr>
                  <th>Bill Number</th>
                  <th>Date</th>
                  <th>Supplier</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="purchases-empty">
                        <Package size={28} />
                        <strong>No purchases found</strong>
                        <span>
                          Create your first purchase to get started.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map((purchase) => (
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
                        <div className="purchases-person">
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
                        {formatCurrency(purchase.balanceAmount)}
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

                      <td>
                        <button
                          type="button"
                          className="purchases-view-btn"
                          onClick={() =>
                            openPurchase(purchase._id)
                          }
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showForm && (
        <div className="purchases-modal-backdrop">
          <div className="purchases-modal">
            <div className="purchases-modal-header">
              <div>
                <div className="purchases-eyebrow">
                  <Receipt size={15} />
                  New Purchase
                </div>

                <h2>Create Purchase</h2>

                <p>
                  Record a supplier bill and update inventory.
                </p>
              </div>

              <button
                type="button"
                className="purchases-close-btn"
                onClick={closeForm}
                disabled={saving}
              >
                <X size={19} />
              </button>
            </div>

            <div className="purchases-modal-body">
              <section className="purchases-form-section">
                <div className="purchases-form-section-title">
                  <Truck size={17} />
                  Purchase Details
                </div>

                <div className="purchases-form-grid">
                  <label>
                    <span>Supplier *</span>

                    <select
                      value={supplierId}
                      onChange={(event) =>
                        setSupplierId(event.target.value)
                      }
                    >
                      <option value="">
                        Select supplier
                      </option>

                      {suppliers.map((supplier) => (
                        <option
                          key={supplier._id}
                          value={supplier._id}
                        >
                          {supplier.name}
                        </option>
                      ))}
                    </select>

                    {selectedSupplier && (
                      <small className="purchases-field-help">
                        {selectedSupplier.phone || ""}
                        {selectedSupplier.gstNumber
                          ? ` · GSTIN: ${selectedSupplier.gstNumber}`
                          : ""}
                      </small>
                    )}
                  </label>

                  <label>
                    <span>Bill Number *</span>

                    <input
                      type="text"
                      placeholder="e.g. INV-1025"
                      value={billNumber}
                      onChange={(event) =>
                        setBillNumber(event.target.value)
                      }
                    />
                  </label>

                  <label>
                    <span>Purchase Date *</span>

                    <div className="purchases-input-icon">
                      <CalendarDays size={16} />

                      <input
                        type="date"
                        value={purchaseDate}
                        onChange={(event) =>
                          setPurchaseDate(event.target.value)
                        }
                      />
                    </div>
                  </label>

                  <label>
                    <span>Due Date</span>

                    <div className="purchases-input-icon">
                      <CalendarDays size={16} />

                      <input
                        type="date"
                        value={dueDate}
                        onChange={(event) =>
                          setDueDate(event.target.value)
                        }
                      />
                    </div>
                  </label>
                </div>
              </section>

              <section className="purchases-form-section">
                <div className="purchases-form-section-title">
                  <Package size={17} />
                  Add Products
                </div>

                <div className="purchases-item-form">
                  <label className="purchases-product-field">
                    <span>Product</span>

                    <select
                      value={selectedProduct}
                      onChange={(event) =>
                        handleProductChange(event.target.value)
                      }
                    >
                      <option value="">
                        Select product
                      </option>

                      {products.map((product) => (
                        <option
                          key={product._id}
                          value={product._id}
                        >
                          {product.name} · Stock: {product.stock}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Quantity</span>

                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={quantity}
                      onChange={(event) =>
                        setQuantity(event.target.value)
                      }
                    />
                  </label>

                  <label>
                    <span>Purchase Rate</span>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={rate}
                      onChange={(event) =>
                        setRate(event.target.value)
                      }
                    />
                  </label>

                  <label>
                    <span>GST %</span>

                    <select
                      value={gstRate}
                      onChange={(event) =>
                        setGstRate(event.target.value)
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
                    <span>HSN Code</span>

                    <input
                      type="text"
                      placeholder="Optional"
                      value={hsnCode}
                      onChange={(event) =>
                        setHsnCode(event.target.value)
                      }
                    />
                  </label>

                  <button
                    type="button"
                    className="purchases-add-item-btn"
                    onClick={addItem}
                  >
                    <Plus size={16} />
                    Add
                  </button>
                </div>

                <div className="purchases-items-table-wrap">
                  <table className="purchases-items-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>HSN</th>
                        <th>Qty</th>
                        <th>Rate</th>
                        <th>GST</th>
                        <th>Amount</th>
                        <th></th>
                      </tr>
                    </thead>

                    <tbody>
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={7}>
                            <div className="purchases-items-empty">
                              No products added yet.
                            </div>
                          </td>
                        </tr>
                      ) : (
                        items.map((item, index) => (
                          <tr key={`${item.product}-${index}`}>
                            <td>
                              <strong>
                                {item.productName}
                              </strong>
                            </td>

                            <td>{item.hsnCode || "—"}</td>

                            <td>{item.quantity}</td>

                            <td>
                              {formatCurrency(item.rate)}
                            </td>

                            <td>{item.gstRate}%</td>

                            <td>
                              {formatCurrency(item.amount)}
                            </td>

                            <td>
                              <button
                                type="button"
                                className="purchases-remove-item-btn"
                                onClick={() =>
                                  removeItem(index)
                                }
                                aria-label="Remove item"
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="purchases-bottom-grid">
                <div className="purchases-form-section">
                  <div className="purchases-form-section-title">
                    <FileText size={17} />
                    Notes
                  </div>

                  <label>
                    <span>Purchase Notes</span>

                    <textarea
                      rows={5}
                      placeholder="Optional notes about this purchase..."
                      value={notes}
                      onChange={(event) =>
                        setNotes(event.target.value)
                      }
                    />
                  </label>
                </div>

                <div className="purchases-summary-card">
                  <div className="purchases-summary-row">
                    <span>Taxable Amount</span>
                    <strong>
                      {formatCurrency(taxableAmount)}
                    </strong>
                  </div>

                  <div className="purchases-summary-row">
                    <span>CGST</span>
                    <strong>{formatCurrency(cgst)}</strong>
                  </div>

                  <div className="purchases-summary-row">
                    <span>SGST</span>
                    <strong>{formatCurrency(sgst)}</strong>
                  </div>

                  <div className="purchases-summary-row">
                    <span>Total GST</span>
                    <strong>
                      {formatCurrency(totalTax)}
                    </strong>
                  </div>

                  <div className="purchases-summary-divider" />

                  <div className="purchases-summary-total">
                    <span>Grand Total</span>
                    <strong>
                      {formatCurrency(calculatedGrandTotal)}
                    </strong>
                  </div>

                  <div className="purchases-summary-payment">
                    <label>
                      <span>Paid Amount</span>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={paidAmount}
                        onChange={(event) =>
                          setPaidAmount(event.target.value)
                        }
                        placeholder="0.00"
                      />
                    </label>

                    <label>
                      <span>Payment Method</span>

                      <select
                        value={paymentMethod}
                        onChange={(event) =>
                          setPaymentMethod(
                            event.target.value as PaymentMethod
                          )
                        }
                        disabled={paid <= 0}
                      >
                        <option value="cash">Cash</option>
                        <option value="upi">UPI</option>
                        <option value="bank">Bank</option>
                        <option value="card">Card</option>
                      </select>
                    </label>

                    {paid > 0 && (
                      <label>
                        <span>Payment Reference</span>

                        <input
                          type="text"
                          placeholder="Optional"
                          value={paymentReference}
                          onChange={(event) =>
                            setPaymentReference(
                              event.target.value
                            )
                          }
                        />
                      </label>
                    )}
                  </div>

                  <div className="purchases-summary-balance">
                    <span>Balance</span>
                    <strong>
                      {formatCurrency(balance)}
                    </strong>
                  </div>
                </div>
              </section>
            </div>

            <div className="purchases-modal-footer">
              <button
                type="button"
                className="purchases-cancel-btn"
                onClick={closeForm}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="button"
                className="purchases-save-btn"
                onClick={handleSavePurchase}
                disabled={saving || items.length === 0}
              >
                {saving ? (
                  <>
                    <RefreshCw
                      size={16}
                      className="purchases-spin"
                    />
                    Saving...
                  </>
                ) : (
                  <>
                    <Receipt size={16} />
                    Save Purchase
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewPurchase && (
        <div className="purchases-modal-backdrop">
          <div className="purchases-view-modal">
            <div className="purchases-modal-header">
              <div>
                <div className="purchases-eyebrow">
                  <Receipt size={15} />
                  Purchase Details
                </div>

                <h2>{viewPurchase.billNumber}</h2>

                <p>
                  {formatDate(viewPurchase.purchaseDate)}
                </p>
              </div>

              <button
                type="button"
                className="purchases-close-btn"
                onClick={() => setViewPurchase(null)}
              >
                <X size={19} />
              </button>
            </div>

            <div className="purchases-view-body">
              <div className="purchases-view-meta-grid">
                <div>
                  <span>Supplier</span>
                  <strong>
                    {viewPurchase.supplier?.name || "—"}
                  </strong>
                </div>

                <div>
                  <span>Phone</span>
                  <strong>
                    {viewPurchase.supplier?.phone || "—"}
                  </strong>
                </div>

                <div>
                  <span>Payment Status</span>
                  <strong>
                    <span
                      className={statusClass(
                        viewPurchase.paymentStatus
                      )}
                    >
                      {viewPurchase.paymentStatus}
                    </span>
                  </strong>
                </div>

                <div>
                  <span>Due Date</span>
                  <strong>
                    {formatDate(viewPurchase.dueDate)}
                  </strong>
                </div>
              </div>

              <div className="purchases-view-items">
                <h3>Items</h3>

                <div className="purchases-table-wrap">
                  <table className="purchases-items-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Qty</th>
                        <th>Rate</th>
                        <th>GST</th>
                        <th>Amount</th>
                      </tr>
                    </thead>

                    <tbody>
                      {viewPurchase.items?.map(
                        (item, index) => (
                          <tr
                            key={`${item.product}-${index}`}
                          >
                            <td>
                              <strong>
                                {item.productName}
                              </strong>
                            </td>

                            <td>{item.quantity}</td>

                            <td>
                              {formatCurrency(item.rate)}
                            </td>

                            <td>{item.gstRate}%</td>

                            <td>
                              {formatCurrency(item.amount)}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="purchases-view-summary">
                <div>
                  <span>Taxable Amount</span>
                  <strong>
                    {formatCurrency(
                      viewPurchase.taxableAmount
                    )}
                  </strong>
                </div>

                <div>
                  <span>CGST</span>
                  <strong>
                    {formatCurrency(viewPurchase.cgst)}
                  </strong>
                </div>

                <div>
                  <span>SGST</span>
                  <strong>
                    {formatCurrency(viewPurchase.sgst)}
                  </strong>
                </div>

                <div>
                  <span>Total GST</span>
                  <strong>
                    {formatCurrency(viewPurchase.totalTax)}
                  </strong>
                </div>

                <div>
                  <span>Grand Total</span>
                  <strong>
                    {formatCurrency(viewPurchase.grandTotal)}
                  </strong>
                </div>

                <div>
                  <span>Paid</span>
                  <strong>
                    {formatCurrency(viewPurchase.paidAmount)}
                  </strong>
                </div>

                <div>
                  <span>Credit Used</span>
                  <strong>
                    {formatCurrency(viewPurchase.creditUsed)}
                  </strong>
                </div>

                <div>
                  <span>Balance</span>
                  <strong>
                    {formatCurrency(
                      viewPurchase.balanceAmount
                    )}
                  </strong>
                </div>
              </div>

              {viewPurchase.notes && (
                <div className="purchases-view-notes">
                  <strong>Notes</strong>
                  <p>{viewPurchase.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}