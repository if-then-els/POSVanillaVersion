const BusinessDetails = require("../models/businessDetails");
const Subscription = require("../models/subscription.model");
const SubscriptionLog = require("../models/subscriptionLog.model");
const Plan = require("../models/plan.model");
const axios = require("axios");
const crypto = require("crypto");
const auth = require("../middleware/auth.middleware");
const currencyService = require("../services/currencyService");
require("dotenv").config();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY;
const PAYSTACK_CURRENCY = (process.env.PAYSTACK_CURRENCY || "NGN").toUpperCase();
const PAYSTACK_BASE_URL = "https://api.paystack.co";

// Paystack processes NGN, GHS, ZAR, KES and USD - but a single merchant
// account only has a subset enabled (depends on country of registration).
// Passing a non-enabled currency fails with:
//   { code: "unsupported_currency", message: "Currency not supported by merchant" }
// So we convert the plan's USD price into a SUPPORTED currency and retry
// across candidates until Paystack accepts one.
const PAYSTACK_SUPPORTED_CURRENCIES = ["NGN", "GHS", "ZAR", "KES", "USD"];

// Preferred order: PAYSTACK_CURRENCIES="GHS,NGN" (optional, comma-separated)
// takes precedence, then PAYSTACK_CURRENCY, then the remaining supported ones.
function getPaystackCandidateCurrencies() {
  const rawList = String(process.env.PAYSTACK_CURRENCIES || "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  const ordered = [...new Set(rawList)];
  if (!ordered.includes(PAYSTACK_CURRENCY)) ordered.push(PAYSTACK_CURRENCY);
  for (const cur of PAYSTACK_SUPPORTED_CURRENCIES) {
    if (!ordered.includes(cur)) ordered.push(cur);
  }
  return ordered;
}

function isUnsupportedCurrencyError(err) {
  const data = err?.response?.data || {};
  // Paystack has used both codes for the same condition across API versions.
  if (
    data.code === "unsupported_currency" ||
    data.code === "currency_not_supported"
  )
    return true;
  const msg = String(data.message || err?.message || "").toLowerCase();
  return msg.includes("currency not supported");
}

async function postPaystackInitialize(payload) {
  return axios.post(`${PAYSTACK_BASE_URL}/transaction/initialize`, payload, {
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
  });
}

// Placeholder for sendExpiryReminderEmail - YOU WILL NEED TO IMPLEMENT THIS
async function sendExpiryReminderEmail(email, data) {
  console.log(`Sending expiry reminder email to ${email}:`, data);
  // Implement actual email sending logic here (e.g., using Nodemailer, SendGrid, etc.)
  /*
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({ ... });
  await transporter.sendMail({
    from: '"Your POS App" <no-reply@yourposapp.com>',
    to: email,
    subject: `Your Subscription is Expiring in ${data.daysLeft} Day(s)!`,
    html: `<p>Dear customer,</p>
           <p>Your subscription will expire on ${data.expiryDate.toLocaleDateString()}.</p>
           <p>Please renew your subscription to avoid service interruption.</p>
           <p>Thank you,</p>
           <p>The POS App Team</p>`,
  });
  */
}

// Controller to initiate Paystack payment
exports.initiatePaystackPayment = async (req, res) => {
  try {
    const { businessId, planId, email, action, paymentMethod } = req.body; // Removed 'reference' from req.body as we will generate it here

    // Generate a truly unique reference using a timestamp and a random string
    // This makes it virtually impossible for duplicates.
    const uniqueRef = `${businessId}_${planId}_${Date.now()}_${crypto
      .randomBytes(8)
      .toString("hex")}`; // Increased random bytes for even more uniqueness

    // Validation checks
    if (!businessId || !planId || !email || !action) {
      console.error("Missing required fields for Paystack initiation:", {
        businessId,
        planId,
        email,
        action,
      });
      return res
        .status(400)
        .json({ message: "Missing required fields for Paystack initiation" });
    }

    // Plans are priced in USD. The charge amount is computed server-side from
    // the plan's USD price (never trust the client amount), converted to a
    // Paystack-supported charge currency, then to its smallest unit.
    // Paystack supports NGN/GHS/ZAR/KES/USD but each merchant account only
    // has a subset enabled - candidates are retried until one is accepted.
    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    const usdPrice = Number(plan.price) || 0;
    if (usdPrice <= 0) {
      console.warn(
        `Attempt to initiate Paystack payment for free plan (${plan.name}). Bypassing Paystack.`,
      );
      return res.status(200).json({
        status: true,
        message: "Payment not required for free plan.",
        data: { reference: "FREE_PLAN_REF" },
      });
    }

    const triedCurrencies = [];
    let paystackResponse = null;
    let chargeCurrency = null;
    let amountKobo = null;
    let amountCharge = null;
    let lastUnsupportedError = null;

    // Try each candidate currency: convert USD -> candidate, then initialize.
    // Skips currencies we cannot convert to; retries on unsupported_currency.
    for (const candidate of getPaystackCandidateCurrencies()) {
      let minor = null;
      try {
        minor = await currencyService.convertUSDToMinor(usdPrice, candidate);
      } catch (convErr) {
        console.warn(
          `Currency conversion USD->${candidate} failed: ${convErr.message}. Trying next currency.`,
        );
        continue;
      }
      if (minor == null || minor <= 0) {
        console.warn(
          `Could not convert USD ${usdPrice} to ${candidate}, trying next currency.`,
        );
        continue;
      }
      triedCurrencies.push(candidate);

      try {
        paystackResponse = await postPaystackInitialize({
          email,
          amount: minor,
          currency: candidate,
          reference: uniqueRef,
          callback_url: `${req.protocol}://${req.get("host")}/subscriptions`,
          metadata: {
            businessId,
            planId,
            planName: plan.name,
            action,
            usdAmount: usdPrice,
            originalAmount: minor / 100,
            originalCurrency: candidate,
            paymentMethod: paymentMethod || "paystack",
          },
        });
        chargeCurrency = candidate;
        amountKobo = minor;
        amountCharge = minor / 100; // major units in charge currency
        break; // success
      } catch (psErr) {
        if (isUnsupportedCurrencyError(psErr)) {
          lastUnsupportedError = psErr;
          console.warn(
            `Paystack rejected currency ${candidate} (not enabled on merchant account). Trying next currency.`,
          );
          paystackResponse = null;
          continue;
        }
        throw psErr; // real failure (auth, network, validation) - don't mask it
      }
    }

    if (!paystackResponse) {
      const detail =
        lastUnsupportedError?.response?.data?.message ||
        "None of the Paystack currencies are enabled on this merchant account.";
      console.error(
        `Paystack init failed for all currencies (tried: ${triedCurrencies.join(", ") || "none"}). ${detail}`,
      );
      return res.status(400).json({
        message:
          `Payment currency not supported by your Paystack account. ` +
          `Tried: ${triedCurrencies.join(", ") || "none"}. ` +
          `Enable one of NGN, GHS, ZAR, KES, USD in your Paystack dashboard ` +
          `or set PAYSTACK_CURRENCY/PAYSTACK_CURRENCIES to an enabled currency.`,
        triedCurrencies,
        error: lastUnsupportedError?.response?.data,
      });
    }

    res.status(200).json({
      ...paystackResponse.data,
      publicKey: PAYSTACK_PUBLIC_KEY,
      currency: chargeCurrency,
      amountCharge,
      amountKobo,
      triedCurrencies,
      metadata: {
        ...paystackResponse.data.metadata,
        amountInUnit: amountCharge,
        amountKobo,
      },
    });
  } catch (error) {
    console.error(
      "Error initiating Paystack payment:",
      error.response ? error.response.data : error.message,
    );
    const providerMessage = error.response?.data?.message;
    res.status(500).json({
      message: providerMessage
        ? `Paystack: ${providerMessage}`
        : "Error initiating Paystack payment",
      error: error.response?.data,
    });
  }
};

// Controller to handle Paystack webhooks (server-to-server verification)
exports.verifyPaystackPayment = async (req, res) => {
  // 1. Verify Paystack Webhook Signature for security
  const hash = crypto
    .createHmac("sha512", PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (hash !== req.headers["x-paystack-signature"]) {
    console.warn("Paystack Webhook: Invalid signature received.");
    return res.status(400).send("Invalid signature");
  }

  const event = req.body;

  // Map the payment channel selected on the frontend to a value the model accepts
  const mapStoredPaymentMethod = (channel) =>
    channel === "card" ? "card" : "paystack";

  // 2. Only process successful charge events
  if (event.event === "charge.success" && event.data.status === "success") {
    try {
      const reference = event.data.reference;
      const metadata = event.data.metadata;
      const businessId = metadata.businessId;
      const planId = metadata.planId;
      const action = metadata.action;
      const originalAmount = metadata.originalAmount;
      const storedPaymentMethod = mapStoredPaymentMethod(metadata.paymentMethod);
      const chargedAmountMajor = event.data.amount / 100; // in merchant currency

      console.log(
        `Paystack Webhook: Received successful charge for reference ${reference}, action: ${action}`,
      );
      console.log(
        `Charged amount (${event.data.currency}): ${chargedAmountMajor}`,
      );

      // Optional: Verify the transaction directly with Paystack API for double-checking
      const verificationResponse = await axios.get(
        `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
        {
          headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
        },
      );
      if (verificationResponse.data.data.status !== "success") {
        console.error(
          `Paystack Webhook: Transaction verification failed for reference ${reference}`,
        );
        return res
          .status(400)
          .json({ message: "Transaction verification failed" });
      }

      if (action === "upgrade") {
        const plan = await Plan.findById(planId);
        if (!plan) {
          console.error(
            `Paystack Webhook: Plan not found for ID ${planId} during upgrade action.`,
          );
          return res.status(404).json({ message: "Plan not found" });
        }

        let subscription = await Subscription.findOne({ business: businessId });
        const now = new Date();
        const endDate = new Date(now);
        endDate.setMonth(now.getMonth() + 1);

        let actionType = "subscription_created";
        if (subscription && subscription.status === "active") {
          actionType = "subscription_upgraded";
        } else if (subscription && subscription.status !== "active") {
          actionType = "subscription_reactivated";
        }

        if (subscription) {
          subscription.plan = planId;
          subscription.startDate = now;
          subscription.endDate = endDate;
          subscription.status = "active";
          subscription.price = chargedAmountMajor; // charged amount in merchant currency
          subscription.paymentMethod = storedPaymentMethod;
          subscription.paystackReference = reference;
          subscription.lastPaymentDate = now;
          subscription.nextBillingDate = endDate;
          await subscription.save();

          await SubscriptionLog.create({
            business: businessId,
            plan: planId,
            action: actionType,
            date: now,
            paymentMethod: storedPaymentMethod,
            price: chargedAmountMajor,
            priceCurrency: event.data.currency,
            paystackReference: reference,
            status: "completed",
            paidAmountUSD: plan.price, // Tier price is stored in USD
          });
        } else {
          subscription = await Subscription.create({
            business: businessId,
            plan: planId,
            startDate: now,
            endDate: endDate,
            status: "active",
            autoRenew: true,
            price: chargedAmountMajor, // charged amount in merchant currency
            paymentMethod: storedPaymentMethod,
            lastPaymentDate: now,
            nextBillingDate: endDate,
            paystackReference: reference,
          });

          await SubscriptionLog.create({
            business: businessId,
            plan: planId,
            action: actionType,
            date: now,
            paymentMethod: storedPaymentMethod,
            price: chargedAmountMajor,
            priceCurrency: event.data.currency,
            paystackReference: reference,
            status: "completed",
            paidAmountUSD: plan.price, // Tier price is stored in USD
          });
        }
        console.log(
          `Paystack Webhook: Subscription action 'upgrade' processed successfully for business ${businessId}.`,
        );
      } else if (action === "updatePaymentMethod") {
        let subscription = await Subscription.findOne({
          business: businessId,
          status: "active",
        });

        if (!subscription) {
          console.error(
            `Paystack Webhook: No active subscription found for business ${businessId} to update payment method.`,
          );
          return res.status(404).json({
            message: "No active subscription found for payment method update",
          });
        }
        if (subscription.plan.toString() !== planId) {
          console.warn(
            `Paystack Webhook: Attempted to update payment method for a different plan than active. Expected ${subscription.plan}, got ${planId}. Proceeding with payment method update on existing subscription.`,
          );
        }

        subscription.paymentMethod = storedPaymentMethod;
        subscription.paystackReference = reference;
        subscription.lastPaymentDate = new Date();
        await subscription.save();

        await SubscriptionLog.create({
          business: businessId,
          plan: subscription.plan,
          action: "payment_method_updated",
          date: new Date(),
          paymentMethod: storedPaymentMethod,
          price: originalAmount,
          paystackReference: reference,
          status: "completed",
          paidAmountUSD: event.data.amount / 100,
        });
        console.log(
          `Paystack Webhook: Payment method updated for business ${businessId}.`,
        );
      } else {
        console.warn(
          `Paystack Webhook: Unknown action type received: ${action} for reference ${reference}.`,
        );
      }

      res.status(200).send("Webhook received and processed");
    } catch (error) {
      console.error(
        "Error processing Paystack webhook for event:",
        event,
        "Error:",
        error,
      );
      res.status(500).send("Error processing webhook");
    }
  } else {
    console.log(
      `Paystack Webhook: Received non-'charge.success' event or non-successful status: ${event.event}, status: ${event.data.status}`,
    );
    res.status(200).send("Webhook received (not a successful charge)");
  }
};

// Controller for frontend to check Paystack transaction status (less reliable than webhooks, mainly for immediate feedback)
exports.checkPaystackStatus = async (req, res) => {
  try {
    const { reference } = req.params;
    const response = await axios.get(
      `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      },
    );

    if (response.data.data.status === "success") {
      return res
        .status(200)
        .json({ status: "success", message: "Payment verified" });
    } else {
      return res.status(400).json({
        status: "failed",
        message: response.data.data.gateway_response,
      });
    }
  } catch (error) {
    console.error(
      "Error checking Paystack status:",
      error.response ? error.response.data : error.message,
    );
    res.status(500).json({
      message: "Error checking payment status",
      error: error.response?.data,
    });
  }
};

exports.upgradeSubscription = async (req, res) => {
  try {
    const businessId = req.user?.business || req.body.businessId;
    const { planId, paymentMethod } = req.body;

    if (!businessId || !planId) {
      console.error("Missing required fields:", { businessId, planId });
      return res.status(400).json({
        message: "Missing required fields for upgrade",
      });
    }

    console.log("Upgrade attempt (Direct Call):", {
      businessId,
      planId,
      paymentMethod,
      timestamp: new Date().toISOString(),
    });

    const plan = await Plan.findById(planId);
    if (!plan) {
      console.error("Error: Plan not found for ID:", planId);
      return res.status(404).json({ message: "Plan not found" });
    }
    console.log("Found plan:", plan.name, "with price:", plan.price);

    let subscription = await Subscription.findOne({ business: businessId });
    console.log(
      "Existing subscription found:",
      subscription ? subscription._id : "None",
    );

    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(now.getMonth() + 1);

    let actionType = "subscription_created";
    if (subscription && subscription.status === "active") {
      actionType = "subscription_upgraded";
    } else if (subscription && subscription.status !== "active") {
      actionType = "subscription_reactivated";
    }

    if (subscription) {
      console.log("Updating existing subscription...");
      subscription.plan = planId;
      subscription.startDate = now;
      subscription.endDate = endDate;
      subscription.status = "active";
      subscription.price = plan.price;
      subscription.paymentMethod = paymentMethod;
      subscription.lastPaymentDate = now;
      subscription.nextBillingDate = endDate;
      await subscription.save();
      console.log("Subscription updated successfully:", subscription._id);

      await SubscriptionLog.create({
        business: businessId,
        plan: planId,
        action: actionType,
        date: now,
        paymentMethod: paymentMethod,
        price: plan.price,
        status: "completed",
      });
      console.log("Subscription log created.");
      res.status(200).json({
        message: `Subscription ${actionType
          .replace("subscription_", "")
          .replace("_", " ")} successfully`,
        subscription: subscription,
      });
    } else {
      console.log("Creating new subscription...");
      subscription = await Subscription.create({
        business: businessId,
        plan: planId,
        startDate: now,
        endDate: endDate,
        status: "active",
        autoRenew: true,
        price: plan.price,
        paymentMethod: paymentMethod,
        lastPaymentDate: now,
        nextBillingDate: endDate,
      });
      console.log("New subscription created successfully:", subscription._id);

      await SubscriptionLog.create({
        business: businessId,
        plan: planId,
        action: actionType,
        date: now,
        paymentMethod: paymentMethod,
        price: plan.price,
        status: "completed",
      });
      console.log("Subscription log created.");
      res.status(201).json({
        message: "Subscription created successfully",
        subscription: subscription,
      });
    }
    console.log("--- upgradeSubscription (Direct Call) End ---");
  } catch (error) {
    console.error("Error upgrading subscription:", error);
    res.status(500).json({ message: "Error upgrading subscription" });
  }
};

exports.cancelSubscription = async (req, res) => {
  try {
    const businessId = req.user.business;
    const subscription = await Subscription.findOne({
      business: businessId,
      status: "active",
    });

    if (!subscription) {
      return res.status(404).json({ message: "No active subscription found" });
    }

    subscription.status = "cancelled";
    await subscription.save();

    await SubscriptionLog.create({
      business: businessId,
      plan: subscription.plan,
      action: "subscription_cancelled",
      date: new Date(),
    });

    res
      .status(200)
      .json({ message: "Subscription cancelled successfully", subscription });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    res.status(500).json({ message: "Error cancelling subscription" });
  }
};

exports.getSubscriptionDetails = async (req, res) => {
  try {
    if (!req.user || !req.user.business) {
      console.error(
        "getSubscriptionDetails: req.user or req.user.business is undefined",
      );
      return res.status(401).json({
        message: "Unauthorized: Business ID not found in user context.",
      });
    }
    const businessId = req.user.business;
    // console.log("Fetching subscription details for businessId:", businessId);

    const subscription = await Subscription.findOne({ business: businessId })
      .populate("plan")
      .lean();

    if (!subscription) {
      return res
        .status(404)
        .json({ message: "No active subscription found for this business." });
    }

    // Attach the current plan's price in the caller's display currency.
    // Plan prices are stored in USD; convert for display only.
    const currency = req.query.currency || "";
    let displayPrice = null;
    let displayCurrency = undefined;
    if (currency && subscription.plan && subscription.plan.price) {
      const converted = await currencyService.convertUSD(
        subscription.plan.price,
        currency,
      );
      if (converted != null) {
        displayCurrency = String(currency).toUpperCase();
        displayPrice = currencyService.roundForDisplay(converted, displayCurrency);
      }
    }
    subscription.displayPrice = displayPrice;
    subscription.displayCurrency = displayCurrency;

    res.status(200).json({ subscription });
  } catch (error) {
    console.error("Error in getSubscriptionDetails:", error);
    res.status(500).json({ message: "Error fetching subscription details" });
  }
};

exports.getSubscriptionHistory = async (req, res) => {
  try {
    const businessId = req.user.business;
    const currency = req.query.currency || "";

    const history = await SubscriptionLog.find({ business: businessId })
      .populate("plan", "name")
      .sort({ date: -1 })
      .lean();

    if (!history || history.length === 0) {
      return res
        .status(200)
        .json({ message: "No subscription history found.", history: [] });
    }

    // Convert each entry's paid amount (stored in USD) into the caller's
    // display currency. Falls back to the stored price when no USD amount
    // was recorded (legacy entries).
    const mapped = await Promise.all(
      history.map(async (entry) => {
        const usdSource =
          entry.paidAmountUSD != null && entry.paidAmountUSD > 0
            ? entry.paidAmountUSD
            : entry.price;
        const converted = currency
          ? await currencyService.convertUSD(usdSource, currency)
          : null;
        if (converted == null) {
          return { ...entry, displayPrice: null, displayCurrency: undefined };
        }
        const displayCurrency = String(currency).toUpperCase();
        return {
          ...entry,
          displayPrice: currencyService.roundForDisplay(converted, displayCurrency),
          displayCurrency,
        };
      }),
    );

    res.status(200).json({ history: mapped });
  } catch (error) {
    console.error("Error fetching subscription history:", error);
    res.status(500).json({ message: "Error fetching subscription history" });
  }
};

exports.updatePaymentMethod = async (req, res) => {
  try {
    const businessId = req.user?.business || req.body.businessId;
    const { paymentMethod, paymentDetails } = req.body;

    const subscription = await Subscription.findOne({
      business: businessId,
      status: "active",
    });

    if (!subscription) {
      return res.status(404).json({ message: "No active subscription found" });
    }

    subscription.paymentMethod = paymentMethod;
    if (paymentMethod === "paystack") {
      subscription.paystackReference = paymentDetails.reference;
    } else if (paymentMethod === "mpesa") {
      subscription.mpesaTransactionId = paymentDetails.transactionId;
    }
    subscription.lastPaymentDate = new Date();

    await subscription.save();

    await SubscriptionLog.create({
      business: businessId,
      plan: subscription.plan,
      action: "payment_method_update_direct",
      date: new Date(),
      paymentMethod: paymentMethod,
      status: "completed",
    });

    res.status(200).json({
      message: "Payment method updated successfully",
      subscription: subscription,
    });
  } catch (error) {
    console.error("Error updating payment method:", error);
    res.status(500).json({ message: "Error updating payment method" });
  }
};
