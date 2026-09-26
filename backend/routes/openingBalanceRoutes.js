const express = require("express");
const router = express.Router();

const {
  createOpeningBalance,
  getOpeningBalance,
} = require("../controllers/openingBalanceController");

const { protect } = require("../middleware/authMiddleware");

router.post("/", protect, createOpeningBalance);
router.get("/", protect, getOpeningBalance);

module.exports = router;