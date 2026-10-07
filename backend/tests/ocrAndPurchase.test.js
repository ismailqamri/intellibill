const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeText,
  normalizePhone,
  normalizeGSTIN,
  stringSimilarity,
} = require("../utils/fuzzyMatch");

const {
  parseInvoiceText,
  normalizeDate,
} = require("../services/ocrService");

describe("1. Fuzzy Matching & Normalization Utilities", () => {
  it("normalizes phone numbers to last 10 digits", () => {
    assert.equal(normalizePhone("+91 9876543210"), "9876543210");
    assert.equal(normalizePhone("09876543210"), "9876543210");
    assert.equal(normalizePhone("98765-43210"), "9876543210");
    assert.equal(normalizePhone("919876543210"), "9876543210");
  });

  it("normalizes GSTIN to uppercase alphanumeric", () => {
    assert.equal(normalizeGSTIN("27aaaaa0000a1z5"), "27AAAAA0000A1Z5");
    assert.equal(normalizeGSTIN(" 29-BBBBB1111B2Z6 "), "29BBBBB1111B2Z6");
  });

  it("normalizes text by stripping punctuation and lowercasing", () => {
    assert.equal(
      normalizeText("Apex   Electronics Pvt. Ltd.!"),
      "apex electronics pvt ltd"
    );
  });

  it("calculates string similarity for fuzzy matching", () => {
    // Exact or near-exact
    const exact = stringSimilarity("Apex Electronics", "apex electronics");
    assert.equal(exact, 1);

    // Minor typo or variation
    const fuzzy = stringSimilarity(
      "Shree Balaji Traders",
      "Sri Balaji Traders"
    );
    assert.ok(fuzzy >= 0.7, `Expected similarity >= 0.7, got ${fuzzy}`);

    // Completely different
    const diff = stringSimilarity("Reliance Digital", "Zomato Media");
    assert.ok(diff < 0.4, `Expected similarity < 0.4, got ${diff}`);
  });
});

describe("2. OCR Text Extraction & Normalization", () => {
  const sampleInvoiceText = `
    TAX INVOICE
    APEX ELECTRONICS & HARDWARE PVT LTD
    Plot 42, MIDC Industrial Area, Andheri East, Mumbai 400093
    GSTIN: 27AABCA1234F1Z5
    Phone: +91 9820012345
    Email: sales@apexelectronics.in

    Bill To:
    INTELLIBILL TRADERS
    Shop 12, Market Road, Pune
    GSTIN: 27XYZPA9999K1Z2

    Invoice No: INV-2024-884
    Invoice Date: 14/03/2024

    --------------------------------------------------------------------------------
    Sr. No.  Item Description       HSN Code   Qty   Rate     GST%   Amount
    --------------------------------------------------------------------------------
    1        HDMI Cable 2 Meter     8544       10    150.00   18%    1500.00
    2        Wireless Mouse USB     8471       5     400.00   18%    2000.00
    --------------------------------------------------------------------------------
    Sub Total: 3500.00
    CGST @ 9%: 315.00
    SGST @ 9%: 315.00
    Grand Total: 4130.00
  `;

  it("extracts normalized supplier information", () => {
    const data = parseInvoiceText(sampleInvoiceText);

    assert.equal(data.supplier.gstin, "27AABCA1234F1Z5");
    assert.equal(data.supplier.phone, "9820012345");
    assert.ok(
      data.supplier.name.toLowerCase().includes("apex electronics"),
      `Expected supplier name to contain 'apex electronics', got: ${data.supplier.name}`
    );
    assert.ok(data.supplier.address.length > 0);
  });

  it("extracts invoice number and date", () => {
    const data = parseInvoiceText(sampleInvoiceText);

    assert.equal(data.invoiceNumber, "INV-2024-884");
    assert.equal(data.invoiceDate, "2024-03-14");
  });

  it("extracts line items with quantity, rate, GST and amounts", () => {
    const data = parseInvoiceText(sampleInvoiceText);

    assert.equal(data.items.length, 2);

    const item1 = data.items[0];
    assert.ok(item1.name.toLowerCase().includes("hdmi cable"));
    assert.equal(item1.hsnCode, "8544");
    assert.equal(item1.quantity, 10);
    assert.equal(item1.rate, 150);
    assert.equal(item1.gstRate, 18);
    assert.equal(item1.amount, 1500);

    const item2 = data.items[1];
    assert.ok(item2.name.toLowerCase().includes("wireless mouse"));
    assert.equal(item2.hsnCode, "8471");
    assert.equal(item2.quantity, 5);
    assert.equal(item2.rate, 400);
    assert.equal(item2.gstRate, 18);
    assert.equal(item2.amount, 2000);
  });

  it("extracts totals and tax breakdown", () => {
    const data = parseInvoiceText(sampleInvoiceText);

    assert.equal(data.subtotal, 3500);
    assert.equal(data.cgst, 315);
    assert.equal(data.sgst, 315);
    assert.equal(data.total, 4130);
  });

  it("tolerates missing or unclear fields gracefully", () => {
    const incompleteText = `
      Invoice No: 123
      Some Random Item 500
    `;
    const data = parseInvoiceText(incompleteText);

    assert.ok(typeof data.supplier === "object");
    assert.ok(Array.isArray(data.items));
    assert.equal(data.invoiceNumber, "123");
    // Doesn't crash on missing fields
    assert.equal(typeof data.subtotal, "number");
    assert.equal(typeof data.total, "number");
  });

  it("normalizes diverse date formats", () => {
    assert.equal(normalizeDate("15/08/2023"), "2023-08-15");
    assert.equal(normalizeDate("05-12-2024"), "2024-12-05");
    assert.equal(normalizeDate("2024-01-20"), "2024-01-20");
    assert.equal(normalizeDate("25 Oct 2023"), "2023-10-25");
  });
});

