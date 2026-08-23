const SalesReturn = require("../models/SalesReturn");
const Invoice = require("../models/Invoice");
const Product = require("../models/Product");
const CustomerAdvance = require("../models/CustomerAdvance");
const Ledger = require("../models/Ledger");

exports.createSalesReturn = async (req, res) => {
  try {
    const {
      invoiceId,
      items,
      reason,
    } = req.body;

    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    let totalReturnAmount = 0;
    const returnItems = [];

    for (const returnItem of items) {
      const invoiceItem = invoice.items.find(
        (item) =>
          item.product.toString() ===
          returnItem.productId
      );

      if (!invoiceItem) {
        return res.status(400).json({
          success: false,
          message: "Product not found in invoice",
        });
      }

      // Check Previous Returns
const previousReturns = await SalesReturn.find({
  invoice: invoice._id,
});

let alreadyReturnedQty = 0;

for (const salesReturn of previousReturns) {
  const returnedItem = salesReturn.items.find(
    (item) =>
      item.product.toString() ===
      returnItem.productId
  );

  if (returnedItem) {
    alreadyReturnedQty += returnedItem.quantity;
  }
}

const remainingQty =
  invoiceItem.quantity - alreadyReturnedQty;

if (returnItem.quantity > remainingQty) {
  return res.status(400).json({
    success: false,
    message:
      `Only ${remainingQty} units can still be returned for ${invoiceItem.productName}`,
  });
}

      const amount =
        invoiceItem.rate *
        returnItem.quantity;

      const taxAmount =
        amount *
        (invoiceItem.gstRate / 100);

      const totalAmount =
        amount + taxAmount;

      totalReturnAmount += totalAmount;

      returnItems.push({
        product: invoiceItem.product,
        productName:
          invoiceItem.productName,
        quantity: returnItem.quantity,
        rate: invoiceItem.rate,
        gstRate: invoiceItem.gstRate,
        amount: totalAmount,
      });

      // Increase Stock
      await Product.findByIdAndUpdate(
        invoiceItem.product,
        {
          $inc: {
            stock: returnItem.quantity,
          },
        }
      );
    }

    const returnNumber =
      `SR-${Date.now()}`;

    const salesReturn =
      await SalesReturn.create({
        returnNumber,
        invoice: invoice._id,
        customer: invoice.customer,
        items: returnItems,
        totalAmount: totalReturnAmount,
        reason,
      });

    // Adjust Invoice Outstanding
    if (invoice.paymentStatus === "PAID") {
      await CustomerAdvance.create({
        customer: invoice.customer,
        amount: totalReturnAmount,
        remainingAmount:
          totalReturnAmount,
        paymentMethod: "credit",
        reference: salesReturn._id,
        notes: `Sales Return ${returnNumber}`,
      });
    } else {
      invoice.balanceAmount =
        Math.max(
          0,
          invoice.balanceAmount -
            totalReturnAmount
        );

      if (
        invoice.balanceAmount === 0
      ) {
        invoice.paymentStatus =
          "PAID";
      }

      await invoice.save();
    }

    await Ledger.create({
      type: "DEBIT",
      amount: totalReturnAmount,
      paymentMethod: "cash",
      source: "Sales Return",
      sourceId: salesReturn._id,
      description: `Sales Return ${returnNumber}`,
    });

    res.status(201).json({
      success: true,
      salesReturn,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};