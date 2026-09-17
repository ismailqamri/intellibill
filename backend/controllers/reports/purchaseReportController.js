
const Purchase = require("../../models/Purchase");

// Get Purchase Report
exports.getPurchaseReport = async (req, res) => {
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

      filter.purchaseDate = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    // Fetch Purchases
    const purchases = await Purchase.find(filter)
      .populate("supplier", "name phone")
      .sort({ purchaseDate: -1 })
      .lean();

    // Calculate Summary
    const summary = purchases.reduce(
      (result, purchase) => {
        result.purchaseCount += 1;
        result.taxableAmount += purchase.taxableAmount || 0;
        result.totalTax += purchase.totalTax || 0;
        result.grandTotal += purchase.grandTotal || 0;
        result.paidAmount += purchase.paidAmount || 0;
        result.balanceAmount += purchase.balanceAmount || 0;

        return result;
      },
      {
        purchaseCount: 0,
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

    purchases.forEach((purchase) => {
      if (paymentStatus[purchase.paymentStatus] !== undefined) {
        paymentStatus[purchase.paymentStatus] += 1;
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
      purchases,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};