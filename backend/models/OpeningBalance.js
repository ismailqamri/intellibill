const mongoose = require("mongoose");

const openingBalanceSchema = new mongoose.Schema(
  {
    cash: {
      type: Number,
      default: 0,
    },

    upi: {
      type: Number,
      default: 0,
    },

    bank: {
      type: Number,
      default: 0,
    },

    openingDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "OpeningBalance",
  openingBalanceSchema
);