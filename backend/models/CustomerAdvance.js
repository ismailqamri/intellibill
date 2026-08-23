const mongoose = require("mongoose");

const customerAdvanceSchema = new mongoose.Schema(
{
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Customer",
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

    paymentMethod: {
        type: String,
        enum: ["cash", "upi", "bank", "card"],
        required: true,
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
    "CustomerAdvance",
    customerAdvanceSchema
);