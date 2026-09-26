const express = require("express");
const router = express.Router();

const {
  createSupplier,
  getSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
  getSupplierSummary,
} = require("../controllers/supplierController");

const { protect } = require("../middleware/authMiddleware");

router.post("/", protect, createSupplier);
router.get("/", protect, getSuppliers);
router.get("/:id", protect, getSupplierById);
router.put("/:id", protect, updateSupplier);
router.delete("/:id", protect, deleteSupplier);
router.get("/:id/summary", protect, getSupplierSummary);

module.exports = router;