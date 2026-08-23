const mongoose = require("mongoose");

const supplierCreditSchema = new mongoose.Schema(
  {
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    remainingAmount: {
      type: Number,
      required: true,
    },

    source: {
      type: String,
      default: "Purchase Return",
    },

    reference: {
      type: String,
      default: "",
    },

    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "SupplierCredit",
  supplierCreditSchema
);