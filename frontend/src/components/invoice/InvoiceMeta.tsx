type InvoiceMetaProps = {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  taxModeLabel: string;
  onDueDateChange: (dueDate: string) => void;
};

const addDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const formatDisplayDate = (dateValue: string) => {
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateValue;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

export default function InvoiceMeta({
  invoiceNumber,
  invoiceDate,
  dueDate,
  taxModeLabel,
  onDueDateChange,
}: InvoiceMetaProps) {
  const presets = [
    { label: "Today", value: addDays(0) },
    { label: "+7", value: addDays(7) },
    { label: "+15", value: addDays(15) },
    { label: "+30", value: addDays(30) },
  ];

  return (
    <div className="invoice-meta-strip">
      <div className="meta-readout">
        <span>Invoice</span>
        <strong>{invoiceNumber}</strong>
      </div>

      <div className="meta-readout">
        <span>Invoice Date</span>
        <strong>{formatDisplayDate(invoiceDate)}</strong>
      </div>

      <div className="tax-mode-text">{taxModeLabel}</div>

      <label className="due-date-control">
        Due date
        <input
          type="date"
          value={dueDate}
          onChange={(event) => onDueDateChange(event.target.value)}
        />
      </label>

      <div className="due-presets" aria-label="Due date presets">
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className="invoice-chip compact"
            aria-pressed={dueDate === preset.value}
            onClick={() => onDueDateChange(preset.value)}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
