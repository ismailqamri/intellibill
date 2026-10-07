import { jsPDF } from "jspdf";

type InvoiceCustomer = {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  state?: string;
};

export type PdfInvoiceItem = {
  productName?: string;
  hsnCode?: string;
  quantity?: number;
  rate?: number;
  gstRate?: number;
  amount?: number;
};

export type PdfInvoice = {
  invoiceNumber?: string;
  invoiceDate?: string;
  createdAt?: string;
  customer?: InvoiceCustomer | null;
  customerName?: string;
  customerPhone?: string;
  items?: PdfInvoiceItem[];
  taxableAmount?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  totalTax?: number;
  grandTotal?: number;
  paidAmount?: number;
  balanceAmount?: number;
  paymentStatus?: string;
  payments?: Array<{ method?: string; amount?: number; reference?: string }>;
  dueDate?: string;
  notes?: string;
};

export type PdfCompanySettings = {
  companyName?: string;
  logoUrl?: string;
  address?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  gstNumber?: string;
  stateName?: string;
  stateCode?: string;
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  branch?: string;
  ifscCode?: string;
  upiId?: string;
  declaration?: string;
  jurisdiction?: string;
  authorizedSignatoryName?: string;
  termsAndConditions?: string;
};

const PAGE_WIDTH = 595.28;
const MARGIN_X = 35;
const TOP_Y = 52;
const BODY_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
const NOTE_Y = 832;

const ITEM_COLUMNS = [26, 174, 60, 40, 64, 60, 35, 66];
const GST_COLUMNS = [95, 72, 53, 67, 53, 67, 118];

type TaxRow = {
  hsn: string;
  gstRate: number;
  taxable: number;
  cgst: number;
  sgst: number;
  tax: number;
};