describe("3. Supplier Matching & User Isolation Logic", () => {
  const { matchSupplier } = require("../services/matchingService");

  const user1Id = "60c72b2f9b1d8b001c8d0001";
  const user2Id = "60c72b2f9b1d8b001c8d0002";

  const allSuppliers = [
    {
      _id: "supp_1",
      name: "Super Fast Logistics",
      gstNumber: "27AAAAA1111A1Z1",
      phone: "9811111111",
      user: user1Id,
    },
    {
      _id: "supp_2",
      name: "Om Sai Enterprises",
      gstNumber: "27BBBBB2222B1Z2",
      phone: "9822222222",
      user: user1Id,
    },
    {
      _id: "supp_other_user",
      name: "Secret Supplier of User 2",
      gstNumber: "27ZZZZZ9999Z1Z9",
      phone: "9899999999",
      user: user2Id,
    },
  ];

  // Helper simulating DB query with user filter
  const getSuppliersForUser = (userId) =>
    allSuppliers.filter((s) => s.user === userId);

  it("matches supplier by exact GSTIN (Priority 1)", async () => {
    const res = await matchSupplier(
      { name: "Different Name", gstin: "27AAAAA1111A1Z1", phone: "1234567890" },
      user1Id,
      getSuppliersForUser(user1Id)
    );
    assert.equal(res.status, "EXISTING");
    assert.equal(res.matchMethod, "GSTIN");
    assert.equal(res.matchedSupplier._id, "supp_1");
  });

  it("matches supplier by exact phone (Priority 2)", async () => {
    const res = await matchSupplier(
      { name: "Different Name", gstin: "", phone: "9822222222" },
      user1Id,
      getSuppliersForUser(user1Id)
    );
    assert.equal(res.status, "EXISTING");
    assert.equal(res.matchMethod, "PHONE");
    assert.equal(res.matchedSupplier._id, "supp_2");
  });

  it("matches supplier by normalized name (Priority 3)", async () => {
    const res = await matchSupplier(
      { name: "super fast logistics", gstin: "", phone: "" },
      user1Id,
      getSuppliersForUser(user1Id)
    );
    assert.equal(res.status, "EXISTING");
    assert.equal(res.matchMethod, "NAME_EXACT");
    assert.equal(res.matchedSupplier._id, "supp_1");
  });

  it("detects new supplier when no match exists", async () => {
    const res = await matchSupplier(
      { name: "Brand New Supplier Ltd", gstin: "27NEWWW3333N1Z3", phone: "9833333333" },
      user1Id,
      getSuppliersForUser(user1Id)
    );
    assert.equal(res.status, "NEW");
    assert.equal(res.matchedSupplier, null);
  });

  it("enforces user isolation: does NOT match suppliers belonging to another user", async () => {
    const res = await matchSupplier(
      { name: "Secret Supplier of User 2", gstin: "27ZZZZZ9999Z1Z9", phone: "9899999999" },
      user1Id,
      getSuppliersForUser(user1Id) // User 1's list does not contain User 2's supplier
    );
    assert.equal(res.status, "NEW");
    assert.equal(res.matchedSupplier, null);
  });
});

