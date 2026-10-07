const Supplier = require("../models/Supplier");
const Product = require("../models/Product");
const {
  normalizeText,
  normalizePhone,
  normalizeGSTIN,
  stringSimilarity,
} = require("../utils/fuzzyMatch");

/**
 * Build user filter for models that support user isolation
 */
function getUserFilter(userId) {
  if (!userId) return {};
  return {
    $or: [{ user: userId }, { user: { $exists: false } }],
  };
}

/**
 * Match extracted supplier against existing suppliers belonging to user
 */
async function matchSupplier(extractedSupplier, userId, suppliersList = null) {
  let suppliers = suppliersList;
  if (!Array.isArray(suppliers)) {
    const userFilter = getUserFilter(userId);
    suppliers = await Supplier.find(userFilter);
  }

  const extGST = normalizeGSTIN(extractedSupplier?.gstin);
  const extPhone = normalizePhone(extractedSupplier?.phone);
  const extName = normalizeText(extractedSupplier?.name);

  // 1. GSTIN exact match
  if (extGST) {
    const match = suppliers.find((s) => normalizeGSTIN(s.gstNumber) === extGST);
    if (match) {
      return {
        status: "EXISTING",
        matchMethod: "GSTIN",
        confidence: 1.0,
        matchedSupplier: match,
      };
    }
  }

  // 2. Phone exact match
  if (extPhone) {
    const match = suppliers.find((s) => normalizePhone(s.phone) === extPhone);
    if (match) {
      return {
        status: "EXISTING",
        matchMethod: "PHONE",
        confidence: 0.95,
        matchedSupplier: match,
      };
    }
  }

  // 3. Normalized supplier name exact match
  if (extName) {
    const exactNameMatch = suppliers.find(
      (s) => normalizeText(s.name) === extName
    );
    if (exactNameMatch) {
      return {
        status: "EXISTING",
        matchMethod: "NAME_EXACT",
        confidence: 0.9,
        matchedSupplier: exactNameMatch,
      };
    }

    // 4. Fuzzy name match
    let bestMatch = null;
    let highestScore = 0;

    for (const s of suppliers) {
      const score = stringSimilarity(s.name, extractedSupplier.name);
      if (score > highestScore) {
        highestScore = score;
        bestMatch = s;
      }
    }

    if (bestMatch && highestScore >= 0.72) {
      return {
        status: "EXISTING",
        matchMethod: "FUZZY_NAME",
        confidence: Math.round(highestScore * 100) / 100,
        matchedSupplier: bestMatch,
      };
    }
  }

  return {
    status: "NEW",
    matchMethod: null,
    confidence: 0,
    matchedSupplier: null,
  };
}

/**
 * Match extracted product items against existing products belonging to user
 */
async function matchProducts(extractedItems, userId, productsList = null) {
  let products = productsList;
  if (!Array.isArray(products)) {
    const userFilter = getUserFilter(userId);
    products = await Product.find(userFilter);
  }

  return extractedItems.map((item) => {
    const extName = normalizeText(item.name);
    const extHsn = (item.hsnCode || "").trim();
    const extSku = (item.sku || item.barcode || "").trim();

    // 1. SKU / Barcode exact match (if available)
    if (extSku) {
      const skuMatch = products.find(
        (p) =>
          ((p.sku && p.sku.trim() === extSku) ||
            (p.barcode && p.barcode.trim() === extSku))
      );
      if (skuMatch) {
        return {
          ...item,
          status: "EXISTING",
          matchMethod: "SKU_BARCODE",
          confidence: 1.0,
          matchedProduct: skuMatch,
        };
      }
    }

    // 2. HSN code + Normalized product name match
    if (extHsn && extName) {
      const hsnNameMatch = products.find(
        (p) =>
          (p.hsnCode || "").trim() === extHsn &&
          normalizeText(p.name) === extName
      );
      if (hsnNameMatch) {
        return {
          ...item,
          status: "EXISTING",
          matchMethod: "HSN_AND_NAME",
          confidence: 0.98,
          matchedProduct: hsnNameMatch,
        };
      }
    }

    // 2. Normalized product name exact match
    if (extName) {
      const exactNameMatch = products.find(
        (p) => normalizeText(p.name) === extName
      );
      if (exactNameMatch) {
        return {
          ...item,
          status: "EXISTING",
          matchMethod: "NAME_EXACT",
          confidence: 0.92,
          matchedProduct: exactNameMatch,
        };
      }

      // 3. Fuzzy name match
      let bestMatch = null;
      let highestScore = 0;

      for (const p of products) {
        const score = stringSimilarity(p.name, item.name);
        if (score > highestScore) {
          highestScore = score;
          bestMatch = p;
        }
      }

      if (bestMatch && highestScore >= 0.7) {
        return {
          ...item,
          status: "EXISTING",
          matchMethod: "FUZZY_NAME",
          confidence: Math.round(highestScore * 100) / 100,
          matchedProduct: bestMatch,
        };
      }
    }

    return {
      ...item,
      status: "NEW",
      matchMethod: null,
      confidence: 0,
      matchedProduct: null,
    };
  });
}

module.exports = {
  getUserFilter,
  matchSupplier,
  matchProducts,
};
