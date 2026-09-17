
const express = require("express");

const router = express.Router();

const {
  getPurchaseReport,
} = require("../controllers/reports/purchaseReportController");

// Get Purchase Report
router.get("/purchases", getPurchaseReport);

module.exports = router;