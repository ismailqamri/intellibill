const mongoose = require("mongoose");

const salesReturnItemSchema = new mongoose.Schema({
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

const salesReturnSchema = new mongoose.Schema(
  {
    returnNumber: {
      type: String,
      required: true,
      unique: true,
    },

    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      required: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    items: [salesReturnItemSchema],

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
  "SalesReturn",
  salesReturnSchema
);