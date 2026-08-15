const express = require("express");
const router = express.Router();

const {
  createCustomer,
  getCustomers,
} = require("../controllers/customerController");

router.post("/", createCustomer);
router.get("/", getCustomers);

module.exports = router;