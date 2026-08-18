const express = require("express");
const router = express.Router();

const {
  createExpense,
  getExpenses,
} = require("../controllers/expenseController");

router.post("/", createExpense);
router.get("/", getExpenses);

module.exports = router;