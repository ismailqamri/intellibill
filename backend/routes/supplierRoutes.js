const express = require("express");
const router = express.Router();

const {
  createSupplier,
  getSuppliers,
  getSupplierById,
} = require("../controllers/supplierController");

router.post("/", createSupplier);
router.get("/", getSuppliers);
router.get("/:id", getSupplierById);

module.exports = router;