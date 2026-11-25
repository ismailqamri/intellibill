require("dotenv").config();
const mongoose = require("mongoose");

const CompanySettings = require("./models/CompanySettings");
const Customer = require("./models/Customer");
const CustomerAdvance = require("./models/CustomerAdvance");
const Expense = require("./models/Expense");
const Invoice = require("./models/Invoice");
const Ledger = require("./models/Ledger");
const OpeningBalance = require("./models/OpeningBalance");
const Product = require("./models/Product");
const Purchase = require("./models/Purchase");

const Supplier = require("./models/Supplier");
let User = null;
try {
  User = require("./models/User");
} catch (_) {
  // Optional if User model filename differs
}

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

async function seedDemo() {
  if (!process.env.MONGODB_URI) {
    console.error("❌ MONGODB_URI not found in backend/.env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`✅ Connected to MongoDB: ${mongoose.connection.name}`);

  const isReset = process.argv.includes("--reset");
  if (isReset) {
    console.log("🧹 --reset flag detected: clearing existing demo records...");
    await Promise.all([
      CompanySettings.deleteMany({}),
      Customer.deleteMany({}),
      CustomerAdvance.deleteMany({}),
      Expense.deleteMany({}),
      Invoice.deleteMany({}),
      Ledger.deleteMany({}),
      OpeningBalance.deleteMany({}),
      Product.deleteMany({}),
      Purchase.deleteMany({}),
      Supplier.deleteMany({}),
    ]);
  }

  const existingUser = User ? await User.findOne() : null;
  const userId = existingUser ? existingUser._id : undefined;

  // 1. Company Profile
  await CompanySettings.findOneAndUpdate(
    {},
    {
      companyName: "IntelliBill Enterprises Pvt. Ltd.",
      address: "MG Road, Indiranagar",
      city: "Bengaluru",
      state: "Karnataka",
      pinCode: "560038",
      phone: "+91 98450 11223",
      email: "accounts@intellibill.in",
      gstin: "29AABCI4321K1Z5",
      gstNumber: "29AABCI4321K1Z5",
      stateName: "Karnataka",
      stateCode: "29",
      invoicePrefix: "INV",
      currentInvoiceNumber: 8,
      financialYear: "2026-27",
      bankName: "HDFC Bank",
      accountHolderName: "IntelliBill Enterprises Pvt. Ltd.",
      accountNumber: "50200048912345",
      branch: "Indiranagar, Bengaluru",
      ifscCode: "HDFC0000184",
      upiId: "intellibill@hdfcbank",
      declaration:
        "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.",
      jurisdiction: "Bengaluru, Karnataka",
      authorizedSignatoryName: "Syed Abdullah",
      termsAndConditions:
        "1. Goods once sold will not be taken back.\n2. Payment due within 15 days.",
    },
    { upsert: true, new: true }
  );
  console.log("✔ CompanySettings configured");

  // 2. Opening Balance
  const openingCount = await OpeningBalance.countDocuments();
  if (openingCount === 0) {
    await OpeningBalance.create({
      cash: 25000,
      upi: 65000,
      bank: 240000,
      openingDate: daysAgo(30),
    });
    console.log("✔ OpeningBalance created");
  }

  // 3. Suppliers
  const suppliers = await Supplier.insertMany([
    {
      name: "Kaveri Wholesale Distributors",
      phone: "9845123401",
      email: "sales@kaveriwholesale.in",
      address: "SP Road, Bengaluru, Karnataka",
      gstNumber: "29AABCK7812M1Z2",
    },
    {
      name: "Malnad Tech & Office Supplies",
      phone: "9448123402",
      email: "orders@malnadtech.in",
      address: "Bunder Road, Mangaluru, Karnataka",
      gstNumber: "29AADCM5521P1Z8",
    },
    {
      name: "Deccan Packaging & Paper Co.",
      phone: "9900123403",
      email: "billing@deccanpack.in",
      address: "Peenya Industrial Area, Bengaluru, Karnataka",
      gstNumber: "29AAECD9012L1Z4",
    },
  ]);
  console.log(`✔ ${suppliers.length} Suppliers inserted`);

  // 4. Customers
  const customers = await Customer.insertMany([
    {
      name: "Aarav Retail Mart",
      phone: "9880112201",
      whatsappNumber: "9880112201",
      email: "purchase@aaravmart.in",
      address: "Jayanagar 4th Block, Bengaluru",
      gstNumber: "29AAACA1122B1Z1",
    },
    {
      name: "Coastal Electronics & Care",
      phone: "9880112202",
      whatsappNumber: "9880112202",
      email: "accounts@coastalelectronics.in",
      address: "Main Road, Bhatkal, Karnataka",
      gstNumber: "29AABCC3344D1Z6",
    },
    {
      name: "Nandi Super Bazaar",
      phone: "9880112203",
      whatsappNumber: "9880112203",
      email: "billing@nandibazaar.in",
      address: "Malleshwaram, Bengaluru",
      gstNumber: "29AAACN5566E1Z3",
    },
    {
      name: "Zoya Boutique & Lifestyle",
      phone: "9880112204",
      whatsappNumber: "9880112204",
      email: "zoya.store@gmail.com",
      address: "Commercial Street, Bengaluru",
      gstNumber: "",
    },
    {
      name: "Apex IT Solutions",
      phone: "9880112205",
      whatsappNumber: "9880112205",
      email: "admin@apexit.co.in",
      address: "Electronic City Phase 1, Bengaluru",
      gstNumber: "29AAECA7788F1Z9",
    },
  ]);
  console.log(`✔ ${customers.length} Customers inserted`);

  // 5. Products (2 items intentionally below reorderLevel to trigger Low Stock)
  const products = await Product.insertMany([
    {
      name: "Thermal Receipt Printer 80mm",
      category: "POS Hardware",
      price: 4200,
      stock: 18,
      reorderLevel: 5,
      supplier: suppliers[0].name,
      gstRate: 18,
      hsnCode: "8443",
      user: userId,
    },
    {
      name: "Wireless Barcode Scanner 2D",
      category: "POS Hardware",
      price: 2650,
      stock: 4, // Low stock (< 8)
      reorderLevel: 8,
      supplier: suppliers[0].name,
      gstRate: 18,
      hsnCode: "8471",
      user: userId,
    },
    {
      name: "Thermal Paper Rolls (Box of 50)",
      category: "Consumables",
      price: 1450,
      stock: 42,
      reorderLevel: 15,
      supplier: suppliers[2].name,
      gstRate: 12,
      hsnCode: "4811",
      user: userId,
    },
    {
      name: "Heavy-Duty Cash Drawer",
      category: "POS Hardware",
      price: 3100,
      stock: 12,
      reorderLevel: 5,
      supplier: suppliers[1].name,
      gstRate: 18,
      hsnCode: "8303",
      user: userId,
    },
    {
      name: "A4 Copier Paper 75 GSM (5 Reams)",
      category: "Stationery",
      price: 1350,
      stock: 6, // Low stock (< 12)
      reorderLevel: 12,
      supplier: suppliers[2].name,
      gstRate: 12,
      hsnCode: "4802",
      user: userId,
    },
    {
      name: "USB-C Multiport Hub",
      category: "Accessories",
      price: 1850,
      stock: 25,
      reorderLevel: 10,
      supplier: suppliers[1].name,
      gstRate: 18,
      hsnCode: "8544",
      user: userId,
    },
    {
      name: "Label Sticker Roll 50x25mm",
      category: "Consumables",
      price: 380,
      stock: 65,
      reorderLevel: 20,
      supplier: suppliers[2].name,
      gstRate: 12,
      hsnCode: "4821",
      user: userId,
    },
  ]);
  console.log(`✔ ${products.length} Products inserted (2 low-stock items)`);

  // 6. Purchases
  const purchase1Taxable = 42000;
  const purchase1Tax = round2(purchase1Taxable * 0.18);
  const purchase1Total = round2(purchase1Taxable + purchase1Tax);

  const purchase2Taxable = 18000;
  const purchase2Tax = round2(purchase2Taxable * 0.12);
  const purchase2Total = round2(purchase2Taxable + purchase2Tax);

  const purchases = await Purchase.insertMany([
    {
      supplier: suppliers[0]._id,
      billNumber: "KWD-2026-104",
      purchaseDate: daysAgo(24),
      items: [
        {
          product: products[0]._id,
          productName: products[0].name,
          quantity: 10,
          rate: 3200,
          gstRate: 18,
          amount: 32000,
          hsnCode: products[0].hsnCode,
        },
        {
          product: products[1]._id,
          productName: products[1].name,
          quantity: 5,
          rate: 2000,
          gstRate: 18,
          amount: 10000,
          hsnCode: products[1].hsnCode,
        },
      ],
      taxableAmount: purchase1Taxable,
      cgst: round2(purchase1Tax / 2),
      sgst: round2(purchase1Tax / 2),
      igst: 0,
      totalTax: purchase1Tax,
      grandTotal: purchase1Total,
      payments: [
        {
          method: "bank",
          amount: purchase1Total,
          reference: "NEFT9928172",
          paidAt: daysAgo(24),
        },
      ],
      paidAmount: purchase1Total,
      balanceAmount: 0,
      paymentStatus: "PAID",
      notes: "Initial POS hardware restock",
      user: userId,
    },
    {
      supplier: suppliers[2]._id,
      billNumber: "DPC-2026-089",
      purchaseDate: daysAgo(12),
      items: [
        {
          product: products[2]._id,
          productName: products[2].name,
          quantity: 15,
          rate: 1200,
          gstRate: 12,
          amount: 18000,
          hsnCode: products[2].hsnCode,
        },
      ],
      taxableAmount: purchase2Taxable,
      cgst: round2(purchase2Tax / 2),
      sgst: round2(purchase2Tax / 2),
      igst: 0,
      totalTax: purchase2Tax,
      grandTotal: purchase2Total,
      payments: [
        {
          method: "upi",
          amount: 10000,
          reference: "UPI62819104",
          paidAt: daysAgo(12),
        },
      ],
      paidAmount: 10000,
      balanceAmount: round2(purchase2Total - 10000),
      paymentStatus: "PARTIAL",
      dueDate: daysAgo(-5),
      notes: "Consumables batch purchase",
      user: userId,
    },
  ]);
  console.log(`✔ ${purchases.length} Purchases inserted`);

  // 7. Invoices spread across the last 30 days
  const invoiceSpecs = [
    {
      num: "INV-0001",
      days: 27,
      customer: customers[0],
      status: "PAID",
      method: "upi",
      lines: [
        { prod: products[0], qty: 2 },
        { prod: products[2], qty: 4 },
      ],
    },
    {
      num: "INV-0002",
      days: 21,
      customer: customers[1],
      status: "PAID",
      method: "bank",
      lines: [
        { prod: products[3], qty: 2 },
        { prod: products[1], qty: 2 },
      ],
    },
    {
      num: "INV-0003",
      days: 16,
      customer: customers[2],
      status: "PAID",
      method: "cash",
      lines: [
        { prod: products[4], qty: 6 },
        { prod: products[6], qty: 10 },
      ],
    },
    {
      num: "INV-0004",
      days: 11,
      customer: customers[4],
      status: "PARTIAL",
      method: "upi",
      lines: [
        { prod: products[0], qty: 3 },
        { prod: products[5], qty: 4 },
      ],
    },
    {
      num: "INV-0005",
      days: 6,
      customer: customers[3],
      status: "PAID",
      method: "card",
      lines: [
        { prod: products[2], qty: 5 },
        { prod: products[6], qty: 8 },
      ],
    },
    {
      num: "INV-0006",
      days: 3,
      customer: customers[0],
      status: "PENDING",
      method: "credit",
      lines: [
        { prod: products[1], qty: 3 },
        { prod: products[3], qty: 1 },
      ],
    },
    {
      num: "INV-0007",
      days: 1,
      customer: customers[2],
      status: "PAID",
      method: "upi",
      lines: [
        { prod: products[0], qty: 1 },
        { prod: products[5], qty: 3 },
        { prod: products[4], qty: 2 },
      ],
    },
  ];

  const createdInvoices = [];
  for (const spec of invoiceSpecs) {
    let taxableAmount = 0;
    let totalTax = 0;

    const items = spec.lines.map(({ prod, qty }) => {
      const amount = round2(prod.price * qty);
      const itemTax = round2((amount * prod.gstRate) / 100);
      taxableAmount = round2(taxableAmount + amount);
      totalTax = round2(totalTax + itemTax);
      return {
        product: prod._id,
        productName: prod.name,
        quantity: qty,
        rate: prod.price,
        gstRate: prod.gstRate,
        amount,
        hsnCode: prod.hsnCode,
      };
    });

    const grandTotal = round2(taxableAmount + totalTax);
    const cgst = round2(totalTax / 2);
    const sgst = round2(totalTax - cgst);

    let paidAmount = 0;
    const payments = [];
    if (spec.status === "PAID") {
      paidAmount = grandTotal;
      payments.push({
        method: spec.method,
        amount: grandTotal,
        reference: `REF-${spec.num}`,
        paidAt: daysAgo(spec.days),
      });
    } else if (spec.status === "PARTIAL") {
      paidAmount = round2(grandTotal * 0.5);
      payments.push({
        method: spec.method,
        amount: paidAmount,
        reference: `REF-${spec.num}-P1`,
        paidAt: daysAgo(spec.days),
      });
    }

    const balanceAmount = round2(grandTotal - paidAmount);
    const invDate = daysAgo(spec.days);

    const inv = await Invoice.create({
      invoiceNumber: spec.num,
      invoiceDate: invDate,
      customer: spec.customer._id,
      customerName: spec.customer.name,
      customerPhone: spec.customer.phone,
      items,
      taxableAmount,
      cgst,
      sgst,
      igst: 0,
      totalTax,
      grandTotal,
      paidAmount,
      advanceUsed: 0,
      payments,
      balanceAmount,
      paymentStatus: spec.status,
      dueDate: daysAgo(spec.days - 15),
      notes: "Demo invoice generated via seedDemo.js",
      createdAt: invDate,
      updatedAt: invDate,
    });

    createdInvoices.push(inv);
  }
  console.log(`✔ ${createdInvoices.length} Invoices inserted`);

  // 8. Customer Advance & Expenses & Ledger entries
  await CustomerAdvance.create({
    customer: customers[1]._id,
    amount: 5000,
    remainingAmount: 5000,
    paymentMethod: "upi",
    reference: "UPI-ADV-701",
    notes: "Advance deposit for upcoming hardware order",
  });

  const expenses = await Expense.insertMany([
    {
      title: "Shop Monthly Rent",
      category: "Rent",
      amount: 14000,
      paymentMethod: "bank",
      notes: "Monthly commercial space rent",
    },
    {
      title: "BESCOM Electricity Bill",
      category: "Electricity",
      amount: 2450,
      paymentMethod: "upi",
      notes: "Monthly power bill",
    },
    {
      title: "Local Courier & Delivery Charges",
      category: "Delivery",
      amount: 850,
      paymentMethod: "cash",
      notes: "Customer parcel dispatch",
    },
  ]);

  const ledgerEntries = [];
  for (const inv of createdInvoices) {
    if (inv.paidAmount > 0) {
      ledgerEntries.push({
        type: "CREDIT",
        amount: inv.paidAmount,
        paymentMethod: inv.payments[0].method,
        source: "INVOICE",
        sourceId: inv._id,
        description: `Payment received for ${inv.invoiceNumber} (${inv.customerName})`,
        createdAt: inv.invoiceDate,
        updatedAt: inv.invoiceDate,
      });
    }
  }
  for (const exp of expenses) {
    ledgerEntries.push({
      type: "DEBIT",
      amount: exp.amount,
      paymentMethod: exp.paymentMethod,
      source: "EXPENSE",
      sourceId: exp._id,
      description: `${exp.title} (${exp.category})`,
    });
  }
  await Ledger.insertMany(ledgerEntries);
  console.log(`✔ CustomerAdvance, ${expenses.length} Expenses & ${ledgerEntries.length} Ledger entries inserted`);

  console.log("\n🎉 Demo data seeded successfully! Refresh http://localhost:3000 to view your dashboard.");
  await mongoose.disconnect();
  process.exit(0);
}

seedDemo().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});