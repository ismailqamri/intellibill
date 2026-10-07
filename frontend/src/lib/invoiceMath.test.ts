import assert from "node:assert/strict";
import test from "node:test";
import { adjustInclusiveRatesToTotal, calculateInvoice } from "./invoiceMath.ts";

const baseItem = {
  productId: "p1",
  productName: "Soap",
  quantity: 1,
  rate: 30,
  gstRate: 5,
  stock: 5,
};

test("extracts GST from an inclusive MRP", () => {
  const result = calculateInvoice([baseItem]);
  assert.equal(result.lines[0].lineAmount, 30);
  assert.equal(result.lines[0].taxable, 28.57);
  assert.equal(result.lines[0].gst, 1.43);
});

test("splits intra-state GST into CGST and SGST", () => {
  const result = calculateInvoice([baseItem], { taxMode: "intra" });
  assert.equal(result.cgst, 0.72);
  assert.equal(result.sgst, 0.71);
  assert.equal(result.igst, 0);
});

test("uses IGST for inter-state tax", () => {
  const result = calculateInvoice([baseItem], { taxMode: "inter" });
  assert.equal(result.cgst, 0);
  assert.equal(result.sgst, 0);
  assert.equal(result.igst, 1.43);
});

test("rounds final total to the nearest rupee", () => {
  const result = calculateInvoice([{ ...baseItem, rate: 10.4 }]);
  assert.equal(result.sumLineAmounts, 10.4);
  assert.equal(result.total, 10);
});

test("calculates negative round-off", () => {
  const result = calculateInvoice([{ ...baseItem, rate: 10.49 }]);
  assert.equal(result.total, 10);
  assert.equal(result.roundOff, -0.49);
});

test("calculates positive round-off", () => {
  const result = calculateInvoice([{ ...baseItem, rate: 10.51 }]);
  assert.equal(result.total, 11);
  assert.equal(result.roundOff, 0.49);
});

test("marks partial payment", () => {
  const result = calculateInvoice([baseItem], { amountReceived: 10 });
  assert.equal(result.status, "PARTIAL");
  assert.equal(result.balance, 20);
});

test("marks full payment", () => {
  const result = calculateInvoice([baseItem], { amountReceived: 30 });
  assert.equal(result.status, "PAID");
  assert.equal(result.balance, 0);
});

test("marks pending payment", () => {
  const result = calculateInvoice([baseItem], { amountReceived: 0 });
  assert.equal(result.status, "PENDING");
  assert.equal(result.balance, 30);
});

test("flags quantity greater than stock without blocking calculation", () => {
  const result = calculateInvoice([{ ...baseItem, quantity: 6 }]);
  assert.equal(result.hasStockWarning, true);
  assert.equal(result.lines[0].exceedsStock, true);
});

test("adjusts a single GST-inclusive rate to match an edited total", () => {
  const adjusted = adjustInclusiveRatesToTotal([{ ...baseItem, quantity: 2, rate: 30 }], 70);
  const result = calculateInvoice(adjusted);
  assert.equal(adjusted[0].rate, 35);
  assert.equal(result.lines[0].lineAmount, 70);
  assert.equal(result.total, 70);
});

test("adjusts multiple GST-inclusive rates proportionally", () => {
  const adjusted = adjustInclusiveRatesToTotal(
    [
      { ...baseItem, productId: "p1", productName: "Item 1", quantity: 1, rate: 100 },
      { ...baseItem, productId: "p2", productName: "Item 2", quantity: 2, rate: 50 },
    ],
    220
  );
  const result = calculateInvoice(adjusted);
  assert.equal(result.lines[0].lineAmount, 110);
  assert.equal(result.lines[1].lineAmount, 110);
  assert.equal(result.sumLineAmounts, 220);
  assert.equal(result.total, 220);
});
