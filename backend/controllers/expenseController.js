const Expense = require("../models/Expense");
const Ledger = require("../models/Ledger");

// Add Expense
exports.createExpense = async (req, res) => {
  try {
    const expense = await Expense.create(req.body);

    // Create Ledger Entry
    await Ledger.create({
      type: "DEBIT",
      amount: expense.amount,
      paymentMethod: expense.paymentMethod,
      source: "Expense",
      sourceId: expense._id,
      description: expense.title,
    });

    res.status(201).json({
      success: true,
      expense,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get All Expenses
exports.getExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find().sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: expenses.length,
      expenses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};