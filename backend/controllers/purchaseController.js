const Purchase = require("../models/Purchase");
const Product = require("../models/Product");
const Supplier = require("../models/Supplier");
const Ledger = require("../models/Ledger");
const SupplierCredit = require("../models/SupplierCredit");
const ocrService = require("../services/ocrService");
const matchingService = require("../services/matchingService");

const VALID_PAYMENT_METHODS = ["cash", "upi", "bank", "card"];

// Validate Payment Details
const validatePayment = (payment) => {
  if (!payment || typeof payment !== "object") {
    return "Each payment must be a valid object";
  }

  const amount = Number(payment.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    return "Payment amount must be greater than zero";
  }

  if (!VALID_PAYMENT_METHODS.includes(payment.method)) {
    return `Payment method must be one of: ${VALID_PAYMENT_METHODS.join(
      ", "
    )}`;
  }

  if (
    payment.reference !== undefined &&
    payment.reference !== null &&
    typeof payment.reference !== "string"
  ) {
    return "Payment reference must be a string";
  }

  return null;
};

// ======================================================
// GET ALL PURCHASES
// ======================================================

exports.getPurchases = async (req, res) => {
  try {
    const query = req.user?.id
      ? { $or: [{ user: req.user.id }, { user: { $exists: false } }] }
      : {};
    const purchases = await Purchase.find(query)
      .populate("supplier")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: purchases.length,
      purchases,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================================
// GET SINGLE PURCHASE
// ======================================================

exports.getPurchaseById = async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id)
      .populate("supplier");

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found",
      });
    }

    res.status(200).json({
      success: true,
      purchase,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================================
// ADD PAYMENT TO PURCHASE
// ======================================================

exports.addPayment = async (req, res) => {
  try {
    const { amount, method, reference } = req.body;

    const paymentAmount = Number(amount);

    const validationError = validatePayment({
      amount: paymentAmount,
      method,
      reference,
    });

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const purchase = await Purchase.findById(req.params.id);

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found",
      });
    }

    // Prevent payment on fully paid purchase
    if (purchase.paymentStatus === "PAID") {
      return res.status(400).json({
        success: false,
        message: "Purchase is already fully paid",
      });
    }

    // Prevent overpayment
    if (paymentAmount > purchase.balanceAmount) {
      return res.status(400).json({
        success: false,
        message: `Only ₹${purchase.balanceAmount} is outstanding`,
      });
    }

    // Add payment
    purchase.payments.push({
      amount: paymentAmount,
      method,
      reference: reference || "",
    });

    const newPaidAmount =
      Number(purchase.paidAmount || 0) + paymentAmount;

    const newBalanceAmount = Math.max(
      0,
      Number(purchase.grandTotal || 0) - newPaidAmount
    );

    // Ledger entry
    await Ledger.create({
      type: "DEBIT",
      amount: paymentAmount,
      paymentMethod: method,
      source: "Purchase Payment",
      sourceId: purchase._id,
      description: `Payment for Purchase ${purchase.billNumber}`,
    });

    purchase.paidAmount = newPaidAmount;
    purchase.balanceAmount = newBalanceAmount;

    if (newBalanceAmount === 0) {
      purchase.paymentStatus = "PAID";
    } else {
      purchase.paymentStatus = "PARTIAL";
    }

    await purchase.save();

    res.status(200).json({
      success: true,
      message: "Payment added successfully",
      purchase,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================================
// CREATE PURCHASE
// ======================================================

exports.createPurchase = async (req, res) => {
  try {
    const {
      supplier,
      billNumber,
      purchaseDate,
      items,
      taxableAmount,
      cgst = 0,
      sgst = 0,
      igst = 0,
      totalTax,
      roundOff = 0,
      grandTotal,
      payments = [],
      dueDate,
      notes,
      billFileUrl = "",
      billOriginalName = "",
    } = req.body;

    // --------------------------------------------------
    // BASIC VALIDATION
    // --------------------------------------------------

    if (!supplier) {
      return res.status(400).json({
        success: false,
        message: "Supplier is required",
      });
    }

    if (!billNumber || !billNumber.trim()) {
      return res.status(400).json({
        success: false,
        message: "Bill number is required",
      });
    }

    if (!purchaseDate) {
      return res.status(400).json({
        success: false,
        message: "Purchase date is required",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Purchase must contain at least one item",
      });
    }

    if (!Array.isArray(payments)) {
      return res.status(400).json({
        success: false,
        message: "Payments must be an array",
      });
    }

    const purchaseTotal = Number(grandTotal);

    if (!Number.isFinite(purchaseTotal) || purchaseTotal <= 0) {
      return res.status(400).json({
        success: false,
        message: "Grand total must be greater than zero",
      });
    }

    // --------------------------------------------------
    // VALIDATE ITEMS
    // --------------------------------------------------

    for (const item of items) {
      if (!item.product) {
        return res.status(400).json({
          success: false,
          message:
            "Every purchase item must be linked to an inventory product",
        });
      }

      if (!item.productName || !item.productName.trim()) {
        return res.status(400).json({
          success: false,
          message: "Product name is required",
        });
      }

      const quantity = Number(item.quantity);
      const rate = Number(item.rate);

      if (!Number.isFinite(quantity) || quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid quantity for ${item.productName}`,
        });
      }

      if (!Number.isFinite(rate) || rate < 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid purchase rate for ${item.productName}`,
        });
      }
    }

    // --------------------------------------------------
    // VALIDATE PAYMENTS
    // --------------------------------------------------

    for (const payment of payments) {
      const validationError = validatePayment(payment);

      if (validationError) {
        return res.status(400).json({
          success: false,
          message: validationError,
        });
      }
    }

    // --------------------------------------------------
    // CALCULATE PAID AMOUNT
    // --------------------------------------------------

    const paidAmount = payments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0
    );

    if (paidAmount > purchaseTotal) {
      return res.status(400).json({
        success: false,
        message: `Initial payments cannot exceed the purchase total of ₹${purchaseTotal}`,
      });
    }

    // --------------------------------------------------
    // SUPPLIER CREDIT
    // --------------------------------------------------

    let creditUsed = 0;
    let totalPaidAmount = paidAmount;

    const credits = await SupplierCredit.find({
      supplier,
      remainingAmount: { $gt: 0 },
    }).sort({ createdAt: 1 });

    let remainingPurchaseAmount =
      purchaseTotal - paidAmount;

    for (const credit of credits) {
      if (remainingPurchaseAmount <= 0) {
        break;
      }

      const useAmount = Math.min(
        Number(credit.remainingAmount),
        remainingPurchaseAmount
      );

      credit.remainingAmount -= useAmount;

      await credit.save();

      creditUsed += useAmount;
      remainingPurchaseAmount -= useAmount;
    }

    totalPaidAmount += creditUsed;

    // --------------------------------------------------
    // BALANCE
    // --------------------------------------------------

    const balanceAmount = Math.max(
      0,
      purchaseTotal - totalPaidAmount
    );

    let paymentStatus = "PENDING";

    if (balanceAmount === 0) {
      paymentStatus = "PAID";
    } else if (totalPaidAmount > 0) {
      paymentStatus = "PARTIAL";
    }

    // --------------------------------------------------
    // CREATE PURCHASE
    // --------------------------------------------------

    const purchase = await Purchase.create({
      supplier,
      billNumber: billNumber.trim(),
      purchaseDate,
      items,
      taxableAmount: Number(taxableAmount) || 0,
      cgst: Number(cgst) || 0,
      sgst: Number(sgst) || 0,
      igst: Number(igst) || 0,
      totalTax: Number(totalTax) || 0,
      roundOff: Number(roundOff) || 0,
      grandTotal: purchaseTotal,
      payments,
      paidAmount: totalPaidAmount,
      creditUsed,
      balanceAmount,
      paymentStatus,
      dueDate,
      notes: notes || "",
      billFileUrl: billFileUrl || "",
      billOriginalName: billOriginalName || "",
      user: req.user?.id,
    });

    // --------------------------------------------------
    // LEDGER ENTRIES
    // --------------------------------------------------

    for (const payment of payments) {
      await Ledger.create({
        type: "DEBIT",
        amount: Number(payment.amount),
        paymentMethod: payment.method,
        source: "Purchase Payment",
        sourceId: purchase._id,
        description: `Payment for Purchase ${billNumber}`,
      });
    }

    // --------------------------------------------------
    // INCREASE INVENTORY STOCK
    // --------------------------------------------------

    for (const item of items) {
      await Product.findByIdAndUpdate(
        item.product,
        {
          $inc: {
            stock: Number(item.quantity),
          },
        },
        {
          new: true,
        }
      );
    }

    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    res.status(201).json({
      success: true,
      message: "Purchase created successfully",
      creditUsed,
      purchase,
    });
  } catch (error) {
    console.error("Create Purchase Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================================
// SCAN PURCHASE BILL (OCR ONLY - NO DB MUTATION)
// ======================================================

exports.scanPurchaseBill = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload an invoice bill file (JPG, PNG, WEBP, or PDF)",
      });
    }

    const fileInfo = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: `/uploads/bills/${req.file.filename}`,
    };

    // 1. Process invoice through OCR service
    const { rawText, normalized, confidence } = await ocrService.processInvoice(
      req.file.path,
      req.file.mimetype
    );

    // 2. Match supplier against logged-in user's suppliers
    const matchedSupplierResult = await matchingService.matchSupplier(
      normalized.supplier,
      req.user?.id
    );

    // 3. Match items against logged-in user's products
    const matchedItems = await matchingService.matchProducts(
      normalized.items,
      req.user?.id
    );

    return res.status(200).json({
      success: true,
      message: "Bill processed successfully for review",
      file: fileInfo,
      rawText,
      extracted: normalized,
      supplierMatch: matchedSupplierResult,
      matchedItems,
      confidence,
    });
  } catch (error) {
    console.error("OCR Scan Error:", error);
    return res.status(500).json({
      success: false,
      message:
        "Failed to scan and extract invoice information. Please ensure the file is clear or enter the bill manually.",
    });
  }
};

