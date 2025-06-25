const axios = require("axios");
const Subscription = require("../models/subscription.model");
const SubscriptionLog = require("../models/subscriptionLog.model"); // Assuming you have a SubscriptionLog model

const {
  MPESA_CONSUMER_KEY,
  MPESA_CONSUMER_SECRET,
  MPESA_SHORTCODE,
  MPESA_PASSKEY,
  MPESA_CALLBACK_URL,
} = process.env;

// Helper: Get M-Pesa access token
async function getMpesaToken() {
  const auth = Buffer.from(
    `${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`
  ).toString("base64");
  const res = await axios.get(
    "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    { headers: { Authorization: `Basic ${auth}` } }
  );
  return res.data.access_token;
}

// Controller: Initiate STK Push
exports.initiateMpesaPayment = async (req, res) => {
  try {
    const { phone, amount, businessId, plan, durationMonths } = req.body;
    if (!phone || !amount || !businessId || !plan || !durationMonths) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const token = await getMpesaToken();
    const timestamp = new Date()
      .toISOString()
      .replace(/[^0-9]/g, "")
      .slice(0, 14);
    const password = Buffer.from(
      `${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`
    ).toString("base64");

    const stkPayload = {
      BusinessShortCode: MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: phone,
      PartyB: MPESA_SHORTCODE,
      PhoneNumber: phone,
      CallBackURL: MPESA_CALLBACK_URL,
      AccountReference: businessId,
      TransactionDesc: `Subscription payment for ${plan}`,
    };

    const response = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      stkPayload,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // Save a pending subscription/payment record if needed

    res
      .status(200)
      .json({ message: "STK Push initiated", data: response.data });
  } catch (error) {
    res.status(500).json({
      message: "M-Pesa STK Push failed",
      error: error.response?.data || error.message,
    });
  }
};

// M-Pesa STK Push Callback Handler
exports.mpesaCallback = async (req, res) => {
  try {
    const stkCallback = req.body.Body?.stkCallback;
    if (!stkCallback)
      return res.status(400).json({ message: "Invalid callback data" });

    const resultCode = stkCallback.ResultCode;
    const metadata = stkCallback.CallbackMetadata;
    const amount = metadata?.Item?.find((i) => i.Name === "Amount")?.Value;
    const businessId = stkCallback.AccountReference;

    // Find the latest pending subscription
    const subscription = await Subscription.findOne({
      business: businessId,
      status: "pending",
    }).sort({ createdAt: -1 });

    if (resultCode === 0 && subscription) {
      // Verify amount matches expected
      if (amount < subscription.totalPrice) {
        return res
          .status(400)
          .json({ message: "Paid amount less than required" });
      }
      subscription.status = "active";
      subscription.lastPaymentDate = new Date();
      await subscription.save();

      // Log payment
      await SubscriptionLog.create({
        business: businessId,
        oldPlan: null,
        newPlan: subscription.plan,
        action: "payment",
        date: new Date(),
        discount: subscription.discount,
        totalPrice: subscription.totalPrice,
      });

      return res
        .status(200)
        .json({ message: "Payment processed successfully" });
    } else {
      return res.status(200).json({ message: "Payment not successful" });
    }
  } catch (error) {
    res.status(500).json({ message: "Callback processing error" });
  }
};
