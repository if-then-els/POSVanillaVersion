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

    // Calculate endDate for the new subscription
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + Number(durationMonths));

    // You need to fetch the plan price here, similar to your upgradeSubscription logic
    // Assuming you have a Plan model and the price is stored there.
    const Plan = require("../models/plan.model"); // Make sure Plan model is imported
    const planDoc = await Plan.findOne({ name: plan });
    if (!planDoc) {
      return res.status(400).json({ message: "Selected plan does not exist" });
    }
    const planPrice = planDoc.price;
    const totalPrice = planPrice * durationMonths; // Calculate total price

    // Create a new pending subscription *before* initiating STK Push
    // This ensures you have a record to link the callback to, even if STK push fails (less ideal, but safer)
    // Or, create it after successful STK push initiation, using the CheckoutRequestID
    const newSubscription = await Subscription.create({
      business: businessId,
      plan: plan,
      startDate: startDate,
      endDate: endDate,
      status: "pending", // Set status to pending
      autoRenew: false,
      price: planPrice, // Price per month or unit
      totalPrice: totalPrice, // Total calculated price
      durationMonths: durationMonths,
      // You can add other relevant fields here as needed
    });

    const stkPayload = {
      BusinessShortCode: MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount, // Use the amount passed in req.body
      PartyA: phone,
      PartyB: MPESA_SHORTCODE,
      PhoneNumber: phone,
      CallBackURL: MPESA_CALLBACK_URL,
      AccountReference: businessId, // This is your internal reference
      TransactionDesc: `Subscription payment for ${plan}`,
    };

    console.log(
      "STK Push Payload being sent to M-Pesa:",
      JSON.stringify(stkPayload, null, 2)
    );

    const response = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      stkPayload,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log(
      "M-Pesa STK Push Response:",
      JSON.stringify(response.data, null, 2)
    );

    // ************* IMPORTANT FIX *************
    // Update the pending subscription with the CheckoutRequestID
    // This is the key to linking the M-Pesa callback to your subscription
    if (response.data && response.data.CheckoutRequestID) {
      newSubscription.checkoutRequestID = response.data.CheckoutRequestID;
      await newSubscription.save();
      console.log(
        `Saved CheckoutRequestID ${response.data.CheckoutRequestID} to subscription ${newSubscription._id}`
      );
    } else {
      console.warn(
        "M-Pesa STK Push response did not contain CheckoutRequestID."
      );
      // Handle cases where CheckoutRequestID is missing (e.g., failed initiation)
      newSubscription.status = "failed"; // Mark the subscription as failed if STK push initiation response is bad
      await newSubscription.save();
      return res
        .status(500)
        .json({
          message:
            "STK Push initiation failed: Missing CheckoutRequestID in response.",
        });
    }

    res
      .status(200)
      .json({
        message: "STK Push initiated",
        data: response.data,
        subscriptionId: newSubscription._id,
      });
  } catch (error) {
    console.error(
      "M-Pesa STK Push failed:",
      error.response?.data || error.message
    );
    res.status(500).json({
      message: "M-Pesa STK Push failed",
      error: error.response?.data || error.message,
    });
  }
};

// M-Pesa STK Push Callback Handler
exports.mpesaCallback = async (req, res) => {
  try {
    console.log("M-Pesa Callback Body:", JSON.stringify(req.body, null, 2));
    const stkCallback = req.body.Body?.stkCallback;
    if (!stkCallback)
      return res.status(400).json({ message: "Invalid callback data" });

    const resultCode = stkCallback.ResultCode;
    const metadata = stkCallback.CallbackMetadata;
    const amount = metadata?.Item?.find((i) => i.Name === "Amount")?.Value;
    const businessId = stkCallback.AccountReference;

    console.log(
      "ResultCode:",
      resultCode,
      "BusinessId:",
      businessId,
      "Amount:",
      amount
    );

    console.log("businessId from callback:", businessId);
    console.log("Looking for pending subscription for business:", businessId);
    const mongoose = require("mongoose");
    let subscription;
    try {
      subscription = await Subscription.findOne({
        business: mongoose.Types.ObjectId(businessId),
        status: "pending",
      }).sort({ createdAt: -1 });
      console.log("Found subscription (ObjectId):", subscription);
    } catch (e) {
      subscription = await Subscription.findOne({
        business: businessId,
        status: "pending",
      }).sort({ createdAt: -1 });
      console.log("Found subscription (string):", subscription);
    }

    console.log("Found subscription:", subscription);

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
    console.error("Callback error:", error);
    res.status(500).json({ message: "Callback processing error" });
  }
};
