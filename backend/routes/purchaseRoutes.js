const express = require("express");
const router = express.Router();

const {
  createPurchase,
  getPurchases,
  getPurchaseById,
  addPayment,
} = require("../controllers/purchaseController");


router.post("/", createPurchase);
router.get("/", getPurchases);
router.get("/:id", getPurchaseById);
router.post("/:id/payment", addPayment);

module.exports = router;