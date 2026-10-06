import { Plus, Search } from "lucide-react";
import { InvoiceProduct } from "@/hooks/useInvoice";

type ItemSearchProps = {
  products: InvoiceProduct[];
  quickProducts: InvoiceProduct[];
  query: string;
  highlightedIndex: number;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onQueryChange: (query: string) => void;
  onHighlight: (index: number) => void;
  onAddProduct: (product: InvoiceProduct) => void;
  onNewProduct: () => void;
};

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value || 0);

export default function ItemSearch({
  products,
  quickProducts,
  query,
  highlightedIndex,
  inputRef,
  onQueryChange,
  onHighlight,
  onAddProduct,
  onNewProduct,
}: ItemSearchProps) {
  const filteredProducts = products
    .filter((product) => {
      const haystack = `${product.name} ${product.sku || ""} ${
        product.hsnCode || ""
      } ${product.barcode || ""}`.toLowerCase();
      return query.trim() ? haystack.includes(query.toLowerCase()) : false;
    })
    .slice(0, 7);

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!filteredProducts.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      onHighlight(Math.min(highlightedIndex + 1, filteredProducts.length - 1));
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      onHighlight(Math.max(highlightedIndex - 1, 0));
    }

    if (event.key === "Enter") {
      event.preventDefault();
      onAddProduct(filteredProducts[Math.max(highlightedIndex, 0)]);
    }
  }

  return (
    <div className="item-search-block">
      <div className="item-search-topline">
        <label className="invoice-search-label">
          Product search
          <span className="invoice-search-shell">
            <Search size={17} aria-hidden="true" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => {
                onQueryChange(event.target.value);
                onHighlight(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search product, SKU or barcode"
              autoComplete="off"
            />
          </span>
        </label>

        <button type="button" className="invoice-soft-btn" onClick={onNewProduct}>
          <Plus size={16} aria-hidden="true" />
          New product
        </button>
      </div>

      {filteredProducts.length > 0 && (
        <div className="product-results" role="listbox">
          {filteredProducts.map((product, index) => (
            <button
              key={product._id}
              type="button"
              role="option"
              aria-selected={index === highlightedIndex}
              className="product-result"
              onMouseEnter={() => onHighlight(index)}
              onClick={() => onAddProduct(product)}
            >
              <span>
                <strong>{product.name}</strong>
                <small>
                  {product.sku || product.hsnCode
                    ? `${product.sku ? `${product.sku} / ` : ""}HSN ${product.hsnCode || "-"}`
                    : "HSN not available"}
                </small>
              </span>
              <span className="ib-num">{money(product.price)}</span>
              <span>Stock {product.stock}</span>
            </button>
          ))}
        </div>
      )}

      {quickProducts.length > 0 && (
        <div className="quick-add-products" aria-label="Quick add products">
          <span>Quick add</span>
          <div>
            {quickProducts.map((product) => (
              <button
                key={product._id}
                type="button"
                className="quick-add-chip"
                onClick={() => onAddProduct(product)}
              >
                {product.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
