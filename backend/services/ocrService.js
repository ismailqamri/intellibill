const fs = require("fs");
const path = require("path");
const Tesseract = require("tesseract.js");

/**
 * Clean and normalize text lines
 */
function cleanLines(text) {
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Normalize Date into YYYY-MM-DD if possible
 */
function normalizeDate(rawDate) {
  if (!rawDate) return "";

  const trimmed = rawDate.trim();

  // Pattern DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (dmyMatch) {
    let day = dmyMatch[1].padStart(2, "0");
    let month = dmyMatch[2].padStart(2, "0");
    let year = dmyMatch[3];
    if (year.length === 2) year = `20${year}`;
    if (Number(month) <= 12 && Number(day) <= 31) {
      return `${year}-${month}-${day}`;
    }
  }

  // Pattern YYYY-MM-DD
  const ymdMatch = trimmed.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, "0");
    const day = ymdMatch[3].padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // Month name pattern (e.g., 5-Sep-2023 or 15 Jan 2024)
  const monthNameMatch = trimmed.match(
    /^(\d{1,2})[\s\-\/]([A-Za-z]{3,9})[\s\-\/](\d{2,4})$/
  );
  if (monthNameMatch) {
    const day = monthNameMatch[1].padStart(2, "0");
    let year = monthNameMatch[3];
    if (year.length === 2) year = `20${year}`;
    const monthStr = monthNameMatch[2].toLowerCase();
    const months = {
      jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
      jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
    };
    for (const [key, val] of Object.entries(months)) {
      if (monthStr.startsWith(key)) {
        return `${year}-${val}-${day}`;
      }
    }
  }

  return trimmed;
}

/**
 * Extract text from file (image or PDF)
 */
async function extractRawText(fileInput, mimeType) {
  let buffer;

  if (Buffer.isBuffer(fileInput)) {
    buffer = fileInput;
  } else if (typeof fileInput === "string" && fs.existsSync(fileInput)) {
    buffer = fs.readFileSync(fileInput);
  } else {
    throw new Error("Invalid file input: must be buffer or existing file path");
  }

  const isPdf =
    mimeType === "application/pdf" ||
    (typeof fileInput === "string" && fileInput.toLowerCase().endsWith(".pdf")) ||
    (buffer.length >= 4 && buffer.slice(0, 4).toString() === "%PDF");

  if (isPdf) {
    try {
      const pdfLib = require("pdf-parse");
      const PDFParseClass = pdfLib.PDFParse || pdfLib;
      if (typeof PDFParseClass === "function" && PDFParseClass.prototype?.getText) {
        const parser = new PDFParseClass({ data: buffer });
        const res = await parser.getText();
        if (res && res.text && res.text.trim().length > 10) {
          return res.text;
        }
      } else if (typeof pdfLib === "function") {
        const res = await pdfLib(buffer);
        if (res && res.text && res.text.trim().length > 10) {
          return res.text;
        }
      }
    } catch (pdfErr) {
      console.warn("PDF text parse error:", pdfErr.message);
    }

    throw new Error(
      "Could not extract readable text from this PDF invoice. If it is a scanned document without embedded text, please upload as an image (JPG/PNG)."
    );
  }

  // For images (PNG, JPG, WEBP, etc.)
  try {
    const result = await Tesseract.recognize(buffer, "eng", {
      logger: () => {},
    });
    return result.data.text || "";
  } catch (imgErr) {
    console.error("Tesseract recognition error:", imgErr.message);
    throw new Error(
      "Could not recognize text from this image. Please ensure the invoice is well-lit and legible."
    );
  }
}

/**
 * Parse raw invoice text into normalized structured data
 */
