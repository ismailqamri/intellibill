const express = require("express");
const router = express.Router();

const {
  createPurchase,
  getPurchases,
  getPurchaseById,
  addPayment,
} = require("../controllers/purchaseController");

const { protect } = require("../middleware/authMiddleware");

router.post("/", protect, createPurchase);
router.get("/", protect, getPurchases);
router.get("/:id", protect, getPurchaseById);
router.post("/:id/payment", protect, addPayment);

module.exports = router;