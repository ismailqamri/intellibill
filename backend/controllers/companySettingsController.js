const CompanySettings = require("../models/CompanySettings");

// Create or Update Settings
exports.saveSettings = async (req, res) => {
  try {
    let settings = await CompanySettings.findOne();

    if (settings) {
      settings = await CompanySettings.findByIdAndUpdate(
        settings._id,
        req.body,
        {
          new: true,
          runValidators: true,
        }
      );
    } else {
      settings = await CompanySettings.create(req.body);
    }

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