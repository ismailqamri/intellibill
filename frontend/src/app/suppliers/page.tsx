"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Supplier = {
  _id: string;
  name: string;
  phone: string;
  whatsappNumber?: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  creditDays?: number;
  notes?: string;
  isActive?: boolean;
  createdAt?: string;
};

type SupplierSummary = {
  totalBills: number;
  totalPurchases: number;
  totalPaid: number;
  totalOutstanding: number;
};

type SupplierForm = {
  name: string;
  phone: string;
  whatsappNumber: string;
  email: string;
  address: string;
  gstNumber: string;
  creditDays: string;
  notes: string;
  isActive: boolean;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

const emptyForm: SupplierForm = {
  name: "",
  phone: "",
  whatsappNumber: "",
  email: "",
  address: "",
  gstNumber: "",
  creditDays: "0",
  notes: "",
  isActive: true,
};

function formatCurrency(value: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || "";
}

async function apiRequest(
  url: string,
  options: RequestInit = {}
) {
  const token = getToken();

  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [outstandingMap, setOutstandingMap] = useState<
    Record<string, number>
  >({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] =
    useState<Supplier | null>(null);

  const [form, setForm] = useState<SupplierForm>(emptyForm);

  const [selectedSupplier, setSelectedSupplier] =
    useState<Supplier | null>(null);
  const [selectedSummary, setSelectedSummary] =
    useState<SupplierSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [error, setError] = useState("");

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiRequest(`${API_URL}/suppliers`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load suppliers");
      }

      const supplierList: Supplier[] = data.suppliers || [];
      setSuppliers(supplierList);

      const summaries: Record<string, number> = {};

      await Promise.all(
        supplierList.map(async (supplier) => {
          try {
            const summaryResponse = await apiRequest(
              `${API_URL}/suppliers/${supplier._id}/summary`
            );

            const summaryData = await summaryResponse.json();

            if (summaryResponse.ok) {
              summaries[supplier._id] =
                Number(summaryData.totalOutstanding) || 0;
            }
          } catch {
            summaries[supplier._id] = 0;
          }
        })
      );

      setOutstandingMap(summaries);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load suppliers"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const filteredSuppliers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return suppliers;

    return suppliers.filter((supplier) => {
      return (
        supplier.name.toLowerCase().includes(query) ||
        supplier.phone.toLowerCase().includes(query) ||
        (supplier.email || "").toLowerCase().includes(query) ||
        (supplier.gstNumber || "").toLowerCase().includes(query)
      );
    });
  }, [suppliers, search]);

  const totalSuppliers = suppliers.length;

  const activeSuppliers = suppliers.filter(
    (supplier) => supplier.isActive !== false
  ).length;

  const gstRegistered = suppliers.filter(
    (supplier) => (supplier.gstNumber || "").trim().length > 0
  ).length;

  const totalOutstanding = suppliers.reduce(
    (total, supplier) =>
      total + Number(outstandingMap[supplier._id] || 0),
    0
  );

  const openAddForm = () => {
    setEditingSupplier(null);
    setForm(emptyForm);
    setError("");
    setShowForm(true);
  };

  const openEditForm = (supplier: Supplier) => {
    setEditingSupplier(supplier);

    setForm({
      name: supplier.name || "",
      phone: supplier.phone || "",
      whatsappNumber: supplier.whatsappNumber || "",
      email: supplier.email || "",
      address: supplier.address || "",
      gstNumber: supplier.gstNumber || "",
      creditDays: String(supplier.creditDays ?? 0),
      notes: supplier.notes || "",
      isActive: supplier.isActive !== false,
    });

    setError("");
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    setEditingSupplier(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Supplier name is required.");
      return;
    }

    if (!form.phone.trim()) {
      setError("Phone number is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        whatsappNumber: form.whatsappNumber.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        gstNumber: form.gstNumber.trim(),
        creditDays: Number(form.creditDays) || 0,
        notes: form.notes.trim(),
        isActive: form.isActive,
      };

      const url = editingSupplier
        ? `${API_URL}/suppliers/${editingSupplier._id}`
        : `${API_URL}/suppliers`;

      const response = await apiRequest(url, {
        method: editingSupplier ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save supplier");
      }

      closeForm();
      await loadSuppliers();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save supplier"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (supplier: Supplier) => {
    const confirmed = window.confirm(
      `Delete supplier "${supplier.name}"?`
    );

    if (!confirmed) return;

    try {
      setError("");

      const response = await apiRequest(
        `${API_URL}/suppliers/${supplier._id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete supplier");
      }

      if (selectedSupplier?._id === supplier._id) {
        setSelectedSupplier(null);
        setSelectedSummary(null);
      }

      await loadSuppliers();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete supplier"
      );
    }
  };

  const openSupplierDetails = async (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setSelectedSummary(null);
    setSummaryLoading(true);
    setError("");

    try {
      const response = await apiRequest(
        `${API_URL}/suppliers/${supplier._id}/summary`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load supplier summary");
      }

      setSelectedSummary({
        totalBills: Number(data.totalBills) || 0,
        totalPurchases: Number(data.totalPurchases) || 0,
        totalPaid: Number(data.totalPaid) || 0,
        totalOutstanding: Number(data.totalOutstanding) || 0,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load supplier summary"
      );
    } finally {
      setSummaryLoading(false);
    }
  };

  return (
    <main className="customers-page suppliers-page">
      <div className="customers-container">
        <div className="customers-header">
          <div>
            <div className="customers-eyebrow">PURCHASE MANAGEMENT</div>
            <h1>Suppliers</h1>
            <p>
              Manage suppliers, credit terms, and outstanding purchase
              balances.
            </p>
          </div>

          <button
            type="button"
            className="customers-primary-btn"
            onClick={openAddForm}
          >
            <span>＋</span>
            Add Supplier
          </button>
        </div>

        {error && (
          <div className="customers-error">
            {error}
          </div>
        )}

        <section className="customers-stats-grid">
          <div className="customers-stat-card">
            <div className="customers-stat-label">TOTAL SUPPLIERS</div>
            <div className="customers-stat-value">
              {totalSuppliers}
            </div>
            <div className="customers-stat-meta">
              Supplier records
            </div>
          </div>

          <div className="customers-stat-card">
            <div className="customers-stat-label">ACTIVE SUPPLIERS</div>
            <div className="customers-stat-value">
              {activeSuppliers}
            </div>
            <div className="customers-stat-meta">
              Currently active
            </div>
          </div>

          <div className="customers-stat-card">
            <div className="customers-stat-label">GST REGISTERED</div>
            <div className="customers-stat-value">
              {gstRegistered}
            </div>
            <div className="customers-stat-meta">
              Suppliers with GSTIN
            </div>
          </div>

          <div className="customers-stat-card customers-stat-highlight">
            <div className="customers-stat-label">
              OUTSTANDING PAYABLE
            </div>
            <div className="customers-stat-value">
              {formatCurrency(totalOutstanding)}
            </div>
            <div className="customers-stat-meta">
              Amount due to suppliers
            </div>
          </div>
        </section>

        <section className="customers-content-card">
          <div className="customers-toolbar">
            <div>
              <h2>Supplier Directory</h2>
              <p>
                {filteredSuppliers.length} supplier
                {filteredSuppliers.length !== 1 ? "s" : ""} shown
              </p>
            </div>

            <div className="customers-search">
              <span>⌕</span>
              <input
                type="search"
                placeholder="Search suppliers..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="customers-empty-state">
              <div className="customers-empty-icon">◌</div>
              <h3>Loading suppliers...</h3>
              <p>Please wait while supplier records are loaded.</p>
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="customers-empty-state">
              <div className="customers-empty-icon">◫</div>
              <h3>
                {search ? "No suppliers found" : "No suppliers yet"}
              </h3>
              <p>
                {search
                  ? "Try a different search term."
                  : "Add your first supplier to start managing purchases."}
              </p>

              {!search && (
                <button
                  type="button"
                  className="customers-secondary-btn"
                  onClick={openAddForm}
                >
                  Add Supplier
                </button>
              )}
            </div>
          ) : (
            <div className="customers-table-wrap">
              <table className="customers-table">
                <thead>
                  <tr>
                    <th>SUPPLIER</th>
                    <th>CONTACT</th>
                    <th>GSTIN</th>
                    <th>CREDIT</th>
                    <th>OUTSTANDING</th>
                    <th>STATUS</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredSuppliers.map((supplier) => {
                    const outstanding =
                      Number(outstandingMap[supplier._id]) || 0;

                    const active = supplier.isActive !== false;

                    return (
                      <tr key={supplier._id}>
                        <td>
                          <div className="customers-name-cell">
                            <div className="customers-avatar">
                              {supplier.name
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div>
                              <strong>{supplier.name}</strong>
                              <span>
                                {supplier.email ||
                                  supplier.phone}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="customers-contact-cell">
                            <span>
                                <strong>Phone:</strong> {supplier.phone}
                            </span>

                            {supplier.whatsappNumber && (
                                <span>
                                    <strong>WhatsApp:</strong> {supplier.whatsappNumber}
                                </span>
                            )}
                        </div>
                        </td>

                        <td>
                          {supplier.gstNumber ? (
                            <span className="customers-gstin">
                              {supplier.gstNumber}
                            </span>
                          ) : (
                            <span className="customers-muted">
                              Not registered
                            </span>
                          )}
                        </td>

                        <td>
                          <strong>
                            {supplier.creditDays || 0} days
                          </strong>
                        </td>

                        <td>
                          <strong
                            className={
                              outstanding > 0
                                ? "supplier-outstanding"
                                : "supplier-paid"
                            }
                          >
                            {formatCurrency(outstanding)}
                          </strong>
                        </td>

                        <td>
                          <span
                            className={`customers-status ${
                              active
                                ? "customers-status-active"
                                : "customers-status-inactive"
                            }`}
                          >
                            <span />
                            {active ? "Active" : "Inactive"}
                          </span>
                        </td>

                        <td>
                          <div className="customers-actions">
                            <button
                              type="button"
                              className="customers-action-btn"
                              title="View"
                              onClick={() =>
                                openSupplierDetails(supplier)
                              }
                            >
                              View
                            </button>

                            <button
                              type="button"
                              className="customers-action-btn"
                              title="Edit"
                              onClick={() =>
                                openEditForm(supplier)
                              }
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              className="customers-action-btn customers-action-danger"
                              title="Delete"
                              onClick={() =>
                                handleDelete(supplier)
                              }
                            >
                              Delete
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

      {showForm && (
        <div className="customers-modal-backdrop">
          <div className="customers-modal">
            <div className="customers-modal-header">
              <div>
                <div className="customers-eyebrow">
                  {editingSupplier
                    ? "UPDATE SUPPLIER"
                    : "NEW SUPPLIER"}
                </div>

                <h2>
                  {editingSupplier
                    ? "Edit Supplier"
                    : "Add Supplier"}
                </h2>
              </div>

              <button
                type="button"
                className="customers-modal-close"
                onClick={closeForm}
              >
                ×
              </button>
            </div>

            <form
              className="customers-form"
              onSubmit={handleSubmit}
            >
              <div className="customers-form-grid">
                <label>
                  Supplier Name *
                  <input
                    value={form.name}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        name: event.target.value,
                      })
                    }
                    placeholder="Enter supplier name"
                    required
                  />
                </label>

                <label>
                  Phone *
                  <input
                    value={form.phone}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        phone: event.target.value,
                      })
                    }
                    placeholder="Enter phone number"
                    required
                  />
                </label>

                <label>
                  WhatsApp Number
                  <input
                    value={form.whatsappNumber}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        whatsappNumber: event.target.value,
                      })
                    }
                    placeholder="WhatsApp number"
                  />
                </label>

                <label>
                  Email
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        email: event.target.value,
                      })
                    }
                    placeholder="supplier@example.com"
                  />
                </label>

                <label>
                  GST Number
                  <input
                    value={form.gstNumber}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        gstNumber: event.target.value,
                      })
                    }
                    placeholder="GSTIN"
                  />
                </label>

                <label>
                  Credit Days
                  <input
                    type="number"
                    min="0"
                    value={form.creditDays}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        creditDays: event.target.value,
                      })
                    }
                    placeholder="0"
                  />
                </label>

                <label className="customers-form-full">
                  Address
                  <textarea
                    value={form.address}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        address: event.target.value,
                      })
                    }
                    placeholder="Supplier address"
                    rows={3}
                  />
                </label>

                <label className="customers-form-full">
                  Notes
                  <textarea
                    value={form.notes}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        notes: event.target.value,
                      })
                    }
                    placeholder="Additional notes"
                    rows={3}
                  />
                </label>

                <label className="customers-checkbox customers-form-full">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        isActive: event.target.checked,
                      })
                    }
                  />
                  <span>Supplier is active</span>
                </label>
              </div>

              <div className="customers-form-actions">
                <button
                  type="button"
                  className="customers-secondary-btn"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="customers-primary-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingSupplier
                    ? "Update Supplier"
                    : "Save Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedSupplier && (
        <div className="customers-modal-backdrop">
          <div className="customers-modal customers-details-modal">
            <div className="customers-modal-header">
              <div>
                <div className="customers-eyebrow">
                  SUPPLIER DETAILS
                </div>

                <h2>{selectedSupplier.name}</h2>
              </div>

              <button
                type="button"
                className="customers-modal-close"
                onClick={() => {
                  setSelectedSupplier(null);
                  setSelectedSummary(null);
                }}
              >
                ×
              </button>
            </div>

            <div className="customers-details">
              <div className="customers-detail-grid">
                <div>
                  <span>Phone</span>
                  <strong>{selectedSupplier.phone}</strong>
                </div>

                <div>
                  <span>WhatsApp</span>
                  <strong>
                    {selectedSupplier.whatsappNumber ||
                      "Not provided"}
                  </strong>
                </div>

                <div>
                  <span>Email</span>
                  <strong>
                    {selectedSupplier.email ||
                      "Not provided"}
                  </strong>
                </div>

                <div>
                  <span>GST Number</span>
                  <strong>
                    {selectedSupplier.gstNumber ||
                      "Not registered"}
                  </strong>
                </div>

                <div>
                  <span>Credit Days</span>
                  <strong>
                    {selectedSupplier.creditDays || 0} days
                  </strong>
                </div>

                <div>
                  <span>Status</span>
                  <strong>
                    {selectedSupplier.isActive !== false
                      ? "Active"
                      : "Inactive"}
                  </strong>
                </div>

                <div className="customers-detail-full">
                  <span>Address</span>
                  <strong>
                    {selectedSupplier.address ||
                      "Not provided"}
                  </strong>
                </div>

                {selectedSupplier.notes && (
                  <div className="customers-detail-full">
                    <span>Notes</span>
                    <strong>{selectedSupplier.notes}</strong>
                  </div>
                )}
              </div>

              <div className="customers-summary-section">
                <h3>Purchase Account</h3>

                {summaryLoading ? (
                  <div className="customers-summary-loading">
                    Loading account summary...
                  </div>
                ) : selectedSummary ? (
                  <div className="customers-summary-grid">
                    <div>
                      <span>Total Bills</span>
                      <strong>
                        {selectedSummary.totalBills}
                      </strong>
                    </div>

                    <div>
                      <span>Total Purchases</span>
                      <strong>
                        {formatCurrency(
                          selectedSummary.totalPurchases
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Total Paid</span>
                      <strong className="supplier-paid">
                        {formatCurrency(
                          selectedSummary.totalPaid
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Outstanding</span>
                      <strong className="supplier-outstanding">
                        {formatCurrency(
                          selectedSummary.totalOutstanding
                        )}
                      </strong>
                    </div>
                  </div>
                ) : (
                  <div className="customers-summary-loading">
                    No purchase summary available.
                  </div>
                )}
              </div>

              <div className="customers-form-actions">
                <button
                  type="button"
                  className="customers-secondary-btn"
                  onClick={() =>
                    openEditForm(selectedSupplier)
                  }
                >
                  Edit Supplier
                </button>

                <button
                  type="button"
                  className="customers-primary-btn"
                  onClick={() => {
                    setSelectedSupplier(null);
                    setSelectedSummary(null);
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}