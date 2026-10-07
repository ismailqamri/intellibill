const Supplier = require("../models/Supplier");
const Purchase = require("../models/Purchase");

// Add Supplier
exports.createSupplier = async (req, res) => {
  try {
    const supplierData = { ...req.body };
    if (req.user && req.user.id) {
      supplierData.user = req.user.id;
    }
    const supplier = await Supplier.create(supplierData);

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
    const query = req.user?.id
      ? { $or: [{ user: req.user.id }, { user: { $exists: false } }] }
      : {};
    const suppliers = await Supplier.find(query).sort({
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

// Update Supplier
exports.updateSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

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

// Delete Supplier
exports.deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndDelete(req.params.id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Supplier deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

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
      totalPurchases += Number(purchase.grandTotal || 0);
      totalPaid += Number(purchase.paidAmount || 0);
      totalOutstanding += Number(purchase.balanceAmount || 0);
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
