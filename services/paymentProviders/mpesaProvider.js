const axios = require("axios");

async function getAccessToken() {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  if (!key || !secret) throw new Error("MPESA_CONSUMER_KEY/SECRET missing");
  const auth = Buffer.from(`${key}:${secret}`).toString("base64");
  const resp = await axios.get("https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials", {
    headers: { Authorization: `Basic ${auth}` },
  });
  return resp.data.access_token;
}

async function stkPush({ phone, amount, businessId, reference }) {
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const callbackURL = process.env.MPESA_STK_PUSH_CALLBACK_URL || process.env.MPESA_CHECKOUT_CALLBACK_URL;
  if (!shortcode || !passkey) {
    // demo fallback
    return { success: true, demo: true, checkoutRequestId: `DEMO_${Date.now()}`, message: "MPESA not configured - demo mode" };
  }
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
  const token = await getAccessToken();
  const res = await axios.post(
    "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
    {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(amount),
      PartyA: phone,
      PartyB: shortcode,
      PhoneNumber: phone,
      CallBackURL: callbackURL,
      AccountReference: reference || businessId,
      TransactionDesc: `POS payment ${amount} for ${businessId}`,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return { success: true, checkoutRequestId: res.data.CheckoutRequestID, raw: res.data };
}

async function queryStk({ checkoutRequestId }) {
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
  const token = await getAccessToken();
  const res = await axios.post(
    "https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query",
    { BusinessShortCode: shortcode, Password: password, Timestamp: timestamp, CheckoutRequestID: checkoutRequestId },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
}

module.exports = { stkPush, queryStk, getAccessToken };
