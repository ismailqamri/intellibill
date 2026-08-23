const express = require("express");
const router = express.Router();

const {
  createPurchaseReturn,
} = require("../controllers/purchaseReturnController");

router.post("/", createPurchaseReturn);

module.exports = router;