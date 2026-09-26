const express = require("express");
const router = express.Router();

const {
  getLedgerEntries,
  getLedgerSummary,
} = require("../controllers/ledgerController");

const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getLedgerEntries);
router.get("/summary", protect, getLedgerSummary);

module.exports = router;