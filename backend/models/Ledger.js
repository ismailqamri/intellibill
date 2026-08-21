const mongoose = require("mongoose");

const ledgerSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["CREDIT", "DEBIT"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    paymentMethod: {
      type: String,
      enum: ["cash", "upi", "bank", "card"],
      required: true,
    },

    source: {
      type: String,
      required: true,
    },

    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
    },

    description: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Ledger", ledgerSchema);