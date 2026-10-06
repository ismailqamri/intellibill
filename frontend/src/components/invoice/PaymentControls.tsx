import { CreditCard, IndianRupee, Landmark, Smartphone } from "lucide-react";

type PaymentControlsProps = {
  total: number;
  paidAmount: number;
  paymentMethod: "cash" | "upi" | "card" | "credit";
  onPaymentMethodChange: (method: "cash" | "upi" | "card" | "credit") => void;
  onPaidAmountChange: (amount: number) => void;
};

const methods = [
  { value: "cash", label: "Cash", icon: IndianRupee },
  { value: "upi", label: "UPI", icon: Smartphone },
  { value: "card", label: "Card", icon: CreditCard },
  { value: "credit", label: "Credit", icon: Landmark },
] as const;

export default function PaymentControls({
  total,
  paidAmount,
  paymentMethod,
  onPaymentMethodChange,
  onPaidAmountChange,
}: PaymentControlsProps) {
  const cappedPaid = Math.min(paidAmount, total);

  return (
    <div className="payment-controls">
      <div className="segmented-control" aria-label="Payment method">
        {methods.map((method) => {
          const Icon = method.icon;
          return (
            <button
              key={method.value}
              type="button"
              aria-pressed={paymentMethod === method.value}
              onClick={() => onPaymentMethodChange(method.value)}
            >
              <Icon size={15} aria-hidden="true" />
              {method.label}
            </button>
          );
        })}
      </div>

      <label>
        Amount received
        <input
          type="number"
          min="0"
          step="0.01"
          value={cappedPaid}
          disabled={paymentMethod === "credit"}
          onChange={(event) =>
            onPaidAmountChange(Math.min(Number(event.target.value) || 0, total))
          }
        />
      </label>

      <div className="quick-chip-row" aria-label="Payment presets">
        <button
          type="button"
          className="invoice-chip"
          aria-pressed={cappedPaid === total && total > 0}
          onClick={() => onPaidAmountChange(total)}
        >
          Paid in full
        </button>
        <button
          type="button"
          className="invoice-chip"
          aria-pressed={cappedPaid === Math.round(total / 2)}
          onClick={() => onPaidAmountChange(Math.round(total / 2))}
        >
          Half now
        </button>
        <button
          type="button"
          className="invoice-chip"
          aria-pressed={paymentMethod === "credit"}
          onClick={() => onPaymentMethodChange("credit")}
        >
          On credit
        </button>
      </div>
    </div>
  );
}
