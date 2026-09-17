
const express = require("express");

const router = express.Router();

const {
  getGSTSummary,
} = require("../controllers/reports/gstReportController");

router.get("/gst", getGSTSummary);

module.exports = router;