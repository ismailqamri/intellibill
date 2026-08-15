const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      required: true,
    },

    price: {
      type: Number,
      required: true,
    },

    stock: {
      type: Number,
      default: 0,
    },

    reorderLevel: {
      type: Number,
      default: 10,
    },

    supplier: {
      type: String,
      default: "",
    },

    gstRate: {
      type: Number,
      default: 18,
    },
    hsnCode: {
        type: String,
        default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Product", productSchema);