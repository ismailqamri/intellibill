
const express = require("express");

const router = express.Router();

const {
  getSalesReport,
} = require("../controllers/reports/salesReportController");

// Get Sales Report
router.get("/sales", getSalesReport);

module.exports = router;