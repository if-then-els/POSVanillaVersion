const PaymentMethod = require("../models/paymentMethod");

exports.addPaymentMethod = async (req, res) => {
  try {
    const method = await PaymentMethod.create({
      businessId: req.user.businessId,
      type: req.body.type,
      provider: req.body.provider,
      label: req.body.label,
      config: req.body.config,
    });

    res.status(201).json({ success: true, method });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPaymentMethods = async (req, res) => {
  try {
    const methods = await PaymentMethod.find({
      businessId: req.user.businessId,
      active: true,
    });
    res.json({ success: true, methods });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
