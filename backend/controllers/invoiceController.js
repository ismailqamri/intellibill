const Invoice = require("../models/Invoice");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const CompanySettings = require("../models/CompanySettings");
const CustomerAdvance = require("../models/CustomerAdvance");
const Ledger = require("../models/Ledger");

// Get All Invoices
exports.getInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find()
      .populate("customer")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: invoices.length,
      invoices,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get Single Invoice
exports.getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate("customer");

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    res.status(200).json({
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

// Add Payment To Invoice
exports.addInvoicePayment = async (req, res) => {
  try {
    const { amount, method, reference } = req.body;

    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    if (invoice.paymentStatus === "PAID") {
      return res.status(400).json({
        success: false,
        message: "Invoice is already fully paid",
      });
    }

    if (amount > invoice.balanceAmount) {
      return res.status(400).json({
        success: false,
        message: `Only ₹${invoice.balanceAmount} is outstanding`,
      });
    }

    invoice.payments.push({
      method,
      amount,
      reference,
    });

    invoice.paidAmount += amount;
    invoice.balanceAmount =
      invoice.grandTotal - invoice.paidAmount;

    if (invoice.balanceAmount <= 0) {
      invoice.balanceAmount = 0;
      invoice.paymentStatus = "PAID";
    } else {
      invoice.paymentStatus = "PARTIAL";
    }

    await invoice.save();

    await Ledger.create({
      type: "CREDIT",
      amount,
      paymentMethod: method,
      source: "Invoice Payment",
      sourceId: invoice._id,
      description: `Payment for Invoice ${invoice.invoiceNumber}`,
    });

    res.status(200).json({
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

// Create Invoice
exports.createInvoice = async (req, res) => {
  try {
    const {
      customerId,
      items,
      paidAmount = 0,
      paymentMethod,
      useAdvance = false,
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

      // Stock Validation
      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `${product.name} has only ${product.stock} units available`,
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

// Prevent Overpayment
if (paidAmount > grandTotal) {
  return res.status(400).json({
    success: false,
    message: `Paid amount cannot exceed invoice total ₹${grandTotal}`,
  });
}

// Customer Advance Logic
let advanceUsed = 0;
let totalPaidAmount = paidAmount;

if (useAdvance) {
  const advances = await CustomerAdvance.find({
    customer: customerId,
    remainingAmount: { $gt: 0 },
  }).sort({ createdAt: 1 });

  let remainingInvoiceAmount =
    grandTotal - paidAmount;

  for (const advance of advances) {
    if (remainingInvoiceAmount <= 0) break;

    const useAmount = Math.min(
      advance.remainingAmount,
      remainingInvoiceAmount
    );

    advance.remainingAmount -= useAmount;
    await advance.save();

    advanceUsed += useAmount;
    remainingInvoiceAmount -= useAmount;
  }

  totalPaidAmount += advanceUsed;
}

const balanceAmount = Math.max(
  0,
  grandTotal - totalPaidAmount
);

    let paymentStatus = "PENDING";

    if (balanceAmount <= 0) {
      paymentStatus = "PAID";
    } else if (totalPaidAmount > 0) {
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

      paidAmount: totalPaidAmount,

      payments:
        paidAmount > 0
          ? [
              {
                method: paymentMethod,
                amount: paidAmount,
                reference: "",
              },
            ]
          : [],

      balanceAmount,
      paymentStatus,

      dueDate,
      notes,
    });

    // Reduce Product Stock
    for (const item of items) {
      await Product.findByIdAndUpdate(
        item.productId,
        {
          $inc: {
            stock: -item.quantity,
          },
        }
      );
    }

    // Ledger Entry for Direct Payment
    if (paidAmount > 0) {
      await Ledger.create({
        type: "CREDIT",
        amount: paidAmount,
        paymentMethod,
        source: "Invoice Payment",
        sourceId: invoice._id,
        description: `Payment for Invoice ${invoiceNumber}`,
      });
    }

    // Increment Invoice Number
    settings.currentInvoiceNumber += 1;
    await settings.save();

    res.status(201).json({
      success: true,
      advanceUsed,
      invoice,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};