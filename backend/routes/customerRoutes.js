const express = require("express");
const router = express.Router();

const {
  createCustomer,
  getCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerSummary,
} = require("../controllers/customerController");

const { protect } = require("../middleware/authMiddleware");

router.post("/", protect, createCustomer);

router.get("/", protect, getCustomers);

router.get("/:id", protect, getCustomer);

router.put("/:id", protect, updateCustomer);

router.delete("/:id", protect, deleteCustomer);

router.get("/:id/summary", protect, getCustomerSummary);

module.exports = router;