// ======================================================
// CONFIRM OCR PURCHASE (CREATES SUPPLIER/PRODUCTS & PURCHASE)
// ======================================================

exports.confirmOcrPurchase = async (req, res) => {
  try {
    const {
      supplier,
      billNumber,
      purchaseDate,
      items,
      taxableAmount,
      cgst = 0,
      sgst = 0,
      igst = 0,
      totalTax,
      roundOff = 0,
      grandTotal,
      payments = [],
      dueDate,
      notes,
      billFileUrl = "",
      billOriginalName = "",
    } = req.body;

    const userId = req.user?.id;

    // 1. Basic validation
    if (!billNumber || !billNumber.trim()) {
      return res.status(400).json({
        success: false,
        message: "Bill / Invoice number is required",
      });
    }

    if (!purchaseDate) {
      return res.status(400).json({
        success: false,
        message: "Purchase date is required",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Purchase must contain at least one item",
      });
    }

    // 2. Resolve Supplier (Existing or New)
    let finalSupplierId = null;
    let finalSupplierName = "";

    if (!supplier) {
      return res.status(400).json({
        success: false,
        message: "Supplier is required",
      });
    }

    const isNewSupplier =
      supplier.isNew === true ||
      supplier.status === "NEW" ||
      (!supplier._id && supplier.name);

    if (isNewSupplier) {
      const sName = (supplier.name || "").trim();
      if (!sName) {
        return res.status(400).json({
          success: false,
          message: "Supplier name is required for new supplier",
        });
      }

      // Check for existing supplier with same GSTIN or phone for this user
      const existingQuery = [];
      if (supplier.gstin) {
        existingQuery.push({ gstNumber: supplier.gstin.trim() });
      }
      if (supplier.phone && supplier.phone !== "N/A") {
        existingQuery.push({ phone: supplier.phone.trim() });
      }

      let existingSupplier = null;
      if (existingQuery.length > 0) {
        existingSupplier = await Supplier.findOne({
          $and: [
            matchingService.getUserFilter(userId),
            { $or: existingQuery },
          ],
        });
      }

      if (existingSupplier) {
        finalSupplierId = existingSupplier._id;
        finalSupplierName = existingSupplier.name;
      } else {
        const createdSupplier = await Supplier.create({
          name: sName,
          phone:
            supplier.phone && supplier.phone.trim()
              ? supplier.phone.trim()
              : "N/A",
          whatsappNumber: supplier.whatsappNumber || "",
          email: supplier.email || "",
          address: supplier.address || "",
          gstNumber: supplier.gstin || supplier.gstNumber || "",
          creditDays: Number(supplier.creditDays) || 0,
          notes: supplier.notes || "Created via OCR scan",
          isActive: true,
          user: userId,
        });
        finalSupplierId = createdSupplier._id;
        finalSupplierName = createdSupplier.name;
      }
    } else {
      finalSupplierId = supplier._id || supplier;
      const existingSupplier = await Supplier.findById(finalSupplierId);
      if (!existingSupplier) {
        return res.status(404).json({
          success: false,
          message: "Supplier not found",
        });
      }
      finalSupplierName = existingSupplier.name;
    }

    // 3. Resolve Products (Existing or New)
    const processedItems = [];

    for (const rawItem of items) {
      const isNewProduct =
        rawItem.isNew === true ||
        rawItem.status === "NEW" ||
        (!rawItem.product && rawItem.name);

      let productId = rawItem.product;
      let productName = rawItem.productName || rawItem.name;

      if (isNewProduct) {
        if (!productName || !productName.trim()) {
          return res.status(400).json({
            success: false,
            message: "Product name is required",
          });
        }

        // Check if matching product already exists for this user
        let existingProd = await Product.findOne({
          $and: [
            matchingService.getUserFilter(userId),
            { name: new RegExp(`^${productName.trim()}$`, "i") },
          ],
        });

        if (existingProd) {
          productId = existingProd._id;
          productName = existingProd.name;
        } else {
          const itemRate = Number(rawItem.rate) || 0;
          const sellingPrice =
            Number(rawItem.price) ||
            Number(rawItem.mrp) ||
            Math.round(itemRate * 1.25 * 100) / 100;

          const createdProduct = await Product.create({
            name: productName.trim(),
            category: rawItem.category?.trim() || "General",
            price: sellingPrice,
            stock: 0, // Will be incremented by purchase!
            reorderLevel: Number(rawItem.reorderLevel) || 10,
            supplier: finalSupplierName,
            gstRate: Number(rawItem.gstRate) || 18,
            hsnCode: rawItem.hsnCode || "",
            user: userId,
          });

          productId = createdProduct._id;
          productName = createdProduct.name;
        }
      } else {
        const existingProd = await Product.findById(productId);
        if (!existingProd) {
          return res.status(404).json({
            success: false,
            message: `Product not found for ${productName}`,
          });
        }
        productName = existingProd.name;
      }

      const quantity = Number(rawItem.quantity);
      const rate = Number(rawItem.rate);

      if (!Number.isFinite(quantity) || quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid quantity for ${productName}`,
        });
      }

      if (!Number.isFinite(rate) || rate < 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid rate for ${productName}`,
        });
      }

      const discountPercent = Number(rawItem.discountPercent) || 0;
      const discountAmount =
        Number(rawItem.discountAmount) ||
        Math.round(quantity * rate * (discountPercent / 100) * 100) / 100;
      const gstRate = Number(rawItem.gstRate) || 0;
      const lineTaxable =
        Number(rawItem.amount) ||
        Math.round((quantity * rate - discountAmount) * 100) / 100;

      processedItems.push({
        product: productId,
        productName,
        quantity,
        rate,
        discountPercent,
        discountAmount,
        gstRate,
        amount: lineTaxable,
        hsnCode: rawItem.hsnCode || "",
      });
    }

    // 4. Validate grand total & payments
    const purchaseTotal = Number(grandTotal);
    if (!Number.isFinite(purchaseTotal) || purchaseTotal <= 0) {
      return res.status(400).json({
        success: false,
        message: "Grand total must be greater than zero",
      });
    }

    for (const payment of payments) {
      const validationError = validatePayment(payment);
      if (validationError) {
        return res.status(400).json({
          success: false,
          message: validationError,
        });
      }
    }

    const paidAmount = payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0
    );

    if (paidAmount > purchaseTotal) {
      return res.status(400).json({
        success: false,
        message: `Paid amount (₹${paidAmount}) cannot exceed purchase total (₹${purchaseTotal})`,
      });
    }

    // 5. Credit consumption
    let creditUsed = 0;
    let totalPaidAmount = paidAmount;

    const credits = await SupplierCredit.find({
      supplier: finalSupplierId,
      remainingAmount: { $gt: 0 },
    }).sort({ createdAt: 1 });

    let remainingPurchaseAmount = purchaseTotal - paidAmount;

    for (const credit of credits) {
      if (remainingPurchaseAmount <= 0) break;
      const useAmount = Math.min(
        Number(credit.remainingAmount),
        remainingPurchaseAmount
      );
      credit.remainingAmount -= useAmount;
      await credit.save();
      creditUsed += useAmount;
      remainingPurchaseAmount -= useAmount;
    }

    totalPaidAmount += creditUsed;
    const balanceAmount = Math.max(0, purchaseTotal - totalPaidAmount);

    let paymentStatus = "PENDING";
    if (balanceAmount === 0) {
      paymentStatus = "PAID";
    } else if (totalPaidAmount > 0) {
      paymentStatus = "PARTIAL";
    }

    // 6. Create Purchase
    const purchase = await Purchase.create({
      supplier: finalSupplierId,
      billNumber: billNumber.trim(),
      purchaseDate,
      items: processedItems,
      taxableAmount: Number(taxableAmount) || 0,
      cgst: Number(cgst) || 0,
      sgst: Number(sgst) || 0,
      igst: Number(igst) || 0,
      totalTax: Number(totalTax) || 0,
      roundOff: Number(roundOff) || 0,
      grandTotal: purchaseTotal,
      payments,
      paidAmount: totalPaidAmount,
      creditUsed,
      balanceAmount,
      paymentStatus,
      dueDate,
      notes: notes || "",
      billFileUrl: billFileUrl || "",
      billOriginalName: billOriginalName || "",
      user: userId,
    });

    // 7. Ledger Entries
    for (const payment of payments) {
      await Ledger.create({
        type: "DEBIT",
        amount: Number(payment.amount),
        paymentMethod: payment.method,
        source: "Purchase Payment",
        sourceId: purchase._id,
        description: `Payment for Purchase ${billNumber.trim()}`,
      });
    }

    // 8. Increase Inventory Stock
    for (const item of processedItems) {
      await Product.findByIdAndUpdate(
        item.product,
        {
          $inc: {
            stock: Number(item.quantity),
          },
        },
        { new: true }
      );
    }

    return res.status(201).json({
      success: true,
      message: "Purchase confirmed and created successfully",
      creditUsed,
      purchase,
    });
  } catch (error) {
    console.error("Confirm OCR Purchase Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to confirm and create purchase",
    });
  }
};