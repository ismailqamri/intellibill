const express = require("express");
const router = express.Router();

const {
  createPurchase,
  getPurchases,
  getPurchaseById,
  addPayment,
  scanPurchaseBill,
  confirmOcrPurchase,
} = require("../controllers/purchaseController");

const { protect } = require("../middleware/authMiddleware");
const { uploadBill } = require("../middleware/uploadMiddleware");

router.post("/", protect, createPurchase);
router.get("/", protect, getPurchases);
router.get("/:id", protect, getPurchaseById);
router.post("/:id/payment", protect, addPayment);

// OCR purchase routes
router.post("/ocr", protect, uploadBill.single("bill"), scanPurchaseBill);
router.post("/confirm-ocr", protect, confirmOcrPurchase);

module.exports = router;