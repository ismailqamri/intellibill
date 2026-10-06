import { X } from "lucide-react";

export type NewCustomerForm = {
  name: string;
  phone: string;
  email: string;
  address: string;
  gstNumber: string;
};

type NewCustomerDrawerProps = {
  open: boolean;
  form: NewCustomerForm;
  saving: boolean;
  onChange: (form: NewCustomerForm) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export default function NewCustomerDrawer({
  open,
  form,
  saving,
  onChange,
  onClose,
  onSubmit,
}: NewCustomerDrawerProps) {
  if (!open) return null;

  return (
    <div className="invoice-drawer-backdrop">
      <aside className="invoice-drawer" aria-label="New customer drawer">
        <div className="drawer-heading">
          <div>
            <h2>New customer</h2>
            <p>Add a customer without leaving this invoice.</p>
          </div>
          <button type="button" aria-label="Close customer drawer" onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <form className="drawer-form" onSubmit={onSubmit}>
          <label>
            Customer name *
            <input
              value={form.name}
              onChange={(event) => onChange({ ...form, name: event.target.value })}
              required
            />
          </label>
          <label>
            Phone *
            <input
              value={form.phone}
              onChange={(event) => onChange({ ...form, phone: event.target.value })}
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => onChange({ ...form, email: event.target.value })}
            />
          </label>
          <label>
            GSTIN
            <input
              value={form.gstNumber}
              onChange={(event) => onChange({ ...form, gstNumber: event.target.value })}
            />
          </label>
          <label>
            Address
            <textarea
              rows={3}
              value={form.address}
              onChange={(event) => onChange({ ...form, address: event.target.value })}
            />
          </label>
          <div className="drawer-actions">
            <button type="button" className="invoice-tertiary-action" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="invoice-primary-action compact" disabled={saving}>
              {saving ? "Saving..." : "Save customer"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
