import { Printer, RotateCcw, Save } from "lucide-react";
import { InvoiceState } from "@/hooks/useInvoice";
import { InvoiceCalculation } from "@/lib/invoiceMath";
import PaymentControls from "./PaymentControls";

type SummaryPanelProps = {
  state: InvoiceState;
  calculation: InvoiceCalculation;
  saving: boolean;
  onPaymentMethodChange: (method: InvoiceState["paymentMethod"]) => void;
  onPaidAmountChange: (amount: number) => void;
  onSave: (mode: "print" | "new" | "save") => void;
  onCancel: () => void;
};

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value || 0);

const statusLabel = {
  PAID: "Paid",
  PARTIAL: "Partial",
  PENDING: "Pending",
};

export default function SummaryPanel({
  state,
  calculation,
  saving,
  onPaymentMethodChange,
  onPaidAmountChange,
  onSave,
  onCancel,
}: SummaryPanelProps) {
  const taxLabel = state.taxMode === "inter" ? "IGST" : "CGST + SGST";
  const taxValue = state.taxMode === "inter" ? calculation.igst : calculation.cgst + calculation.sgst;

  return (
    <aside className="invoice-card summary-panel">
      <div className="invoice-card-heading compact">
        <div>
          <h2>Summary</h2>
        </div>
      </div>

      <div className="summary-lines">
        <div>
          <span>Taxable amount</span>
          <strong className="ib-num">{money(calculation.taxableAmount)}</strong>
        </div>
        <div>
          <span>{taxLabel}</span>
          <strong className="ib-num">{money(taxValue)}</strong>
        </div>
        <div>
          <span>Round off</span>
          <strong className="ib-num">
            {calculation.roundOff > 0 ? "+" : ""}{money(calculation.roundOff)}
          </strong>
        </div>
      </div>

      <div className="total-band">
        <span>Total</span>
        <strong className="ib-num">{money(calculation.total)}</strong>
      </div>

      <PaymentControls
        total={calculation.total}
        paidAmount={state.paidAmount}
        paymentMethod={state.paymentMethod}
        onPaymentMethodChange={onPaymentMethodChange}
        onPaidAmountChange={onPaidAmountChange}
      />

      <div className="payment-status-box">
        <span>Balance due</span>
        <strong className="ib-num">{money(calculation.balance)}</strong>
        <span>Status</span>
        <strong className={`status-pill status-${calculation.status.toLowerCase()}`}>
          {statusLabel[calculation.status]}
        </strong>
      </div>

      <div className="summary-actions">
        <button
          type="button"
          className="invoice-primary-action"
          disabled={saving}
          onClick={() => onSave("print")}
        >
          <Printer size={18} aria-hidden="true" />
          {saving ? "Saving..." : "Save and print"}
        </button>
        <div className="summary-secondary-actions">
          <button
            type="button"
            className="invoice-secondary-action"
            disabled={saving}
            onClick={() => onSave("new")}
          >
            <RotateCcw size={16} aria-hidden="true" />
            Save and new
          </button>
          <button
            type="button"
            className="invoice-secondary-action"
            disabled
            title="Draft storage is not supported by the current invoice backend."
          >
            <Save size={16} aria-hidden="true" />
            Save as draft
          </button>
        </div>
        <button type="button" className="invoice-tertiary-action" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </aside>
  );
}