describe("4. Product Matching & User Isolation Logic", () => {
  const { matchProducts } = require("../services/matchingService");

  const user1Id = "60c72b2f9b1d8b001c8d0001";
  const user2Id = "60c72b2f9b1d8b001c8d0002";

  const allProducts = [
    {
      _id: "prod_1",
      name: "USB-C Fast Charging Cable 1M",
      hsnCode: "8544",
      price: 299,
      user: user1Id,
    },
    {
      _id: "prod_2",
      name: "Bluetooth Wireless Keyboard",
      hsnCode: "8471",
      price: 1200,
      user: user1Id,
    },
    {
      _id: "prod_other_user",
      name: "User 2 Exclusive Gaming Mouse",
      hsnCode: "8471",
      price: 2500,
      user: user2Id,
    },
  ];

  const getProductsForUser = (userId) =>
    allProducts.filter((p) => p.user === userId);

  it("matches product by HSN and name", async () => {
    const items = [
      { name: "USB-C Fast Charging Cable 1M", hsnCode: "8544", quantity: 5, rate: 150 },
    ];
    const results = await matchProducts(items, user1Id, getProductsForUser(user1Id));
    assert.equal(results[0].status, "EXISTING");
    assert.equal(results[0].matchMethod, "HSN_AND_NAME");
    assert.equal(results[0].matchedProduct._id, "prod_1");
  });

  it("matches product by exact name", async () => {
    const items = [
      { name: "Bluetooth Wireless Keyboard", hsnCode: "", quantity: 1, rate: 800 },
    ];
    const results = await matchProducts(items, user1Id, getProductsForUser(user1Id));
    assert.equal(results[0].status, "EXISTING");
    assert.equal(results[0].matchMethod, "NAME_EXACT");
    assert.equal(results[0].matchedProduct._id, "prod_2");
  });

  it("detects new product when no match exists", async () => {
    const items = [
      { name: "Portable Projector 4K", hsnCode: "8528", quantity: 2, rate: 15000 },
    ];
    const results = await matchProducts(items, user1Id, getProductsForUser(user1Id));
    assert.equal(results[0].status, "NEW");
    assert.equal(results[0].matchedProduct, null);
  });

  it("enforces product user isolation: does not match product belonging to other user", async () => {
    const items = [
      { name: "User 2 Exclusive Gaming Mouse", hsnCode: "8471", quantity: 1, rate: 2000 },
    ];
    const results = await matchProducts(items, user1Id, getProductsForUser(user1Id));
    assert.equal(results[0].status, "NEW");
    assert.equal(results[0].matchedProduct, null);
  });
});

describe("5. Purchase Confirmation & Math Validation", () => {
  it("validates monetary values and item calculations accurately", () => {
    const items = [
      { quantity: 10, rate: 100, discountPercent: 10, gstRate: 18 },
      { quantity: 2, rate: 500, discountPercent: 0, gstRate: 12 },
    ];

    let taxableTotal = 0;
    let totalTax = 0;

    for (const item of items) {
      const gross = item.quantity * item.rate;
      const discount = gross * (item.discountPercent / 100);
      const taxable = gross - discount;
      const tax = taxable * (item.gstRate / 100);

      taxableTotal += taxable;
      totalTax += tax;
    }

    assert.equal(taxableTotal, 900 + 1000); // 1900
    assert.equal(totalTax, 162 + 120); // 282

    const cgst = Math.round((totalTax / 2) * 100) / 100;
    const sgst = Math.round((totalTax - cgst) * 100) / 100;
    const grandTotal = Math.round((taxableTotal + totalTax) * 100) / 100;

    assert.equal(cgst, 141);
    assert.equal(sgst, 141);
    assert.equal(grandTotal, 2182);
  });

  it("calculates balance amount and determines paymentStatus correctly", () => {
    const grandTotal = 5000;

    // Unpaid
    const unpaidPaid = 0;
    const unpaidBal = grandTotal - unpaidPaid;
    const unpaidStatus = unpaidBal === 0 ? "PAID" : unpaidPaid > 0 ? "PARTIAL" : "PENDING";
    assert.equal(unpaidBal, 5000);
    assert.equal(unpaidStatus, "PENDING");

    // Partial
    const partPaid = 2000;
    const partBal = grandTotal - partPaid;
    const partStatus = partBal === 0 ? "PAID" : partPaid > 0 ? "PARTIAL" : "PENDING";
    assert.equal(partBal, 3000);
    assert.equal(partStatus, "PARTIAL");

    // Fully paid
    const fullPaid = 5000;
    const fullBal = grandTotal - fullPaid;
    const fullStatus = fullBal === 0 ? "PAID" : fullPaid > 0 ? "PARTIAL" : "PENDING";
    assert.equal(fullBal, 0);
    assert.equal(fullStatus, "PAID");
  });
});

