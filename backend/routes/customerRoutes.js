const express = require("express");
const router = express.Router();

const {
  createCustomer,
  getCustomers,
  getCustomerSummary,
} = require("../controllers/customerController");

router.post("/", createCustomer);
router.get("/", getCustomers);
router.get("/:id/summary", getCustomerSummary);

module.exports = router;