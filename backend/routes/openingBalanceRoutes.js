const express = require("express");
const router = express.Router();

const {
  createOpeningBalance,
  getOpeningBalance,
} = require("../controllers/openingBalanceController");

router.post("/", createOpeningBalance);
router.get("/", getOpeningBalance);

module.exports = router;