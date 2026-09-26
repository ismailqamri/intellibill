
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

type Customer = {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  gstNumber?: string;
};

type Product = {
  _id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  gstRate: number;
  hsnCode?: string;
};

type InvoiceItem = {
  productId: string;
  productName: string;
  quantity: number;
  rate: number;
  gstRate: number;
  hsnCode: string;
  amount: number;
};

type NewCustomer = {
  name: string;
  phone: string;
  email: string;
  address: string;
  gstNumber: string;
};

type NewProduct = {
  name: string;
  category: string;
  price: string;
  stock: string;
  reorderLevel: string;
  gstRate: string;
  hsnCode: string;
};

const emptyCustomer: NewCustomer = {
  name: "",
  phone: "",
  email: "",
  address: "",
  gstNumber: "",
};

const emptyProduct: NewProduct = {
  name: "",
  category: "",
  price: "",
  stock: "",
  reorderLevel: "10",
  gstRate: "18",
  hsnCode: "",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function SalesPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");

  const [quantity, setQuantity] = useState("1");
  const [items, setItems] = useState<InvoiceItem[]>([]);

  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);

  const [customerForm, setCustomerForm] =
    useState<NewCustomer>(emptyCustomer);

  const [productForm, setProductForm] =
    useState<NewProduct>(emptyProduct);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    loadData();
  }, [router]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [customersResponse, productsResponse] = await Promise.all([
        fetch(`${API_URL}/customers`, { headers }),
        fetch(`${API_URL}/products`, { headers }),
      ]);

      const customersData = await customersResponse.json();
      const productsData = await productsResponse.json();

      if (!customersResponse.ok) {
        throw new Error(
          customersData.message || "Failed to load customers"
        );
      }

      if (!productsResponse.ok) {
        throw new Error(
          productsData.message || "Failed to load products"
        );
      }

      setCustomers(
        customersData.customers ||
          customersData.data ||
          []
      );

      setProducts(
        productsData.products ||
          productsData.data ||
          []
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load data"
      );
    } finally {
      setLoading(false);
    }
  }

  const selectedProductData = useMemo(
    () => products.find((product) => product._id === selectedProduct),
    [products, selectedProduct]
  );

  const roundMoney = (value: number) =>
    Math.round((value + Number.EPSILON) * 100) / 100;

  // Product prices are treated as MRP / selling price INCLUDING GST.
  // GST is extracted from each item's MRP, matching the backend calculation.
  const calculatedTaxableAmount = useMemo(
    () =>
      roundMoney(
        items.reduce((total, item) => {
          if (item.gstRate <= 0) {
            return total + item.amount;
          }

          const taxableValue = roundMoney(
            item.amount / (1 + item.gstRate / 100)
          );
          return total + taxableValue;
        }, 0)
      ),
    [items]
  );

  const totalTax = useMemo(
    () =>
      roundMoney(
        items.reduce((total, item) => {
          if (item.gstRate <= 0) {
            return total;
          }

          const taxableValue = roundMoney(
            item.amount / (1 + item.gstRate / 100)
          );
          return total + roundMoney(item.amount - taxableValue);
        }, 0)
      ),
    [items]
  );

  const cgst = roundMoney(totalTax / 2);
  const sgst = roundMoney(totalTax - cgst);

  const calculatedGrandTotal = useMemo(
    () => roundMoney(items.reduce((total, item) => total + item.amount, 0)),
    [items]
  );

  // Editable final invoice total.
  const [grandTotalOverride, setGrandTotalOverride] = useState("");

  const grandTotal =
    grandTotalOverride !== ""
      ? Math.max(Number(grandTotalOverride) || 0, 0)
      : calculatedGrandTotal;

  const adjustment = grandTotal - calculatedGrandTotal;

  const paid = Number(paidAmount) || 0;
  const balance = Math.max(grandTotal - paid, 0);

  const paymentStatus =
    paid >= grandTotal && grandTotal > 0
      ? "PAID"
      : paid > 0
        ? "PARTIAL"
        : "PENDING";

  function addItem() {
    setError("");
    setMessage("");

    if (!selectedProductData) {
      setError("Please select a product.");
      return;
    }

    const parsedQuantity = Number(quantity);

    if (!parsedQuantity || parsedQuantity <= 0) {
      setError("Quantity must be greater than zero.");
      return;
    }

    if (parsedQuantity > selectedProductData.stock) {
      setError(
        `Only ${selectedProductData.stock} units available in stock.`
      );
      return;
    }

    const existingItem = items.find(
      (item) => item.productId === selectedProductData._id
    );

    if (existingItem) {
      const updatedQuantity =
        existingItem.quantity + parsedQuantity;

      if (updatedQuantity > selectedProductData.stock) {
        setError(
          `Only ${selectedProductData.stock} units available in stock.`
        );
        return;
      }

      setItems((previousItems) =>
        previousItems.map((item) =>
          item.productId === selectedProductData._id
            ? {
                ...item,
                quantity: updatedQuantity,
                amount: updatedQuantity * item.rate,
              }
            : item
        )
      );
    } else {
      setItems((previousItems) => [
        ...previousItems,
        {
          productId: selectedProductData._id,
          productName: selectedProductData.name,
          quantity: parsedQuantity,
          rate: selectedProductData.price,
          gstRate: selectedProductData.gstRate || 0,
          hsnCode: selectedProductData.hsnCode || "",
          amount: parsedQuantity * selectedProductData.price,
        },
      ]);
    }

    setSelectedProduct("");
    setQuantity("1");
  }

  function updateItemQuantity(
    productId: string,
    newQuantity: number
  ) {
    if (newQuantity <= 0) {
      removeItem(productId);
      return;
    }

    const product = products.find(
      (item) => item._id === productId
    );

    if (product && newQuantity > product.stock) {
      setError(`Only ${product.stock} units available.`);
      return;
    }

    setItems((previousItems) =>
      previousItems.map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantity: newQuantity,
              amount: newQuantity * item.rate,
            }
          : item
      )
    );
  }

  function removeItem(productId: string) {
    setItems((previousItems) =>
      previousItems.filter(
        (item) => item.productId !== productId
      )
    );
  }

  async function createCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setCreatingCustomer(true);
      setError("");
      setMessage("");

      if (!customerForm.name.trim() || !customerForm.phone.trim()) {
        setError("Customer name and phone are required.");
        return;
      }

      const token = localStorage.getItem("token");

      const response = await fetch(`${API_URL}/customers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(customerForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create customer");
      }

      const createdCustomer =
        data.customer || data.data || data;

      setCustomers((previousCustomers) => [
        ...previousCustomers,
        createdCustomer,
      ]);

      setSelectedCustomer(createdCustomer._id);
      setCustomerForm(emptyCustomer);
      setShowCustomerForm(false);
      setMessage("Customer created successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create customer"
      );
    } finally {
      setCreatingCustomer(false);
    }
  }

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setCreatingProduct(true);
      setError("");
      setMessage("");

      if (
        !productForm.name.trim() ||
        !productForm.category.trim() ||
        !productForm.price
      ) {
        setError("Product name, category and price are required.");
        return;
      }

      const token = localStorage.getItem("token");

      const response = await fetch(`${API_URL}/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: productForm.name,
          category: productForm.category,
          price: Number(productForm.price),
          stock: Number(productForm.stock) || 0,
          reorderLevel: Number(productForm.reorderLevel) || 10,
          gstRate: Number(productForm.gstRate) || 0,
          hsnCode: productForm.hsnCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create product");
      }

      const createdProduct =
        data.product || data.data || data;

      setProducts((previousProducts) => [
        ...previousProducts,
        createdProduct,
      ]);

      setSelectedProduct(createdProduct._id);
      setProductForm(emptyProduct);
      setShowProductForm(false);
      setMessage("Product created successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create product"
      );
    } finally {
      setCreatingProduct(false);
    }
  }

  async function saveInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      if (!selectedCustomer) {
        setError("Please select a customer.");
        return;
      }

      if (items.length === 0) {
        setError("Please add at least one product.");
        return;
      }

      if (grandTotal < 0 || grandTotal > calculatedGrandTotal) {
        setError(
          `Grand total must be between ₹0.00 and ₹${calculatedGrandTotal.toFixed(2)}.`
        );
        return;
      }

      if (paid < 0 || paid > grandTotal) {
        setError("Paid amount must be between 0 and the invoice total.");
        return;
      }

      if (paid > 0 && !paymentMethod) {
        setError("Please select a payment method.");
        return;
      }

      const token = localStorage.getItem("token");

      const response = await fetch(`${API_URL}/invoices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerId: selectedCustomer,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          paidAmount: paid,
          paymentMethod: paid > 0 ? paymentMethod : undefined,
          dueDate: dueDate || undefined,
          notes,
          grandTotal,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save invoice");
      }

      setMessage(
        `Invoice saved successfully${
          data.invoice?.invoiceNumber
            ? `: ${data.invoice.invoiceNumber}`
            : "."
        }`
      );

      setSelectedCustomer("");
      setItems([]);
      setPaidAmount("");
      setPaymentMethod("cash");
      setDueDate("");
      setNotes("");
      setGrandTotalOverride("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save invoice"
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="sales-page">
        <div className="sales-loading">Loading sales data...</div>
      </main>
    );
  }

  return (
    <main className="sales-page">
      <div className="sales-header">
        <div>
          

          <h1>Create Invoice</h1>
          <p>Create invoices, manage GST and record payments.</p>
        </div>

        <div className="header-actions">
          <button
            className="secondary-button"
            onClick={() => setShowCustomerForm((value) => !value)}
          >
            + Customer
          </button>

          <button
            className="secondary-button"
            onClick={() => setShowProductForm((value) => !value)}
          >
            + Product
          </button>
        </div>
      </div>

      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}

      {showCustomerForm && (
        <section className="sales-card">
          <div className="card-heading">
            <div>
              <h2>Add Customer</h2>
              <p>Save a new customer to your database.</p>
            </div>

            <button
              className="close-button"
              onClick={() => setShowCustomerForm(false)}
            >
              ×
            </button>
          </div>

          <form
            className="form-grid"
            onSubmit={createCustomer}
          >
            <label>
              Customer Name *
              <input
                value={customerForm.name}
                onChange={(event) =>
                  setCustomerForm({
                    ...customerForm,
                    name: event.target.value,
                  })
                }
                placeholder="Enter customer name"
              />
            </label>

            <label>
              Phone Number *
              <input
                value={customerForm.phone}
                onChange={(event) =>
                  setCustomerForm({
                    ...customerForm,
                    phone: event.target.value,
                  })
                }
                placeholder="Enter phone number"
              />
            </label>

            <label>
              Email
              <input
                type="email"
                value={customerForm.email}
                onChange={(event) =>
                  setCustomerForm({
                    ...customerForm,
                    email: event.target.value,
                  })
                }
                placeholder="customer@example.com"
              />
            </label>

            <label>
              GST Number
              <input
                value={customerForm.gstNumber}
                onChange={(event) =>
                  setCustomerForm({
                    ...customerForm,
                    gstNumber: event.target.value,
                  })
                }
                placeholder="Optional GSTIN"
              />
            </label>

            <label className="full-width">
              Address
              <textarea
                value={customerForm.address}
                onChange={(event) =>
                  setCustomerForm({
                    ...customerForm,
                    address: event.target.value,
                  })
                }
                placeholder="Customer address"
                rows={2}
              />
            </label>

            <div className="form-actions full-width">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowCustomerForm(false)}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-button"
                disabled={creatingCustomer}
              >
                {creatingCustomer ? "Saving..." : "Save Customer"}
              </button>
            </div>
          </form>
        </section>
      )}

      {showProductForm && (
        <section className="sales-card">
          <div className="card-heading">
            <div>
              <h2>Add Product</h2>
              <p>Create a product and add it to your inventory.</p>
            </div>

            <button
              className="close-button"
              onClick={() => setShowProductForm(false)}
            >
              ×
            </button>
          </div>

          <form
            className="form-grid"
            onSubmit={createProduct}
          >
            <label>
              Product Name *
              <input
                value={productForm.name}
                onChange={(event) =>
                  setProductForm({
                    ...productForm,
                    name: event.target.value,
                  })
                }
                placeholder="Enter product name"
              />
            </label>

            <label>
              Category *
              <input
                value={productForm.category}
                onChange={(event) =>
                  setProductForm({
                    ...productForm,
                    category: event.target.value,
                  })
                }
                placeholder="e.g. Grocery"
              />
            </label>

            <label>
              MRP (Including GST) *
              <input
                type="number"
                min="0"
                step="0.01"
                value={productForm.price}
                onChange={(event) =>
                  setProductForm({
                    ...productForm,
                    price: event.target.value,
                  })
                }
                placeholder="e.g. 30.00"
              />
            </label>

            <label>
              Opening Stock
              <input
                type="number"
                min="0"
                value={productForm.stock}
                onChange={(event) =>
                  setProductForm({
                    ...productForm,
                    stock: event.target.value,
                  })
                }
                placeholder="0"
              />
            </label>

            <label>
              GST Rate
              <select
                value={productForm.gstRate}
                onChange={(event) =>
                  setProductForm({
                    ...productForm,
                    gstRate: event.target.value,
                  })
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
              Reorder Level
              <input
                type="number"
                min="0"
                value={productForm.reorderLevel}
                onChange={(event) =>
                  setProductForm({
                    ...productForm,
                    reorderLevel: event.target.value,
                  })
                }
              />
            </label>

            <label>
              HSN Code
              <input
                value={productForm.hsnCode}
                onChange={(event) =>
                  setProductForm({
                    ...productForm,
                    hsnCode: event.target.value,
                  })
                }
                placeholder="Optional HSN code"
              />
            </label>

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowProductForm(false)}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-button"
                disabled={creatingProduct}
              >
                {creatingProduct ? "Saving..." : "Save Product"}
              </button>
            </div>
          </form>
        </section>
      )}

      <form onSubmit={saveInvoice}>
        <section className="sales-card">
          <div className="card-heading">
            <div>
              <h2>Customer Details</h2>
              <p>Select the customer for this invoice.</p>
            </div>

            <button
              type="button"
              className="small-action"
              onClick={() => setShowCustomerForm(true)}
            >
              + New Customer
            </button>
          </div>

          <div className="form-grid">
            <label>
              Customer *
              <select
                value={selectedCustomer}
                onChange={(event) =>
                  setSelectedCustomer(event.target.value)
                }
                required
              >
                <option value="">Select customer</option>

                {customers.map((customer) => (
                  <option
                    key={customer._id}
                    value={customer._id}
                  >
                    {customer.name} - {customer.phone}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Due Date
              <input
                type="date"
                value={dueDate}
                onChange={(event) =>
                  setDueDate(event.target.value)
                }
              />
            </label>
          </div>
        </section>

        <section className="sales-card">
          <div className="card-heading">
            <div>
              <h2>Products</h2>
              <p>Add products to your invoice.</p>
            </div>

            <button
              type="button"
              className="small-action"
              onClick={() => setShowProductForm(true)}
            >
              + New Product
            </button>
          </div>

          <div className="product-selector">
            <label>
              Product
              <select
                value={selectedProduct}
                onChange={(event) =>
                  setSelectedProduct(event.target.value)
                }
              >
                <option value="">Select product</option>

                {products.map((product) => (
                  <option
                    key={product._id}
                    value={product._id}
                    disabled={product.stock <= 0}
                  >
                    {product.name} — {formatCurrency(product.price)} —
                    Stock: {product.stock}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Quantity
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(event) =>
                  setQuantity(event.target.value)
                }
              />
            </label>

            <button
              type="button"
              className="primary-button add-item-button"
              onClick={addItem}
            >
              Add Item
            </button>
          </div>

          {selectedProductData && (
            <div className="product-preview">
              <span>{selectedProductData.name}</span>
              <span>
                MRP (Incl. GST): {formatCurrency(selectedProductData.price)}
              </span>
              <span>
                GST: {selectedProductData.gstRate || 0}%
              </span>
              <span>
                Available: {selectedProductData.stock}
              </span>
            </div>
          )}

          <div className="table-wrapper">
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>MRP (Incl. GST)</th>
                  <th>Qty</th>
                  <th>GST</th>
                  <th>Amount</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty-table">
                      No products added yet.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.productId}>
                      <td>
                        <strong>{item.productName}</strong>

                        {item.hsnCode && (
                          <small>HSN: {item.hsnCode}</small>
                        )}
                      </td>

                      <td>{formatCurrency(item.rate)}</td>

                      <td>
                        <input
                          className="quantity-input"
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(event) =>
                            updateItemQuantity(
                              item.productId,
                              Number(event.target.value)
                            )
                          }
                        />
                      </td>

                      <td>{item.gstRate}%</td>

                      <td>{formatCurrency(item.amount)}</td>

                      <td>
                        <button
                          type="button"
                          className="delete-button"
                          onClick={() => removeItem(item.productId)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="sales-columns">
          <section className="sales-card">
            <div className="card-heading">
              <div>
                <h2>Payment Details</h2>
                <p>Record the amount received from the customer.</p>
              </div>
            </div>

            <div className="form-grid">
              <label>
                Paid Amount
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
                Payment Method
                <select
                  value={paymentMethod}
                  onChange={(event) =>
                    setPaymentMethod(event.target.value)
                  }
                  disabled={paid <= 0}
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="bank">Bank</option>
                  <option value="card">Card</option>
                </select>
              </label>

              <label className="full-width">
                Notes
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(event) =>
                    setNotes(event.target.value)
                  }
                  placeholder="Additional notes"
                />
              </label>
            </div>
          </section>

          <section className="sales-card summary-card">
            <h2>Invoice Summary</h2>

            <div className="summary-row">
              <span>Taxable Amount</span>
              <strong>{formatCurrency(calculatedTaxableAmount)}</strong>
            </div>

            <div className="summary-row">
              <span>CGST</span>
              <strong>{formatCurrency(cgst)}</strong>
            </div>

            <div className="summary-row">
              <span>SGST</span>
              <strong>{formatCurrency(sgst)}</strong>
            </div>

            <div className="summary-row">
              <span>Calculated Total</span>
              <strong>{formatCurrency(calculatedGrandTotal)}</strong>
            </div>

            <div className="summary-row total-row">
              <label
                htmlFor="grand-total"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span>Grand Total</span>
                <small style={{ fontWeight: 400, opacity: 0.7 }}>
                  (Editable)
                </small>
              </label>

              <input
                id="grand-total"
                type="number"
                min="0"
                step="0.01"
                value={
                  grandTotalOverride !== ""
                    ? grandTotalOverride
                    : calculatedGrandTotal.toFixed(2)
                }
                onChange={(event) => setGrandTotalOverride(event.target.value)}
                onFocus={(event) => {
                  if (grandTotalOverride === "") {
                    setGrandTotalOverride(calculatedGrandTotal.toFixed(2));
                    event.currentTarget.select();
                  }
                }}
                style={{
                  width: "130px",
                  textAlign: "right",
                  fontWeight: 700,
                }}
              />
            </div>

            {Math.abs(adjustment) > 0.001 && (
              <div className="summary-row">
                <span>
                  {adjustment < 0 ? "Discount / Adjustment" : "Adjustment"}
                </span>
                <strong>
                  {adjustment < 0 ? "-" : "+"}
                  {formatCurrency(Math.abs(adjustment))}
                </strong>
              </div>
            )}

            <div className="summary-row">
              <span>Paid Amount</span>
              <strong>{formatCurrency(paid)}</strong>
            </div>

            <div className="summary-row balance-row">
              <span>Balance Due</span>
              <strong>{formatCurrency(balance)}</strong>
            </div>

            <div className="status-box">
              <span>Payment Status</span>
              <strong className={`status-${paymentStatus.toLowerCase()}`}>
                {paymentStatus}
              </strong>
            </div>

            <button
              type="submit"
              className="save-invoice-button"
              disabled={saving || items.length === 0}
            >
              {saving ? "Saving Invoice..." : "Save Invoice"}
            </button>

            <button
              type="button"
              className="cancel-invoice-button"
              onClick={() => router.push("/")}
            >
              Cancel
            </button>
          </section>
        </div>
      </form>
    </main>
  );
}