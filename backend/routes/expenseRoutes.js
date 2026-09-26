const express = require("express");
const router = express.Router();

const {
  createExpense,
  getExpenses,
} = require("../controllers/expenseController");

const { protect } = require("../middleware/authMiddleware");

router.post("/", protect, createExpense);
router.get("/", protect, getExpenses);

module.exports = router;