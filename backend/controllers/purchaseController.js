const Purchase = require("../models/Purchase");
const Product = require("../models/Product");
const Ledger = require("../models/Ledger");
const SupplierCredit = require("../models/SupplierCredit");

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
    const purchases = await Purchase.find()
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