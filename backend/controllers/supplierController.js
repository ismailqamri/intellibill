const Supplier = require("../models/Supplier");

const Purchase = require("../models/Purchase");

// Supplier Outstanding Summary
exports.getSupplierSummary = async (req, res) => {
  try {
    const supplierId = req.params.id;

    const purchases = await Purchase.find({
      supplier: supplierId,
    });

    let totalPurchases = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;

    purchases.forEach((purchase) => {
      totalPurchases += purchase.grandTotal;
      totalPaid += purchase.paidAmount;
      totalOutstanding += purchase.balanceAmount;
    });

    res.status(200).json({
      success: true,
      supplierId,
      totalBills: purchases.length,
      totalPurchases,
      totalPaid,
      totalOutstanding,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Add Supplier
exports.createSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.create(req.body);

    res.status(201).json({
      success: true,
      supplier,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get All Suppliers
exports.getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: suppliers.length,
      suppliers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get Single Supplier
exports.getSupplierById = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    res.status(200).json({
      success: true,
      supplier,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};