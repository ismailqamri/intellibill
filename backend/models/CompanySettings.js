const mongoose = require("mongoose");

const companySettingsSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
    },

    logoUrl: {
      type: String,
      default: "",
      trim: true,
    },

    address: {
      type: String,
      default: "",
      trim: true,
    },

    city: {
      type: String,
      default: "",
      trim: true,
    },

    state: {
      type: String,
      default: "",
      trim: true,
    },

    pinCode: {
      type: String,
      default: "",
      trim: true,
    },

    phone: {
      type: String,
      default: "",
      trim: true,
    },

    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },

    gstin: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
    },

    gstNumber: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
    },

    stateName: {
      type: String,
      default: "",
      trim: true,
    },

    stateCode: {
      type: String,
      default: "",
      trim: true,
    },

    invoicePrefix: {
      type: String,
      default: "INV",
      trim: true,
      uppercase: true,
    },

    currentInvoiceNumber: {
      type: Number,
      default: 1,
      min: 1,
    },

    financialYear: {
      type: String,
      default: "2026-27",
      trim: true,
    },

    bankName: {
      type: String,
      default: "",
      trim: true,
    },

    accountHolderName: {
      type: String,
      default: "",
      trim: true,
    },

    accountNumber: {
      type: String,
      default: "",
      trim: true,
    },

    branch: {
      type: String,
      default: "",
      trim: true,
    },

    ifscCode: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
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

    declaration: {
      type: String,
      default: "",
      trim: true,
    },

    jurisdiction: {
      type: String,
      default: "",
      trim: true,
    },

    authorizedSignatoryName: {
      type: String,
      default: "",
      trim: true,
    },

    termsAndConditions: {
      type: String,
      default: "",
      trim: true,
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
