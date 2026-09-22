const axios = require("axios");

const PAYSTACK_BASE = "https://api.paystack.co";

function getSecret() { return process.env.PAYSTACK_SECRET_KEY; }

function getCurrency() { return process.env.PAYSTACK_CURRENCY || "NGN"; }

async function initialize({ email, amountKES, reference, callbackUrl, metadata }) {
  const secret = getSecret();
  if (!secret) throw new Error("PAYSTACK_SECRET_KEY missing");
  // Paystack expects the amount in the smallest currency unit (e.g. kobo for
  // NGN). Charges MUST use the merchant's supported currency (PAYSTACK_CURRENCY);
  // the frontend's location display is cosmetic only. Paystack does NOT support KES.
  const amountKobo = Math.round(Number(amountKES) * 100);
  if (amountKobo <= 0) throw new Error("Amount must be >0");
  const payload = {
    email,
    amount: amountKobo,
    currency: getCurrency(),
    reference,
    callback_url: callbackUrl,
    metadata,
  };
  const res = await axios.post(`${PAYSTACK_BASE}/transaction/initialize`, payload, {
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
  });
  return res.data;
}

async function verify(reference) {
  const secret = getSecret();
  const res = await axios.get(`${PAYSTACK_BASE}/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  return res.data;
}

module.exports = { initialize, verify };