function safe(value: unknown) {
  return String(value ?? "").trim();
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function money(value: unknown) {
  return numberValue(value).toFixed(2);
}

function signedMoney(value: number) {
  if (value < 0) return `(-)${Math.abs(value).toFixed(2)}`;
  return value.toFixed(2);
}

function formatDate(value?: string, mode: "date-only" | "timestamp" = "date-only") {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(mode === "timestamp" ? date.getDate() : date.getUTCDate()).padStart(2, "0");
  const month = String((mode === "timestamp" ? date.getMonth() : date.getUTCMonth()) + 1).padStart(2, "0");
  const year = mode === "timestamp" ? date.getFullYear() : date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

function sanitizeFilePart(value: string) {
  return value.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "") || "invoice";
}

function companyName(settings: PdfCompanySettings) {
  return safe(settings.companyName) || "Company";
}

const ones = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function wordsBelowThousand(value: number) {
  const parts: string[] = [];
  const hundred = Math.floor(value / 100);
  const rest = value % 100;

  if (hundred) parts.push(`${ones[hundred]} Hundred`);
  if (rest) {
    if (rest < 20) {
      parts.push(ones[rest]);
    } else {
      const ten = Math.floor(rest / 10);
      const one = rest % 10;
      parts.push([tens[ten], ones[one]].filter(Boolean).join(" "));
    }
  }

  return parts.join(" ");
}

function numberToIndianWords(value: number) {
  const rounded = Math.round(Math.abs(value));
  if (rounded === 0) return "Zero";

  const crore = Math.floor(rounded / 10000000);
  const lakh = Math.floor((rounded % 10000000) / 100000);
  const thousand = Math.floor((rounded % 100000) / 1000);
  const rest = rounded % 1000;

  return [
    crore ? `${wordsBelowThousand(crore)} Crore` : "",
    lakh ? `${wordsBelowThousand(lakh)} Lakh` : "",
    thousand ? `${wordsBelowThousand(thousand)} Thousand` : "",
    rest ? wordsBelowThousand(rest) : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function amountInWords(value: number) {
  const rupees = Math.floor(Math.abs(value));
  const paise = Math.round((Math.abs(value) - rupees) * 100);
  const rupeeWords = `${numberToIndianWords(rupees)} INR`;
  const paiseWords = paise > 0 ? ` and ${numberToIndianWords(paise)} paise` : "";
  return `${rupeeWords}${paiseWords} Only`;
}

function setBaseStyle(doc: jsPDF) {
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.45);
}

function text(doc: jsPDF, value: string, x: number, y: number, options?: { align?: "left" | "right" | "center" }) {
  doc.text(value, x, y, options);
}

function drawWrapped(doc: jsPDF, value: string, x: number, y: number, width: number, lineHeight = 8.5) {
  const lines = doc.splitTextToSize(value, width);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function drawCellText(doc: jsPDF, value: string, x: number, y: number, width: number, align: "left" | "right" | "center" = "left") {
  const padding = 3;
  const tx = align === "right" ? x + width - padding : align === "center" ? x + width / 2 : x + padding;
  text(doc, value, tx, y, { align });
}

function drawVerticals(doc: jsPDF, x: number, y: number, height: number, widths: number[]) {
  let cursor = x;
  widths.slice(0, -1).forEach((width) => {
    cursor += width;
    doc.line(cursor, y, cursor, y + height);
  });
}

function sellerLines(settings: PdfCompanySettings) {
  const cityLine = [settings.city, settings.state, settings.pinCode].map(safe).filter(Boolean).join(", ");
  return [
    companyName(settings),
    safe(settings.address),
    cityLine,
    safe(settings.gstin || settings.gstNumber) ? `GSTIN/UIN: ${safe(settings.gstin || settings.gstNumber)}` : "",
    safe(settings.stateName || settings.state) ? `State Name : ${safe(settings.stateName || settings.state)}${safe(settings.stateCode) ? `, Code : ${safe(settings.stateCode)}` : ""}` : "",
    safe(settings.phone) ? `Contact : ${safe(settings.phone)}` : "",
    safe(settings.email) ? `E-Mail : ${safe(settings.email)}` : "",
  ].filter(Boolean);
}

function buyerLines(invoice: PdfInvoice) {
  const customer = invoice.customer || {};
  const buyerName = safe(customer.name || invoice.customerName) || "Walk-in Customer";
  return [
    "Buyer",
    buyerName,
    safe(customer.address),
    safe(customer.phone || invoice.customerPhone) ? `Ph No:${safe(customer.phone || invoice.customerPhone)}` : "",
    safe(customer.gstNumber) ? `GSTIN/UIN : ${safe(customer.gstNumber)}` : "",
    safe(customer.state) ? `State Name : ${safe(customer.state)}` : "",
  ].filter(Boolean);
}

function drawTopSection(doc: jsPDF, invoice: PdfInvoice, settings: PdfCompanySettings) {
  const x = MARGIN_X;
  const y = TOP_Y;
  const height = 230;
  const leftWidth = 262;
  const rightWidth = BODY_WIDTH - leftWidth;
  const rightColumnWidth = rightWidth / 2;
  const sellerHeight = 88;

  doc.setFontSize(13);
  text(doc, "Tax Invoice", PAGE_WIDTH / 2, 30, { align: "center" });

  doc.rect(x, y, BODY_WIDTH, height);
  doc.line(x + leftWidth, y, x + leftWidth, y + height);
  doc.line(x, y + sellerHeight, x + leftWidth, y + sellerHeight);
  doc.line(x + leftWidth + rightColumnWidth, y, x + leftWidth + rightColumnWidth, y + height - 70);

  doc.setFontSize(9.5);
  sellerLines(settings).forEach((line, index) => {
    doc.setFont("helvetica", index === 0 ? "bold" : "normal");
    text(doc, line, x + 3, y + 14 + index * 10);
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  buyerLines(invoice).forEach((line, index) => {
    doc.setFont("helvetica", index === 1 ? "bold" : "normal");
    text(doc, line, x + 3, y + sellerHeight + 14 + index * 12);
  });

  const leftMetaX = x + leftWidth;
  const rightMetaX = leftMetaX + rightColumnWidth;
  const rowHeight = 25;
  for (let index = 1; index <= 6; index += 1) {
    doc.line(leftMetaX, y + index * rowHeight, x + BODY_WIDTH, y + index * rowHeight);
  }

  const invoiceDate = formatDate(invoice.invoiceDate || invoice.createdAt, "timestamp");
  const dueDate = invoice.dueDate ? formatDate(invoice.dueDate) : "";
  const paymentMethod = safe(invoice.payments?.[0]?.method);
  const metaRows = [
    ["Invoice No.", safe(invoice.invoiceNumber), "Dated", invoiceDate],
    ["Delivery Note", "", "Mode/Terms of Payment", paymentMethod],
    ["Supplier's Ref.", "", "Other Reference(s)", ""],
    ["Buyer's Order No.", "", "Dated", ""],
    ["Despatch Document No.", "", "Delivery Note Date", dueDate],
    ["Despatched through", "", "Destination", ""],
  ];

  doc.setFontSize(8.7);
  metaRows.forEach(([labelA, valueA, labelB, valueB], index) => {
    const rowY = y + index * rowHeight + 10;
    doc.setFont("helvetica", "normal");
    text(doc, labelA, leftMetaX + 3, rowY);
    if (valueA) {
      doc.setFont("helvetica", "bold");
      text(doc, valueA, leftMetaX + 3, rowY + 11);
    }
    doc.setFont("helvetica", "normal");
    text(doc, labelB, rightMetaX + 3, rowY);
    if (valueB) {
      doc.setFont("helvetica", "bold");
      text(doc, valueB, rightMetaX + 3, rowY + 11);
    }
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  text(doc, "Terms of Delivery", leftMetaX + 3, y + height - 60);
}

function drawItemHeader(doc: jsPDF, x: number, y: number) {
  const headers = [
    ["Sl", "No."],
    ["Description of Goods"],
    ["HSN/SAC"],
    ["GST", "Rate"],
    ["Quantity"],
    ["Rate", "(Incl. GST)"],
    ["per"],
    ["Amount"],
  ];

  doc.rect(x, y, BODY_WIDTH, 36);
  drawVerticals(doc, x, y, 36, ITEM_COLUMNS);
  doc.setFontSize(8.6);
  headers.forEach((parts, index) => {
    const cellX = x + ITEM_COLUMNS.slice(0, index).reduce((sum, width) => sum + width, 0);
    parts.forEach((part, lineIndex) => {
      drawCellText(doc, part, cellX, y + 13 + lineIndex * 12, ITEM_COLUMNS[index], "center");
    });
  });
}

function drawItemsAndTotals(doc: jsPDF, invoice: PdfInvoice) {
  const x = MARGIN_X;
  const y = 282;
  const height = 270;
  const headerHeight = 36;
  const totalHeight = 22;
  const bodyY = y + headerHeight;
  const bodyHeight = height - headerHeight - totalHeight;
  const totalY = y + height - totalHeight;
  const items = invoice.items || [];

  drawItemHeader(doc, x, y);
  doc.rect(x, bodyY, BODY_WIDTH, bodyHeight);
  drawVerticals(doc, x, bodyY, bodyHeight + totalHeight, ITEM_COLUMNS);
  doc.line(x, totalY, x + BODY_WIDTH, totalY);

  doc.setFontSize(9.2);
  let rowY = bodyY + 15;
  items.slice(0, 8).forEach((item, index) => {
    const rowTop = rowY - 9;
    const descriptionX = x + ITEM_COLUMNS[0] + 3;
    const descLines = doc.splitTextToSize(safe(item.productName) || "Item", ITEM_COLUMNS[1] - 6);
    drawCellText(doc, String(index + 1), x, rowY, ITEM_COLUMNS[0], "center");
    doc.text(descLines, descriptionX, rowY);
    drawCellText(doc, safe(item.hsnCode) || "-", x + ITEM_COLUMNS[0] + ITEM_COLUMNS[1], rowY, ITEM_COLUMNS[2], "center");
    drawCellText(doc, `${numberValue(item.gstRate).toFixed(0)} %`, x + ITEM_COLUMNS.slice(0, 3).reduce((sum, width) => sum + width, 0), rowY, ITEM_COLUMNS[3], "right");
    drawCellText(doc, String(numberValue(item.quantity)), x + ITEM_COLUMNS.slice(0, 4).reduce((sum, width) => sum + width, 0), rowY, ITEM_COLUMNS[4], "center");
    drawCellText(doc, money(item.rate), x + ITEM_COLUMNS.slice(0, 5).reduce((sum, width) => sum + width, 0), rowY, ITEM_COLUMNS[5], "right");
    drawCellText(doc, "Item", x + ITEM_COLUMNS.slice(0, 6).reduce((sum, width) => sum + width, 0), rowY, ITEM_COLUMNS[6], "center");
    drawCellText(doc, money(item.amount), x + ITEM_COLUMNS.slice(0, 7).reduce((sum, width) => sum + width, 0), rowY, ITEM_COLUMNS[7], "right");
    rowY = rowTop + Math.max(28, descLines.length * 10 + 12);
  });

  const summaryX = x + ITEM_COLUMNS[0] + ITEM_COLUMNS[1] - 3;
  const amountX = x + BODY_WIDTH - 6;
  const roundOff = roundMoney(numberValue(invoice.grandTotal) - numberValue(invoice.taxableAmount) - numberValue(invoice.cgst) - numberValue(invoice.sgst) - numberValue(invoice.igst));
  const summaryRows = [
    ["Taxable Value", money(invoice.taxableAmount)],
    ["Output CGST", money(invoice.cgst)],
    ["Output SGST", money(invoice.sgst)],
    ...(numberValue(invoice.igst) ? [["Output IGST", money(invoice.igst)]] : []),
    ["Round Off", signedMoney(roundOff)],
    ["Paid Amount", money(invoice.paidAmount)],
    ["Balance Due", money(invoice.balanceAmount)],
  ];

  doc.setFontSize(9.2);
  let summaryY = Math.max(rowY + 12, totalY - 100);
  summaryRows.forEach(([label, value]) => {
    text(doc, label, summaryX, summaryY, { align: "right" });
    text(doc, value, amountX, summaryY, { align: "right" });
    summaryY += 12;
  });

  const totalQuantity = items.reduce((sum, item) => sum + numberValue(item.quantity), 0);
  doc.setFontSize(9.4);
  text(doc, "Total", x + ITEM_COLUMNS[0] + ITEM_COLUMNS[1] - 8, totalY + 15, { align: "right" });
  text(doc, `${totalQuantity} Items`, x + ITEM_COLUMNS.slice(0, 5).reduce((sum, width) => sum + width, 0) - 6, totalY + 15, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  text(doc, money(invoice.grandTotal), amountX, totalY + 16, { align: "right" });
  doc.setFont("helvetica", "normal");

  return y + height;
}

function drawAmountWords(doc: jsPDF, invoice: PdfInvoice, y: number) {
  const x = MARGIN_X;
  const height = 44;
  doc.rect(x, y, BODY_WIDTH, height);
  doc.setFontSize(8.6);
  text(doc, "Amount Chargeable (in words)", x + 3, y + 12);
  text(doc, "E. & O.E", x + BODY_WIDTH - 6, y + 12, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.2);
  drawWrapped(doc, amountInWords(numberValue(invoice.grandTotal)), x + 3, y + 30, BODY_WIDTH - 10, 10);
  doc.setFont("helvetica", "normal");
  return y + height;
}

function taxSummary(invoice: PdfInvoice) {
  const summary = new Map<string, TaxRow>();

  (invoice.items || []).forEach((item) => {
    const hsn = safe(item.hsnCode) || "-";
    const gstRate = numberValue(item.gstRate);
    const amount = numberValue(item.amount);
    const taxable = gstRate > 0 ? amount / (1 + gstRate / 100) : amount;
    const tax = amount - taxable;
    const key = `${hsn}-${gstRate}`;
    const existing = summary.get(key) || { hsn, gstRate, taxable: 0, cgst: 0, sgst: 0, tax: 0 };
    existing.taxable += taxable;
    existing.tax += tax;
    existing.cgst += tax / 2;
    existing.sgst += tax / 2;
    summary.set(key, existing);
  });

  return Array.from(summary.values()).map((row) => ({
    ...row,
    taxable: roundMoney(row.taxable),
    cgst: roundMoney(row.cgst),
    sgst: roundMoney(row.sgst),
    tax: roundMoney(row.tax),
  }));
}

function drawGstSummary(doc: jsPDF, invoice: PdfInvoice, y: number) {
  const rows = taxSummary(invoice);
  const x = MARGIN_X;
  const height = 82;
  const headerSplit = y + 16;
  const rowY = y + 44;

  doc.rect(x, y, BODY_WIDTH, height);
  doc.line(x, headerSplit, x + BODY_WIDTH, headerSplit);
  doc.line(x, y + 36, x + BODY_WIDTH, y + 36);
  doc.line(x, y + height - 18, x + BODY_WIDTH, y + height - 18);
  drawVerticals(doc, x, y, height, GST_COLUMNS);

  const centralX = x + GST_COLUMNS[0] + GST_COLUMNS[1];
  const stateX = centralX + GST_COLUMNS[2] + GST_COLUMNS[3];

  doc.setFontSize(8.4);
  drawCellText(doc, "HSN/SAC", x, y + 15, GST_COLUMNS[0], "center");
  drawCellText(doc, "Taxable", x + GST_COLUMNS[0], y + 15, GST_COLUMNS[1], "center");
  drawCellText(doc, "Value", x + GST_COLUMNS[0], y + 28, GST_COLUMNS[1], "center");
  drawCellText(doc, "Central Tax", centralX, y + 15, GST_COLUMNS[2] + GST_COLUMNS[3], "center");
  drawCellText(doc, "State Tax", stateX, y + 15, GST_COLUMNS[4] + GST_COLUMNS[5], "center");
  drawCellText(doc, "Total", x + BODY_WIDTH - GST_COLUMNS[6], y + 15, GST_COLUMNS[6], "center");
  drawCellText(doc, "Tax Amount", x + BODY_WIDTH - GST_COLUMNS[6], y + 28, GST_COLUMNS[6], "center");
  ["Rate", "Amount", "Rate", "Amount"].forEach((label, index) => {
    const colX = centralX + GST_COLUMNS.slice(2, 2 + index).reduce((sum, width) => sum + width, 0);
    drawCellText(doc, label, colX, y + 31, GST_COLUMNS[index + 2], "center");
  });

  doc.setFontSize(8.2);
  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalTax = 0;
  rows.slice(0, 2).forEach((row, index) => {
    const currentY = rowY + index * 11;
    totalTaxable += row.taxable;
    totalCgst += row.cgst;
    totalSgst += row.sgst;
    totalTax += row.tax;
    drawCellText(doc, row.hsn, x, currentY, GST_COLUMNS[0], "left");
    drawCellText(doc, money(row.taxable), x + GST_COLUMNS[0], currentY, GST_COLUMNS[1], "right");
    drawCellText(doc, `${(row.gstRate / 2).toFixed(0)}%`, centralX, currentY, GST_COLUMNS[2], "right");
    drawCellText(doc, money(row.cgst), centralX + GST_COLUMNS[2], currentY, GST_COLUMNS[3], "right");
    drawCellText(doc, `${(row.gstRate / 2).toFixed(0)}%`, stateX, currentY, GST_COLUMNS[4], "right");
    drawCellText(doc, money(row.sgst), stateX + GST_COLUMNS[4], currentY, GST_COLUMNS[5], "right");
    drawCellText(doc, money(row.tax), x + BODY_WIDTH - GST_COLUMNS[6], currentY, GST_COLUMNS[6], "right");
  });

  const totalY = y + height - 6;
  doc.setFont("helvetica", "bold");
  drawCellText(doc, "Total", x, totalY, GST_COLUMNS[0], "right");
  drawCellText(doc, money(totalTaxable), x + GST_COLUMNS[0], totalY, GST_COLUMNS[1], "right");
  drawCellText(doc, money(totalCgst), centralX + GST_COLUMNS[2], totalY, GST_COLUMNS[3], "right");
  drawCellText(doc, money(totalSgst), stateX + GST_COLUMNS[4], totalY, GST_COLUMNS[5], "right");
  drawCellText(doc, money(totalTax), x + BODY_WIDTH - GST_COLUMNS[6], totalY, GST_COLUMNS[6], "right");
  doc.setFont("helvetica", "normal");

  return y + height;
}

function drawTaxWords(doc: jsPDF, invoice: PdfInvoice, y: number) {
  const x = MARGIN_X;
  const height = 28;
  doc.rect(x, y, BODY_WIDTH, height);
  doc.setFontSize(8.7);
  text(doc, "Tax Amount (in words) :", x + 3, y + 18);
  doc.setFont("helvetica", "bold");
  text(doc, amountInWords(numberValue(invoice.totalTax)), x + 106, y + 18);
  doc.setFont("helvetica", "normal");
  return y + height;
}

function drawBottomSection(doc: jsPDF, settings: PdfCompanySettings, y: number) {
  const x = MARGIN_X;
  const height = 110;
  const leftWidth = 265;
  const rightX = x + leftWidth;

  doc.rect(x, y, BODY_WIDTH, height);
  doc.line(rightX, y, rightX, y + height);
  doc.line(rightX, y + 68, x + BODY_WIDTH, y + 68);

  doc.setFontSize(8.4);
  if (safe(settings.jurisdiction)) {
    text(doc, safe(settings.jurisdiction), x + 3, y + 14);
  }

  doc.setFont("helvetica", "bold");
  text(doc, "Declaration", x + 3, y + height - 34);
  doc.line(x + 3, y + height - 32, x + 50, y + height - 32);
  doc.setFont("helvetica", "normal");
  drawWrapped(doc, safe(settings.declaration), x + 3, y + height - 21, leftWidth - 10, 8.2);

  text(doc, "Company's Bank Details", rightX + 3, y + 14);
  const bankLines = [
    safe(settings.bankName) ? `Bank Name        : ${safe(settings.bankName)}` : "",
    safe(settings.accountNumber) ? `A/c No.          : ${safe(settings.accountNumber)}` : "",
    safe(settings.branch) || safe(settings.ifscCode) ? `Branch & IFSC Code : ${[settings.branch, settings.ifscCode].map(safe).filter(Boolean).join(" & ")}` : "",
    safe(settings.upiId) ? `UPI ID           : ${safe(settings.upiId)}` : "",
  ].filter(Boolean);
  bankLines.forEach((line, index) => text(doc, line, rightX + 3, y + 30 + index * 11));

  doc.setFont("helvetica", "bold");
  text(doc, `for ${companyName(settings)}`, x + BODY_WIDTH - 6, y + 78, { align: "right" });
  doc.setFont("helvetica", "normal");
  text(doc, safe(settings.authorizedSignatoryName), x + BODY_WIDTH - 6, y + 94, { align: "right" });
  text(doc, "Authorized Signatory", x + BODY_WIDTH - 6, y + height - 3, { align: "right" });

  return y + height;
}

function drawComputerNote(doc: jsPDF) {
  doc.setFontSize(9);
  text(doc, "This is a Computer Generated Invoice", PAGE_WIDTH / 2, NOTE_Y, { align: "center" });
}

function drawTraditionalInvoice(doc: jsPDF, invoice: PdfInvoice, settings: PdfCompanySettings) {
  setBaseStyle(doc);
  drawTopSection(doc, invoice, settings);
  const afterItems = drawItemsAndTotals(doc, invoice);
  const afterWords = drawAmountWords(doc, invoice, afterItems);
  const afterGst = drawGstSummary(doc, invoice, afterWords);
  const afterTaxWords = drawTaxWords(doc, invoice, afterGst);
  drawBottomSection(doc, settings, afterTaxWords);
  drawComputerNote(doc);

  if ((invoice.items || []).length > 8) {
    doc.addPage();
    setBaseStyle(doc);
    doc.setFontSize(11);
    text(doc, `Additional items for Invoice ${safe(invoice.invoiceNumber)}`, MARGIN_X, 36);
    let y = 56;
    (invoice.items || []).slice(8).forEach((item, index) => {
      doc.setFontSize(8.6);
      const line = `${index + 9}. ${safe(item.productName)} | HSN: ${safe(item.hsnCode) || "-"} | Qty: ${numberValue(item.quantity)} | Rate: ${money(item.rate)} | Amount: ${money(item.amount)}`;
      text(doc, line, MARGIN_X, y);
      y += 14;
    });
  }
}

export function createInvoicePdf(invoice: PdfInvoice, settings: PdfCompanySettings) {
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const invoiceNumber = safe(invoice.invoiceNumber) || "Invoice";
  const filename = `Invoice-${sanitizeFilePart(invoiceNumber)}.pdf`;

  doc.setProperties({
    title: filename,
    subject: `Tax invoice ${invoiceNumber}`,
    author: companyName(settings),
  });

  drawTraditionalInvoice(doc, invoice, settings);

  return { blob: doc.output("blob"), filename };
}

export function openInvoicePdf(invoice: PdfInvoice, settings: PdfCompanySettings, targetWindow?: Window | null) {
  const { blob, filename } = createInvoicePdf(invoice, settings);
  const url = URL.createObjectURL(blob);
  const opened = targetWindow || window.open("", "_blank");

  if (!opened) {
    URL.revokeObjectURL(url);
    throw new Error("The browser blocked the PDF tab. Please allow pop-ups for this site and try again.");
  }

  opened.opener = null;
  try {
    opened.document.title = filename;
  } catch {
    // The PDF still opens even when the browser does not allow setting the tab title.
  }
  opened.location.href = url;
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
