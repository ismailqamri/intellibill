const express = require("express");
const router = express.Router();

const {
  getLedgerEntries,
  getLedgerSummary,
} = require("../controllers/ledgerController");

router.get("/", getLedgerEntries);
router.get("/summary", getLedgerSummary);

module.exports = router;