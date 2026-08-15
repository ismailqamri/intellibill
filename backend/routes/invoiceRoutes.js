const express = require("express");
const router = express.Router();

const {
  createInvoice,
} = require("../controllers/invoiceController");

router.post("/", createInvoice);

module.exports = router;