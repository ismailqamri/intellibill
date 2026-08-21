const Purchase = require("../models/Purchase");
const Product = require("../models/Product");
const Ledger = require("../models/Ledger");

// Add Payment To Purchase
exports.addPayment = async (req, res) => {
  try {
    const { amount, method, reference } = req.body;

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

    // Prevent Over Payment
    if (amount > purchase.balanceAmount) {
      return res.status(400).json({
        success: false,
        message: `Only ₹${purchase.balanceAmount} is outstanding`,
      });
    }

    purchase.payments.push({
      amount,
      method,
      reference,
    });

    // Ledger Entry
    await Ledger.create({
      type: "DEBIT",
      amount,
      paymentMethod: method,
      source: "Purchase Payment",
      sourceId: purchase._id,
      description: `Payment for Purchase ${purchase.billNumber}`,
    });

    purchase.paidAmount += amount;
    purchase.balanceAmount = purchase.grandTotal - purchase.paidAmount;

    if (purchase.balanceAmount <= 0) {
      purchase.paymentStatus = "PAID";
      purchase.balanceAmount = 0;
    } else {
      purchase.paymentStatus = "PARTIAL";
    }

    await purchase.save();

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

// Create Purchase
exports.createPurchase = async (req, res) => {
  try {
    const {
      supplier,
      billNumber,
      items,
      taxableAmount,
      cgst,
      sgst,
      igst,
      totalTax,
      grandTotal,
      payments = [],
      dueDate,
      notes,
    } = req.body;

    const paidAmount = payments.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );

    const balanceAmount = grandTotal - paidAmount;

    let paymentStatus = "PENDING";

    if (balanceAmount <= 0) {
      paymentStatus = "PAID";
    } else if (paidAmount > 0) {
      paymentStatus = "PARTIAL";
    }

    const purchase = await Purchase.create({
      supplier,
      billNumber,
      items,
      taxableAmount,
      cgst,
      sgst,
      igst,
      totalTax,
      grandTotal,
      payments,
      paidAmount,
      balanceAmount,
      paymentStatus,
      dueDate,
      notes,
    });

    // Ledger Entries For Initial Payments
    for (const payment of payments) {
      await Ledger.create({
        type: "DEBIT",
        amount: payment.amount,
        paymentMethod: payment.method,
        source: "Purchase Payment",
        sourceId: purchase._id,
        description: `Payment for Purchase ${billNumber}`,
      });
    }

    // Increase Product Stock
    for (const item of items) {
      if (item.product) {
        await Product.findByIdAndUpdate(
          item.product,
          {
            $inc: {
              stock: item.quantity,
            },
          }
        );
      }
    }

    res.status(201).json({
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