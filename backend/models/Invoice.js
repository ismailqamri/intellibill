const mongoose = require("mongoose");

const invoiceItemSchema = new mongoose.Schema({
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
    required: true,
  },

  amount: {
    type: Number,
    required: true,
  },

  hsnCode: {
    type: String,
    default: "",
  },
});

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },

    invoiceDate: {
      type: Date,
      default: Date.now,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    items: {
      type: [invoiceItemSchema],
      required: true,
      validate: [
        (val) => val.length > 0,
        "Invoice must contain at least one item",
     ],
    },

    taxableAmount: {
      type: Number,
      required: true,
    },

    cgst: {
      type: Number,
      default: 0,
    },

    sgst: {
      type: Number,
      default: 0,
    },

    igst: {
      type: Number,
      default: 0,
    },

    totalTax: {
      type: Number,
      required: true,
    },

    grandTotal: {
      type: Number,
      required: true,
    },

    paidAmount: {
      type: Number,
      default: 0,
    },

    balanceAmount: {
      type: Number,
      required: true,
    },

    paymentStatus: {
      type: String,
      enum: ["PAID", "PARTIAL", "PENDING"],
      default: "PENDING",
    },

    dueDate: {
      type: Date,
    },

    notes: {
      type: String,
      default: "",
    },

    pdfUrl: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Invoice", invoiceSchema);