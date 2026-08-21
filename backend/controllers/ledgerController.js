const Ledger = require("../models/Ledger");

// Get All Ledger Entries
exports.getLedgerEntries = async (req, res) => {
  try {
    const entries = await Ledger.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: entries.length,
      entries,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Ledger Summary
exports.getLedgerSummary = async (req, res) => {
  try {
    const entries = await Ledger.find();

    let cash = 0;
    let upi = 0;
    let bank = 0;
    let card = 0;

    entries.forEach((entry) => {
      const sign = entry.type === "CREDIT" ? 1 : -1;

      if (entry.paymentMethod === "cash") {
        cash += sign * entry.amount;
      }

      if (entry.paymentMethod === "upi") {
        upi += sign * entry.amount;
      }

      if (entry.paymentMethod === "bank") {
        bank += sign * entry.amount;
      }

      if (entry.paymentMethod === "card") {
        card += sign * entry.amount;
      }
    });

    res.status(200).json({
      success: true,
      balances: {
        cash,
        upi,
        bank,
        card,
        total: cash + upi + bank + card,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};