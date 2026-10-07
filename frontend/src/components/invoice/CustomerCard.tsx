import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import InvoiceMeta from "./InvoiceMeta";
import { InvoiceCustomer } from "@/hooks/useInvoice";

type CustomerCardProps = {
  customers: InvoiceCustomer[];
  selectedCustomer?: InvoiceCustomer;
  customerId: string;
  walkInSelected: boolean;
  customerQuery: string;
  walkInCustomerName: string;
  walkInCustomerPhone: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  onCustomerQueryChange: (query: string) => void;
  onCustomerSelect: (customerId: string) => void;
  onCustomerClear: () => void;
  onWalkInToggle: () => void;
  onWalkInCustomerChange: (customer: { name?: string; phone?: string }) => void;
  onDueDateChange: (dueDate: string) => void;
  onNewCustomer: () => void;
};

const initials = (name?: string) =>
  (name || "Walk in")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "WI";

const formatMoney = (value?: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value || 0);

export default function CustomerCard({
  customers,
  selectedCustomer,
  customerId,
  walkInSelected,
  customerQuery,
  walkInCustomerName,
  walkInCustomerPhone,
  invoiceNumber,
  invoiceDate,
  dueDate,
  onCustomerQueryChange,
  onCustomerSelect,
  onCustomerClear,
  onWalkInToggle,
  onWalkInCustomerChange,
  onDueDateChange,
  onNewCustomer,
}: CustomerCardProps) {
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const normalizedQuery = customerQuery.trim().toLowerCase();
  const isWalkInSelected = walkInSelected && !customerId;

  const filteredCustomers = useMemo(
    () =>
      customers.filter((customer) => {
        const haystack = `${customer.name} ${customer.phone || ""} ${
          customer.gstNumber || ""
        }`.toLowerCase();
        return haystack.includes(normalizedQuery);
      }),
    [customers, normalizedQuery]
  );
  const safeHighlightedIndex = Math.min(
    highlightedIndex,
    Math.max(filteredCustomers.length - 1, 0)
  );

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function selectCustomer(customer: InvoiceCustomer) {
    onCustomerSelect(customer._id);
    setIsDropdownOpen(false);
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsDropdownOpen(true);
      setHighlightedIndex((current) =>
        filteredCustomers.length
          ? Math.min(
              Math.min(current, filteredCustomers.length - 1) + 1,
              filteredCustomers.length - 1
            )
          : 0
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsDropdownOpen(true);
      setHighlightedIndex((current) =>
        Math.max(Math.min(current, filteredCustomers.length - 1) - 1, 0)
      );
      return;
    }

    if (event.key === "Enter" && isDropdownOpen) {
      event.preventDefault();
      const highlightedCustomer = filteredCustomers[safeHighlightedIndex];
      if (highlightedCustomer) selectCustomer(highlightedCustomer);
      return;
    }

    if (event.key === "Escape") {
      setIsDropdownOpen(false);
    }
  }

  return (
    <section className="invoice-card">
      <div className="invoice-card-heading">
        <div>
          <h2>Customer</h2>
          <p>Pick the billing customer and invoice dates.</p>
        </div>

        <button type="button" className="invoice-soft-btn" onClick={onNewCustomer}>
          <Plus size={16} aria-hidden="true" />
          New customer
        </button>
      </div>

      <div className="customer-picker-row" ref={pickerRef}>
        <label className="invoice-search-label customer-search-field">
          Customer
          <span className="invoice-search-shell">
            <Search size={17} aria-hidden="true" />
            <input
              value={customerQuery}
              onChange={(event) => {
                onCustomerQueryChange(event.target.value);
                setHighlightedIndex(0);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              onClick={() => setIsDropdownOpen(true)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search customer..."
              role="combobox"
              aria-expanded={isDropdownOpen}
              aria-controls="invoice-customer-dropdown"
              aria-autocomplete="list"
              aria-activedescendant={
                isDropdownOpen && filteredCustomers[safeHighlightedIndex]
                  ? `invoice-customer-option-${filteredCustomers[safeHighlightedIndex]._id}`
                  : undefined
              }
            />
          </span>

          {isDropdownOpen && (
            <div
              id="invoice-customer-dropdown"
              className="customer-dropdown"
              role="listbox"
              aria-label="Customer search results"
            >
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer, index) => {
                  const isHighlighted = index === safeHighlightedIndex;
                  const isSelected = customerId === customer._id;

                  return (
                    <button
                      key={customer._id}
                      id={`invoice-customer-option-${customer._id}`}
                      type="button"
                      className="customer-dropdown-option"
                      role="option"
                      aria-selected={isSelected}
                      data-highlighted={isHighlighted}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onClick={() => selectCustomer(customer)}
                    >
                      <span>{customer.name}</span>
                      <small>
                        {[customer.phone, customer.gstNumber]
                          .filter(Boolean)
                          .join(" • ") || "No phone or GSTIN"}
                      </small>
                    </button>
                  );
                })
              ) : (
                <div className="customer-dropdown-empty" role="status">
                  No customers found
                </div>
              )}
            </div>
          )}
        </label>

        <button
          type="button"
          className="walk-in-option"
          aria-pressed={isWalkInSelected}
          onClick={() => {
            onWalkInToggle();
            setIsDropdownOpen(false);
          }}
        >
          Walk-in
        </button>
      </div>

      {selectedCustomer ? (
        <div className="selected-customer-panel">
          <div className="customer-avatar" aria-hidden="true">
            {initials(selectedCustomer.name)}
          </div>
          <div>
            <strong>{selectedCustomer.name}</strong>
            <span>
              GSTIN: {selectedCustomer.gstNumber || "Not provided"} • State: {selectedCustomer.state || "Not captured"}
            </span>
            <span className="ib-num">
              Outstanding: {formatMoney(selectedCustomer.totalOutstanding)}
            </span>
          </div>
          <button
            type="button"
            className="selected-customer-remove"
            aria-label="Remove customer"
            onClick={onCustomerClear}
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>
      ) : isWalkInSelected ? (
        <div className="walk-in-form">
          <label>
            Customer Name
            <input
              value={walkInCustomerName}
              onChange={(event) => onWalkInCustomerChange({ name: event.target.value })}
              placeholder="Enter customer name"
              required
            />
          </label>
          <label>
            Phone Number
            <input
              value={walkInCustomerPhone}
              onChange={(event) => onWalkInCustomerChange({ phone: event.target.value })}
              placeholder="Enter phone number"
            />
          </label>
        </div>
      ) : null}

      <InvoiceMeta
        invoiceNumber={invoiceNumber}
        invoiceDate={invoiceDate}
        dueDate={dueDate}
        onDueDateChange={onDueDateChange}
      />
    </section>
  );
}
