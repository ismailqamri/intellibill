const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const customerRoutes = require("./routes/customerRoutes");
const companySettingsRoutes = require("./routes/companySettingsRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const supplierRoutes = require("./routes/supplierRoutes");
const purchaseRoutes = require("./routes/purchaseRoutes");
const invoiceEditRoutes = require("./routes/invoiceEditRoutes");
const ledgerRoutes = require("./routes/ledgerRoutes");
const openingBalanceRoutes = require("./routes/openingBalanceRoutes");
const customerAdvanceRoutes = require("./routes/customerAdvanceRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const salesReturnRoutes = require("./routes/salesReturnRoutes");
const purchaseReturnRoutes = require("./routes/purchaseReturnRoutes");
const supplierCreditRoutes =require("./routes/supplierCreditRoutes");

dotenv.config();

connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/settings", companySettingsRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/invoice-edit", invoiceEditRoutes);
app.use("/api/ledger", ledgerRoutes);
app.use("/api/opening-balance", openingBalanceRoutes);
app.use("/api/customer-advances", customerAdvanceRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/sales-returns", salesReturnRoutes);
app.use("/api/purchase-returns", purchaseReturnRoutes);
app.use("/api/supplier-credits",supplierCreditRoutes);


app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "IntelliBill Backend Running"
  });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});