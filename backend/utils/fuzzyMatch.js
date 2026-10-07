// Fuzzy matching and text normalization utilities

function normalizeText(text) {
  if (!text || typeof text !== "string") return "";
  return text
    .toLowerCase()
    .replace(/[^\w\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePhone(phone) {
  if (!phone || typeof phone !== "string") return "";
  const digits = phone.replace(/\D/g, "");
  // If starts with 91 and has 12 digits, strip country code
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }
  return digits.slice(-10); // Return last 10 digits
}

function normalizeGSTIN(gstin) {
  if (!gstin || typeof gstin !== "string") return "";
  return gstin.toUpperCase().replace(/[^0-9A-Z]/g, "").trim();
}

// Levenshtein distance
function levenshteinDistance(a, b) {
  const s1 = a || "";
  const s2 = b || "";
  const m = s1.length;
  const n = s2.length;

  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}

// Similarity score between 0 and 1
function stringSimilarity(a, b) {
  const normA = normalizeText(a);
  const normB = normalizeText(b);

  if (!normA && !normB) return 1;
  if (!normA || !normB) return 0;
  if (normA === normB) return 1;

  // Substring inclusion check
  if (normA.includes(normB) || normB.includes(normA)) {
    const minLen = Math.min(normA.length, normB.length);
    const maxLen = Math.max(normA.length, normB.length);
    if (minLen / maxLen > 0.6) {
      return 0.85 + 0.15 * (minLen / maxLen);
    }
  }

  // Token / word intersection check
  const wordsA = new Set(normA.split(" ").filter((w) => w.length > 1));
  const wordsB = new Set(normB.split(" ").filter((w) => w.length > 1));

  let commonCount = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) commonCount++;
  }

  const tokenScore = (2 * commonCount) / (wordsA.size + wordsB.size || 1);

  const maxLen = Math.max(normA.length, normB.length);
  const distance = levenshteinDistance(normA, normB);
  const charScore = 1 - distance / maxLen;

  return Math.max(tokenScore, charScore);
}

module.exports = {
  normalizeText,
  normalizePhone,
  normalizeGSTIN,
  levenshteinDistance,
  stringSimilarity,
};
