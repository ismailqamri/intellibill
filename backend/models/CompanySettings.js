const mongoose = require("mongoose");

const companySettingsSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
    },

    gstNumber: {
      type: String,
      required: true,
    },

    address: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      default: "",
    },

    bankName: {
      type: String,
      default: "",
    },

    accountNumber: {
      type: String,
      default: "",
    },

    ifscCode: {
      type: String,
      default: "",
    },

    upiId: {
      type: String,
      default: "",
    },

    reminderEnabled: {
      type: Boolean,
      default: true,
    },

    reminderFrequency: {
      type: String,
      enum: ["daily", "weekly", "monthly", "manual"],
      default: "weekly",
    },

    reminderDay: {
      type: String,
      default: "Saturday",
    },

    reminderTime: {
      type: String,
      default: "10:00",
    },
    currentInvoiceNumber: {  
      type: Number,
      default: 1,
    },
    financialYear: {
      type: String,
      default: "26-27",
    },
    
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "CompanySettings",
  companySettingsSchema
);