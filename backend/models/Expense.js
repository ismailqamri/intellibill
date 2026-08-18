const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      enum: [
        "Delivery",
        "Fuel",
        "Salary",
        "Rent",
        "Electricity",
        "Internet",
        "Personal Withdrawal",
        "Purchase Expense",
        "Maintenance",
        "Other",
      ],
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

    withdrawnBy: {
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

module.exports = mongoose.model("Expense", expenseSchema);