const PurchaseReturn = require("../models/PurchaseReturn");
const Purchase = require("../models/Purchase");
const Product = require("../models/Product");
const Ledger = require("../models/Ledger");
const SupplierCredit = require("../models/SupplierCredit");

exports.createPurchaseReturn = async (req, res) => {
  try {
    const {
      purchaseId,
      items,
      reason,
    } = req.body;

    const purchase = await Purchase.findById(
      purchaseId
    );

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found",
      });
    }

    let totalReturnAmount = 0;
    const returnItems = [];

    for (const returnItem of items) {
      const purchaseItem =
        purchase.items.find(
          (item) =>
            item.product.toString() ===
            returnItem.productId
        );

      if (!purchaseItem) {
        return res.status(400).json({
          success: false,
          message:
            "Product not found in purchase",
        });
      }

      // Previous Returns Validation
      const previousReturns =
        await PurchaseReturn.find({
          purchase: purchase._id,
        });

      let alreadyReturnedQty = 0;

      for (const purchaseReturn of previousReturns) {
        const returnedItem =
          purchaseReturn.items.find(
            (item) =>
              item.product.toString() ===
              returnItem.productId
          );

        if (returnedItem) {
          alreadyReturnedQty +=
            returnedItem.quantity;
        }
      }

      const remainingQty =
        purchaseItem.quantity -
        alreadyReturnedQty;

      if (
        returnItem.quantity >
        remainingQty
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Only ${remainingQty} units can still be returned for ${purchaseItem.productName}`,
        });
      }

      const amount =
        purchaseItem.rate *
        returnItem.quantity;

      const taxAmount =
        amount *
        (purchaseItem.gstRate / 100);

      const totalAmount =
        amount + taxAmount;

      totalReturnAmount += totalAmount;

      returnItems.push({
        product: purchaseItem.product,
        productName:
          purchaseItem.productName,
        quantity: returnItem.quantity,
        rate: purchaseItem.rate,
        gstRate: purchaseItem.gstRate,
        amount: totalAmount,
      });

      // Reduce Stock
      await Product.findByIdAndUpdate(
        purchaseItem.product,
        {
          $inc: {
            stock: -returnItem.quantity,
          },
        }
      );
    }

    const returnNumber =
      `PR-${Date.now()}`;

    const purchaseReturn =
      await PurchaseReturn.create({
        returnNumber,
        purchase: purchase._id,
        supplier: purchase.supplier,
        items: returnItems,
        totalAmount: totalReturnAmount,
        reason,
      });

    // Reduce Supplier Outstanding
    // Adjust Supplier Outstanding / Credit

if (purchase.balanceAmount > 0) {

  purchase.balanceAmount = Math.max(
    0,
    purchase.balanceAmount - totalReturnAmount
  );

  await purchase.save();

} else {

  await SupplierCredit.create({
    supplier: purchase.supplier,
    amount: totalReturnAmount,
    remainingAmount: totalReturnAmount,
    reference: purchaseReturn._id,
    notes: `Purchase Return ${returnNumber}`,
  });

}

    await purchase.save();

    // Ledger Entry
    await Ledger.create({
      type: "DEBIT",
      amount: totalReturnAmount,
      paymentMethod: "bank",
      source: "Purchase Return",
      sourceId: purchaseReturn._id,
      description:
        `Purchase Return ${returnNumber}`,
    });

    res.status(201).json({
      success: true,
      purchaseReturn,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};