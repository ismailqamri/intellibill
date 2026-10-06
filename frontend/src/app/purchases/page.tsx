"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  FileText,
  Package,
  Plus,
  RefreshCw,
  Receipt,
  Search,
  Trash2,
  Truck,
  X,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

type Supplier = {
  _id: string;
  name: string;
  phone?: string;
  whatsappNumber?: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  creditDays?: number;
  notes?: string;
  isActive?: boolean;
};

type Product = {
  _id: string;
  name: string;
  category?: string;
  price: number;
  stock: number;
  reorderLevel?: number;
  supplier?: string;
  gstRate?: number;
  hsnCode?: string;
};

type PurchaseItem = {
  product: string;
  productName: string;
  quantity: number;
  rate: number;
  discountPercent: number;
  discountAmount: number;
  gstRate: number;
  amount: number;
  hsnCode: string;
};

type Purchase = {
  _id: string;
  supplier?: Supplier;
  billNumber: string;
  purchaseDate?: string;
  items: PurchaseItem[];
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  roundOff?: number;
  grandTotal: number;
  paidAmount: number;
  creditUsed?: number;
  balanceAmount: number;
  paymentStatus: string;
  dueDate?: string;
  notes?: string;
};

type PaymentMethod = "cash" | "upi" | "bank" | "card";

function formatCurrency(value: number | undefined) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value?: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function statusClass(status?: string) {
  switch (status) {
    case "PAID":
      return "purchases-status purchases-status-paid";
    case "PARTIAL":
      return "purchases-status purchases-status-partial";
    case "PENDING":
      return "purchases-status purchases-status-pending";
    default:
      return "purchases-status";
  }
}

