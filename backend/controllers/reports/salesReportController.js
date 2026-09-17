
const Invoice = require("../../models/Invoice");

// Get Sales Report
exports.getSalesReport = async (req, res) => {
  try {
    const { from, to } = req.query;

    const filter = {};

    // Date Filter
    if (from || to) {
      const startDate = from
        ? new Date(`${from}T00:00:00.000Z`)
        : new Date("1970-01-01T00:00:00.000Z");

      const endDate = to
        ? new Date(`${to}T23:59:59.999Z`)
        : new Date();

      if (
        Number.isNaN(startDate.getTime()) ||
        Number.isNaN(endDate.getTime())
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format. Use YYYY-MM-DD",
        });
      }

      if (startDate > endDate) {
        return res.status(400).json({
          success: false,
          message: "The from date cannot be after the to date",
        });
      }

      filter.invoiceDate = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    // Fetch Invoices
    const invoices = await Invoice.find(filter)
      .populate("customer", "name phone")
      .sort({ invoiceDate: -1 })
      .lean();

    // Calculate Summary
    const summary = invoices.reduce(
      (result, invoice) => {
        result.invoiceCount += 1;
        result.taxableAmount += invoice.taxableAmount || 0;
        result.totalTax += invoice.totalTax || 0;
        result.grandTotal += invoice.grandTotal || 0;
        result.paidAmount += invoice.paidAmount || 0;
        result.balanceAmount += invoice.balanceAmount || 0;

        return result;
      },
      {
        invoiceCount: 0,
        taxableAmount: 0,
        totalTax: 0,
        grandTotal: 0,
        paidAmount: 0,
        balanceAmount: 0,
      }
    );

    // Payment Status Summary
    const paymentStatus = {
      PAID: 0,
      PARTIAL: 0,
      PENDING: 0,
    };

    invoices.forEach((invoice) => {
      if (paymentStatus[invoice.paymentStatus] !== undefined) {
        paymentStatus[invoice.paymentStatus] += 1;
      }
    });

    res.status(200).json({
      success: true,
      reportPeriod: {
        from: from || "All dates",
        to: to || "All dates",
      },
      summary,
      paymentStatus,
      invoices,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};