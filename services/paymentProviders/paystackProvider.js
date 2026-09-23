const axios = require("axios");

const PAYSTACK_BASE = "https://api.paystack.co";

// Paystack processes NGN, GHS, ZAR, KES and USD, but each merchant account
// only has a subset enabled. Passing a non-enabled currency fails with
// code "unsupported_currency", so callers should retry across candidates.
const SUPPORTED_CURRENCIES = ["NGN", "GHS", "ZAR", "KES", "USD"];

function getSecret() { return process.env.PAYSTACK_SECRET_KEY; }

function getCurrency() { return (process.env.PAYSTACK_CURRENCY || "NGN").toUpperCase(); }

function getCandidateCurrencies() {
  const rawList = String(process.env.PAYSTACK_CURRENCIES || "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  const ordered = [...new Set(rawList)];
  const preferred = getCurrency();
  if (!ordered.includes(preferred)) ordered.push(preferred);
  for (const cur of SUPPORTED_CURRENCIES) {
    if (!ordered.includes(cur)) ordered.push(cur);
  }
  return ordered;
}

function isUnsupportedCurrencyError(err) {
  const data = err?.response?.data || {};
  if (
    data.code === "unsupported_currency" ||
    data.code === "currency_not_supported"
  )
    return true;
  const msg = String(data.message || err?.message || "").toLowerCase();
  return msg.includes("currency not supported");
}

async function initialize({ email, amountKES, reference, callbackUrl, metadata, currency }) {
  const secret = getSecret();
  if (!secret) throw new Error("PAYSTACK_SECRET_KEY missing");
  // Paystack expects the amount in the smallest currency unit (kobo/pesewas/cents).
  // Single-currency legacy path: uses the explicitly requested currency (or env default).
  const amountKobo = Math.round(Number(amountKES) * 100);
  if (amountKobo <= 0) throw new Error("Amount must be >0");
  const chargeCurrency = String(currency || getCurrency()).toUpperCase();
  const payload = {
    email,
    amount: amountKobo,
    currency: chargeCurrency,
    reference,
    callback_url: callbackUrl,
    metadata,
  };
  const res = await axios.post(`${PAYSTACK_BASE}/transaction/initialize`, payload, {
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
  });
  return { ...res.data, chargeCurrency };
}

// Retry wrapper: tries each candidate currency until Paystack accepts one.
// `amountByCurrency` maps currency code -> minor-units amount (already converted).
async function initializeWithFallback({ email, reference, callbackUrl, metadata, amountByCurrency }) {
  const secret = getSecret();
  if (!secret) throw new Error("PAYSTACK_SECRET_KEY missing");
  const tried = [];
  let lastErr = null;
  for (const cur of getCandidateCurrencies()) {
    const amount = amountByCurrency?.[cur];
    if (amount == null || !(Number(amount) > 0)) continue;
    tried.push(cur);
    try {
      const res = await axios.post(
        `${PAYSTACK_BASE}/transaction/initialize`,
        {
          email,
          amount: Math.round(Number(amount)),
          currency: cur,
          reference,
          callback_url: callbackUrl,
          metadata: { ...metadata, originalCurrency: cur, originalAmount: Number(amount) / 100 },
        },
        { headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" } },
      );
      return { ...res.data, chargeCurrency: cur, tried };
    } catch (err) {
      if (isUnsupportedCurrencyError(err)) {
        lastErr = err;
        continue;
      }
      throw err;
    }
  }
  const err = new Error(
    `Payment currency not supported by your Paystack account. Tried: ${tried.join(", ") || "none"}.`,
  );
  err.tried = tried;
  err.providerError = lastErr?.response?.data;
  throw err;
}

async function verify(reference) {
  const secret = getSecret();
  const res = await axios.get(`${PAYSTACK_BASE}/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  return res.data;
}

module.exports = { initialize, initializeWithFallback, verify, getCandidateCurrencies, SUPPORTED_CURRENCIES };