export default function PurchasesPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [creatingSupplier, setCreatingSupplier] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [showNewSupplier, setShowNewSupplier] = useState(false);

  const [search, setSearch] = useState("");

  // =====================================================
  // PURCHASE DETAILS
  // =====================================================

  const [supplierId, setSupplierId] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(getToday());
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  // =====================================================
  // EXISTING PRODUCT ITEM
  // =====================================================

  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [rate, setRate] = useState("");
  const [discountPercent, setDiscountPercent] = useState("0");
  const [gstRate, setGstRate] = useState("18");
  const [hsnCode, setHsnCode] = useState("");

  const [items, setItems] = useState<PurchaseItem[]>([]);

  // =====================================================
  // ROUND OFF
  // =====================================================

  const [roundOff, setRoundOff] = useState("");

  // =====================================================
  // PAYMENT
  // =====================================================

  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("cash");
  const [paymentReference, setPaymentReference] = useState("");

  // =====================================================
  // NEW SUPPLIER
  // =====================================================

  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierPhone, setNewSupplierPhone] = useState("");
  const [newSupplierWhatsapp, setNewSupplierWhatsapp] = useState("");
  const [newSupplierEmail, setNewSupplierEmail] = useState("");
  const [newSupplierAddress, setNewSupplierAddress] = useState("");
  const [newSupplierGST, setNewSupplierGST] = useState("");
  const [newSupplierCreditDays, setNewSupplierCreditDays] = useState("0");
  const [newSupplierNotes, setNewSupplierNotes] = useState("");

  // =====================================================
  // NEW PRODUCT
  // =====================================================

  const [newProductName, setNewProductName] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("");
  const [newProductMRP, setNewProductMRP] = useState("");
  const [newProductPurchaseRate, setNewProductPurchaseRate] =
    useState("");
  const [newProductQuantity, setNewProductQuantity] = useState("1");
  const [newProductDiscount, setNewProductDiscount] = useState("0");
  const [newProductGST, setNewProductGST] = useState("18");
  const [newProductHSN, setNewProductHSN] = useState("");
  const [newProductReorder, setNewProductReorder] = useState("10");

  // =====================================================
  // VIEW PURCHASE
  // =====================================================

  const [viewPurchase, setViewPurchase] =
    useState<Purchase | null>(null);

  // =====================================================
  // FETCH DATA
  // =====================================================

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Authentication token not found.");
      }

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [
        supplierResponse,
        productResponse,
        purchaseResponse,
      ] = await Promise.all([
        fetch(`${API_URL}/suppliers`, { headers }),
        fetch(`${API_URL}/products`, { headers }),
        fetch(`${API_URL}/purchases`, { headers }),
      ]);

      const [
        supplierData,
        productData,
        purchaseData,
      ] = await Promise.all([
        supplierResponse.json(),
        productResponse.json(),
        purchaseResponse.json(),
      ]);

      if (!supplierResponse.ok || !supplierData.success) {
        throw new Error(
          supplierData.message || "Failed to load suppliers."
        );
      }

      if (!productResponse.ok || !productData.success) {
        throw new Error(
          productData.message || "Failed to load products."
        );
      }

      if (!purchaseResponse.ok || !purchaseData.success) {
        throw new Error(
          purchaseData.message || "Failed to load purchases."
        );
      }

      setSuppliers(supplierData.suppliers || []);
      setProducts(productData.products || []);
      setPurchases(purchaseData.purchases || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load purchase data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // =====================================================
  // SELECTED SUPPLIER
  // =====================================================

  const selectedSupplier = useMemo(
    () =>
      suppliers.find(
        (supplier) => supplier._id === supplierId
      ),
    [suppliers, supplierId]
  );

  // =====================================================
  // FILTER PURCHASES
  // =====================================================

  const filteredPurchases = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return purchases;

    return purchases.filter((purchase) => {
      return (
        purchase.billNumber?.toLowerCase().includes(query) ||
        purchase.supplier?.name?.toLowerCase().includes(query) ||
        purchase.supplier?.phone?.toLowerCase().includes(query) ||
        purchase.paymentStatus?.toLowerCase().includes(query)
      );
    });
  }, [purchases, search]);

  // =====================================================
  // KPI
  // =====================================================

  const totalPurchases = purchases.length;

  const purchaseValue = useMemo(
    () =>
      purchases.reduce(
        (total, purchase) =>
          total + Number(purchase.grandTotal || 0),
        0
      ),
    [purchases]
  );

  const totalPaid = useMemo(
    () =>
      purchases.reduce(
        (total, purchase) =>
          total + Number(purchase.paidAmount || 0),
        0
      ),
    [purchases]
  );

  const totalOutstanding = useMemo(
    () =>
      purchases.reduce(
        (total, purchase) =>
          total + Number(purchase.balanceAmount || 0),
        0
      ),
    [purchases]
  );

  // =====================================================
  // PURCHASE CALCULATIONS
  // =====================================================

  const taxableAmount = useMemo(
    () =>
      items.reduce(
        (total, item) =>
          total + Number(item.amount || 0),
        0
      ),
    [items]
  );

  const totalTax = useMemo(
    () =>
      items.reduce((total, item) => {
        const amount = Number(item.amount || 0);
        const tax =
          amount * (Number(item.gstRate || 0) / 100);

        return total + tax;
      }, 0),
    [items]
  );

  const cgst =
    Math.round((totalTax / 2) * 100) / 100;

  const sgst =
    Math.round((totalTax - cgst) * 100) / 100;

  const beforeRoundOff =
    Math.round(
      (taxableAmount + totalTax) * 100
    ) / 100;

  const manualRoundOff =
    roundOff === "" ? 0 : Number(roundOff) || 0;

  const calculatedGrandTotal =
    Math.round(
      (beforeRoundOff + manualRoundOff) * 100
    ) / 100;

  const paid = Math.max(
    Number(paidAmount) || 0,
    0
  );

  const balance = Math.max(
    calculatedGrandTotal - paid,
    0
  );

  // =====================================================
  // RESET NEW SUPPLIER FORM
  // =====================================================

  const resetNewSupplierForm = () => {
    setNewSupplierName("");
    setNewSupplierPhone("");
    setNewSupplierWhatsapp("");
    setNewSupplierEmail("");
    setNewSupplierAddress("");
    setNewSupplierGST("");
    setNewSupplierCreditDays("0");
    setNewSupplierNotes("");
  };

  // =====================================================
  // RESET NEW PRODUCT FORM
  // =====================================================

  const resetNewProductForm = () => {
    setNewProductName("");
    setNewProductCategory("");
    setNewProductMRP("");
    setNewProductPurchaseRate("");
    setNewProductQuantity("1");
    setNewProductDiscount("0");
    setNewProductGST("18");
    setNewProductHSN("");
    setNewProductReorder("10");
  };

  // =====================================================
  // RESET PURCHASE FORM
  // =====================================================

  const resetForm = () => {
    setSupplierId("");
    setBillNumber("");
    setPurchaseDate(getToday());
    setDueDate("");
    setNotes("");

    setSelectedProduct("");
    setQuantity("1");
    setRate("");
    setDiscountPercent("0");
    setGstRate("18");
    setHsnCode("");

    setItems([]);

    setRoundOff("");

    setPaidAmount("");
    setPaymentMethod("cash");
    setPaymentReference("");

    resetNewSupplierForm();
    resetNewProductForm();

    setError("");
    setSuccess("");
  };

  const closeForm = () => {
    if (
      saving ||
      creatingProduct ||
      creatingSupplier
    ) {
      return;
    }

    resetForm();
    setShowForm(false);
    setShowNewProduct(false);
    setShowNewSupplier(false);
  };

  // =====================================================
  // EXISTING PRODUCT SELECT
  // =====================================================

  const handleProductChange = (productId: string) => {
    setSelectedProduct(productId);

    const product = products.find(
      (item) => item._id === productId
    );

    if (!product) {
      setRate("");
      setDiscountPercent("0");
      setGstRate("18");
      setHsnCode("");
      return;
    }

    setRate(String(product.price ?? 0));
    setDiscountPercent("0");
    setGstRate(String(product.gstRate ?? 18));
    setHsnCode(product.hsnCode || "");
  };

  // =====================================================
  // CREATE NEW SUPPLIER
  // =====================================================

  const createNewSupplier = async () => {
    try {
      setCreatingSupplier(true);
      setError("");
      setSuccess("");

      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error(
          "Authentication token not found."
        );
      }

      if (!newSupplierName.trim()) {
        throw new Error(
          "Please enter the supplier name."
        );
      }

      if (!newSupplierPhone.trim()) {
        throw new Error(
          "Please enter the supplier phone number."
        );
      }

      const creditDays =
        Number(newSupplierCreditDays);

      if (
        !Number.isFinite(creditDays) ||
        creditDays < 0
      ) {
        throw new Error(
          "Credit days cannot be negative."
        );
      }

      const response = await fetch(
        `${API_URL}/suppliers`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: newSupplierName.trim(),
            phone: newSupplierPhone.trim(),
            whatsappNumber:
              newSupplierWhatsapp.trim(),
            email:
              newSupplierEmail.trim(),
            address:
              newSupplierAddress.trim(),
            gstNumber:
              newSupplierGST.trim(),
            creditDays,
            notes:
              newSupplierNotes.trim(),
            isActive: true,
          }),
        }
      );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Failed to create supplier."
        );
      }

      const createdSupplier: Supplier =
        data.supplier;

      if (!createdSupplier?._id) {
        throw new Error(
          "Supplier was created but its ID was not returned."
        );
      }

      // Add supplier to current list
      setSuppliers((current) => [
        createdSupplier,
        ...current,
      ]);

      // Automatically select supplier
      setSupplierId(
        createdSupplier._id
      );

      resetNewSupplierForm();

      setShowNewSupplier(false);

      setSuccess(
        "New supplier created and selected for this purchase."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create supplier."
      );
    } finally {
      setCreatingSupplier(false);
    }
  };

  // =====================================================
  // CREATE NEW PRODUCT + ADD TO PURCHASE
  // =====================================================

  const createNewProduct = async () => {
    try {
      setCreatingProduct(true);
      setError("");
      setSuccess("");

      const token =
        localStorage.getItem("token");

      if (!token) {
        throw new Error(
          "Authentication token not found."
        );
      }

      if (!newProductName.trim()) {
        throw new Error(
          "Please enter the product name."
        );
      }

      if (!newProductCategory.trim()) {
        throw new Error(
          "Please enter the product category."
        );
      }

      const mrp =
        Number(newProductMRP);

      if (
        !Number.isFinite(mrp) ||
        mrp < 0
      ) {
        throw new Error(
          "Please enter a valid MRP / selling price."
        );
      }

      const purchaseRate =
        Number(newProductPurchaseRate);

      if (
        !Number.isFinite(
          purchaseRate
        ) ||
        purchaseRate < 0
      ) {
        throw new Error(
          "Please enter a valid purchase rate."
        );
      }

      const productQuantity =
        Number(newProductQuantity);

      if (
        !Number.isFinite(
          productQuantity
        ) ||
        productQuantity <= 0
      ) {
        throw new Error(
          "Purchase quantity must be greater than zero."
        );
      }

      const discount =
        Number(newProductDiscount);

      if (
        !Number.isFinite(discount) ||
        discount < 0 ||
        discount > 100
      ) {
        throw new Error(
          "Discount must be between 0% and 100%."
        );
      }

      const gst =
        Number(newProductGST);

      if (
        !Number.isFinite(gst) ||
        gst < 0
      ) {
        throw new Error(
          "GST rate cannot be negative."
        );
      }

      const reorder =
        Number(newProductReorder);

      if (
        !Number.isFinite(
          reorder
        ) ||
        reorder < 0
      ) {
        throw new Error(
          "Reorder level cannot be negative."
        );
      }

      // ---------------------------------------------------
      // CREATE PRODUCT IN PRODUCT MASTER
      // ---------------------------------------------------

      const response =
        await fetch(
          `${API_URL}/products`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Authorization:
                `Bearer ${token}`,
            },
            body: JSON.stringify({
              name:
                newProductName.trim(),

              category:
                newProductCategory.trim(),

              // Product.price = MRP / selling price
              price: mrp,

              // Purchase will add stock
              stock: 0,

              reorderLevel:
                reorder,

              supplier:
                selectedSupplier?.name ||
                "",

              gstRate: gst,

              hsnCode:
                newProductHSN.trim(),
            }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Failed to create product."
        );
      }

      const createdProduct: Product =
        data.product;

      if (!createdProduct?._id) {
        throw new Error(
          "Product was created but its ID was not returned."
        );
      }

      // ---------------------------------------------------
      // CALCULATE PURCHASE ITEM
      // ---------------------------------------------------

      const grossAmount =
        productQuantity *
        purchaseRate;

      const discountAmount =
        grossAmount *
        (discount / 100);

      const taxableLineAmount =
        grossAmount -
        discountAmount;

      const roundedDiscount =
        Math.round(
          discountAmount * 100
        ) / 100;

      const roundedTaxable =
        Math.round(
          taxableLineAmount * 100
        ) / 100;

      const newPurchaseItem: PurchaseItem =
        {
          product:
            createdProduct._id,

          productName:
            createdProduct.name,

          quantity:
            productQuantity,

          rate:
            purchaseRate,

          discountPercent:
            discount,

          discountAmount:
            roundedDiscount,

          gstRate:
            gst,

          amount:
            roundedTaxable,

          hsnCode:
            newProductHSN.trim() ||
            createdProduct.hsnCode ||
            "",
        };

      // Add product to local list
      setProducts((current) => [
        createdProduct,
        ...current,
      ]);

      // Add product directly to purchase
      setItems((current) => [
        ...current,
        newPurchaseItem,
      ]);

      resetNewProductForm();

      setShowNewProduct(false);

      setSuccess(
        "New product created and added to this purchase."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create product."
      );
    } finally {
      setCreatingProduct(false);
    }
  };

  // =====================================================
  // ADD EXISTING PRODUCT ITEM
  // =====================================================

  const addItem = () => {
    setError("");

    if (!selectedProduct) {
      setError(
        "Please select a product."
      );
      return;
    }

    const product =
      products.find(
        (item) =>
          item._id === selectedProduct
      );

    if (!product) {
      setError(
        "Selected product was not found."
      );
      return;
    }

    const itemQuantity =
      Number(quantity);

    const itemRate =
      Number(rate);

    const itemDiscount =
      Number(discountPercent);

    const itemGstRate =
      Number(gstRate);

    if (
      !Number.isFinite(
        itemQuantity
      ) ||
      itemQuantity <= 0
    ) {
      setError(
        "Quantity must be greater than zero."
      );
      return;
    }

    if (
      !Number.isFinite(itemRate) ||
      itemRate < 0
    ) {
      setError(
        "Purchase rate cannot be negative."
      );
      return;
    }

    if (
      !Number.isFinite(
        itemDiscount
      ) ||
      itemDiscount < 0 ||
      itemDiscount > 100
    ) {
      setError(
        "Discount must be between 0% and 100%."
      );
      return;
    }

    if (
      !Number.isFinite(
        itemGstRate
      ) ||
      itemGstRate < 0
    ) {
      setError(
        "GST rate cannot be negative."
      );
      return;
    }

    const grossAmount =
      itemQuantity *
      itemRate;

    const discountAmount =
      grossAmount *
      (itemDiscount / 100);

    const taxableLineAmount =
      grossAmount -
      discountAmount;

    const roundedDiscount =
      Math.round(
        discountAmount * 100
      ) / 100;

    const roundedTaxable =
      Math.round(
        taxableLineAmount * 100
      ) / 100;

    const newItem: PurchaseItem = {
      product:
        product._id,

      productName:
        product.name,

      quantity:
        itemQuantity,

      rate:
        itemRate,

      discountPercent:
        itemDiscount,

      discountAmount:
        roundedDiscount,

      gstRate:
        itemGstRate,

      amount:
        roundedTaxable,

      hsnCode:
        hsnCode ||
        product.hsnCode ||
        "",
    };

    setItems((current) => [
      ...current,
      newItem,
    ]);

    setSelectedProduct("");
    setQuantity("1");
    setRate("");
    setDiscountPercent("0");
    setGstRate("18");
    setHsnCode("");
  };

  // =====================================================
  // REMOVE ITEM
  // =====================================================

  const removeItem = (
    index: number
  ) => {
    setItems((current) =>
      current.filter(
        (_, itemIndex) =>
          itemIndex !== index
      )
    );
  };

  // =====================================================
  // SAVE PURCHASE
  // =====================================================

  const handleSavePurchase =
    async () => {
      try {
        setSaving(true);
        setError("");
        setSuccess("");

        const token =
          localStorage.getItem(
            "token"
          );

        if (!token) {
          throw new Error(
            "Authentication token not found."
          );
        }

        if (!supplierId) {
          throw new Error(
            "Please select a supplier."
          );
        }

        if (!billNumber.trim()) {
          throw new Error(
            "Please enter the supplier bill number."
          );
        }

        if (!purchaseDate) {
          throw new Error(
            "Please select a purchase date."
          );
        }

        if (items.length === 0) {
          throw new Error(
            "Please add at least one product."
          );
        }

        if (
          calculatedGrandTotal <= 0
        ) {
          throw new Error(
            "Purchase total must be greater than zero."
          );
        }

        if (
          paid >
          calculatedGrandTotal
        ) {
          throw new Error(
            "Paid amount cannot be greater than the purchase total."
          );
        }

        const payments =
          paid > 0
            ? [
                {
                  amount:
                    paid,

                  method:
                    paymentMethod,

                  reference:
                    paymentReference.trim(),
                },
              ]
            : [];

        const payload = {
          supplier:
            supplierId,

          billNumber:
            billNumber.trim(),

          purchaseDate,

          items:
            items.map(
              (item) => ({
                product:
                  item.product,

                productName:
                  item.productName,

                quantity:
                  item.quantity,

                rate:
                  item.rate,

                discountPercent:
                  item.discountPercent,

                discountAmount:
                  item.discountAmount,

                gstRate:
                  item.gstRate,

                amount:
                  item.amount,

                hsnCode:
                  item.hsnCode,
              })
            ),

          taxableAmount:
            Number(
              taxableAmount.toFixed(2)
            ),

          cgst:
            Number(
              cgst.toFixed(2)
            ),

          sgst:
            Number(
              sgst.toFixed(2)
            ),

          igst: 0,

          totalTax:
            Number(
              totalTax.toFixed(2)
            ),

          roundOff:
            Number(
              manualRoundOff.toFixed(2)
            ),

          grandTotal:
            Number(
              calculatedGrandTotal.toFixed(
                2
              )
            ),

          payments,

          dueDate:
            dueDate ||
            undefined,

          notes:
            notes.trim(),
        };

        const response =
          await fetch(
            `${API_URL}/purchases`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${token}`,
              },

              body:
                JSON.stringify(
                  payload
                ),
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              "Failed to create purchase."
          );
        }

        setSuccess(
          "Purchase created successfully and inventory stock updated."
        );

        await fetchData();

        resetForm();
        setShowForm(false);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to create purchase."
        );
      } finally {
        setSaving(false);
      }
    };

  // =====================================================
  // VIEW PURCHASE
  // =====================================================

  const openPurchase =
    async (
      purchaseId: string
    ) => {
      try {
        setError("");

        const token =
          localStorage.getItem(
            "token"
          );

        if (!token) {
          throw new Error(
            "Authentication token not found."
          );
        }

        const response =
          await fetch(
            `${API_URL}/purchases/${purchaseId}`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              "Unable to load purchase."
          );
        }

        setViewPurchase(
          data.purchase
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load purchase."
        );
      }
    };

  // =====================================================
  // UI
  // =====================================================

  return (
    <main className="purchases-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="purchases-header">

        <div>

          <div className="purchases-eyebrow">
            <Package size={15} />
            Purchase Management
          </div>

          <h1>
            Purchases
          </h1>

          <p>
            Record supplier purchases,
            manage payments and keep
            inventory updated.
          </p>

        </div>

        <div className="purchases-header-actions">

          <button
            type="button"
            className="purchases-refresh-btn"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw
              size={16}
              className={
                loading
                  ? "purchases-spin"
                  : ""
              }
            />

            Refresh
          </button>

          <button
            type="button"
            className="purchases-primary-btn"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            <Plus size={17} />
            New Purchase
          </button>

        </div>

      </div>

      {/* =================================================
          ALERTS
      ================================================= */}

      {error && (
        <div className="purchases-alert purchases-alert-error">

          <strong>
            Error:
          </strong>

          <span>
            {error}
          </span>

          <button
            type="button"
            onClick={() =>
              setError("")
            }
            aria-label="Close error"
          >
            <X size={16} />
          </button>

        </div>
      )}

      {success && (
        <div className="purchases-alert purchases-alert-success">

          <strong>
            Success:
          </strong>

          <span>
            {success}
          </span>

          <button
            type="button"
            onClick={() =>
              setSuccess("")
            }
            aria-label="Close success"
          >
            <X size={16} />
          </button>

        </div>
      )}

      {/* =================================================
          KPI
      ================================================= */}

      <section className="purchases-kpi-grid">

        <div className="purchases-kpi-card">

          <div className="purchases-kpi-icon">
            <Receipt size={19} />
          </div>

          <div>

            <span>
              Total Purchases
            </span>

            <strong>
              {totalPurchases}
            </strong>

            <small>
              Purchase records
            </small>

          </div>

        </div>

        <div className="purchases-kpi-card">

          <div className="purchases-kpi-icon">
            <Package size={19} />
          </div>

          <div>

            <span>
              Purchase Value
            </span>

            <strong>
              {formatCurrency(
                purchaseValue
              )}
            </strong>

            <small>
              Total purchase value
            </small>

          </div>

        </div>

        <div className="purchases-kpi-card">

          <div className="purchases-kpi-icon">
            <Truck size={19} />
          </div>

          <div>

            <span>
              Paid Amount
            </span>

            <strong>
              {formatCurrency(
                totalPaid
              )}
            </strong>

            <small>
              Amount paid to suppliers
            </small>

          </div>

        </div>

        <div className="purchases-kpi-card purchases-kpi-highlight">

          <div className="purchases-kpi-icon">
            <FileText size={19} />
          </div>

          <div>

            <span>
              Outstanding
            </span>

            <strong>
              {formatCurrency(
                totalOutstanding
              )}
            </strong>

            <small>
              Supplier balance
            </small>

          </div>

        </div>

      </section>

      {/* =================================================
          SEARCH
      ================================================= */}

      <section className="purchases-toolbar">

        <div className="purchases-search">

          <Search size={17} />

          <input
            type="text"
            placeholder="Search bill number, supplier or status..."
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
          />

        </div>

        <div className="purchases-toolbar-count">
          {filteredPurchases.length} records
        </div>

      </section>

      {/* =================================================
          HISTORY
      ================================================= */}

      <section className="purchases-table-card">

        <div className="purchases-table-heading">

          <div>

            <h2>
              Purchase History
            </h2>

            <p>
              Supplier purchases and
              payment status.
            </p>

          </div>

          <span>
            {filteredPurchases.length} purchases
          </span>

        </div>

        {loading ? (
          <div className="purchases-loading">

            <RefreshCw
              size={22}
              className="purchases-spin"
            />

            <span>
              Loading purchases...
            </span>

          </div>
        ) : (
          <div className="purchases-table-wrap">

            <table className="purchases-table">

              <thead>

                <tr>
                  <th>
                    Bill Number
                  </th>

                  <th>
                    Date
                  </th>

                  <th>
                    Supplier
                  </th>

                  <th>
                    Total
                  </th>

                  <th>
                    Paid
                  </th>

                  <th>
                    Balance
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Action
                  </th>
                </tr>

              </thead>

              <tbody>

                {filteredPurchases.length ===
                0 ? (
                  <tr>

                    <td colSpan={8}>

                      <div className="purchases-empty">

                        <Package size={28} />

                        <strong>
                          No purchases found
                        </strong>

                        <span>
                          Create your first
                          purchase to get
                          started.
                        </span>

                      </div>

                    </td>

                  </tr>
                ) : (
                  filteredPurchases.map(
                    (purchase) => (
                      <tr
                        key={
                          purchase._id
                        }
                      >

                        <td>
                          <strong>
                            {
                              purchase.billNumber ||
                              "—"
                            }
                          </strong>
                        </td>

                        <td>
                          {formatDate(
                            purchase.purchaseDate
                          )}
                        </td>

                        <td>

                          <div className="purchases-person">

                            <strong>
                              {
                                purchase
                                  .supplier
                                  ?.name ||
                                "—"
                              }
                            </strong>

                            {purchase
                              .supplier
                              ?.phone && (
                              <span>
                                {
                                  purchase
                                    .supplier
                                    .phone
                                }
                              </span>
                            )}

                          </div>

                        </td>

                        <td>
                          {formatCurrency(
                            purchase.grandTotal
                          )}
                        </td>

                        <td>
                          {formatCurrency(
                            purchase.paidAmount
                          )}
                        </td>

                        <td>
                          {formatCurrency(
                            purchase.balanceAmount
                          )}
                        </td>

                        <td>

                          <span
                            className={statusClass(
                              purchase.paymentStatus
                            )}
                          >
                            {
                              purchase.paymentStatus ||
                              "—"
                            }
                          </span>

                        </td>

                        <td>

                          <button
                            type="button"
                            className="purchases-view-btn"
                            onClick={() =>
                              openPurchase(
                                purchase._id
                              )
                            }
                          >
                            View
                          </button>

                        </td>

                      </tr>
                    )
                  )
                )}

              </tbody>

            </table>

          </div>
        )}

      </section>

      {/* =================================================
          NEW PURCHASE MODAL
      ================================================= */}

      {showForm && (
        <div className="purchases-modal-backdrop">

          <div className="purchases-modal">

            <div className="purchases-modal-header">

              <div>

                <div className="purchases-eyebrow">
                  <Receipt size={15} />
                  New Purchase
                </div>

                <h2>
                  Create Purchase
                </h2>

                <p>
                  Record a supplier bill
                  and update inventory.
                </p>

              </div>

              <button
                type="button"
                className="purchases-close-btn"
                onClick={closeForm}
                disabled={
                  saving ||
                  creatingProduct ||
                  creatingSupplier
                }
              >
                <X size={19} />
              </button>

            </div>

            <div className="purchases-modal-body">

              {/* ==========================================
                  PURCHASE DETAILS
              ========================================== */}

              <section className="purchases-form-section">

                <div className="purchases-form-section-title">
                  <Truck size={17} />
                  Purchase Details
                </div>

                <div className="purchases-form-grid">

                  {/* SUPPLIER */}

                  <div className="purchases-supplier-field">

                    <label>

                      <span>
                        Supplier *
                      </span>

                      <select
                        value={
                          supplierId
                        }
                        onChange={(
                          event
                        ) =>
                          setSupplierId(
                            event.target.value
                          )
                        }
                      >

                        <option value="">
                          Select supplier
                        </option>

                        {suppliers.map(
                          (
                            supplier
                          ) => (
                            <option
                              key={
                                supplier._id
                              }
                              value={
                                supplier._id
                              }
                            >
                              {
                                supplier.name
                              }
                            </option>
                          )
                        )}

                      </select>

                      {selectedSupplier && (
                        <small className="purchases-field-help">

                          {selectedSupplier.phone ||
                            ""}

                          {selectedSupplier.gstNumber
                            ? ` · GSTIN: ${selectedSupplier.gstNumber}`
                            : ""}

                        </small>
                      )}

                    </label>

                    <button
                      type="button"
                      className="purchases-secondary-action"
                      onClick={() => {
                        setError("");
                        setShowNewSupplier(
                          true
                        );
                      }}
                      disabled={
                        saving ||
                        creatingProduct ||
                        creatingSupplier
                      }
                    >
                      <Plus size={15} />
                      Add New Supplier
                    </button>

                  </div>

                  {/* BILL NUMBER */}

                  <label>

                    <span>
                      Bill Number *
                    </span>

                    <input
                      type="text"
                      placeholder="e.g. 792/23-24"
                      value={
                        billNumber
                      }
                      onChange={(
                        event
                      ) =>
                        setBillNumber(
                          event.target.value
                        )
                      }
                    />

                  </label>

                  {/* PURCHASE DATE */}

                  <label>

                    <span>
                      Purchase Date *
                    </span>

                    <div className="purchases-input-icon">

                      <CalendarDays
                        size={16}
                      />

                      <input
                        type="date"
                        value={
                          purchaseDate
                        }
                        onChange={(
                          event
                        ) =>
                          setPurchaseDate(
                            event.target.value
                          )
                        }
                      />

                    </div>

                  </label>

                  {/* DUE DATE */}

                  <label>

                    <span>
                      Due Date
                    </span>

                    <div className="purchases-input-icon">

                      <CalendarDays
                        size={16}
                      />

                      <input
                        type="date"
                        value={
                          dueDate
                        }
                        onChange={(
                          event
                        ) =>
                          setDueDate(
                            event.target.value
                          )
                        }
                      />

                    </div>

                  </label>

                </div>

              </section>

              {/* ==========================================
                  PRODUCTS
              ========================================== */}

              <section className="purchases-form-section">

                <div className="purchases-form-section-title">
                  <Package size={17} />
                  Add Products
                </div>

                <div
                  style={{
                    display:
                      "flex",
                    justifyContent:
                      "flex-end",
                    marginBottom:
                      "14px",
                  }}
                >

                  <button
                    type="button"
                    className="purchases-primary-btn"
                    onClick={() => {
                      setError("");
                      setShowNewProduct(
                        true
                      );
                    }}
                  >
                    <Plus size={16} />
                    Add New Product
                  </button>

                </div>

                {/* EXISTING PRODUCT */}

                <div className="purchases-item-form">

                  <label className="purchases-product-field">

                    <span>
                      Existing Product
                    </span>

                    <select
                      value={
                        selectedProduct
                      }
                      onChange={(
                        event
                      ) =>
                        handleProductChange(
                          event.target.value
                        )
                      }
                    >

                      <option value="">
                        Select existing product
                      </option>

                      {products.map(
                        (
                          product
                        ) => (
                          <option
                            key={
                              product._id
                            }
                            value={
                              product._id
                            }
                          >
                            {
                              product.name
                            }{" "}
                            · Stock:{" "}
                            {
                              product.stock
                            }
                          </option>
                        )
                      )}

                    </select>

                  </label>

                  <label>

                    <span>
                      Quantity
                    </span>

                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={
                        quantity
                      }
                      onChange={(
                        event
                      ) =>
                        setQuantity(
                          event.target.value
                        )
                      }
                    />

                  </label>

                  <label>

                    <span>
                      Purchase Rate
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={rate}
                      onChange={(
                        event
                      ) =>
                        setRate(
                          event.target.value
                        )
                      }
                    />

                  </label>

                  <label>

                    <span>
                      Discount %
                    </span>

                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={
                        discountPercent
                      }
                      onChange={(
                        event
                      ) =>
                        setDiscountPercent(
                          event.target.value
                        )
                      }
                    />

                  </label>

                  <label>

                    <span>
                      GST %
                    </span>

                    <select
                      value={
                        gstRate
                      }
                      onChange={(
                        event
                      ) =>
                        setGstRate(
                          event.target.value
                        )
                      }
                    >

                      <option value="0">
                        0%
                      </option>

                      <option value="5">
                        5%
                      </option>

                      <option value="12">
                        12%
                      </option>

                      <option value="18">
                        18%
                      </option>

                      <option value="28">
                        28%
                      </option>

                    </select>

                  </label>

                  <label>

                    <span>
                      HSN Code
                    </span>

                    <input
                      type="text"
                      placeholder="Optional"
                      value={
                        hsnCode
                      }
                      onChange={(
                        event
                      ) =>
                        setHsnCode(
                          event.target.value
                        )
                      }
                    />

                  </label>

                  <button
                    type="button"
                    className="purchases-add-item-btn"
                    onClick={
                      addItem
                    }
                  >
                    <Plus size={16} />
                    Add
                  </button>

                </div>

                {/* ITEMS TABLE */}

                <div className="purchases-items-table-wrap">

                  <table className="purchases-items-table">

                    <thead>

                      <tr>

                        <th>
                          Product
                        </th>

                        <th>
                          HSN
                        </th>

                        <th>
                          Qty
                        </th>

                        <th>
                          Rate
                        </th>

                        <th>
                          Discount
                        </th>

                        <th>
                          GST
                        </th>

                        <th>
                          Taxable
                        </th>

                        <th></th>

                      </tr>

                    </thead>

                    <tbody>

                      {items.length ===
                      0 ? (
                        <tr>

                          <td colSpan={8}>

                            <div className="purchases-items-empty">
                              No products
                              added yet.
                            </div>

                          </td>

                        </tr>
                      ) : (
                        items.map(
                          (
                            item,
                            index
                          ) => (
                            <tr
                              key={`${item.product}-${index}`}
                            >

                              <td>
                                <strong>
                                  {
                                    item.productName
                                  }
                                </strong>
                              </td>

                              <td>
                                {
                                  item.hsnCode ||
                                  "—"
                                }
                              </td>

                              <td>
                                {
                                  item.quantity
                                }
                              </td>

                              <td>
                                {formatCurrency(
                                  item.rate
                                )}
                              </td>

                              <td>
                                {
                                  item.discountPercent
                                }
                                % (
                                {formatCurrency(
                                  item.discountAmount
                                )}
                                )
                              </td>

                              <td>
                                {
                                  item.gstRate
                                }
                                %
                              </td>

                              <td>
                                {formatCurrency(
                                  item.amount
                                )}
                              </td>

                              <td>

                                <button
                                  type="button"
                                  className="purchases-remove-item-btn"
                                  onClick={() =>
                                    removeItem(
                                      index
                                    )
                                  }
                                  aria-label="Remove item"
                                >
                                  <Trash2
                                    size={15}
                                  />
                                </button>

                              </td>

                            </tr>
                          )
                        )
                      )}

                    </tbody>

                  </table>

                </div>

              </section>

              {/* ==========================================
                  NOTES + SUMMARY
              ========================================== */}

              <section className="purchases-bottom-grid">

                <div className="purchases-form-section">

                  <div className="purchases-form-section-title">
                    <FileText size={17} />
                    Notes
                  </div>

                  <label>

                    <span>
                      Purchase Notes
                    </span>

                    <textarea
                      rows={5}
                      placeholder="Optional notes about this purchase..."
                      value={
                        notes
                      }
                      onChange={(
                        event
                      ) =>
                        setNotes(
                          event.target.value
                        )
                      }
                    />

                  </label>

                </div>

                <div className="purchases-summary-card">

                  <div className="purchases-summary-row">

                    <span>
                      Taxable Amount
                    </span>

                    <strong>
                      {formatCurrency(
                        taxableAmount
                      )}
                    </strong>

                  </div>

                  <div className="purchases-summary-row">

                    <span>
                      CGST
                    </span>

                    <strong>
                      {formatCurrency(
                        cgst
                      )}
                    </strong>

                  </div>

                  <div className="purchases-summary-row">

                    <span>
                      SGST
                    </span>

                    <strong>
                      {formatCurrency(
                        sgst
                      )}
                    </strong>

                  </div>

                  <div className="purchases-summary-row">

                    <span>
                      Total GST
                    </span>

                    <strong>
                      {formatCurrency(
                        totalTax
                      )}
                    </strong>

                  </div>

                  <div className="purchases-summary-row">

                    <span>
                      Before Round Off
                    </span>

                    <strong>
                      {formatCurrency(
                        beforeRoundOff
                      )}
                    </strong>

                  </div>

                  <div className="purchases-summary-row">

                    <span>
                      Round Off
                    </span>

                    <input
                      type="number"
                      step="0.01"
                      value={
                        roundOff
                      }
                      onChange={(
                        event
                      ) =>
                        setRoundOff(
                          event.target.value
                        )
                      }
                      placeholder="0.00"
                      style={{
                        width:
                          "100px",
                        textAlign:
                          "right",
                      }}
                    />

                  </div>

                  <div className="purchases-summary-divider" />

                  <div className="purchases-summary-total">

                    <span>
                      Grand Total
                    </span>

                    <strong>
                      {formatCurrency(
                        calculatedGrandTotal
                      )}
                    </strong>

                  </div>

                  <div className="purchases-summary-payment">

                    <label>

                      <span>
                        Paid Amount
                      </span>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          paidAmount
                        }
                        onChange={(
                          event
                        ) =>
                          setPaidAmount(
                            event.target.value
                          )
                        }
                        placeholder="0.00"
                      />

                    </label>

                    <label>

                      <span>
                        Payment Method
                      </span>

                      <select
                        value={
                          paymentMethod
                        }
                        onChange={(
                          event
                        ) =>
                          setPaymentMethod(
                            event.target
                              .value as PaymentMethod
                          )
                        }
                        disabled={
                          paid <= 0
                        }
                      >

                        <option value="cash">
                          Cash
                        </option>

                        <option value="upi">
                          UPI
                        </option>

                        <option value="bank">
                          Bank
                        </option>

                        <option value="card">
                          Card
                        </option>

                      </select>

                    </label>

                    {paid > 0 && (
                      <label>

                        <span>
                          Payment Reference
                        </span>

                        <input
                          type="text"
                          placeholder="Optional"
                          value={
                            paymentReference
                          }
                          onChange={(
                            event
                          ) =>
                            setPaymentReference(
                              event.target.value
                            )
                          }
                        />

                      </label>
                    )}

                  </div>

                  <div className="purchases-summary-balance">

                    <span>
                      Balance
                    </span>

                    <strong>
                      {formatCurrency(
                        balance
                      )}
                    </strong>

                  </div>

                </div>

              </section>

            </div>

            <div className="purchases-modal-footer">

              <button
                type="button"
                className="purchases-cancel-btn"
                onClick={
                  closeForm
                }
                disabled={
                  saving ||
                  creatingProduct ||
                  creatingSupplier
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="purchases-save-btn"
                onClick={
                  handleSavePurchase
                }
                disabled={
                  saving ||
                  items.length === 0
                }
              >
                {saving ? (
                  <>
                    <RefreshCw
                      size={16}
                      className="purchases-spin"
                    />

                    Saving...
                  </>
                ) : (
                  <>
                    <Receipt size={16} />
                    Save Purchase
                  </>
                )}
              </button>

            </div>

          </div>

        </div>
      )}

      {/* =================================================
          ADD NEW SUPPLIER
      ================================================= */}

      {showNewSupplier && (
        <div className="purchases-modal-backdrop">

          <div
            className="purchases-modal"
            style={{
              maxWidth:
                "820px",
            }}
          >

            <div className="purchases-modal-header">

              <div>

                <div className="purchases-eyebrow">
                  <Truck size={15} />
                  Supplier
                </div>

                <h2>
                  Add New Supplier
                </h2>

                <p>
                  Add the supplier without
                  leaving the purchase screen.
                </p>

              </div>

              <button
                type="button"
                className="purchases-close-btn"
                onClick={() =>
                  setShowNewSupplier(
                    false
                  )
                }
                disabled={
                  creatingSupplier
                }
              >
                <X size={19} />
              </button>

            </div>

            <div className="purchases-modal-body">

              <section className="purchases-form-section">

                <div className="purchases-form-section-title">
                  <Truck size={17} />
                  Supplier Details
                </div>

                <div className="purchases-form-grid">

                  {/* NAME */}

                  <label>

                    <span>
                      Supplier Name *
                    </span>

                    <input
                      type="text"
                      placeholder="e.g. ABM Trading Company"
                      value={
                        newSupplierName
                      }
                      onChange={(
                        event
                      ) =>
                        setNewSupplierName(
                          event.target.value
                        )
                      }
                    />

                  </label>

                  {/* PHONE */}

                  <label>

                    <span>
                      Phone *
                    </span>

                    <input
                      type="text"
                      placeholder="e.g. 9876543210"
                      value={
                        newSupplierPhone
                      }
                      onChange={(
                        event
                      ) =>
                        setNewSupplierPhone(
                          event.target.value
                        )
                      }
                    />

                  </label>

                  {/* WHATSAPP */}

                  <label>

                    <span>
                      WhatsApp
                    </span>

                    <input
                      type="text"
                      placeholder="Optional"
                      value={
                        newSupplierWhatsapp
                      }
                      onChange={(
                        event
                      ) =>
                        setNewSupplierWhatsapp(
                          event.target.value
                        )
                      }
                    />

                  </label>

                  {/* EMAIL */}

                  <label>

                    <span>
                      Email
                    </span>

                    <input
                      type="email"
                      placeholder="Optional"
                      value={
                        newSupplierEmail
                      }
                      onChange={(
                        event
                      ) =>
                        setNewSupplierEmail(
                          event.target.value
                        )
                      }
                    />

                  </label>

                  {/* GST */}

                  <label>

                    <span>
                      GST Number
                    </span>

                    <input
                      type="text"
                      placeholder="e.g. 29ABCDE1234F1Z5"
                      value={
                        newSupplierGST
                      }
                      onChange={(
                        event
                      ) =>
                        setNewSupplierGST(
                          event.target.value
                        )
                      }
                    />

                  </label>

                  {/* CREDIT DAYS */}

                  <label>

                    <span>
                      Credit Days
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={
                        newSupplierCreditDays
                      }
                      onChange={(
                        event
                      ) =>
                        setNewSupplierCreditDays(
                          event.target.value
                        )
                      }
                    />

                  </label>

                </div>

                {/* ADDRESS */}

                <label
                  style={{
                    display:
                      "block",
                    marginTop:
                      "16px",
                  }}
                >

                  <span>
                    Address
                  </span>

                  <textarea
                    rows={3}
                    placeholder="Supplier address"
                    value={
                      newSupplierAddress
                    }
                    onChange={(
                      event
                    ) =>
                      setNewSupplierAddress(
                        event.target.value
                      )
                    }
                  />

                </label>

                {/* NOTES */}

                <label
                  style={{
                    display:
                      "block",
                    marginTop:
                      "16px",
                  }}
                >

                  <span>
                    Notes
                  </span>

                  <textarea
                    rows={3}
                    placeholder="Optional supplier notes..."
                    value={
                      newSupplierNotes
                    }
                    onChange={(
                      event
                    ) =>
                      setNewSupplierNotes(
                        event.target.value
                      )
                    }
                  />

                </label>

              </section>

            </div>

            <div className="purchases-modal-footer">

              <button
                type="button"
                className="purchases-cancel-btn"
                onClick={() =>
                  setShowNewSupplier(
                    false
                  )
                }
                disabled={
                  creatingSupplier
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="purchases-save-btn"
                onClick={
                  createNewSupplier
                }
                disabled={
                  creatingSupplier
                }
              >

                {creatingSupplier ? (
                  <>
                    <RefreshCw
                      size={16}
                      className="purchases-spin"
                    />

                    Creating...
                  </>
                ) : (
                  <>
                    <Truck size={16} />

                    Create Supplier
                  </>
                )}

              </button>

            </div>

          </div>

        </div>
      )}

      {/* =================================================
          ADD NEW PRODUCT
      ================================================= */}

      {showNewProduct && (
        <div className="purchases-modal-backdrop">

          <div
            className="purchases-modal"
            style={{
              maxWidth:
                "820px",
            }}
          >

            <div className="purchases-modal-header">

              <div>

                <div className="purchases-eyebrow">
                  <Package size={15} />
                  Inventory
                </div>

                <h2>
                  Add New Product
                </h2>

                <p>
                  Add the product and
                  purchase details together.
                </p>

              </div>

              <button
                type="button"
                className="purchases-close-btn"
                onClick={() =>
                  setShowNewProduct(
                    false
                  )
                }
                disabled={
                  creatingProduct
                }
              >
                <X size={19} />
              </button>

            </div>

            <div className="purchases-modal-body">

              <section className="purchases-form-section">

                <div className="purchases-form-section-title">
                  <Package size={17} />
                  Product & Purchase Details
                </div>

                <div className="purchases-form-grid">

                  {/* PRODUCT NAME */}

                  <label>

                    <span>
                      Product Name *
                    </span>

                    <input
                      type="text"
                      placeholder="e.g. LP SS Screw 6x19 Phillips PVD Rose Gold"
                      value={
                        newProductName
                      }
                      onChange={(
                        event
                      ) =>
                        setNewProductName(
                          event.target.value
                        )
                      }
                    />

                  </label>

                  {/* CATEGORY */}

                  <label>

                    <span>
                      Category *
                    </span>

                    <input
                      type="text"
                      placeholder="e.g. Hardware"
                      value={
                        newProductCategory
                      }
                      onChange={(
                        event
                      ) =>
                        setNewProductCategory(
                          event.target.value
                        )
                      }
                    />

                  </label>

                  {/* MRP */}

                  <label>

                    <span>
                      MRP / Selling Price *
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={
                        newProductMRP
                      }
                      onChange={(
                        event
                      ) =>
                        setNewProductMRP(
                          event.target.value
                        )
                      }
                    />

                    <small className="purchases-field-help">
                      This is the product's
                      selling MRP, not the
                      supplier purchase rate.
                    </small>

                  </label>

                  {/* PURCHASE RATE */}

                  <label>

                    <span>
                      Purchase Rate *
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="e.g. 423.00"
                      value={
                        newProductPurchaseRate
                      }
                      onChange={(
                        event
                      ) =>
                        setNewProductPurchaseRate(
                          event.target.value
                        )
                      }
                    />

                  </label>

                  {/* QUANTITY */}

                  <label>

                    <span>
                      Purchase Quantity *
                    </span>

                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={
                        newProductQuantity
                      }
                      onChange={(
                        event
                      ) =>
                        setNewProductQuantity(
                          event.target.value
                        )
                      }
                    />

                  </label>

                  {/* DISCOUNT */}

                  <label>

                    <span>
                      Discount %
                    </span>

                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={
                        newProductDiscount
                      }
                      onChange={(
                        event
                      ) =>
                        setNewProductDiscount(
                          event.target.value
                        )
                      }
                    />

                  </label>

                  {/* GST */}

                  <label>

                    <span>
                      GST %
                    </span>

                    <select
                      value={
                        newProductGST
                      }
                      onChange={(
                        event
                      ) =>
                        setNewProductGST(
                          event.target.value
                        )
                      }
                    >

                      <option value="0">
                        0%
                      </option>

                      <option value="5">
                        5%
                      </option>

                      <option value="12">
                        12%
                      </option>

                      <option value="18">
                        18%
                      </option>

                      <option value="28">
                        28%
                      </option>

                    </select>

                  </label>

                  {/* HSN */}

                  <label>

                    <span>
                      HSN Code
                    </span>

                    <input
                      type="text"
                      placeholder="e.g. 73181400"
                      value={
                        newProductHSN
                      }
                      onChange={(
                        event
                      ) =>
                        setNewProductHSN(
                          event.target.value
                        )
                      }
                    />

                  </label>

                  {/* REORDER */}

                  <label>

                    <span>
                      Reorder Level
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={
                        newProductReorder
                      }
                      onChange={(
                        event
                      ) =>
                        setNewProductReorder(
                          event.target.value
                        )
                      }
                    />

                  </label>

                </div>

                {/* PREVIEW */}

                <div
                  style={{
                    marginTop:
                      "18px",
                    padding:
                      "16px",
                    borderRadius:
                      "10px",
                    background:
                      "var(--ib-bg)",
                    border:
                      "1px solid var(--ib-border)",
                    fontSize:
                      "13px",
                    lineHeight:
                      "1.7",
                    color:
                      "var(--ib-soft-ink)",
                  }}
                >

                  <strong>
                    Purchase Preview
                  </strong>

                  <br />

                  Gross:{" "}
                  {formatCurrency(
                    Number(
                      newProductQuantity ||
                        0
                    ) *
                      Number(
                        newProductPurchaseRate ||
                          0
                      )
                  )}

                  <br />

                  Discount:{" "}
                  {formatCurrency(
                    Number(
                      newProductQuantity ||
                        0
                    ) *
                      Number(
                        newProductPurchaseRate ||
                          0
                      ) *
                      (Number(
                        newProductDiscount ||
                          0
                      ) /
                        100)
                  )}

                  <br />

                  Taxable:{" "}
                  {formatCurrency(
                    Number(
                      newProductQuantity ||
                        0
                    ) *
                      Number(
                        newProductPurchaseRate ||
                          0
                      ) *
                      (1 -
                        Number(
                          newProductDiscount ||
                            0
                        ) /
                          100)
                  )}

                  <br />

                  <strong>
                    Stock after purchase:
                  </strong>{" "}
                  {newProductQuantity ||
                    0}{" "}
                  units

                </div>

              </section>

            </div>

            <div className="purchases-modal-footer">

              <button
                type="button"
                className="purchases-cancel-btn"
                onClick={() =>
                  setShowNewProduct(
                    false
                  )
                }
                disabled={
                  creatingProduct
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="purchases-save-btn"
                onClick={
                  createNewProduct
                }
                disabled={
                  creatingProduct
                }
              >

                {creatingProduct ? (
                  <>
                    <RefreshCw
                      size={16}
                      className="purchases-spin"
                    />

                    Creating...
                  </>
                ) : (
                  <>
                    <Package size={16} />

                    Create Product & Add
                  </>
                )}

              </button>

            </div>

          </div>

        </div>
      )}

      {/* =================================================
          VIEW PURCHASE
      ================================================= */}

      {viewPurchase && (
        <div className="purchases-modal-backdrop">

          <div className="purchases-view-modal">

            <div className="purchases-modal-header">

              <div>

                <div className="purchases-eyebrow">
                  <Receipt size={15} />
                  Purchase Details
                </div>

                <h2>
                  {
                    viewPurchase.billNumber
                  }
                </h2>

                <p>
                  {formatDate(
                    viewPurchase.purchaseDate
                  )}
                </p>

              </div>

              <button
                type="button"
                className="purchases-close-btn"
                onClick={() =>
                  setViewPurchase(
                    null
                  )
                }
              >
                <X size={19} />
              </button>

            </div>

            <div className="purchases-view-body">

              <div className="purchases-view-meta-grid">

                <div>

                  <span>
                    Supplier
                  </span>

                  <strong>
                    {
                      viewPurchase
                        .supplier
                        ?.name ||
                      "—"
                    }
                  </strong>

                </div>

                <div>

                  <span>
                    Phone
                  </span>

                  <strong>
                    {
                      viewPurchase
                        .supplier
                        ?.phone ||
                      "—"
                    }
                  </strong>

                </div>

                <div>

                  <span>
                    Payment Status
                  </span>

                  <strong>

                    <span
                      className={statusClass(
                        viewPurchase.paymentStatus
                      )}
                    >
                      {
                        viewPurchase.paymentStatus
                      }
                    </span>

                  </strong>

                </div>

                <div>

                  <span>
                    Due Date
                  </span>

                  <strong>
                    {formatDate(
                      viewPurchase.dueDate
                    )}
                  </strong>

                </div>

              </div>

              <div className="purchases-view-items">

                <h3>
                  Items
                </h3>

                <div className="purchases-table-wrap">

                  <table className="purchases-items-table">

                    <thead>

                      <tr>

                        <th>
                          Product
                        </th>

                        <th>
                          Qty
                        </th>

                        <th>
                          Rate
                        </th>

                        <th>
                          Discount
                        </th>

                        <th>
                          GST
                        </th>

                        <th>
                          Taxable
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {viewPurchase.items?.map(
                        (
                          item,
                          index
                        ) => (
                          <tr
                            key={`${item.product}-${index}`}
                          >

                            <td>
                              <strong>
                                {
                                  item.productName
                                }
                              </strong>
                            </td>

                            <td>
                              {
                                item.quantity
                              }
                            </td>

                            <td>
                              {formatCurrency(
                                item.rate
                              )}
                            </td>

                            <td>
                              {
                                item.discountPercent
                              }
                              % (
                              {formatCurrency(
                                item.discountAmount
                              )}
                              )
                            </td>

                            <td>
                              {
                                item.gstRate
                              }
                              %
                            </td>

                            <td>
                              {formatCurrency(
                                item.amount
                              )}
                            </td>

                          </tr>
                        )
                      )}

                    </tbody>

                  </table>

                </div>

              </div>

              <div className="purchases-view-summary">

                <div>

                  <span>
                    Taxable Amount
                  </span>

                  <strong>
                    {formatCurrency(
                      viewPurchase.taxableAmount
                    )}
                  </strong>

                </div>

                <div>

                  <span>
                    CGST
                  </span>

                  <strong>
                    {formatCurrency(
                      viewPurchase.cgst
                    )}
                  </strong>

                </div>

                <div>

                  <span>
                    SGST
                  </span>

                  <strong>
                    {formatCurrency(
                      viewPurchase.sgst
                    )}
                  </strong>

                </div>

                <div>

                  <span>
                    Total GST
                  </span>

                  <strong>
                    {formatCurrency(
                      viewPurchase.totalTax
                    )}
                  </strong>

                </div>

                <div>

                  <span>
                    Round Off
                  </span>

                  <strong>
                    {formatCurrency(
                      viewPurchase.roundOff
                    )}
                  </strong>

                </div>

                <div>

                  <span>
                    Grand Total
                  </span>

                  <strong>
                    {formatCurrency(
                      viewPurchase.grandTotal
                    )}
                  </strong>

                </div>

                <div>

                  <span>
                    Paid
                  </span>

                  <strong>
                    {formatCurrency(
                      viewPurchase.paidAmount
                    )}
                  </strong>

                </div>

                <div>

                  <span>
                    Credit Used
                  </span>

                  <strong>
                    {formatCurrency(
                      viewPurchase.creditUsed
                    )}
                  </strong>

                </div>

                <div>

                  <span>
                    Balance
                  </span>

                  <strong>
                    {formatCurrency(
                      viewPurchase.balanceAmount
                    )}
                  </strong>

                </div>

              </div>

              {viewPurchase.notes && (
                <div className="purchases-view-notes">

                  <strong>
                    Notes
                  </strong>

                  <p>
                    {
                      viewPurchase.notes
                    }
                  </p>

                </div>
              )}

            </div>

          </div>

        </div>
      )}

    </main>
  );
}