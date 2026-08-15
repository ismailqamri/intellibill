const Invoice = require("../models/Invoice");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const CompanySettings = require("../models/CompanySettings");

// Create Invoice
exports.createInvoice = async (req, res) => {
  try {
    const {
      customerId,
      items,
      paidAmount = 0,
      dueDate,
      notes,
    } = req.body;

    // Check Customer
    const customer = await Customer.findById(customerId);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Get Company Settings
    const settings = await CompanySettings.findOne();

    if (!settings) {
      return res.status(400).json({
        success: false,
        message: "Company settings not found",
      });
    }

    let taxableAmount = 0;
    let totalTax = 0;

    const invoiceItems = [];

    // Process Products
    for (const item of items) {
      const product = await Product.findById(item.productId);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.productId}`,
        });
      }

      const amount = product.price * item.quantity;

      const taxAmount =
        amount * (product.gstRate / 100);

      taxableAmount += amount;
      totalTax += taxAmount;

      invoiceItems.push({
        product: product._id,
        productName: product.name,
        quantity: item.quantity,
        rate: product.price,
        gstRate: product.gstRate,
        hsnCode: product.hsnCode,
        amount,
      });
    }

    const cgst = totalTax / 2;
    const sgst = totalTax / 2;

    const grandTotal = taxableAmount + totalTax;

    const balanceAmount = grandTotal - paidAmount;

    let paymentStatus = "PENDING";

    if (balanceAmount <= 0) {
      paymentStatus = "PAID";
    } else if (
      paidAmount > 0 &&
      paidAmount < grandTotal
    ) {
      paymentStatus = "PARTIAL";
    }

    // Generate Invoice Number
    const invoiceNumber =
      `${settings.currentInvoiceNumber}/${settings.financialYear}`;

    const invoice = await Invoice.create({
      invoiceNumber,
      customer: customer._id,
      items: invoiceItems,

      taxableAmount,
      cgst,
      sgst,
      totalTax,
      grandTotal,

      paidAmount,
      balanceAmount,
      paymentStatus,

      dueDate,
      notes,
    });

    // Increment Invoice Number
    settings.currentInvoiceNumber += 1;
    await settings.save();

    res.status(201).json({
      success: true,
      invoice,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};