function parseInvoiceText(rawText) {
  const lines = cleanLines(rawText);

  const normalized = {
    supplier: {
      name: "",
      gstin: "",
      phone: "",
      address: "",
    },
    invoiceNumber: "",
    invoiceDate: "",
    items: [],
    subtotal: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    total: 0,
  };

  const gstRegex = /\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Zz][0-9A-Z]{1}\b/;
  const phoneRegex = /(?:(?:\+|0{0,2})91[\s-]?)?[6-9]\d{9}\b/;
  const landlineRegex = /\b0\d{2,4}[\s-]?\d{6,8}\b/;
  const dateRegex = /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{1,2}[\s\-\/](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\-\/]\d{2,4})\b/i;

  const headerIgnoreWords = [
    "tax invoice",
    "retail invoice",
    "tax-invoice",
    "bill of supply",
    "cash memo",
    "original for recipient",
    "duplicate for supplier",
    "triplicate for transporter",
    "proforma invoice",
    "commercial invoice",
    "invoice",
    "gst invoice",
  ];

  // Divide into supplier lines vs buyer lines
  let supplierLines = [];
  let inSupplierZone = true;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    if (
      lower.startsWith("buyer") ||
      lower.startsWith("bill to") ||
      lower.startsWith("billed to") ||
      lower.startsWith("details of receiver") ||
      lower.startsWith("consignee")
    ) {
      inSupplierZone = false;
      break;
    }
    if (inSupplierZone) {
      supplierLines.push(line);
    }
  }

  if (supplierLines.length === 0) {
    supplierLines = lines.slice(0, 10);
  }

  // 1. Supplier GSTIN
  for (const line of supplierLines) {
    const match = line.match(gstRegex);
    if (match) {
      normalized.supplier.gstin = match[0].toUpperCase();
      break;
    }
  }
  if (!normalized.supplier.gstin) {
    for (const line of lines) {
      const match = line.match(gstRegex);
      if (match) {
        normalized.supplier.gstin = match[0].toUpperCase();
        break;
      }
    }
  }

  // 2. Supplier Phone
  for (const line of supplierLines) {
    const match = line.match(phoneRegex) || line.match(landlineRegex);
    if (match) {
      const digits = match[0].replace(/\D/g, "");
      normalized.supplier.phone = digits.slice(-10);
      break;
    }
  }
  if (!normalized.supplier.phone) {
    for (const line of lines.slice(0, 15)) {
      const match = line.match(phoneRegex) || line.match(landlineRegex);
      if (match) {
        const digits = match[0].replace(/\D/g, "");
        normalized.supplier.phone = digits.slice(-10);
        break;
      }
    }
  }

  // 3. Supplier Name
  for (const line of supplierLines) {
    const lower = line.toLowerCase().trim();
    if (headerIgnoreWords.some((w) => lower === w || lower.startsWith(w + " -"))) continue;
    if (line.match(gstRegex) || line.match(phoneRegex)) continue;
    if (lower.startsWith("state") || lower.startsWith("e-mail") || lower.startsWith("contact") || lower.startsWith("d.no")) continue;

    const prefixMatch = line.match(/(?:sold\s*by|supplier|m\/s|messrs)[\s.:]+(.+)/i);
    if (prefixMatch && prefixMatch[1].trim().length > 2) {
      normalized.supplier.name = prefixMatch[1].trim().replace(/[^\w\s&.,()-]/g, "");
      break;
    }

    if (!normalized.supplier.name && line.length >= 3 && line.length <= 60) {
      normalized.supplier.name = line.replace(/[^\w\s&.,()-]/g, "").trim();
      break;
    }
  }

  // 4. Supplier Address
  const addrList = [];
  for (const line of supplierLines) {
    const lower = line.toLowerCase();
    if (
      line !== normalized.supplier.name &&
      !line.match(gstRegex) &&
      !headerIgnoreWords.includes(lower) &&
      !lower.startsWith("contact") &&
      !lower.startsWith("e-mail") &&
      (lower.includes("road") ||
        lower.includes("street") ||
        lower.includes("nagar") ||
        lower.includes("bunder") ||
        lower.includes("estate") ||
        lower.includes("industrial") ||
        lower.includes("plot") ||
        lower.includes("floor") ||
        lower.includes("d.no") ||
        /\b\d{6}\b/.test(line))
    ) {
      addrList.push(line);
    }
  }
  if (addrList.length > 0) {
    normalized.supplier.address = addrList.slice(0, 3).join(", ");
  }

  // 5. Invoice Number
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    if (
      lower.startsWith("invoice no") ||
      lower.startsWith("inv no") ||
      lower.startsWith("bill no") ||
      lower === "invoice no." ||
      lower.startsWith("invoice #") ||
      lower.startsWith("bill #")
    ) {
      const inlineMatch = line.match(/(?:invoice\s*no\.?|inv\s*no\.?|bill\s*no\.?)[\s.:#№-]*([A-Za-z0-9\-_/]+)/i);
      if (inlineMatch && inlineMatch[1] && inlineMatch[1].length > 1 && !["date", "dated"].includes(inlineMatch[1].toLowerCase())) {
        normalized.invoiceNumber = inlineMatch[1];
        break;
      }
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (
          nextLine &&
          !nextLine.toLowerCase().startsWith("dated") &&
          !nextLine.toLowerCase().startsWith("mode") &&
          !nextLine.toLowerCase().startsWith("delivery")
        ) {
          normalized.invoiceNumber = nextLine;
          break;
        }
      }
    }
  }

  if (!normalized.invoiceNumber) {
    for (const line of lines) {
      const match = line.match(/(?:inv(?:oice)?|bill)[\s.:#№-]*([A-Za-z0-9\-_/]{3,20})/i);
      if (match && match[1] && !["date", "dated", "original", "tax"].includes(match[1].toLowerCase())) {
        normalized.invoiceNumber = match[1];
        break;
      }
    }
  }

  // 6. Invoice Date
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    if (
      lower.startsWith("dated") ||
      lower.startsWith("date") ||
      lower.startsWith("invoice date") ||
      lower.startsWith("bill date")
    ) {
      const inlineMatch = line.match(dateRegex);
      if (inlineMatch) {
        normalized.invoiceDate = normalizeDate(inlineMatch[1]);
        break;
      }
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        const nextMatch = nextLine.match(dateRegex);
        if (nextMatch) {
          normalized.invoiceDate = normalizeDate(nextMatch[1]);
          break;
        }
      }
    }
  }

  if (!normalized.invoiceDate) {
    for (const line of lines) {
      if (line.toLowerCase().includes("d.no") || line.toLowerCase().includes("road") || line.toLowerCase().includes("plot")) {
        continue;
      }
      const match = line.match(dateRegex);
      if (match) {
        normalized.invoiceDate = normalizeDate(match[1]);
        break;
      }
    }
  }

  // 7. Taxes & Totals
  for (const line of lines) {
    const lower = line.toLowerCase();

    if ((lower.includes("cgst") || lower.includes("central tax")) && !lower.includes("rate")) {
      const amounts = line.match(/\b\d+(?:,\d+)*(?:\.\d{1,2})\b/g);
      if (amounts) {
        const lastNum = parseFloat(amounts[amounts.length - 1].replace(/[^\d.]/g, ""));
        if (!isNaN(lastNum) && lastNum > 0) normalized.cgst = lastNum;
      }
    }

    if ((lower.includes("sgst") || lower.includes("state tax") || lower.includes("utgst")) && !lower.includes("rate")) {
      const amounts = line.match(/\b\d+(?:,\d+)*(?:\.\d{1,2})\b/g);
      if (amounts) {
        const lastNum = parseFloat(amounts[amounts.length - 1].replace(/[^\d.]/g, ""));
        if (!isNaN(lastNum) && lastNum > 0) normalized.sgst = lastNum;
      }
    }

    if ((lower.includes("igst") || lower.includes("integrated tax")) && !lower.includes("rate")) {
      const amounts = line.match(/\b\d+(?:,\d+)*(?:\.\d{1,2})\b/g);
      if (amounts) {
        const lastNum = parseFloat(amounts[amounts.length - 1].replace(/[^\d.]/g, ""));
        if (!isNaN(lastNum) && lastNum > 0) normalized.igst = lastNum;
      }
    }
  }

  const taxSum = (normalized.cgst || 0) + (normalized.sgst || 0) + (normalized.igst || 0);

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (
      lower.startsWith("total ") ||
      lower.includes("grand total") ||
      lower.includes("net total") ||
      lower.includes("invoice value")
    ) {
      if (!lower.includes("tax amount") && !lower.includes("hsn")) {
        const amounts = line.match(/\b\d+(?:,\d+)*(?:\.\d{1,2})\b/g);
        if (amounts) {
          const candidate = parseFloat(amounts[0].replace(/[^\d.]/g, ""));
          if (!isNaN(candidate) && candidate > taxSum && candidate > normalized.total) {
            normalized.total = candidate;
          }
        }
      }
    }

    if (
      lower.includes("sub total") ||
      lower.includes("subtotal") ||
      lower.includes("taxable value") ||
      lower.includes("taxable amount")
    ) {
      const amounts = line.match(/\b\d+(?:,\d+)*(?:\.\d{1,2})\b/g);
      if (amounts) {
        const lastNum = parseFloat(amounts[amounts.length - 1].replace(/[^\d.]/g, ""));
        if (!isNaN(lastNum) && lastNum > 0) normalized.subtotal = lastNum;
      }
    }
  }

  // 8. Line Items Extraction
  let inItemSection = false;
  let itemSectionLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    if (
      !inItemSection &&
      (lower.includes("description") ||
        lower.includes("particulars") ||
        lower.includes("item name") ||
        lower.includes("sl description") ||
        (lower.includes("hsn") && lower.includes("qty")))
    ) {
      inItemSection = true;
      continue;
    }

    if (
      inItemSection &&
      (lower.includes("sub total") ||
        lower.includes("subtotal") ||
        lower.includes("grand total") ||
        lower.startsWith("total ") ||
        lower.startsWith("total:") ||
        lower.startsWith("total\t") ||
        lower.includes("taxable value") ||
        lower.includes("output cgst") ||
        lower.includes("output sgst") ||
        lower.includes("output igst") ||
        lower.includes("cgst @") ||
        lower.includes("sgst @") ||
        lower.includes("igst @") ||
        lower.includes("less :") ||
        lower.includes("amount in words") ||
        lower.includes("declaration") ||
        lower.includes("bank details"))
    ) {
      inItemSection = false;
      break;
    }

    if (inItemSection) {
      if (/^[-=_*]{3,}$/.test(line.trim())) continue;
      itemSectionLines.push(line);
    }
  }

  // Attempt standard column-based row parsing first
  let pendingDescLines = [];
  for (let i = 0; i < itemSectionLines.length; i++) {
    const line = itemSectionLines[i];
    const lower = line.toLowerCase();
    if (
      lower.startsWith("no.") ||
      lower.startsWith("rate") ||
      lower.startsWith("sl ") ||
      lower.startsWith("sr. no") ||
      lower.startsWith("item desc")
    ) {
      continue;
    }

    // Single-line structured table row (e.g. "1 HDMI Cable 2 Meter 8544 10 150.00 18% 1500.00")
    const singleLineMatch = line.match(
      /^(?:(\d+)\s+)?(.+?)\s+(\d{4,8})\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s*(?:%\s*|\s+(\d+(?:\.\d+)?)\s*%\s*)?\s+(\d+(?:\.\d+)?)$/
    );

    if (singleLineMatch) {
      const name = singleLineMatch[2].trim();
      const hsn = singleLineMatch[3];
      const qty = parseFloat(singleLineMatch[4]) || 1;
      const rate = parseFloat(singleLineMatch[5]) || 0;
      const gst = singleLineMatch[6] ? parseFloat(singleLineMatch[6]) : 18;
      const amount = parseFloat(singleLineMatch[7]) || qty * rate;

      normalized.items.push({
        name,
        hsnCode: hsn,
        quantity: qty,
        rate,
        gstRate: gst,
        amount,
      });
      pendingDescLines = [];
      continue;
    }

    // Multi-line invoice (Tally / complex column layouts)
    const hsnMatch = line.match(/\b(\d{4,8})\b/);
    const decimalNums = (line.match(/\b\d+(?:\.\d{1,2})\b/g) || []).map((n) => parseFloat(n));

    if (decimalNums.length === 0 && !hsnMatch) {
      const cleanDesc = line.replace(/^\d+[\.\s\-]+/, "").trim();
      if (cleanDesc.length > 2 && !cleanDesc.toLowerCase().includes("hsn/sac")) {
        pendingDescLines.push(cleanDesc);
      }
    } else {
      let hsn = hsnMatch ? hsnMatch[1] : "";
      let rate = decimalNums[0] || 0;
      let amount = decimalNums[decimalNums.length - 1] || rate;

      const qtyMatch = line.match(/\b(\d+)\s*(?:packet|pcs|nos|units|kg|box|bag|mtr)?\b/i);
      const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;

      const textOnly = line
        .replace(/\b\d+(?:\.\d{1,2})?\b/g, "")
        .replace(/\b\d{4,8}\b/g, "")
        .replace(/[%,\t]/g, " ")
        .replace(/\b(packet|pcs|nos|units|kg|box|bag|mtr)\b/gi, "")
        .trim();

      if (textOnly.length > 2 && !textOnly.toLowerCase().includes("hsn/sac")) {
        pendingDescLines.push(textOnly);
      }

      const itemName = pendingDescLines.join(" ").replace(/\s+/g, " ").trim() || "Invoice Item";

      normalized.items.push({
        name: itemName,
        hsnCode: hsn,
        quantity: qty > 0 ? qty : 1,
        rate: rate > 0 ? rate : amount,
        gstRate: 18,
        amount: amount > 0 ? amount : rate,
      });

      pendingDescLines = [];
    }
  }

  // Fallback: If no items found from multi-line check, try simple regex on lines
  if (normalized.items.length === 0) {
    for (const line of lines) {
      const hsnMatch = line.match(/\b(\d{6,8})\b/);
      const nums = line.match(/\b\d+(?:\.\d{1,2})\b/g);
      if (hsnMatch && nums && nums.length >= 2) {
        normalized.items.push({
          name: "Invoice Item",
          hsnCode: hsnMatch[1],
          quantity: 1,
          rate: parseFloat(nums[nums.length - 1]),
          gstRate: 18,
          amount: parseFloat(nums[nums.length - 1]),
        });
        break;
      }
    }
  }

  // Reconcile totals if missing
  if (normalized.subtotal === 0 && normalized.items.length > 0) {
    normalized.subtotal = Math.round(
      normalized.items.reduce((sum, it) => sum + (it.amount || 0), 0) * 100
    ) / 100;
  }

  if (normalized.total === 0) {
    normalized.total = Math.round(
      (normalized.subtotal +
        normalized.cgst +
        normalized.sgst +
        normalized.igst) *
        100
    ) / 100;
  }

  return normalized;
}

/**
 * Main OCR entry point
 */
async function processInvoice(fileInput, mimeType) {
  const rawText = await extractRawText(fileInput, mimeType);
  const normalized = parseInvoiceText(rawText);

  // Assess confidence & fields that need review
  const needsReviewFields = [];
  if (!normalized.supplier.name) needsReviewFields.push("supplier.name");
  if (!normalized.supplier.gstin) needsReviewFields.push("supplier.gstin");
  if (!normalized.invoiceNumber) needsReviewFields.push("invoiceNumber");
  if (!normalized.invoiceDate) needsReviewFields.push("invoiceDate");
  if (normalized.items.length === 0) needsReviewFields.push("items");
  if (normalized.total <= 0) needsReviewFields.push("total");

  return {
    rawText,
    normalized,
    confidence: {
      isComplete: needsReviewFields.length === 0,
      needsReviewFields,
    },
  };
}

module.exports = {
  extractRawText,
  parseInvoiceText,
  processInvoice,
  normalizeDate,
};
