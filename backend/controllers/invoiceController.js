const Invoice = require("../models/Invoice");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const CompanySettings = require("../models/CompanySettings");
const CustomerAdvance = require("../models/CustomerAdvance");
const Ledger = require("../models/Ledger");

const roundMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

// Get All Invoices
exports.getInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find()
      .populate("customer")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: invoices.length,
      invoices,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get Single Invoice
exports.getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate("customer");

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    res.status(200).json({
      success: true,
      invoice,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Add Payment To Invoice
exports.addInvoicePayment = async (req, res) => {
  try {
    const { amount, method, reference } = req.body;
    const paymentAmount = roundMoney(Number(amount));

    if (!paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Payment amount must be greater than zero",
      });
    }

    if (!["cash", "upi", "bank", "card", "credit"].includes(method)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method",
      });
    }

    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    if (invoice.paymentStatus === "PAID") {
      return res.status(400).json({
        success: false,
        message: "Invoice is already fully paid",
      });
    }

    if (paymentAmount > invoice.balanceAmount) {
      return res.status(400).json({
        success: false,
        message: `Only ₹${invoice.balanceAmount.toFixed(2)} is outstanding`,
      });
    }

    invoice.payments.push({
      method,
      amount: paymentAmount,
      reference: reference || "",
    });

    invoice.paidAmount = roundMoney(
      invoice.paidAmount + paymentAmount
    );

    invoice.balanceAmount = roundMoney(
      Math.max(invoice.grandTotal - invoice.paidAmount, 0)
    );

    if (invoice.balanceAmount === 0) {
      invoice.paymentStatus = "PAID";
    } else {
      invoice.paymentStatus = "PARTIAL";
    }

    await invoice.save();

    await Ledger.create({
      type: "CREDIT",
      amount: paymentAmount,
      paymentMethod: method,
      source: "Invoice Payment",
      sourceId: invoice._id,
      description: `Payment for Invoice ${invoice.invoiceNumber}`,
    });

    res.status(200).json({
      success: true,
      invoice,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Create Invoice
exports.createInvoice = async (req, res) => {
  try {
    const {
      customerId,
      walkInCustomer,
      items,
      paidAmount = 0,
      paymentMethod,
      useAdvance = false,
      dueDate,
      notes,
      grandTotal: requestedGrandTotal,
    } = req.body;

    // Basic validation
    const walkInName = String(walkInCustomer?.name || "").trim();
    const walkInPhone = String(walkInCustomer?.phone || "").trim();

    if (!customerId && !walkInName) {
      return res.status(400).json({
        success: false,
        message: "Customer or walk-in customer name is required",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invoice must contain at least one item",
      });
    }

    // Check customer
    const customer = customerId ? await Customer.findById(customerId) : null;

    if (customerId && !customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Company settings
    const settings = await CompanySettings.findOne();

    if (!settings) {
      return res.status(400).json({
        success: false,
        message: "Company settings not found",
      });
    }

    let taxableAmount = 0;
    let totalTax = 0;

    const invoiceItems = [];

    // Process products
    //
    // IMPORTANT:
    // Product.price is treated as MRP INCLUDING GST.
    //
    // Example:
    // MRP = ₹30
    // GST = 5%
    //
    // Taxable = 30 / 1.05 = ₹28.57
    // GST     = ₹1.43
    // Total   = ₹30
    //
    for (const item of items) {
      const quantity = Number(item.quantity);

      if (!Number.isFinite(quantity) || quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: "Item quantity must be greater than zero",
        });
      }

      const product = await Product.findById(item.productId);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.productId}`,
        });
      }

      // Check stock
      if (product.stock < quantity) {
        return res.status(400).json({
          success: false,
          message: `${product.name} has only ${product.stock} units available`,
        });
      }

      const rateInclusive =
        item.rate !== undefined &&
        item.rate !== null &&
        item.rate !== ""
          ? roundMoney(Number(item.rate))
          : roundMoney(product.price);

      if (!Number.isFinite(rateInclusive) || rateInclusive < 0) {
        return res.status(400).json({
          success: false,
          message: "Item rate must be a valid non-negative amount",
        });
      }

      const mrpInclusive = roundMoney(
        rateInclusive * quantity
      );

      const gstRate = Number(product.gstRate) || 0;

      // Extract GST from MRP
      const itemTaxable =
        gstRate > 0
          ? roundMoney(
              mrpInclusive / (1 + gstRate / 100)
            )
          : mrpInclusive;

      const itemTax = roundMoney(
        mrpInclusive - itemTaxable
      );

      taxableAmount += itemTaxable;
      totalTax += itemTax;

      invoiceItems.push({
        product: product._id,
        productName: product.name,
        quantity,

        // MRP including GST
        rate: rateInclusive,

        gstRate,
        hsnCode: product.hsnCode || "",

        // Total selling amount
        amount: mrpInclusive,
      });
    }

    taxableAmount = roundMoney(taxableAmount);
    totalTax = roundMoney(totalTax);

    // Split GST
    //
    // Remainder goes to SGST so:
    //
    // CGST + SGST = totalTax
    //
    const cgst = roundMoney(totalTax / 2);

    const sgst = roundMoney(
      totalTax - cgst
    );

    // Calculated invoice total
    const calculatedGrandTotal = roundMoney(
      invoiceItems.reduce(
        (sum, item) => sum + item.amount,
        0
      )
    );

    // ------------------------------------------------
    // Editable Grand Total
    // ------------------------------------------------

    let grandTotal = calculatedGrandTotal;

    if (
      requestedGrandTotal !== undefined &&
      requestedGrandTotal !== null &&
      requestedGrandTotal !== ""
    ) {
      const parsedGrandTotal =
        Number(requestedGrandTotal);

      if (
        !Number.isFinite(parsedGrandTotal) ||
        parsedGrandTotal < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Grand total must be a valid non-negative amount",
        });
      }

      grandTotal = roundMoney(parsedGrandTotal);
    }

    // ------------------------------------------------
    // Payment
    // ------------------------------------------------

    const paid = roundMoney(
      Number(paidAmount) || 0
    );

    if (paid > grandTotal) {
      return res.status(400).json({
        success: false,
        message:
          `Paid amount cannot exceed invoice total ₹${grandTotal.toFixed(2)}`,
      });
    }

    if (
      paid > 0 &&
      !["cash", "upi", "bank", "card", "credit"].includes(
        paymentMethod
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A valid payment method is required when paid amount is greater than zero",
      });
    }

    // ------------------------------------------------
    // Customer Advance
    // ------------------------------------------------

    let advanceUsed = 0;
    let totalPaidAmount = paid;

    if (useAdvance && customerId) {
      const advances = await CustomerAdvance.find({
        customer: customerId,
        remainingAmount: { $gt: 0 },
      }).sort({ createdAt: 1 });

      let remainingInvoiceAmount =
        roundMoney(grandTotal - paid);

      for (const advance of advances) {
        if (remainingInvoiceAmount <= 0) {
          break;
        }

        const useAmount = roundMoney(
          Math.min(
            advance.remainingAmount,
            remainingInvoiceAmount
          )
        );

        advance.remainingAmount =
          roundMoney(
            advance.remainingAmount - useAmount
          );

        await advance.save();

        advanceUsed = roundMoney(
          advanceUsed + useAmount
        );

        remainingInvoiceAmount =
          roundMoney(
            remainingInvoiceAmount - useAmount
          );
      }

      totalPaidAmount = roundMoney(
        totalPaidAmount + advanceUsed
      );
    }

    // ------------------------------------------------
    // Balance & Status
    // ------------------------------------------------

    const balanceAmount = roundMoney(
      Math.max(
        grandTotal - totalPaidAmount,
        0
      )
    );

    let paymentStatus = "PENDING";

    if (balanceAmount === 0) {
      paymentStatus = "PAID";
    } else if (totalPaidAmount > 0) {
      paymentStatus = "PARTIAL";
    }

    // ------------------------------------------------
    // Invoice Number
    // ------------------------------------------------

    const invoiceNumber =
      `${settings.currentInvoiceNumber}/${settings.financialYear}`;

    // ------------------------------------------------
    // Create Invoice
    // ------------------------------------------------

    const invoice = await Invoice.create({
      invoiceNumber,

      customer: customer?._id,
      customerName: customer?.name || walkInName,
      customerPhone: customer?.phone || walkInPhone,

      items: invoiceItems,

      taxableAmount,

      cgst,

      sgst,

      totalTax,

      grandTotal,

      paidAmount: totalPaidAmount,

      advanceUsed,

      payments:
        paid > 0
          ? [
              {
                method: paymentMethod,
                amount: paid,
                reference: "",
              },
            ]
          : [],

      balanceAmount,

      paymentStatus,

      dueDate,

      notes,
    });

    // ------------------------------------------------
    // Reduce Product Stock
    // ------------------------------------------------

    for (const item of items) {
      await Product.findByIdAndUpdate(
        item.productId,
        {
          $inc: {
            stock: -Number(item.quantity),
          },
        }
      );
    }

    // ------------------------------------------------
    // Ledger Entry
    // ------------------------------------------------

    if (paid > 0) {
      await Ledger.create({
        type: "CREDIT",
        amount: paid,
        paymentMethod,

        source: "Invoice Payment",

        sourceId: invoice._id,

        description:
          `Payment for Invoice ${invoiceNumber}`,
      });
    }

    // ------------------------------------------------
    // Increment Invoice Number
    // ------------------------------------------------

    settings.currentInvoiceNumber += 1;

    await settings.save();

    // ------------------------------------------------
    // Response
    // ------------------------------------------------

    res.status(201).json({
      success: true,

      calculatedGrandTotal,

      adjustment: roundMoney(
        grandTotal - calculatedGrandTotal
      ),

      advanceUsed,

      invoice,
    });

  } catch (error) {

    console.error(
      "Create invoice error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
