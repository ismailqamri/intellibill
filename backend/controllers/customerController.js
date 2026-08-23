const Customer = require("../models/Customer");
const Invoice = require("../models/Invoice");

// Create Customer
exports.createCustomer = async (req, res) => {
  try {
    const customer = await Customer.create(req.body);

    res.status(201).json({
      success: true,
      customer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get All Customers
exports.getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find();

    res.json({
      success: true,
      count: customers.length,
      customers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Customer Summary
exports.getCustomerSummary = async (req, res) => {
  try {
    const invoices = await Invoice.find({
      customer: req.params.id,
    });

    const totalInvoices = invoices.length;

    const totalSales = invoices.reduce(
      (sum, invoice) => sum + invoice.grandTotal,
      0
    );

    const totalPaid = invoices.reduce(
      (sum, invoice) => sum + invoice.paidAmount,
      0
    );

    const totalOutstanding = invoices.reduce(
      (sum, invoice) => sum + invoice.balanceAmount,
      0
    );

    res.status(200).json({
      success: true,
      customerId: req.params.id,
      totalInvoices,
      totalSales,
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