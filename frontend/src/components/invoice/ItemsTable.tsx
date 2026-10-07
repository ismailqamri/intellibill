import { KeyboardEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Minus, Plus, Trash2 } from "lucide-react";
import { InvoiceItem, InvoiceProduct } from "@/hooks/useInvoice";
import { InvoiceLineCalculation } from "@/lib/invoiceMath";

type ItemsTableProps = {
  products: InvoiceProduct[];
  query: string;
  highlightedIndex: number;
  inputRef: React.RefObject<HTMLInputElement | null>;
  items: InvoiceItem[];
  lines: InvoiceLineCalculation[];
  quantityRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  onQueryChange: (query: string) => void;
  onHighlight: (index: number) => void;
  onAddProduct: (product: InvoiceProduct) => void;
  onQuantityChange: (productId: string, quantity: number) => void;
  onRateChange: (productId: string, rate: number) => void;
  onIncrement: (productId: string, step: number) => void;
  onRemove: (productId: string) => void;
};

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value || 0);

export default function ItemsTable({
  products,
  query,
  highlightedIndex,
  inputRef,
  items,
  lines,
  quantityRefs,
  onQueryChange,
  onHighlight,
  onAddProduct,
  onQuantityChange,
  onRateChange,
  onIncrement,
  onRemove,
}: ItemsTableProps) {
  const searchCellRef = useRef<HTMLTableCellElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);
  const lineByProduct = new Map(lines.map((line) => [line.productId, line]));
  const stockWarnings = lines.filter((line) => line.exceedsStock);
  const trimmedQuery = query.trim().toLowerCase();
  const filteredProducts = useMemo(() => {
    if (!isProductDropdownOpen) return [];

    const matchingProducts = trimmedQuery
      ? products.filter((product) => {
          const haystack = `${product.name} ${product.sku || ""} ${product.barcode || ""}`.toLowerCase();
          return haystack.includes(trimmedQuery);
        })
      : products;

    return matchingProducts.slice(0, 50);
  }, [isProductDropdownOpen, products, trimmedQuery]);
  const safeHighlightedIndex = Math.min(
    highlightedIndex,
    Math.max(filteredProducts.length - 1, 0)
  );

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        searchCellRef.current &&
        !searchCellRef.current.contains(event.target as Node) &&
        !dropdownRef.current?.contains(event.target as Node)
      ) {
        setIsProductDropdownOpen(false);
        onHighlight(0);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [onHighlight, onQueryChange]);

  useLayoutEffect(() => {
    if (!filteredProducts.length || !inputRef.current) {
      setDropdownRect(null);
      return;
    }

    const updateDropdownRect = () => {
      setDropdownRect(inputRef.current?.getBoundingClientRect() || null);
    };

    updateDropdownRect();
    window.addEventListener("resize", updateDropdownRect);
    window.addEventListener("scroll", updateDropdownRect, true);

    return () => {
      window.removeEventListener("resize", updateDropdownRect);
      window.removeEventListener("scroll", updateDropdownRect, true);
    };
  }, [filteredProducts.length, inputRef, query]);

  function selectProduct(product: InvoiceProduct) {
    onAddProduct(product);
    onQueryChange("");
    onHighlight(0);
    setIsProductDropdownOpen(false);
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setIsProductDropdownOpen(false);
      onHighlight(0);
      return;
    }

    if (!filteredProducts.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsProductDropdownOpen(true);
      onHighlight(Math.min(safeHighlightedIndex + 1, filteredProducts.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsProductDropdownOpen(true);
      onHighlight(Math.max(safeHighlightedIndex - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      selectProduct(filteredProducts[safeHighlightedIndex]);
    }
  }

  return (
    <>
      <div className="invoice-table-scroll">
        <table className="pos-items-table">
          <colgroup>
            <col className="items-col-sl" />
            <col className="items-col-description" />
            <col className="items-col-hsn" />
            <col className="items-col-gst" />
            <col className="items-col-qty" />
            <col className="items-col-rate" />
            <col className="items-col-amount" />
          </colgroup>
          <thead>
            <tr>
              <th>Sl No.</th>
              <th>Description of Goods</th>
              <th>HSN/SAC</th>
              <th>GST Rate</th>
              <th>Quantity</th>
              <th>Rate (Incl. GST)</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
                const line = lineByProduct.get(item.productId);
                const exceedsStock = Boolean(line?.exceedsStock);

                return (
                  <tr key={item.productId}>
                    <td className="items-sl-cell ib-num">{index + 1}</td>
                    <td className="items-description-cell">
                      <div>
                        <strong>{item.productName}</strong>
                        {item.sku && <small>SKU: {item.sku}</small>}
                      </div>
                      <small className={exceedsStock ? "stock-warning-text" : ""}>
                        Stock on hand: {item.stock}
                        {exceedsStock ? " - quantity exceeds stock" : ""}
                      </small>
                      <button
                        type="button"
                        className="item-row-delete"
                        aria-label={`Remove ${item.productName}`}
                        onClick={() => onRemove(item.productId)}
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </td>
                    <td className="ib-num">{item.hsnCode || "—"}</td>
                    <td className="ib-num">{item.gstRate}%</td>
                    <td>
                      <div className="qty-stepper" aria-label={`Quantity for ${item.productName}`}>
                        <button
                          type="button"
                          aria-label={`Decrease quantity for ${item.productName}`}
                          onClick={() => onIncrement(item.productId, -1)}
                        >
                          <Minus size={14} aria-hidden="true" />
                        </button>
                        <input
                          ref={(node) => {
                            quantityRefs.current[item.productId] = node;
                          }}
                          type="number"
                          min="0"
                          value={item.quantity}
                          onChange={(event) =>
                            onQuantityChange(item.productId, Number(event.target.value))
                          }
                        />
                        <button
                          type="button"
                          aria-label={`Increase quantity for ${item.productName}`}
                          onClick={() => onIncrement(item.productId, 1)}
                        >
                          <Plus size={14} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                    <td>
                      <input
                        className="line-rate-input ib-num"
                        type="number"
                        min="0"
                        step="0.01"
                        value={Number.isFinite(item.rate) ? item.rate : 0}
                        aria-label={`Rate including GST for ${item.productName}`}
                        onChange={(event) =>
                          onRateChange(item.productId, Number(event.target.value))
                        }
                      />
                    </td>
                    <td className="ib-num">{money(line?.lineAmount || 0)}</td>
                  </tr>
                );
              })}
            <tr className="item-entry-row">
              <td className="items-sl-cell ib-num">{items.length + 1}</td>
              <td className="items-description-cell item-search-cell" ref={searchCellRef}>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => {
                    onQueryChange(event.target.value);
                    onHighlight(0);
                    setIsProductDropdownOpen(true);
                  }}
                  onFocus={() => setIsProductDropdownOpen(true)}
                  onClick={() => setIsProductDropdownOpen(true)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder={items.length ? "Search product..." : "Search product..."}
                  aria-label="Search product in description of goods"
                  role="combobox"
                  aria-expanded={filteredProducts.length > 0}
                  aria-controls="invoice-product-dropdown"
                  aria-autocomplete="list"
                  autoComplete="off"
                />
                {filteredProducts.length > 0 &&
                  dropdownRect &&
                  createPortal(
                    <div
                      id="invoice-product-dropdown"
                      ref={dropdownRef}
                      className="sales-product-dropdown"
                      role="listbox"
                      aria-label="Product search results"
                      style={{
                        position: "fixed",
                        top: dropdownRect.bottom + 6,
                        left: Math.min(
                          Math.max(dropdownRect.left, 16),
                          Math.max(window.innerWidth - Math.max(dropdownRect.width, 420) - 16, 16)
                        ),
                        width: Math.min(Math.max(dropdownRect.width, 420), window.innerWidth - 32),
                      }}
                    >
                      {filteredProducts.map((product, index) => (
                        <button
                          key={product._id}
                          type="button"
                          role="option"
                          aria-selected={index === safeHighlightedIndex}
                          data-highlighted={index === safeHighlightedIndex}
                          onMouseEnter={() => onHighlight(index)}
                          onClick={() => selectProduct(product)}
                        >
                          <span className="sales-product-option-main">
                            <strong>{product.name}</strong>
                            <span className="ib-num">{money(product.price)}</span>
                          </span>
                          <small>{product.hsnCode ? `HSN: ${product.hsnCode}` : "HSN/SAC not provided"}</small>
                        </button>
                      ))}
                    </div>,
                    document.body
                  )}
                {!items.length && !query && (
                  <small className="entry-row-helper">
                    Type in Description of Goods to add the first product.
                  </small>
                )}
              </td>
              <td />
              <td />
              <td />
              <td />
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      {stockWarnings.length > 0 && (
        <div className="stock-warning-banner" role="status">
          {stockWarnings.length} item{stockWarnings.length > 1 ? "s" : ""} exceed
          available stock. The backend currently rejects invoices that exceed stock,
          so adjust quantities before saving.
        </div>
      )}
    </>
  );
}
