const CustomerAdvance = require("../models/CustomerAdvance");
const Ledger = require("../models/Ledger");

// Create Customer Advance
exports.createAdvance = async (req, res) => {
  try {
    const {
      customer,
      amount,
      paymentMethod,
      reference,
      notes,
    } = req.body;

    const advance = await CustomerAdvance.create({
      customer,
      amount,
      remainingAmount: amount,
      paymentMethod,
      reference,
      notes,
    });

    // Ledger Entry
    await Ledger.create({
      type: "CREDIT",
      amount,
      paymentMethod,
      source: "Customer Advance",
      sourceId: advance._id,
      description: "Customer Advance Received",
    });

    res.status(201).json({
      success: true,
      advance,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get All Advances
exports.getAdvances = async (req, res) => {
  try {
    const advances = await CustomerAdvance.find()
      .populate("customer")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: advances.length,
      advances,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Customer Advance Summary
exports.getCustomerAdvanceSummary = async (req, res) => {
  try {
    const advances = await CustomerAdvance.find({
      customer: req.params.id,
    });

    const totalAdvance = advances.reduce(
      (sum, advance) => sum + advance.amount,
      0
    );

    const remainingAdvance = advances.reduce(
      (sum, advance) => sum + advance.remainingAmount,
      0
    );

    res.status(200).json({
      success: true,
      customerId: req.params.id,
      totalAdvance,
      remainingAdvance,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};