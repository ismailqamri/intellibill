const express = require("express");
const router = express.Router();

const {
  createAdvance,
  getAdvances,
  getCustomerAdvanceSummary,
} = require("../controllers/customerAdvanceController");

router.post("/", createAdvance);
router.get("/", getAdvances);
router.get("/customer/:id", getCustomerAdvanceSummary);

module.exports = router;