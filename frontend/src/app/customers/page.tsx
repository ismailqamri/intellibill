"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Customer = {
  _id: string;
  name: string;
  phone: string;
  whatsappNumber?: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  createdAt?: string;
};

type CustomerSummary = {
  customer: Customer;
  totalInvoices: number;
  totalSales: number;
  totalPaid: number;
  totalOutstanding: number;
};

type CustomerForm = {
  name: string;
  phone: string;
  whatsappNumber: string;
  email: string;
  gstNumber: string;
  address: string;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

const emptyForm: CustomerForm = {
  name: "",
  phone: "",
  whatsappNumber: "",
  email: "",
  gstNumber: "",
  address: "",
};

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || "";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
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

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] =
    useState<Customer | null>(null);

  const [form, setForm] = useState<CustomerForm>(emptyForm);

  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);

  const [summary, setSummary] = useState<CustomerSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadCustomers() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/customers`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load customers");
      }

      setCustomers(data.customers || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load customers"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return customers;

    return customers.filter((customer) =>
      [
        customer.name,
        customer.phone,
        customer.email,
        customer.gstNumber,
        customer.address,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [customers, search]);

  const customersWithGST = useMemo(
    () =>
      customers.filter(
        (customer) => customer.gstNumber?.trim()
      ).length,
    [customers]
  );

  const [outstandingMap, setOutstandingMap] = useState<
    Record<string, number>
  >({});

  useEffect(() => {
    async function loadOutstanding() {
      if (!customers.length) {
        setOutstandingMap({});
        return;
      }

      const entries = await Promise.all(
        customers.map(async (customer) => {
          try {
            const response = await fetch(
              `${API_URL}/customers/${customer._id}/summary`,
              {
                headers: {
                  Authorization: `Bearer ${getToken()}`,
                },
              }
            );

            const data = await response.json();

            if (!response.ok) {
              return [customer._id, 0] as const;
            }

            return [
              customer._id,
              Number(data.summary?.totalOutstanding || 0),
            ] as const;
          } catch {
            return [customer._id, 0] as const;
          }
        })
      );

      setOutstandingMap(Object.fromEntries(entries));
    }

    loadOutstanding();
  }, [customers]);

  const totalOutstanding = useMemo(
    () =>
      Object.values(outstandingMap).reduce(
        (total, value) => total + Number(value || 0),
        0
      ),
    [outstandingMap]
  );

  function openAddForm() {
    setEditingCustomer(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEditForm(customer: Customer) {
    setEditingCustomer(customer);

    setForm({
      name: customer.name || "",
      phone: customer.phone || "",
      whatsappNumber: customer.whatsappNumber || "",
      email: customer.email || "",
      gstNumber: customer.gstNumber || "",
      address: customer.address || "",
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingCustomer(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Customer name is required.");
      return;
    }

    if (!form.phone.trim()) {
      setError("Phone number is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        whatsappNumber: form.whatsappNumber.trim(),
        email: form.email.trim(),
        gstNumber: form.gstNumber.trim(),
        address: form.address.trim(),
      };

      const url = editingCustomer
        ? `${API_URL}/customers/${editingCustomer._id}`
        : `${API_URL}/customers`;

      const method = editingCustomer ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save customer");
      }

      await loadCustomers();

      setShowForm(false);
      setEditingCustomer(null);
      setForm(emptyForm);

      setSuccess(
        editingCustomer
          ? "Customer updated successfully."
          : "Customer added successfully."
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save customer"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(customer: Customer) {
    const confirmed = window.confirm(
      `Delete customer "${customer.name}"?`
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      const response = await fetch(
        `${API_URL}/customers/${customer._id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete customer");
      }

      if (selectedCustomer?._id === customer._id) {
        setSelectedCustomer(null);
        setSummary(null);
      }

      await loadCustomers();

      setSuccess("Customer deleted successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete customer"
      );
    }
  }

  async function openCustomerDetails(customer: Customer) {
    try {
      setSelectedCustomer(customer);
      setSummary(null);
      setSummaryLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/customers/${customer._id}/summary`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load customer summary");
      }

      setSummary(data.summary || null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load customer summary"
      );
    } finally {
      setSummaryLoading(false);
    }
  }

  return (
    <main className="customers-page">
      <section className="customers-header">
        <div>
          <div className="customers-breadcrumb">
            Dashboard <span>/</span> Customers
          </div>

          <h1>Customers</h1>

          <p>
            Manage your customer relationships and outstanding balances.
          </p>
        </div>

        <button className="customers-primary-btn" onClick={openAddForm}>
          <span>+</span>
          Add Customer
        </button>
      </section>

      {error && (
        <div className="customers-alert customers-alert-error">
          {error}
          <button onClick={() => setError("")}>×</button>
        </div>
      )}

      {success && (
        <div className="customers-alert customers-alert-success">
          {success}
          <button onClick={() => setSuccess("")}>×</button>
        </div>
      )}

      <section className="customers-stat-grid">
        <div className="customers-stat-card">
          <div className="customers-stat-icon">👥</div>

          <div>
            <span>Total Customers</span>
            <strong>{customers.length}</strong>
          </div>
        </div>

        <div className="customers-stat-card">
          <div className="customers-stat-icon">✓</div>

          <div>
            <span>Customers with GSTIN</span>
            <strong>{customersWithGST}</strong>
          </div>
        </div>

        <div className="customers-stat-card">
          <div className="customers-stat-icon">₹</div>

          <div>
            <span>Outstanding Amount</span>
            <strong>{formatCurrency(totalOutstanding)}</strong>
          </div>
        </div>
      </section>

      <section className="customers-card">
        <div className="customers-toolbar">
          <div>
            <h2>Customer Directory</h2>
            <p>
              {filteredCustomers.length} customer
              {filteredCustomers.length === 1 ? "" : "s"} found
            </p>
          </div>

          <div className="customers-search">
            <span>⌕</span>

            <input
              type="text"
              placeholder="Search customers..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            {search && (
              <button onClick={() => setSearch("")}>×</button>
            )}
          </div>
        </div>

        <div className="customers-table-wrap">
          <table className="customers-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th>GSTIN</th>
                <th>Email</th>
                <th>Outstanding</th>
                <th>Added</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="customers-empty">
                    Loading customers...
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="customers-empty">
                    <div className="customers-empty-icon">👥</div>

                    <strong>
                      {search
                        ? "No customers found"
                        : "No customers yet"}
                    </strong>

                    <p>
                      {search
                        ? "Try changing your search."
                        : "Add your first customer to get started."}
                    </p>

                    {!search && (
                      <button
                        className="customers-secondary-btn"
                        onClick={openAddForm}
                      >
                        + Add Customer
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer._id}>
                    <td>
                      <button
                        className="customers-name-btn"
                        onClick={() => openCustomerDetails(customer)}
                      >
                        <span className="customers-avatar">
                          {customer.name.charAt(0).toUpperCase()}
                        </span>

                        <span>
                          <strong>{customer.name}</strong>
                          <small>{customer.address || "No address"}</small>
                        </span>
                      </button>
                    </td>

                    <td>{customer.phone || "—"}</td>

                    <td>
                      {customer.gstNumber ? (
                        <span className="customers-gstin">
                          {customer.gstNumber}
                        </span>
                      ) : (
                        <span className="customers-muted">—</span>
                      )}
                    </td>

                    <td>{customer.email || "—"}</td>

                    <td>
                      <strong
                        className={
                          Number(outstandingMap[customer._id] || 0) > 0
                            ? "customers-outstanding"
                            : "customers-paid"
                        }
                      >
                        {formatCurrency(
                          outstandingMap[customer._id] || 0
                        )}
                      </strong>
                    </td>

                    <td>{formatDate(customer.createdAt)}</td>

                    <td>
                      <div className="customers-actions">
                        <button
                          title="View customer"
                          onClick={() =>
                            openCustomerDetails(customer)
                          }
                        >
                          View
                        </button>

                        <button
                          title="Edit customer"
                          onClick={() => openEditForm(customer)}
                        >
                          Edit
                        </button>

                        <button
                          className="customers-delete-btn"
                          title="Delete customer"
                          onClick={() => handleDelete(customer)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showForm && (
        <div className="customers-modal-backdrop">
          <div className="customers-modal">
            <div className="customers-modal-header">
              <div>
                <h2>
                  {editingCustomer ? "Edit Customer" : "Add Customer"}
                </h2>

                <p>
                  {editingCustomer
                    ? "Update customer information."
                    : "Add a customer to your IntelliBill directory."}
                </p>
              </div>

              <button
                className="customers-modal-close"
                onClick={closeForm}
                disabled={saving}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="customers-form-grid">
                <label>
                  <span>Name *</span>

                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        name: event.target.value,
                      })
                    }
                    placeholder="Customer name"
                    required
                  />
                </label>

                <label>
                  <span>Phone *</span>

                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        phone: event.target.value,
                      })
                    }
                    placeholder="Phone number"
                    required
                  />
                </label>

                <label>
                  <span>WhatsApp Number</span>

                  <input
                    type="tel"
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
                  <span>Email</span>

                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        email: event.target.value,
                      })
                    }
                    placeholder="customer@example.com"
                  />
                </label>

                <label>
                  <span>GST Number</span>

                  <input
                    type="text"
                    value={form.gstNumber}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        gstNumber: event.target.value.toUpperCase(),
                      })
                    }
                    placeholder="GSTIN"
                  />
                </label>

                <label className="customers-form-full">
                  <span>Address</span>

                  <textarea
                    value={form.address}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        address: event.target.value,
                      })
                    }
                    placeholder="Customer address"
                    rows={3}
                  />
                </label>
              </div>

              <div className="customers-modal-footer">
                <button
                  type="button"
                  className="customers-cancel-btn"
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
                    : editingCustomer
                    ? "Update Customer"
                    : "Save Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedCustomer && (
        <div className="customers-modal-backdrop">
          <div className="customers-modal customers-details-modal">
            <div className="customers-modal-header">
              <div className="customers-details-heading">
                <span className="customers-large-avatar">
                  {selectedCustomer.name.charAt(0).toUpperCase()}
                </span>

                <div>
                  <h2>{selectedCustomer.name}</h2>
                  <p>Customer details and account summary</p>
                </div>
              </div>

              <button
                className="customers-modal-close"
                onClick={() => {
                  setSelectedCustomer(null);
                  setSummary(null);
                }}
              >
                ×
              </button>
            </div>

            <div className="customers-details-info">
              <div>
                <span>Phone</span>
                <strong>{selectedCustomer.phone || "—"}</strong>
              </div>

              <div>
                <span>WhatsApp</span>
                <strong>
                  {selectedCustomer.whatsappNumber || "—"}
                </strong>
              </div>

              <div>
                <span>Email</span>
                <strong>{selectedCustomer.email || "—"}</strong>
              </div>

              <div>
                <span>GSTIN</span>
                <strong>{selectedCustomer.gstNumber || "—"}</strong>
              </div>

              <div className="customers-details-address">
                <span>Address</span>
                <strong>{selectedCustomer.address || "—"}</strong>
              </div>
            </div>

            <div className="customers-summary-section">
              <h3>Account Summary</h3>

              {summaryLoading ? (
                <div className="customers-summary-loading">
                  Loading account summary...
                </div>
              ) : summary ? (
                <div className="customers-summary-grid">
                  <div>
                    <span>Total Invoices</span>
                    <strong>{summary.totalInvoices}</strong>
                  </div>

                  <div>
                    <span>Total Sales</span>
                    <strong>
                      {formatCurrency(summary.totalSales)}
                    </strong>
                  </div>

                  <div>
                    <span>Total Paid</span>
                    <strong className="customers-paid">
                      {formatCurrency(summary.totalPaid)}
                    </strong>
                  </div>

                  <div>
                    <span>Outstanding</span>
                    <strong className="customers-outstanding">
                      {formatCurrency(summary.totalOutstanding)}
                    </strong>
                  </div>
                </div>
              ) : (
                <div className="customers-summary-loading">
                  No summary available.
                </div>
              )}
            </div>

            <div className="customers-modal-footer">
              <button
                className="customers-cancel-btn"
                onClick={() => {
                  setSelectedCustomer(null);
                  setSummary(null);
                }}
              >
                Close
              </button>

              <button
                className="customers-primary-btn"
                onClick={() => {
                  setSelectedCustomer(null);
                  openEditForm(selectedCustomer);
                }}
              >
                Edit Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}