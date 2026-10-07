const CompanySettings = require("../models/CompanySettings");

const GSTIN_PATTERN =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+\-\s()]{7,20}$/;
const PIN_PATTERN = /^[1-9][0-9]{5}$/;
const STATE_CODE_PATTERN = /^[0-9]{1,2}$/;
const INVOICE_PREFIX_PATTERN = /^[A-Z0-9-]{1,12}$/;
const FINANCIAL_YEAR_PATTERN = /^([0-9]{4}|[0-9]{2})-[0-9]{2}$/;

const stringValue = (value) => String(value || "").trim();

function buildSettingsPayload(body) {
  const currentInvoiceNumber = Number(body.currentInvoiceNumber || 1);
  const gstin = stringValue(body.gstin || body.gstNumber).toUpperCase();
  const email = stringValue(body.email).toLowerCase();
  const phone = stringValue(body.phone);
  const pinCode = stringValue(body.pinCode);
  const stateCode = stringValue(body.stateCode);
  const invoicePrefix = stringValue(body.invoicePrefix || "INV").toUpperCase();
  const financialYear = stringValue(body.financialYear || "2026-27");

  return {
    companyName: stringValue(body.companyName),
    logoUrl: stringValue(body.logoUrl),
    address: stringValue(body.address),
    city: stringValue(body.city),
    state: stringValue(body.state),
    pinCode,
    phone,
    email,
    gstin,
    gstNumber: gstin,
    stateName: stringValue(body.stateName),
    stateCode,
    invoicePrefix,
    currentInvoiceNumber,
    financialYear,
    bankName: stringValue(body.bankName),
    accountHolderName: stringValue(body.accountHolderName),
    accountNumber: stringValue(body.accountNumber),
    branch: stringValue(body.branch),
    ifscCode: stringValue(body.ifscCode).toUpperCase(),
    declaration: stringValue(body.declaration),
    jurisdiction: stringValue(body.jurisdiction),
    authorizedSignatoryName: stringValue(body.authorizedSignatoryName),
    termsAndConditions: stringValue(body.termsAndConditions),
  };
}

function validateSettings(payload) {
  if (!payload.companyName) {
    return "Business/Company Name is required";
  }

  if (payload.gstin && !GSTIN_PATTERN.test(payload.gstin)) {
    return "Please enter a valid GSTIN";
  }

  if (payload.email && !EMAIL_PATTERN.test(payload.email)) {
    return "Please enter a valid email address";
  }

  if (payload.phone && !PHONE_PATTERN.test(payload.phone)) {
    return "Please enter a valid phone number";
  }

  if (payload.pinCode && !PIN_PATTERN.test(payload.pinCode)) {
    return "Please enter a valid 6-digit PIN code";
  }

  if (payload.stateCode && !STATE_CODE_PATTERN.test(payload.stateCode)) {
    return "State code must be numeric";
  }

  if (
    payload.invoicePrefix &&
    !INVOICE_PREFIX_PATTERN.test(payload.invoicePrefix)
  ) {
    return "Invoice prefix can only contain letters, numbers, and hyphens";
  }

  if (
    !Number.isInteger(payload.currentInvoiceNumber) ||
    payload.currentInvoiceNumber < 1
  ) {
    return "Current invoice number must be a positive number";
  }

  if (
    payload.financialYear &&
    !FINANCIAL_YEAR_PATTERN.test(payload.financialYear)
  ) {
    return "Financial year must use a format like 2026-27";
  }

  return "";
}

// Create or Update Settings
exports.saveSettings = async (req, res) => {
  try {
    const payload = buildSettingsPayload(req.body);
    const validationError = validateSettings(payload);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    let settings = await CompanySettings.findOne();

    if (settings) {
      settings = await CompanySettings.findByIdAndUpdate(
        settings._id,
        payload,
        {
          new: true,
          runValidators: true,
        }
      );
    } else {
      settings = await CompanySettings.create(payload);
    }

    res.json({
      success: true,
      settings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not save company settings",
    });
  }
};

// Get Settings
exports.getSettings = async (req, res) => {
  try {
    const settings = await CompanySettings.findOne();

    res.json({
      success: true,
      settings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
