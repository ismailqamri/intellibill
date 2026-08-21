const express = require("express");
const router = express.Router();

const {
  createSupplier,
  getSuppliers,
  getSupplierById,
  getSupplierSummary,
} = require("../controllers/supplierController");


router.post("/", createSupplier);
router.get("/", getSuppliers);
router.get("/:id", getSupplierById);
router.get("/:id/summary", getSupplierSummary);

module.exports = router;