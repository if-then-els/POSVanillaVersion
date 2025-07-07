const axios = require("axios");
const Subscription = require("../models/subscription.model");
const SubscriptionLog = require("../models/subscriptionLog.model");
const Plan = require("../models/plan.model");

// Helper: Get M-Pesa Access Token
const getAccessToken = async () => {
  try {
    const auth = Buffer.from(
      `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
    ).toString("base64");
    const response = await axios.get(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        headers: { Authorization: `Basic ${auth}` },
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.error(
      "Error getting M-Pesa access token:",
      error.response ? error.response.data : error.message
    );
    throw new Error("Failed to get M-Pesa access token");
  }
};

// Initiate M-Pesa STK Push
exports.initiateMpesaStkPush = async (req, res) => {
  const { phone, businessId, plan, durationMonths } = req.body;
  if (!phone || !businessId || !plan || !durationMonths) {
    return res.status(400).json({ message: "All fields are required" });
  }
  try {
    // 1. Fetch plan price
    const planDoc = await Plan.findOne({ name: plan });
    if (!planDoc)
      return res.status(400).json({ message: "Selected plan does not exist" });
    const planPrice = planDoc.price;
    const totalPrice = planPrice * durationMonths;

    // 2. Create pending subscription
    const newSubscription = await Subscription.create({
      business: businessId,
      plan,
      startDate: new Date(),
      endDate: new Date(Date.now() + durationMonths * 30 * 24 * 60 * 60 * 1000),
      status: "pending",
      autoRenew: false,
      paymentMethod: "mpesa",
      lastPaymentDate: null,
      nextBillingDate: null,
      price: planPrice,
      totalPrice,
      durationMonths,
      mpesaCheckoutRequestID: null,
      mpesaTransactionId: null,
    });

    // 3. Generate timestamp and password
    const timestamp = new Date()
      .toISOString()
      .replace(/[^0-9]/g, "")
      .slice(0, 14);
    const password = Buffer.from(
      `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
    ).toString("base64");

    // 4. Get access token
    const accessToken = await getAccessToken();

    // 5. Initiate STK Push
    const stkRes = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: totalPrice,
        PartyA: phone,
        PartyB: process.env.MPESA_SHORTCODE,
        PhoneNumber: phone,
        CallBackURL: process.env.MPESA_STK_PUSH_CALLBACK_URL,
        AccountReference: newSubscription._id.toString(),
        TransactionDesc: `Subscription Payment for ${newSubscription.plan} - ${newSubscription._id}`,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    // 6. Store CheckoutRequestID
    newSubscription.mpesaCheckoutRequestID = stkRes.data.CheckoutRequestID;
    await newSubscription.save();

    res.status(200).json({
      message: "STK Push initiated successfully",
      CheckoutRequestID: stkRes.data.CheckoutRequestID,
      subscriptionId: newSubscription._id,
    });
  } catch (error) {
    console.error(
      "M-Pesa STK Push initiation failed:",
      error.response ? error.response.data : error.message
    );
    res.status(500).json({
      message: "M-Pesa STK Push initiation failed",
      error: error.response ? error.response.data : error.message,
    });
  }
};

// M-Pesa C2B Confirmation Callback
exports.mpesaConfirmationCallback = async (req, res) => {
  console.log("M-Pesa callback received:", JSON.stringify(req.body));
  try {
    const body = req.body;
    const stkCallback = body.Body?.stkCallback;
    if (!stkCallback)
      return res.status(400).json({ message: "Invalid callback format" });
    const resultCode = stkCallback.ResultCode;
    const checkoutRequestID = stkCallback.CheckoutRequestID;
    const metadata = stkCallback.CallbackMetadata?.Item || [];
    let mpesaReceipt = null,
      amount = null,
      phone = null,
      billRef = null;
    metadata.forEach((item) => {
      if (item.Name === "MpesaReceiptNumber") mpesaReceipt = item.Value;
      if (item.Name === "Amount") amount = item.Value;
      if (item.Name === "PhoneNumber") phone = item.Value;
      if (item.Name === "BillRefNumber") billRef = item.Value;
    });
    // BillRefNumber is our subscriptionId
    const subscriptionId = billRef || stkCallback.AccountReference;
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription)
      return res.status(404).json({ message: "Subscription not found" });
    if (resultCode === 0) {
      subscription.status = "active";
      subscription.lastPaymentDate = new Date();
      subscription.mpesaTransactionId = mpesaReceipt;
      await subscription.save();
      await SubscriptionLog.create({
        business: subscription.business,
        oldPlan: null,
        newPlan: subscription.plan,
        action: "payment",
        date: new Date(),
        totalPrice: amount,
        transactionId: mpesaReceipt,
        notes: `M-Pesa payment successful via STK Push. CheckoutRequestID: ${checkoutRequestID}`,
      });
    } else {
      subscription.status = "failed";
      await subscription.save();
      await SubscriptionLog.create({
        business: subscription.business,
        oldPlan: subscription.plan,
        newPlan: subscription.plan,
        action: "payment_failed",
        date: new Date(),
        totalPrice: amount,
        transactionId: mpesaReceipt,
        notes: `M-Pesa payment failed. ResultCode: ${resultCode}`,
      });
    }
    // M-Pesa expects this exact response
    res.status(200).json({
      ResultCode: 0,
      ResultDesc: "C2B Confirmation Received Successfully",
    });
  } catch (error) {
    console.error("M-Pesa confirmation callback error:", error);
    res.status(500).json({ message: "Callback processing error" });
  }
};
