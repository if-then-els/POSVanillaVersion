const axios = require("axios");

// Free no-key exchange-rate source, base = USD. Rates refresh daily.
const RATES_URL = "https://open.er-api.com/v6/latest/USD";
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

// Currencies with no minor units (display rounding only)
const NO_MINOR_UNITS = [
  "KES", "UGX", "TZS", "RWF", "XOF", "XAF", "JPY", "KRW", "VND", "IDR",
];

let cache = { rates: null, fetchedAt: 0 };

async function getRates() {
  const now = Date.now();
  if (cache.rates && now - cache.fetchedAt < CACHE_TTL_MS) return cache.rates;
  try {
    const { data } = await axios.get(RATES_URL, { timeout: 15000 });
    if (
      data &&
      data.result === "success" &&
      data.rates &&
      typeof data.rates === "object"
    ) {
      cache = { rates: data.rates, fetchedAt: now };
      return data.rates;
    }
    throw new Error("Unexpected rates payload");
  } catch (err) {
    // If the API is unreachable, fall back to the last known rates.
    if (cache.rates) return cache.rates;
    throw new Error(`Currency rates unavailable: ${err.message || err}`);
  }
}

// Convert a USD amount into major units of the target currency (e.g. 15 USD -> GHS).
// Returns null if the target currency is unknown.
async function convertUSD(amountUSD, toCurrency) {
  const rates = await getRates();
  const code = String(toCurrency || "").toUpperCase();
  const rate = rates[code];
  if (rate == null) return null;
  return Number(amountUSD) * Number(rate);
}

// Convert a USD amount into the smallest units of the target currency.
// NGN/GHS/ZAR (Paystack's chargeable currencies) all use 2 decimal places.
async function convertUSDToMinor(amountUSD, toCurrency) {
  const major = await convertUSD(amountUSD, toCurrency);
  if (major == null) return null;
  return Math.round(major * 100);
}

// Round for display: 0 decimals for no-subunit currencies, 2 elsewhere.
function roundForDisplay(value, currency) {
  const noDecimals = NO_MINOR_UNITS.includes(String(currency || "").toUpperCase());
  if (noDecimals) return Math.round(Number(value));
  return Math.round(Number(value) * 100) / 100;
}

// Attach display-converted price to a plan document without mutating it.
// If no currency is provided, the raw plan price is kept as-is.
async function priceForDisplay(plan, currencyCode) {
  const doc = plan && typeof plan.toObject === "function" ? plan.toObject() : plan;
  const { price, ...rest } = doc || {};
  const usdPrice = Number(price) || 0;
  if (!currencyCode) {
    return { ...rest, price: usdPrice, priceUsd: usdPrice, currency: undefined };
  }
  const converted = await convertUSD(usdPrice, currencyCode);
  const code = String(currencyCode).toUpperCase();
  if (converted == null) {
    return { ...rest, price: usdPrice, priceUsd: usdPrice, currency: code };
  }
  return {
    ...rest,
    priceUsd: usdPrice,
    price: roundForDisplay(converted, code),
    currency: code,
  };
}

module.exports = { getRates, convertUSD, convertUSDToMinor, roundForDisplay, priceForDisplay };