const mongoose = require("mongoose");

const purchaseItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
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

  hsnCode: {
    type: String,
    default: "",
  },
});

const purchaseSchema = new mongoose.Schema(
  {
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },

    billNumber: {
      type: String,
      required: true,
    },

    purchaseDate: {
      type: Date,
      default: Date.now,
    },

    items: {
      type: [purchaseItemSchema],
      required: true,
      validate: [
        (val) => val.length > 0,
        "Purchase must contain at least one item",
      ],
    },

    taxableAmount: {
      type: Number,
      required: true,
      min: 0,
  },

    cgst: {
      type: Number,
      default: 0,
      min: 0,
    },

    sgst: {
      type: Number,
      default: 0,
      min: 0,
    },

  igst: {
    type: Number,
    default: 0,
    min: 0,
},

  totalTax: {
    type: Number,
    required: true,
    min: 0,
  },

  grandTotal: {
    type: Number,
    required: true,
    min: 0,
  },

    payments: [
      {
        method: {
          type: String,
          enum: ["cash", "upi", "bank", "card"],
        },

        amount: {
          type: Number,
          required: true,
          min: 0.01,
        },

        reference: {
          type: String,
          default: "",
        },

        paidAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    creditUsed: {
      type: Number,
      default: 0,
      min: 0,
    },

    balanceAmount: {
      type: Number,
      required: true,
      min: 0,
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
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Purchase", purchaseSchema);