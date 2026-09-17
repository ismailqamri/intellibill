
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

// Get All Purchases
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

// Get Single Purchase
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

// Add Payment To Purchase
exports.addPayment = async (req, res) => {
  try {
    const { amount, method, reference } = req.body;

    const paymentAmount = Number(amount);

    // Validate Payment
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

    // Prevent Payment On Fully Paid Purchase
    if (purchase.paymentStatus === "PAID") {
      return res.status(400).json({
        success: false,
        message: "Purchase is already fully paid",
      });
    }

    // Prevent Overpayment
    if (paymentAmount > purchase.balanceAmount) {
      return res.status(400).json({
        success: false,
        message: `Only ₹${purchase.balanceAmount} is outstanding`,
      });
    }

    // Add Payment To Purchase
    purchase.payments.push({
      amount: paymentAmount,
      method,
      reference: reference || "",
    });

    const newPaidAmount = purchase.paidAmount + paymentAmount;
    const newBalanceAmount = Math.max(
      0,
      purchase.grandTotal - newPaidAmount
    );

    // Create Ledger Entry
    await Ledger.create({
      type: "DEBIT",
      amount: paymentAmount,
      paymentMethod: method,
      source: "Purchase Payment",
      sourceId: purchase._id,
      description: `Payment for Purchase ${purchase.billNumber}`,
    });

    // Update Payment Details
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

// Create Purchase
exports.createPurchase = async (req, res) => {
  try {
    const {
      supplier,
      billNumber,
      items,
      taxableAmount,
      cgst = 0,
      sgst = 0,
      igst = 0,
      totalTax,
      grandTotal,
      payments = [],
      dueDate,
      notes,
    } = req.body;

    // Basic Validation
    if (!Array.isArray(payments)) {
      return res.status(400).json({
        success: false,
        message: "Payments must be an array",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Purchase must contain at least one item",
      });
    }

    const purchaseTotal = Number(grandTotal);

    if (!Number.isFinite(purchaseTotal) || purchaseTotal <= 0) {
      return res.status(400).json({
        success: false,
        message: "Grand total must be greater than zero",
      });
    }

    // Validate Initial Payments
    for (const payment of payments) {
      const validationError = validatePayment(payment);

      if (validationError) {
        return res.status(400).json({
          success: false,
          message: validationError,
        });
      }
    }

    // Calculate Direct Payments
    const paidAmount = payments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0
    );

    // Prevent Initial Overpayment
    if (paidAmount > purchaseTotal) {
      return res.status(400).json({
        success: false,
        message: `Initial payments cannot exceed the purchase total of ₹${purchaseTotal}`,
      });
    }

    // Supplier Credit Logic
    let creditUsed = 0;
    let totalPaidAmount = paidAmount;

    const credits = await SupplierCredit.find({
      supplier,
      remainingAmount: { $gt: 0 },
    }).sort({ createdAt: 1 });

    let remainingPurchaseAmount = purchaseTotal - paidAmount;

    for (const credit of credits) {
      if (remainingPurchaseAmount <= 0) {
        break;
      }

      const useAmount = Math.min(
        credit.remainingAmount,
        remainingPurchaseAmount
      );

      credit.remainingAmount -= useAmount;

      await credit.save();

      creditUsed += useAmount;
      remainingPurchaseAmount -= useAmount;
    }

    totalPaidAmount += creditUsed;

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

    // Create Purchase
    const purchase = await Purchase.create({
      supplier,
      billNumber,
      items,
      taxableAmount,
      cgst,
      sgst,
      igst,
      totalTax,
      grandTotal: purchaseTotal,
      payments,
      paidAmount: totalPaidAmount,
      creditUsed,
      balanceAmount,
      paymentStatus,
      dueDate,
      notes,
    });

    // Ledger Entries For Direct Payments
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

    // Increase Product Stock
    for (const item of items) {
      if (item.product) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: {
            stock: item.quantity,
          },
        });
      }
    }

    res.status(201).json({
      success: true,
      message: "Purchase created successfully",
      creditUsed,
      purchase,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};