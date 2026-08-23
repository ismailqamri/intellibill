const SupplierCredit = require("../models/SupplierCredit");

// Get All Supplier Credits
exports.getSupplierCredits = async (req, res) => {
  try {
    const credits = await SupplierCredit.find()
      .populate("supplier")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: credits.length,
      credits,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Supplier Credit Summary
exports.getSupplierCreditSummary = async (
  req,
  res
) => {
  try {
    const credits = await SupplierCredit.find({
      supplier: req.params.id,
    });

    const totalCredit = credits.reduce(
      (sum, credit) => sum + credit.amount,
      0
    );

    const remainingCredit = credits.reduce(
      (sum, credit) =>
        sum + credit.remainingAmount,
      0
    );

    res.status(200).json({
      success: true,
      supplierId: req.params.id,
      totalCredit,
      remainingCredit,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};