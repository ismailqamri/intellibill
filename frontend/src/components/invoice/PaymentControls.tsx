import { useState } from "react";
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

const roundMoney = (value: number) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export default function PaymentControls({
  total,
  paidAmount,
  paymentMethod,
  onPaymentMethodChange,
  onPaidAmountChange,
}: PaymentControlsProps) {
  const cappedPaid = Math.min(paidAmount, total);
  const [amountInput, setAmountInput] = useState(String(cappedPaid));
  const [isAmountFocused, setIsAmountFocused] = useState(false);
  const displayedAmount = isAmountFocused ? amountInput : String(cappedPaid);

  function updatePaidAmount(value: string) {
    setAmountInput(value);

    if (value === "") {
      onPaidAmountChange(0);
      return;
    }

    const nextAmount = Math.min(Math.max(Number(value) || 0, 0), total);
    onPaidAmountChange(nextAmount);

    if (nextAmount !== Number(value)) {
      setAmountInput(String(nextAmount));
    }
  }

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
          value={displayedAmount}
          onFocus={() => {
            setIsAmountFocused(true);
            setAmountInput(cappedPaid === 0 ? "" : String(cappedPaid));
          }}
          onBlur={() => {
            setIsAmountFocused(false);
            if (amountInput === "") setAmountInput("0");
          }}
          onChange={(event) => updatePaidAmount(event.target.value)}
        />
      </label>

      <div className="quick-payment-options" aria-label="Payment presets">
        <button
          type="button"
          aria-pressed={cappedPaid === total && total > 0}
          onClick={() => {
            setAmountInput(String(total));
            onPaidAmountChange(total);
          }}
        >
          Paid in full
        </button>
        <button
          type="button"
          aria-pressed={cappedPaid === roundMoney(total / 2) && total > 0}
          onClick={() => {
            const halfTotal = roundMoney(total / 2);
            setAmountInput(String(halfTotal));
            onPaidAmountChange(halfTotal);
          }}
        >
          Half now
        </button>
        <button
          type="button"
          aria-pressed={paymentMethod === "credit" && cappedPaid === 0}
          onClick={() => {
            onPaymentMethodChange("credit");
            setAmountInput("0");
            onPaidAmountChange(0);
          }}
        >
          On credit
        </button>
      </div>
    </div>
  );
}
