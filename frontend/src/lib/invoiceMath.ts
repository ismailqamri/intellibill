export type TaxMode = "intra" | "inter";

export type PaymentStatus = "PAID" | "PARTIAL" | "PENDING";

export type InvoiceMathLine = {
  productId: string;
  productName: string;
  quantity: number;
  rate: number;
  gstRate: number;
  stock?: number;
};

export type InvoiceLineCalculation = InvoiceMathLine & {
  lineAmount: number;
  taxable: number;
  gst: number;
  cgst: number;
  sgst: number;
  igst: number;
  exceedsStock: boolean;
};

export type TaxGroup = {
  gstRate: number;
  taxable: number;
  gst: number;
  cgst: number;
  sgst: number;
  igst: number;
};

export type InvoiceCalculation = {
  lines: InvoiceLineCalculation[];
  taxGroups: TaxGroup[];
  taxableAmount: number;
  totalTax: number;
  cgst: number;
  sgst: number;
  igst: number;
  sumLineAmounts: number;
  total: number;
  roundOff: number;
  paid: number;
  balance: number;
  status: PaymentStatus;
  hasStockWarning: boolean;
};

const toPaise = (value: number) =>
  Math.round((Number(value) + Number.EPSILON) * 100);

const fromPaise = (value: number) => value / 100;

const addMoney = (values: number[]) =>
  fromPaise(values.reduce((sum, value) => sum + toPaise(value), 0));

export function roundMoney(value: number) {
  return fromPaise(toPaise(value));
}

export function calculateInvoice(
  items: InvoiceMathLine[],
  options: { taxMode?: TaxMode; amountReceived?: number } = {}
): InvoiceCalculation {
  const taxMode = options.taxMode || "intra";

  const lines = items.map((item) => {
    const quantity = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    const gstRate = Number(item.gstRate) || 0;
    const lineAmount = roundMoney(rate * quantity);
    const taxable =
      gstRate > 0
        ? roundMoney(lineAmount / (1 + gstRate / 100))
        : lineAmount;
    const gst = roundMoney(lineAmount - taxable);
    const cgst = taxMode === "intra" ? roundMoney(gst / 2) : 0;
    const sgst = taxMode === "intra" ? roundMoney(gst - cgst) : 0;
    const igst = taxMode === "inter" ? gst : 0;

    return {
      ...item,
      quantity,
      rate,
      gstRate,
      lineAmount,
      taxable,
      gst,
      cgst,
      sgst,
      igst,
      exceedsStock:
        typeof item.stock === "number" && quantity > item.stock,
    };
  });

  const taxGroups = Array.from(
    lines
      .reduce((groups, line) => {
        const current = groups.get(line.gstRate) || {
          gstRate: line.gstRate,
          taxable: 0,
          gst: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
        };

        groups.set(line.gstRate, {
          gstRate: line.gstRate,
          taxable: addMoney([current.taxable, line.taxable]),
          gst: addMoney([current.gst, line.gst]),
          cgst: addMoney([current.cgst, line.cgst]),
          sgst: addMoney([current.sgst, line.sgst]),
          igst: addMoney([current.igst, line.igst]),
        });

        return groups;
      }, new Map<number, TaxGroup>())
      .values()
  ).sort((a, b) => a.gstRate - b.gstRate);

  const taxableAmount = addMoney(lines.map((line) => line.taxable));
  const totalTax = addMoney(lines.map((line) => line.gst));
  const cgst = addMoney(lines.map((line) => line.cgst));
  const sgst = addMoney(lines.map((line) => line.sgst));
  const igst = addMoney(lines.map((line) => line.igst));
  const sumLineAmounts = addMoney(lines.map((line) => line.lineAmount));
  const total = Math.round(sumLineAmounts);
  const roundOff = roundMoney(total - sumLineAmounts);
  const paid = Math.min(
    Math.max(roundMoney(Number(options.amountReceived) || 0), 0),
    total
  );
  const balance = roundMoney(Math.max(total - paid, 0));
  const status: PaymentStatus =
    balance === 0 && total > 0
      ? "PAID"
      : paid > 0 && balance > 0
        ? "PARTIAL"
        : "PENDING";

  return {
    lines,
    taxGroups,
    taxableAmount,
    totalTax,
    cgst,
    sgst,
    igst,
    sumLineAmounts,
    total,
    roundOff,
    paid,
    balance,
    status,
    hasStockWarning: lines.some((line) => line.exceedsStock),
  };
}
