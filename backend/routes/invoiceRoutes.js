const express = require("express");
const router = express.Router();

const {
  createInvoice,
  addInvoicePayment,
  getInvoiceById,
  getInvoices,
} = require("../controllers/invoiceController");

router.post("/", createInvoice);

router.get("/", getInvoices);
router.get("/:id", getInvoiceById);

router.post("/:id/payment", addInvoicePayment);

module.exports = router;