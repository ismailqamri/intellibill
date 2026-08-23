const express = require("express");
const router = express.Router();

const {
  createSalesReturn,
} = require("../controllers/salesReturnController");

router.post("/", createSalesReturn);

module.exports = router;