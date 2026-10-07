"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CustomerCard from "@/components/invoice/CustomerCard";
import ItemsTable from "@/components/invoice/ItemsTable";
import NewCustomerDrawer, { NewCustomerForm } from "@/components/invoice/NewCustomerDrawer";
import NewProductDrawer, { NewProductForm } from "@/components/invoice/NewProductDrawer";
import SummaryPanel from "@/components/invoice/SummaryPanel";
import { InvoiceCustomer, InvoiceProduct, useInvoice } from "@/hooks/useInvoice";
import { openInvoicePdf, PdfCompanySettings, PdfInvoice } from "@/lib/invoicePdf";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

const emptyCustomer: NewCustomerForm = { name: "", phone: "", email: "", address: "", gstNumber: "" };
const emptyProduct: NewProductForm = { name: "", category: "", price: "", stock: "", reorderLevel: "10", gstRate: "18", hsnCode: "" };

function inferState(gstNumber?: string) {
  const stateCode = gstNumber?.slice(0, 2);
  const states: Record<string, string> = { "01": "Jammu and Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh", "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh", "10": "Bihar", "27": "Maharashtra", "29": "Karnataka", "33": "Tamil Nadu" };
  return stateCode ? states[stateCode] : undefined;
}

function normalizeCustomer(customer: InvoiceCustomer): InvoiceCustomer {
  return { ...customer, state: customer.state || inferState(customer.gstNumber) };
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

async function loadCompanySettings(token: string | null): Promise<PdfCompanySettings> {
  const response = await fetch(`${API_URL}/settings`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Could not load company settings");
  }

  if (!data.settings) {
    throw new Error("Company settings are required before printing an invoice.");
  }

  return data.settings;
}

export default function SalesPage() {
  const router = useRouter();
  const { state, dispatch, calculation } = useInvoice();
  const [customers, setCustomers] = useState<InvoiceCustomer[]>([]);
  const [products, setProducts] = useState<InvoiceProduct[]>([]);
  const [customerQuery, setCustomerQuery] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [highlightedProduct, setHighlightedProduct] = useState(0);
  const [customerForm, setCustomerForm] = useState(emptyCustomer);
  const [productForm, setProductForm] = useState(emptyProduct);
  const [customerDrawerOpen, setCustomerDrawerOpen] = useState(false);
  const [productDrawerOpen, setProductDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const productInputRef = useRef<HTMLInputElement | null>(null);
  const quantityRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }
    loadData();
  }, [router]);

  const selectedCustomer = useMemo(() => customers.find((customer) => customer._id === state.customerId), [customers, state.customerId]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const [customersResponse, productsResponse] = await Promise.all([fetch(`${API_URL}/customers`, { headers }), fetch(`${API_URL}/products`, { headers })]);
      const customersData = await customersResponse.json();
      const productsData = await productsResponse.json();
      if (!customersResponse.ok) throw new Error(customersData.message || "Failed to load customers");
      if (!productsResponse.ok) throw new Error(productsData.message || "Failed to load products");
      setCustomers((customersData.customers || customersData.data || []).map(normalizeCustomer));
      setProducts(productsData.products || productsData.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  function selectCustomer(customerId: string) {
    const customer = customers.find((item) => item._id === customerId);
    setCustomerQuery(customer?.name || "");
    dispatch({ type: "set_customer", customerId, taxMode: "intra" });
  }

  function addProduct(product: InvoiceProduct) {
    setError("");
    setProductQuery("");
    dispatch({ type: "add_product", product });
    window.setTimeout(() => quantityRefs.current[product._id]?.focus(), 0);
  }

  async function createCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setCreatingCustomer(true);
      setError("");
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/customers`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(customerForm) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to create customer");
      const created = normalizeCustomer(data.customer || data.data || data);
      setCustomers((previous) => [created, ...previous]);
      setCustomerForm(emptyCustomer);
      setCustomerDrawerOpen(false);
      setCustomerQuery(created.name);
      dispatch({ type: "set_customer", customerId: created._id, taxMode: "intra" });
      setMessage("Customer created successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create customer");
    } finally {
      setCreatingCustomer(false);
    }
  }

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setCreatingProduct(true);
      setError("");
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/products`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ name: productForm.name, category: productForm.category, price: Number(productForm.price), stock: Number(productForm.stock) || 0, reorderLevel: Number(productForm.reorderLevel) || 10, gstRate: Number(productForm.gstRate) || 0, hsnCode: productForm.hsnCode }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to create product");
      const created = data.product || data.data || data;
      setProducts((previous) => [created, ...previous]);
      setProductForm(emptyProduct);
      setProductDrawerOpen(false);
      addProduct(created);
      setMessage("Product created successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create product");
    } finally {
      setCreatingProduct(false);
    }
  }

  function validateInvoice() {
    if (!state.customerId && !state.walkInSelected) return "Please select a customer or choose Walk-in.";
    if (state.walkInSelected && !state.walkInCustomerName.trim()) return "Please enter a walk-in customer name.";
    if (state.items.length === 0) return "Please add at least one product.";
    if (state.items.some((item) => item.quantity <= 0)) return "Quantity must be greater than zero.";
    if (state.paidAmount < 0) return "Paid amount cannot be negative.";
    return "";
  }

  function resetInvoiceForm() {
    dispatch({ type: "reset" });
    setCustomerQuery("");
    setProductQuery("");
    setHighlightedProduct(0);
    quantityRefs.current = {};
  }

  async function saveInvoice(mode: "print" | "new" | "save") {
    const validationError = validateInvoice();
    if (validationError) {
      setError(validationError);
      return;
    }
    let pdfWindow: Window | null = null;
    if (mode === "print") {
      pdfWindow = window.open("", "_blank");
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");
      const token = localStorage.getItem("token");
      const paidAmount = calculation.paid;
      const paymentMethod = state.paymentMethod;
      const customerPayload = state.customerId
        ? { customerId: state.customerId }
        : {
            walkInCustomer: {
              name: state.walkInCustomerName.trim(),
              phone: state.walkInCustomerPhone.trim() || undefined,
            },
          };
      const response = await fetch(`${API_URL}/invoices`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...customerPayload, items: state.items.map((item) => ({ productId: item.productId, quantity: item.quantity, rate: item.rate })), paidAmount, paymentMethod: paidAmount > 0 ? paymentMethod : undefined, dueDate: state.dueDate || undefined, notes: state.notes, grandTotal: calculation.total }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to save invoice");
      const savedInvoice = data.invoice as PdfInvoice | undefined;
      if (!savedInvoice) throw new Error("Invoice was saved, but the saved invoice data was not returned.");
      const invoiceNumber = savedInvoice.invoiceNumber;
      dispatch({ type: "mark_saved", invoiceNumber });

      if (mode === "print") {
        try {
          const settings = await loadCompanySettings(token);
          openInvoicePdf(savedInvoice, settings, pdfWindow);
          pdfWindow = null;
          setMessage(`Invoice saved successfully${invoiceNumber ? `: ${invoiceNumber}` : ""}. PDF opened in a new tab.`);
          resetInvoiceForm();
        } catch (pdfError) {
          pdfWindow?.close();
          pdfWindow = null;
          setError(`Invoice saved successfully${invoiceNumber ? ` (${invoiceNumber})` : ""}, but PDF generation failed. ${getErrorMessage(pdfError, "Please try printing the saved invoice again.")}`);
        }
      } else {
        setMessage(`Invoice saved successfully${invoiceNumber ? `: ${invoiceNumber}` : "."}`);
      }

      await loadData();
      if (mode === "new") {
        resetInvoiceForm();
      }
    } catch (err) {
      pdfWindow?.close();
      setError(err instanceof Error ? err.message : "Failed to save invoice");
    } finally {
      setSaving(false);
    }
  }

  function cancelInvoice() {
    if (state.dirty && !window.confirm("Discard this unsaved invoice?")) return;
    resetInvoiceForm();
    setError("");
    setMessage("");
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "F2") {
        event.preventDefault();
        productInputRef.current?.focus();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveInvoice("save");
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        saveInvoice("print");
      }
      if (event.key === "Escape") {
        setCustomerDrawerOpen(false);
        setProductDrawerOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  if (loading) {
    return <main className="sales-page pos-sales-page"><div className="sales-loading">Loading sales data...</div></main>;
  }

  return (
    <main className="sales-page pos-sales-page">
      <div className="pos-sales-shell">
        <header className="pos-sales-header">
          <div>
            <div className="title-row"><h1>New invoice</h1></div>
            <p>Build a GST-inclusive invoice quickly from customer, product and payment details.</p>
          </div>
          <div className="shortcut-hints" aria-label="Keyboard shortcuts">
            <span>F2 Find product</span>
            <span>Ctrl/Cmd + S Save</span>
          </div>
        </header>
        {message && <div className="success-message" role="status">{message}</div>}
        {error && <div className="error-message" role="alert">{error}</div>}
        <div className="pos-invoice-flow">
          <CustomerCard customers={customers} selectedCustomer={selectedCustomer} customerId={state.customerId} walkInSelected={state.walkInSelected} customerQuery={customerQuery} walkInCustomerName={state.walkInCustomerName} walkInCustomerPhone={state.walkInCustomerPhone} invoiceNumber={state.invoiceNumber} invoiceDate={state.invoiceDate} dueDate={state.dueDate} onCustomerQueryChange={setCustomerQuery} onCustomerSelect={selectCustomer} onCustomerClear={() => { setCustomerQuery(""); dispatch({ type: "set_customer", customerId: "" }); }} onWalkInToggle={() => { setCustomerQuery(""); dispatch({ type: "set_walk_in_mode", selected: !state.walkInSelected }); }} onWalkInCustomerChange={(walkInCustomer) => dispatch({ type: "set_walk_in_customer", ...walkInCustomer })} onDueDateChange={(dueDate) => dispatch({ type: "set_due_date", dueDate })} onNewCustomer={() => setCustomerDrawerOpen(true)} />
          <section className="invoice-card items-card">
            <div className="invoice-card-heading"><div><h2>Items</h2><p>Enter products directly in the invoice table · Rates include GST</p></div><button type="button" className="invoice-soft-btn" onClick={() => setProductDrawerOpen(true)}>New product</button></div>
            <ItemsTable products={products} query={productQuery} highlightedIndex={highlightedProduct} inputRef={productInputRef} items={state.items} lines={calculation.lines} quantityRefs={quantityRefs} onQueryChange={setProductQuery} onHighlight={setHighlightedProduct} onAddProduct={addProduct} onQuantityChange={(productId, quantity) => dispatch({ type: "set_quantity", productId, quantity })} onRateChange={(productId, rate) => dispatch({ type: "set_rate", productId, rate })} onIncrement={(productId, step) => dispatch({ type: "increment_quantity", productId, step })} onRemove={(productId) => dispatch({ type: "remove_item", productId })} />
          </section>
          <SummaryPanel state={state} calculation={calculation} saving={saving} onPaymentMethodChange={(paymentMethod) => dispatch({ type: "set_payment_method", paymentMethod })} onPaidAmountChange={(paidAmount) => dispatch({ type: "set_paid_amount", paidAmount })} onTotalChange={(total) => dispatch({ type: "set_total", total })} onSave={saveInvoice} onCancel={cancelInvoice} />
        </div>
      </div>
      <NewCustomerDrawer open={customerDrawerOpen} form={customerForm} saving={creatingCustomer} onChange={setCustomerForm} onClose={() => setCustomerDrawerOpen(false)} onSubmit={createCustomer} />
      <NewProductDrawer open={productDrawerOpen} form={productForm} saving={creatingProduct} onChange={setProductForm} onClose={() => setProductDrawerOpen(false)} onSubmit={createProduct} />
    </main>
  );
}
