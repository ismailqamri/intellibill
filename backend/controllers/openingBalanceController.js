const OpeningBalance = require("../models/OpeningBalance");
const Ledger = require("../models/Ledger");

exports.createOpeningBalance = async (req, res) => {
  try {
    const { cash = 0, upi = 0, bank = 0 } = req.body;

    const existing = await OpeningBalance.findOne();

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Opening balance already exists",
      });
    }

    const openingBalance = await OpeningBalance.create({
      cash,
      upi,
      bank,
    });

    if (cash > 0) {
      await Ledger.create({
        type: "CREDIT",
        amount: cash,
        paymentMethod: "cash",
        source: "Opening Balance",
        description: "Opening Cash Balance",
      });
    }

    if (upi > 0) {
      await Ledger.create({
        type: "CREDIT",
        amount: upi,
        paymentMethod: "upi",
        source: "Opening Balance",
        description: "Opening UPI Balance",
      });
    }

    if (bank > 0) {
      await Ledger.create({
        type: "CREDIT",
        amount: bank,
        paymentMethod: "bank",
        source: "Opening Balance",
        description: "Opening Bank Balance",
      });
    }

    res.status(201).json({
      success: true,
      openingBalance,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getOpeningBalance = async (req, res) => {
  try {
    const openingBalance = await OpeningBalance.findOne();

    res.status(200).json({
      success: true,
      openingBalance,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};