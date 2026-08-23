// controllers/invoiceEditController.js

const Invoice = require("../models/Invoice");
const Product = require("../models/Product");

exports.updateInvoice = async (req, res) => {
  try {
    const { items, notes } = req.body;

    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    // Restore Old Stock
    for (const item of invoice.items) {
      await Product.findByIdAndUpdate(
        item.product,
        {
          $inc: {
            stock: item.quantity,
          },
        }
      );
    }

    let taxableAmount = 0;
    let totalTax = 0;

    const invoiceItems = [];

    // Process New Items
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

    // Reduce Stock Again
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

    // Recalculate Payment Status
    let balanceAmount =
      grandTotal - invoice.paidAmount;

    if (balanceAmount < 0) {
      balanceAmount = 0;
    }

    let paymentStatus = "PENDING";

    if (balanceAmount === 0) {
      paymentStatus = "PAID";
    } else if (invoice.paidAmount > 0) {
      paymentStatus = "PARTIAL";
    }

    invoice.items = invoiceItems;
    invoice.taxableAmount = taxableAmount;
    invoice.cgst = cgst;
    invoice.sgst = sgst;
    invoice.totalTax = totalTax;
    invoice.grandTotal = grandTotal;
    invoice.balanceAmount = balanceAmount;
    invoice.paymentStatus = paymentStatus;

    if (notes) {
      invoice.notes = notes;
    }

    await invoice.save();

    res.status(200).json({
      success: true,
      message: "Invoice updated successfully",
      invoice,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};