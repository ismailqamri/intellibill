const express = require("express");
const router = express.Router();

const {
  updateInvoice,
} = require("../controllers/invoiceEditController");

router.put("/:id", updateInvoice);

module.exports = router;