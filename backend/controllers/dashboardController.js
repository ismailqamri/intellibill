const Invoice = require("../models/Invoice");
const Purchase = require("../models/Purchase");
const Product = require("../models/Product");
const Ledger = require("../models/Ledger");

exports.getDashboard = async (req, res) => {
  try {
    // Today's Date
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Today's Sales
    const todayInvoices = await Invoice.find({
      createdAt: { $gte: startOfDay },
    });

    const todaySales = todayInvoices.reduce(
      (sum, invoice) => sum + invoice.grandTotal,
      0
    );

    // Today's Purchases
    const todayPurchasesData = await Purchase.find({
      createdAt: { $gte: startOfDay },
    });

    const todayPurchases = todayPurchasesData.reduce(
      (sum, purchase) => sum + purchase.grandTotal,
      0
    );

    // Ledger Balances
    const ledgerEntries = await Ledger.find();

    let cashBalance = 0;
    let upiBalance = 0;
    let bankBalance = 0;
    let cardBalance = 0;

    ledgerEntries.forEach((entry) => {
      const sign = entry.type === "CREDIT" ? 1 : -1;

      if (entry.paymentMethod === "cash") {
        cashBalance += sign * entry.amount;
      }

      if (entry.paymentMethod === "upi") {
        upiBalance += sign * entry.amount;
      }

      if (entry.paymentMethod === "bank") {
        bankBalance += sign * entry.amount;
      }

      if (entry.paymentMethod === "card") {
        cardBalance += sign * entry.amount;
      }
    });

    // Customer Outstanding
    const invoices = await Invoice.find();

    const customerOutstanding = invoices.reduce(
      (sum, invoice) => sum + invoice.balanceAmount,
      0
    );

    // Supplier Outstanding
    const purchases = await Purchase.find();

    const supplierOutstanding = purchases.reduce(
      (sum, purchase) => sum + purchase.balanceAmount,
      0
    );

    // Low Stock Products
    const lowStockProducts = await Product.countDocuments({
      $expr: {
        $and: [
          { $gt: ["$stock", 0] },
          { $lte: ["$stock", "$reorderLevel"] },
        ],
      },
    });

    res.status(200).json({
      success: true,

      dashboard: {
        todaySales,
        todayPurchases,

        cashBalance,
        upiBalance,
        bankBalance,
        cardBalance,

        customerOutstanding,
        supplierOutstanding,

        lowStockProducts,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};