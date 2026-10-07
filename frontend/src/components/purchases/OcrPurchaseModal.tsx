"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  X,
  ScanText,
  ArrowLeft,
  Plus,
  Trash2,
  RefreshCw,
  Building2,
  Calendar,
  Sparkles,
  HelpCircle,
  ExternalLink,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

export type Supplier = {
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

export type Product = {
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

export type ReviewItem = {
  id: string;
  name: string;
  originalOcrName: string;
  isNewProduct: boolean;
  selectedProductId: string;
  hsnCode: string;
  quantity: number;
  rate: number;
  gstRate: number;
  amount: number;
  category: string;
  sellingPrice: number;
  needsReview: boolean;
  matchedProduct?: Product | null;
};

interface OcrPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  suppliers: Supplier[];
  products: Product[];
}

export default function OcrPurchaseModal({
  isOpen,
  onClose,
  onSuccess,
  suppliers,
  products,
}: OcrPurchaseModalProps) {
  // Step: "upload" | "review"
  const [step, setStep] = useState<"upload" | "review">("upload");

  // File states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Scanning states
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState("");
  const [scanError, setScanError] = useState("");

  // Server uploaded file metadata
  const [uploadedFileInfo, setUploadedFileInfo] = useState<{
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
    url: string;
  } | null>(null);

  // Review states - Supplier
  const [supplierStatus, setSupplierStatus] = useState<"EXISTING" | "NEW">(
    "NEW"
  );
  const [supplierMatchMethod, setSupplierMatchMethod] = useState("");
  const [supplierChoice, setSupplierChoice] = useState<
    "use_matched" | "choose_existing" | "create_new"
  >("create_new");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierGstin, setSupplierGstin] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [supplierAddress, setSupplierAddress] = useState("");

  // Review states - Invoice Metadata
  const [billNumber, setBillNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  // Review states - Items
  const [items, setItems] = useState<ReviewItem[]>([]);

  // Review states - Payment & RoundOff
  const [roundOff, setRoundOff] = useState("0");
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "upi" | "bank" | "card"
  >("cash");
  const [paymentReference, setPaymentReference] = useState("");

  // Confirmation state
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState("");

  // Reset all states
  const resetAll = () => {
    setStep("upload");
    setSelectedFile(null);
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
    }
    setFilePreview(null);
    setIsDragOver(false);
    setScanning(false);
    setScanProgress("");
    setScanError("");
    setUploadedFileInfo(null);

    setSupplierStatus("NEW");
    setSupplierMatchMethod("");
    setSupplierChoice("create_new");
    setSelectedSupplierId("");
    setSupplierName("");
    setSupplierGstin("");
    setSupplierPhone("");
    setSupplierAddress("");

    setBillNumber("");
    setPurchaseDate("");
    setDueDate("");
    setNotes("");
    setItems([]);
    setRoundOff("0");
    setPaidAmount("");
    setPaymentMethod("cash");
    setPaymentReference("");
    setConfirming(false);
    setConfirmError("");
  };

  useEffect(() => {
    if (!isOpen) {
      resetAll();
    }
  }, [isOpen]);

  // Handle file selection
  const handleFileChange = (file: File) => {
    setScanError("");
    const allowed = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];

    if (!allowed.includes(file.type)) {
      setScanError(
        "Unsupported file type. Please upload a JPEG, PNG, WEBP, or PDF invoice."
      );
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setScanError("File size exceeds 10MB limit. Please upload a smaller file.");
      return;
    }

    setSelectedFile(file);
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setFilePreview(url);
    } else {
      setFilePreview(null);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Run OCR
  const handleStartOcr = async () => {
    if (!selectedFile) {
      setScanError("Please select an invoice file first.");
      return;
    }

    try {
      setScanning(true);
      setScanError("");
      setScanProgress("Uploading invoice...");

      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication token not found. Please log in.");
      }

      const formData = new FormData();
      formData.append("bill", selectedFile);

      setScanProgress("Scanning document with OCR engine...");

      const res = await fetch(`${API_URL}/purchases/ocr`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.message || "OCR scanning failed. Please retry with a clearer image."
        );
      }

      setScanProgress("Matching supplier and products...");

      // Set uploaded file info
      setUploadedFileInfo(data.file);

      // Populate Supplier
      const extSupplier = data.extracted?.supplier || {};
      const supMatch = data.supplierMatch;

      if (supMatch && supMatch.status === "EXISTING" && supMatch.matchedSupplier) {
        setSupplierStatus("EXISTING");
        setSupplierMatchMethod(supMatch.matchMethod || "Auto Matched");
        setSupplierChoice("use_matched");
        setSelectedSupplierId(supMatch.matchedSupplier._id);
        setSupplierName(supMatch.matchedSupplier.name || extSupplier.name || "");
        setSupplierGstin(
          supMatch.matchedSupplier.gstNumber || extSupplier.gstin || ""
        );
        setSupplierPhone(
          supMatch.matchedSupplier.phone || extSupplier.phone || ""
        );
        setSupplierAddress(
          supMatch.matchedSupplier.address || extSupplier.address || ""
        );
      } else {
        setSupplierStatus("NEW");
        setSupplierMatchMethod("");
        setSupplierChoice("create_new");
        setSelectedSupplierId("");
        setSupplierName(extSupplier.name || "");
        setSupplierGstin(extSupplier.gstin || "");
        setSupplierPhone(extSupplier.phone || "");
        setSupplierAddress(extSupplier.address || "");
      }

      // Populate Invoice metadata
      setBillNumber(data.extracted?.invoiceNumber || "");
      setPurchaseDate(
        data.extracted?.invoiceDate || new Date().toISOString().split("T")[0]
      );
      setDueDate("");
      setNotes("");

      // Populate Items
      const rawItems = Array.isArray(data.matchedItems)
        ? data.matchedItems
        : Array.isArray(data.extracted?.items)
        ? data.extracted.items
        : [];

      const reviewItems: ReviewItem[] = rawItems.map(
        (item: any, idx: number) => {
          const isMatched = item.status === "EXISTING" && item.matchedProduct;
          const matchedProd = isMatched ? item.matchedProduct : null;
          const qty = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
          const rate = Number(item.rate) >= 0 ? Number(item.rate) : 0;
          const lineTaxable =
            Number(item.amount) > 0 ? Number(item.amount) : qty * rate;

          const isUncertain =
            !item.name ||
            item.name.trim().length === 0 ||
            rate === 0 ||
            lineTaxable === 0;

          return {
            id: `item-${Date.now()}-${idx}`,
            name: matchedProd?.name || item.name || `Item ${idx + 1}`,
            originalOcrName: item.name || "",
            isNewProduct: !isMatched,
            selectedProductId: matchedProd?._id || "",
            hsnCode: item.hsnCode || matchedProd?.hsnCode || "",
            quantity: qty,
            rate: rate,
            gstRate: [0, 5, 12, 18, 28].includes(Number(item.gstRate))
              ? Number(item.gstRate)
              : matchedProd?.gstRate || 18,
            amount: lineTaxable,
            category: matchedProd?.category || "General",
            sellingPrice:
              matchedProd?.price || Math.round(rate * 1.25 * 100) / 100,
            needsReview: isUncertain,
            matchedProduct: matchedProd,
          };
        }
      );

      // If no items were extracted, seed at least one empty item for user
      if (reviewItems.length === 0) {
        reviewItems.push({
          id: `item-${Date.now()}-0`,
          name: "",
          originalOcrName: "",
          isNewProduct: true,
          selectedProductId: "",
          hsnCode: "",
          quantity: 1,
          rate: 0,
          gstRate: 18,
          amount: 0,
          category: "General",
          sellingPrice: 0,
          needsReview: true,
          matchedProduct: null,
        });
      }

      setItems(reviewItems);
      setStep("review");
    } catch (err: any) {
      console.error(err);
      setScanError(err.message || "Failed to process bill. Please try again.");
    } finally {
      setScanning(false);
      setScanProgress("");
    }
  };

  // Calculations
  const taxableAmount = useMemo(() => {
    return (
      Math.round(
        items.reduce((sum, item) => sum + Number(item.amount || 0), 0) * 100
      ) / 100
    );
  }, [items]);

  const totalTax = useMemo(() => {
    const tax = items.reduce((sum, item) => {
      const amt = Number(item.amount || 0);
      const rate = Number(item.gstRate || 0);
      return sum + (amt * rate) / 100;
    }, 0);
    return Math.round(tax * 100) / 100;
  }, [items]);

  const cgst = Math.round((totalTax / 2) * 100) / 100;
  const sgst = Math.round((totalTax - cgst) * 100) / 100;

  const numRoundOff = Number(roundOff) || 0;
  const grandTotal = Math.max(
    0,
    Math.round((taxableAmount + totalTax + numRoundOff) * 100) / 100
  );

  // Update item field
  const updateItem = (id: string, updates: Partial<ReviewItem>) => {
    setItems((current) =>
      current.map((item) => {
        if (item.id !== id) return item;

        const updated = { ...item, ...updates };

        // Recalculate amount if quantity or rate changed
        if (updates.quantity !== undefined || updates.rate !== undefined) {
          const q = Number(updated.quantity) || 0;
          const r = Number(updated.rate) || 0;
          updated.amount = Math.round(q * r * 100) / 100;
        }

        // Clear needs review flag if name and amount are filled
        if (updated.name?.trim() && updated.amount > 0) {
          updated.needsReview = false;
        }

        return updated;
      })
    );
  };

  // Add blank item
  const addNewItem = () => {
    setItems((current) => [
      ...current,
      {
        id: `item-${Date.now()}-${current.length}`,
        name: "",
        originalOcrName: "",
        isNewProduct: true,
        selectedProductId: "",
        hsnCode: "",
        quantity: 1,
        rate: 0,
        gstRate: 18,
        amount: 0,
        category: "General",
        sellingPrice: 0,
        needsReview: true,
        matchedProduct: null,
      },
    ]);
  };

  // Remove item
  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((current) => current.filter((item) => item.id !== id));
  };

  // Confirm Purchase
  const handleConfirmPurchase = async () => {
    try {
      setConfirming(true);
      setConfirmError("");

      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication token not found. Please log in.");
      }

      // Validations
      if (!billNumber.trim()) {
        throw new Error("Invoice / Bill number is required.");
      }

      if (!purchaseDate) {
        throw new Error("Purchase date is required.");
      }

      // Supplier validation
      let supplierPayload: any = null;

      if (supplierChoice === "choose_existing") {
        if (!selectedSupplierId) {
          throw new Error("Please select an existing supplier.");
        }
        supplierPayload = { _id: selectedSupplierId, isNew: false };
      } else if (supplierChoice === "use_matched" && selectedSupplierId) {
        supplierPayload = { _id: selectedSupplierId, isNew: false };
      } else {
        // Create new
        if (!supplierName.trim()) {
          throw new Error("Supplier name is required.");
        }
        supplierPayload = {
          isNew: true,
          name: supplierName.trim(),
          phone: supplierPhone.trim() || "N/A",
          gstin: supplierGstin.trim(),
          address: supplierAddress.trim(),
        };
      }

      // Items validation
      if (items.length === 0) {
        throw new Error("Purchase must have at least one item.");
      }

      for (const item of items) {
        if (!item.name || !item.name.trim()) {
          throw new Error("Every item must have a product name.");
        }
        if (Number(item.quantity) <= 0) {
          throw new Error(`Quantity for "${item.name}" must be greater than zero.`);
        }
        if (Number(item.rate) < 0) {
          throw new Error(`Rate for "${item.name}" cannot be negative.`);
        }
      }

      const numPaid = Number(paidAmount) || 0;
      if (numPaid > grandTotal) {
        throw new Error("Paid amount cannot exceed the grand total.");
      }

      const payments =
        numPaid > 0
          ? [
              {
                amount: numPaid,
                method: paymentMethod,
                reference: paymentReference.trim(),
              },
            ]
          : [];

      const payload = {
        supplier: supplierPayload,
        billNumber: billNumber.trim(),
        purchaseDate,
        items: items.map((item) => ({
          isNew: item.isNewProduct,
          product: item.isNewProduct ? undefined : item.selectedProductId,
          productName: item.name.trim(),
          name: item.name.trim(),
          category: item.category || "General",
          price: item.sellingPrice || item.rate,
          quantity: Number(item.quantity),
          rate: Number(item.rate),
          discountPercent: 0,
          discountAmount: 0,
          gstRate: Number(item.gstRate),
          amount: Number(item.amount),
          hsnCode: item.hsnCode.trim(),
        })),
        taxableAmount,
        cgst,
        sgst,
        igst: 0,
        totalTax,
        roundOff: numRoundOff,
        grandTotal,
        payments,
        dueDate: dueDate || undefined,
        notes: notes.trim(),
        billFileUrl: uploadedFileInfo?.url || "",
        billOriginalName: uploadedFileInfo?.originalName || "",
      };

      const res = await fetch(`${API_URL}/purchases/confirm-ocr`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to confirm purchase.");
      }

      onSuccess(
        `Purchase ${billNumber.trim()} successfully confirmed and inventory stock updated!`
      );
      onClose();
    } catch (err: any) {
      console.error(err);
      setConfirmError(err.message || "An unexpected error occurred.");
    } finally {
      setConfirming(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="purchases-modal-backdrop">
      <div className="purchases-modal purchases-ocr-modal">
        {/* Header */}
        <div className="purchases-modal-header">
          <div>
            <div className="purchases-eyebrow">
              <ScanText size={15} />
              OCR Purchase Automation
            </div>
            <h2>
              {step === "upload"
                ? "Scan & Upload Supplier Bill"
                : "Review & Confirm Extracted Purchase"}
            </h2>
            <p>
              {step === "upload"
                ? "Upload a supplier bill image or PDF. Our OCR engine will automatically extract invoice numbers, taxes, and items."
                : "Verify the extracted information before saving. Products and suppliers will be linked or created automatically upon confirmation."}
            </p>
          </div>
          <button
            type="button"
            className="purchases-close-btn"
            onClick={onClose}
            disabled={scanning || confirming}
          >
            <X size={19} />
          </button>
        </div>

        <div className="purchases-modal-body">
          {/* STEP 1: UPLOAD SCREEN */}
          {step === "upload" && (
            <div className="ocr-upload-container">
              {scanError && (
                <div className="purchases-alert purchases-alert-error">
                  <AlertCircle size={16} />
                  <span>{scanError}</span>
                </div>
              )}

              {/* Drag and drop zone */}
              <div
                className={`ocr-dropzone ${
                  isDragOver ? "ocr-dropzone-active" : ""
                } ${selectedFile ? "ocr-dropzone-has-file" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                />

                {filePreview ? (
                  <div className="ocr-preview-wrap">
                    <img
                      src={filePreview}
                      alt="Bill preview"
                      className="ocr-image-preview"
                    />
                    <div className="ocr-preview-badge">
                      <CheckCircle2 size={14} /> Ready to scan
                    </div>
                  </div>
                ) : selectedFile ? (
                  <div className="ocr-file-icon-wrap">
                    <FileText size={48} className="ocr-file-icon" />
                    <strong>{selectedFile.name}</strong>
                    <span>
                      {(selectedFile.size / 1024).toFixed(1)} KB · PDF Document
                    </span>
                  </div>
                ) : (
                  <div className="ocr-dropzone-empty">
                    <div className="ocr-icon-circle">
                      <Upload size={24} />
                    </div>
                    <h3>Drag and drop supplier invoice here</h3>
                    <p>Supports JPG, PNG, WEBP images or PDF files (up to 10MB)</p>
                    <button
                      type="button"
                      className="purchases-secondary-action ocr-browse-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                    >
                      Browse Files
                    </button>
                  </div>
                )}
              </div>

              {selectedFile && (
                <div className="ocr-selected-details">
                  <div className="ocr-file-meta">
                    <FileText size={16} />
                    <span>
                      <strong>{selectedFile.name}</strong> (
                      {(selectedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>

                  <button
                    type="button"
                    className="purchases-cancel-btn ocr-change-btn"
                    onClick={() => {
                      setSelectedFile(null);
                      setFilePreview(null);
                    }}
                    disabled={scanning}
                  >
                    Change File
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="ocr-upload-actions">
                <button
                  type="button"
                  className="purchases-cancel-btn"
                  onClick={onClose}
                  disabled={scanning}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="purchases-primary-btn ocr-start-btn"
                  onClick={handleStartOcr}
                  disabled={!selectedFile || scanning}
                >
                  {scanning ? (
                    <>
                      <RefreshCw size={16} className="purchases-spin" />
                      {scanProgress || "Scanning with OCR..."}
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      Scan & Extract Bill
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: REVIEW & CONFIRM SCREEN */}
          {step === "review" && (
            <div className="ocr-review-container">
              {confirmError && (
                <div className="purchases-alert purchases-alert-error">
                  <AlertCircle size={16} />
                  <span>{confirmError}</span>
                </div>
              )}

              {/* SUPPLIER CARD */}
              <div className="ocr-card">
                <div className="ocr-card-header">
                  <div className="ocr-card-title">
                    <Building2 size={16} />
                    Supplier Information
                  </div>
                  <div className="ocr-status-badges">
                    {supplierChoice === "create_new" ? (
                      <span className="ocr-badge ocr-badge-new">
                        New Supplier
                      </span>
                    ) : (
                      <span className="ocr-badge ocr-badge-existing">
                        Existing Supplier
                        {supplierMatchMethod ? ` · ${supplierMatchMethod}` : ""}
                      </span>
                    )}
                  </div>
                </div>

                <div className="ocr-supplier-selector-row">
                  <label className="ocr-radio-label">
                    <input
                      type="radio"
                      name="supplierChoice"
                      checked={supplierChoice === "create_new"}
                      onChange={() => setSupplierChoice("create_new")}
                    />
                    <span>Create New Supplier</span>
                  </label>

                  <label className="ocr-radio-label">
                    <input
                      type="radio"
                      name="supplierChoice"
                      checked={supplierChoice === "choose_existing"}
                      onChange={() => setSupplierChoice("choose_existing")}
                    />
                    <span>Link to Existing Supplier</span>
                  </label>
                </div>

                {supplierChoice === "choose_existing" ? (
                  <div className="purchases-form-grid" style={{ marginTop: 12 }}>
                    <div className="purchases-supplier-field" style={{ gridColumn: "1 / -1" }}>
                      <label>
                        <span>Select Existing Supplier *</span>
                        <select
                          value={selectedSupplierId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSelectedSupplierId(val);
                            const found = suppliers.find((s) => s._id === val);
                            if (found) {
                              setSupplierName(found.name);
                              setSupplierGstin(found.gstNumber || "");
                              setSupplierPhone(found.phone || "");
                              setSupplierAddress(found.address || "");
                            }
                          }}
                        >
                          <option value="">Select a supplier...</option>
                          {suppliers.map((s) => (
                            <option key={s._id} value={s._id}>
                              {s.name} {s.phone ? `(${s.phone})` : ""}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="purchases-form-grid" style={{ marginTop: 12 }}>
                    <div>
                      <label className="ocr-field-label">
                        <span>Supplier Name *</span>
                        {!supplierName && (
                          <span className="ocr-needs-review">Needs review</span>
                        )}
                        <input
                          type="text"
                          value={supplierName}
                          onChange={(e) => setSupplierName(e.target.value)}
                          placeholder="Supplier business name"
                        />
                      </label>
                    </div>

                    <div>
                      <label className="ocr-field-label">
                        <span>GSTIN / GST Number</span>
                        <input
                          type="text"
                          value={supplierGstin}
                          onChange={(e) => setSupplierGstin(e.target.value.toUpperCase())}
                          placeholder="e.g. 27AAAAA0000A1Z5"
                        />
                      </label>
                    </div>

                    <div>
                      <label className="ocr-field-label">
                        <span>Phone</span>
                        <input
                          type="text"
                          value={supplierPhone}
                          onChange={(e) => setSupplierPhone(e.target.value)}
                          placeholder="e.g. 9820012345"
                        />
                      </label>
                    </div>

                    <div>
                      <label className="ocr-field-label">
                        <span>Address</span>
                        <input
                          type="text"
                          value={supplierAddress}
                          onChange={(e) => setSupplierAddress(e.target.value)}
                          placeholder="Supplier address"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* INVOICE DETAILS CARD */}
              <div className="ocr-card">
                <div className="ocr-card-header">
                  <div className="ocr-card-title">
                    <Calendar size={16} />
                    Invoice Details
                  </div>
                  {uploadedFileInfo?.url && (
                    <a
                      href={uploadedFileInfo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ocr-view-original-link"
                    >
                      <ExternalLink size={13} /> View Uploaded Bill
                    </a>
                  )}
                </div>

                <div className="purchases-form-grid">
                  <div>
                    <label className="ocr-field-label">
                      <span>Invoice / Bill Number *</span>
                      {!billNumber && (
                        <span className="ocr-needs-review">Needs review</span>
                      )}
                      <input
                        type="text"
                        value={billNumber}
                        onChange={(e) => setBillNumber(e.target.value)}
                        placeholder="e.g. INV-2024-001"
                      />
                    </label>
                  </div>

                  <div>
                    <label className="ocr-field-label">
                      <span>Invoice Date *</span>
                      {!purchaseDate && (
                        <span className="ocr-needs-review">Needs review</span>
                      )}
                      <input
                        type="date"
                        value={purchaseDate}
                        onChange={(e) => setPurchaseDate(e.target.value)}
                      />
                    </label>
                  </div>

                  <div>
                    <label className="ocr-field-label">
                      <span>Due Date</span>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                      />
                    </label>
                  </div>

                  <div>
                    <label className="ocr-field-label">
                      <span>Notes</span>
                      <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Optional remarks"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* ITEMS TABLE CARD */}
              <div className="ocr-card">
                <div className="ocr-card-header">
                  <div className="ocr-card-title">
                    <FileText size={16} />
                    Invoice Items ({items.length})
                  </div>
                  <button
                    type="button"
                    className="purchases-view-btn"
                    onClick={addNewItem}
                  >
                    <Plus size={14} /> Add Line Item
                  </button>
                </div>

                <div className="ocr-table-wrap">
                  <table className="ocr-items-table">
                    <thead>
                      <tr>
                        <th style={{ minWidth: 200 }}>Product Name / OCR</th>
                        <th style={{ minWidth: 160 }}>Link Product</th>
                        <th style={{ width: 100 }}>HSN</th>
                        <th style={{ width: 80 }}>Qty</th>
                        <th style={{ width: 100 }}>Rate (₹)</th>
                        <th style={{ width: 85 }}>GST %</th>
                        <th style={{ width: 110 }}>Amount (₹)</th>
                        <th style={{ width: 40 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <div className="ocr-item-name-cell">
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) =>
                                  updateItem(item.id, { name: e.target.value })
                                }
                                placeholder="Product name"
                                className="ocr-table-input"
                              />
                              {item.needsReview && (
                                <span className="ocr-needs-review-badge">
                                  Needs review
                                </span>
                              )}
                            </div>
                          </td>

                          <td>
                            <select
                              className="ocr-table-select"
                              value={
                                item.isNewProduct
                                  ? "__NEW__"
                                  : item.selectedProductId
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "__NEW__") {
                                  updateItem(item.id, {
                                    isNewProduct: true,
                                    selectedProductId: "",
                                  });
                                } else {
                                  const prod = products.find(
                                    (p) => p._id === val
                                  );
                                  updateItem(item.id, {
                                    isNewProduct: false,
                                    selectedProductId: val,
                                    name: prod?.name || item.name,
                                    hsnCode: prod?.hsnCode || item.hsnCode,
                                    gstRate: prod?.gstRate || item.gstRate,
                                  });
                                }
                              }}
                            >
                              <option value="__NEW__">
                                ➕ Create New Product
                              </option>
                              <optgroup label="Link to Existing Product">
                                {products.map((p) => (
                                  <option key={p._id} value={p._id}>
                                    {p.name}
                                  </option>
                                ))}
                              </optgroup>
                            </select>
                          </td>

                          <td>
                            <input
                              type="text"
                              value={item.hsnCode}
                              onChange={(e) =>
                                updateItem(item.id, {
                                  hsnCode: e.target.value,
                                })
                              }
                              placeholder="HSN"
                              className="ocr-table-input"
                            />
                          </td>

                          <td>
                            <input
                              type="number"
                              min="1"
                              step="any"
                              value={item.quantity}
                              onChange={(e) =>
                                updateItem(item.id, {
                                  quantity: Number(e.target.value),
                                })
                              }
                              className="ocr-table-input"
                            />
                          </td>

                          <td>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.rate}
                              onChange={(e) =>
                                updateItem(item.id, {
                                  rate: Number(e.target.value),
                                })
                              }
                              className="ocr-table-input"
                            />
                          </td>

                          <td>
                            <select
                              value={item.gstRate}
                              onChange={(e) =>
                                updateItem(item.id, {
                                  gstRate: Number(e.target.value),
                                })
                              }
                              className="ocr-table-select"
                            >
                              <option value={0}>0%</option>
                              <option value={5}>5%</option>
                              <option value={12}>12%</option>
                              <option value={18}>18%</option>
                              <option value={28}>28%</option>
                            </select>
                          </td>

                          <td>
                            <strong>
                              ₹{Number(item.amount || 0).toFixed(2)}
                            </strong>
                          </td>

                          <td>
                            <button
                              type="button"
                              className="ocr-remove-row-btn"
                              onClick={() => removeItem(item.id)}
                              disabled={items.length <= 1}
                              title="Remove item"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SUMMARY & PAYMENT CARD */}
              <div className="ocr-card ocr-summary-card">
                <div className="ocr-summary-grid">
                  {/* Left: Optional Payment Entry */}
                  <div className="ocr-payment-column">
                    <h4>Payment Details (Optional)</h4>
                    <div className="purchases-form-grid">
                      <div>
                        <label className="ocr-field-label">
                          <span>Paid Amount (₹)</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={paidAmount}
                            onChange={(e) => setPaidAmount(e.target.value)}
                            placeholder="0.00"
                          />
                        </label>
                      </div>

                      <div>
                        <label className="ocr-field-label">
                          <span>Payment Method</span>
                          <select
                            value={paymentMethod}
                            onChange={(e: any) =>
                              setPaymentMethod(e.target.value)
                            }
                          >
                            <option value="cash">Cash</option>
                            <option value="upi">UPI</option>
                            <option value="bank">Bank</option>
                            <option value="card">Card</option>
                          </select>
                        </label>
                      </div>

                      <div style={{ gridColumn: "1 / -1" }}>
                        <label className="ocr-field-label">
                          <span>Payment Reference</span>
                          <input
                            type="text"
                            value={paymentReference}
                            onChange={(e) => setPaymentReference(e.target.value)}
                            placeholder="Transaction ID / UTR"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Right: Tax Breakdown & Total */}
                  <div className="ocr-totals-column">
                    <div className="ocr-totals-row">
                      <span>Taxable Subtotal:</span>
                      <strong>₹{taxableAmount.toFixed(2)}</strong>
                    </div>

                    <div className="ocr-totals-row">
                      <span>CGST:</span>
                      <strong>₹{cgst.toFixed(2)}</strong>
                    </div>

                    <div className="ocr-totals-row">
                      <span>SGST:</span>
                      <strong>₹{sgst.toFixed(2)}</strong>
                    </div>

                    <div className="ocr-totals-row">
                      <span>Total GST:</span>
                      <strong>₹{totalTax.toFixed(2)}</strong>
                    </div>

                    <div className="ocr-totals-row">
                      <span>Round Off:</span>
                      <input
                        type="number"
                        step="0.01"
                        value={roundOff}
                        onChange={(e) => setRoundOff(e.target.value)}
                        className="ocr-roundoff-input"
                      />
                    </div>

                    <div className="ocr-totals-row ocr-grand-total-row">
                      <span>Grand Total:</span>
                      <span className="ocr-grand-total-value">
                        ₹{grandTotal.toFixed(2)}
                      </span>
                    </div>

                    {Number(paidAmount) > 0 && (
                      <div className="ocr-totals-row ocr-balance-row">
                        <span>Balance Due:</span>
                        <strong>
                          ₹{Math.max(0, grandTotal - Number(paidAmount)).toFixed(2)}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="ocr-review-actions">
                <button
                  type="button"
                  className="purchases-cancel-btn"
                  onClick={() => setStep("upload")}
                  disabled={confirming}
                >
                  <ArrowLeft size={16} /> Back / Rescan
                </button>

                <div className="ocr-review-actions-right">
                  <button
                    type="button"
                    className="purchases-cancel-btn"
                    onClick={onClose}
                    disabled={confirming}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="purchases-primary-btn"
                    onClick={handleConfirmPurchase}
                    disabled={confirming}
                  >
                    {confirming ? (
                      <>
                        <RefreshCw size={16} className="purchases-spin" />
                        Creating Purchase & Updating Inventory...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        Confirm & Add Purchase
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
