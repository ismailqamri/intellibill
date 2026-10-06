import { X } from "lucide-react";

export type NewProductForm = {
  name: string;
  category: string;
  price: string;
  stock: string;
  reorderLevel: string;
  gstRate: string;
  hsnCode: string;
};

type NewProductDrawerProps = {
  open: boolean;
  form: NewProductForm;
  saving: boolean;
  onChange: (form: NewProductForm) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export default function NewProductDrawer({
  open,
  form,
  saving,
  onChange,
  onClose,
  onSubmit,
}: NewProductDrawerProps) {
  if (!open) return null;

  return (
    <div className="invoice-drawer-backdrop">
      <aside className="invoice-drawer" aria-label="New product drawer">
        <div className="drawer-heading">
          <div>
            <h2>New product</h2>
            <p>Create inventory and add it to this invoice.</p>
          </div>
          <button type="button" aria-label="Close product drawer" onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <form className="drawer-form" onSubmit={onSubmit}>
          <label>
            Product name *
            <input
              value={form.name}
              onChange={(event) => onChange({ ...form, name: event.target.value })}
              required
            />
          </label>
          <label>
            Category *
            <input
              value={form.category}
              onChange={(event) => onChange({ ...form, category: event.target.value })}
              required
            />
          </label>
          <label>
            MRP including GST *
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(event) => onChange({ ...form, price: event.target.value })}
              required
            />
          </label>
          <label>
            Opening stock
            <input
              type="number"
              min="0"
              value={form.stock}
              onChange={(event) => onChange({ ...form, stock: event.target.value })}
            />
          </label>
          <label>
            GST rate
            <select
              value={form.gstRate}
              onChange={(event) => onChange({ ...form, gstRate: event.target.value })}
            >
              <option value="0">0%</option>
              <option value="5">5%</option>
              <option value="12">12%</option>
              <option value="18">18%</option>
              <option value="28">28%</option>
            </select>
          </label>
          <label>
            Reorder level
            <input
              type="number"
              min="0"
              value={form.reorderLevel}
              onChange={(event) => onChange({ ...form, reorderLevel: event.target.value })}
            />
          </label>
          <label>
            HSN code
            <input
              value={form.hsnCode}
              onChange={(event) => onChange({ ...form, hsnCode: event.target.value })}
            />
          </label>
          <div className="drawer-actions">
            <button type="button" className="invoice-tertiary-action" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="invoice-primary-action compact" disabled={saving}>
              {saving ? "Saving..." : "Save product"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
