const mongoose = require("mongoose");

const purchaseReturnItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },

  productName: {
    type: String,
    required: true,
  },

  quantity: {
    type: Number,
    required: true,
  },

  rate: {
    type: Number,
    required: true,
  },

  gstRate: {
    type: Number,
    default: 0,
  },

  amount: {
    type: Number,
    required: true,
  },
});

const purchaseReturnSchema = new mongoose.Schema(
  {
    returnNumber: {
      type: String,
      required: true,
      unique: true,
    },

    purchase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Purchase",
      required: true,
    },

    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },

    items: [purchaseReturnItemSchema],

    totalAmount: {
      type: Number,
      required: true,
    },

    reason: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "PurchaseReturn",
  purchaseReturnSchema
);