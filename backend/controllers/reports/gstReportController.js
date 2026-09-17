
const Invoice = require("../../models/Invoice");
const Purchase = require("../../models/Purchase");

// Get GST Summary Report
exports.getGSTSummary = async (req, res) => {
  try {
    const { from, to } = req.query;

    const invoiceFilter = {};
    const purchaseFilter = {};

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

      invoiceFilter.invoiceDate = {
        $gte: startDate,
        $lte: endDate,
      };

      purchaseFilter.purchaseDate = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    // Fetch Invoices and Purchases
    const [invoices, purchases] = await Promise.all([
      Invoice.find(invoiceFilter).lean(),
      Purchase.find(purchaseFilter).lean(),
    ]);

    // Sales GST Summary
    const sales = invoices.reduce(
      (summary, invoice) => {
        summary.invoiceCount += 1;
        summary.taxableAmount += invoice.taxableAmount || 0;
        summary.cgst += invoice.cgst || 0;
        summary.sgst += invoice.sgst || 0;
        summary.igst += invoice.igst || 0;
        summary.totalTax += invoice.totalTax || 0;
        summary.grandTotal += invoice.grandTotal || 0;

        return summary;
      },
      {
        invoiceCount: 0,
        taxableAmount: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        totalTax: 0,
        grandTotal: 0,
      }
    );

    // Purchase GST Summary
    const purchaseSummary = purchases.reduce(
      (summary, purchase) => {
        summary.purchaseCount += 1;
        summary.taxableAmount += purchase.taxableAmount || 0;
        summary.cgst += purchase.cgst || 0;
        summary.sgst += purchase.sgst || 0;
        summary.igst += purchase.igst || 0;
        summary.totalTax += purchase.totalTax || 0;
        summary.grandTotal += purchase.grandTotal || 0;

        return summary;
      },
      {
        purchaseCount: 0,
        taxableAmount: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        totalTax: 0,
        grandTotal: 0,
      }
    );

    // Net GST Summary
    const netGST = {
      taxableAmount:
        sales.taxableAmount - purchaseSummary.taxableAmount,

      cgst: sales.cgst - purchaseSummary.cgst,

      sgst: sales.sgst - purchaseSummary.sgst,

      igst: sales.igst - purchaseSummary.igst,

      totalTax: sales.totalTax - purchaseSummary.totalTax,
    };

    res.status(200).json({
      success: true,

      reportPeriod: {
        from: from || "All dates",
        to: to || "All dates",
      },

      sales,

      purchases: purchaseSummary,

      netGST,

      note: "Sales and purchase returns are not adjusted in this initial report version.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};