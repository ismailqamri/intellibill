const express = require("express");
const router = express.Router();

const {
  getSupplierCredits,
  getSupplierCreditSummary,
} = require("../controllers/supplierCreditController");

router.get("/", getSupplierCredits);

router.get(
  "/supplier/:id",
  getSupplierCreditSummary
);

module.exports = router;