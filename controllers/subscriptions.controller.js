const BusinessDetails = require("../models/businessDetails");
const Subscription = require("../models/subscription.model");
const SubscriptionLog = require("../models/subscriptionLog.model");
const Plan = require("../models/plan.model");
const axios = require("axios"); // For making HTTP requests to Paystack
const crypto = require("crypto"); // For verifying Paystack webhooks

// Load environment variables (ensure PAYSTACK_SECRET_KEY is set in your .env)
require("dotenv").config();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = "https://api.paystack.co";

// Add a conversion helper for KES to USD
const convertKESToUSD = (kesAmount) => {
  // IMPORTANT: Update this rate regularly or fetch from a reliable API
  // Example rate: 1 USD = 130 KES (as of August 2025). Adjust this!
  const rate = 130;
  return Math.round(kesAmount / rate); // Convert KES to USD
};

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
    const { businessId, planId, amount, email, action } = req.body; // Removed 'reference' from req.body as we will generate it here

    // Generate a truly unique reference using a timestamp and a random string
    // This makes it virtually impossible for duplicates.
    const uniqueRef = `${businessId}_${planId}_${Date.now()}_${crypto
      .randomBytes(8)
      .toString("hex")}`; // Increased random bytes for even more uniqueness

    // Validation checks
    if (
      !businessId ||
      !planId ||
      amount === undefined ||
      amount === null ||
      !email ||
      !action
    ) {
      console.error("Missing required fields for Paystack initiation:", {
        businessId,
        planId,
        amount,
        email,
        action,
      });
      return res
        .status(400)
        .json({ message: "Missing required fields for Paystack initiation" });
    }

    if (amount <= 0) {
      console.warn(
        `Attempt to initiate Paystack payment for amount <= 0 (${amount}). Bypassing Paystack.`
      );
      return res.status(200).json({
        status: true,
        message: "Payment not required for free plan.",
        data: { reference: "FREE_PLAN_REF" },
      });
    }

    // Convert KES to USD for Paystack
    const amountInUSD = convertKESToUSD(amount);

    // Ensure converted amount is still positive for Paystack
    if (amountInUSD <= 0) {
      console.error(
        `Converted amount to USD is zero or negative (${amountInUSD}) for original KES amount (${amount}). Cannot process payment.`
      );
      // Returning a 400 with a specific message for this scenario
      return res.status(400).json({
        message:
          "Converted amount is too low to process payment in USD. Please ensure your KES amount is sufficient after conversion.",
      });
    }

    const paystackResponse = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      {
        email,
        amount: amountInUSD * 100, // Convert to cents (Paystack expects amount in smallest currency unit)
        currency: "KES", // Explicitly set currency to USD
        reference: uniqueRef, // Use the newly generated unique reference
        callback_url: `${req.protocol}://${req.get("host")}/subscriptions`,
        metadata: {
          businessId,
          planId,
          action,
          originalAmount: amount, // Store original KES amount
          originalCurrency: "KES",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.status(200).json({
      ...paystackResponse.data,
      metadata: {
        ...paystackResponse.data.metadata,
        amountInKES: amount,
        amountInUSD: amountInUSD,
      },
    });
  } catch (error) {
    console.error(
      "Error initiating Paystack payment:",
      error.response ? error.response.data : error.message
    );
    res.status(500).json({
      message: "Error initiating Paystack payment",
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

  // 2. Only process successful charge events
  if (event.event === "charge.success" && event.data.status === "success") {
    try {
      const reference = event.data.reference;
      const metadata = event.data.metadata;
      const businessId = metadata.businessId;
      const planId = metadata.planId;
      const action = metadata.action;
      const originalAmountKES = metadata.originalAmount;

      console.log(
        `Paystack Webhook: Received successful charge for reference ${reference}, action: ${action}`
      );
      console.log(
        `Original amount (KES): ${originalAmountKES}, Processed amount (USD): ${
          event.data.amount / 100
        }`
      );

      // Optional: Verify the transaction directly with Paystack API for double-checking
      const verificationResponse = await axios.get(
        `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
        {
          headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
        }
      );
      if (verificationResponse.data.data.status !== "success") {
        console.error(
          `Paystack Webhook: Transaction verification failed for reference ${reference}`
        );
        return res
          .status(400)
          .json({ message: "Transaction verification failed" });
      }

      if (action === "upgrade") {
        const plan = await Plan.findById(planId);
        if (!plan) {
          console.error(
            `Paystack Webhook: Plan not found for ID ${planId} during upgrade action.`
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
          subscription.price = plan.price; // Store original plan price in KES
          subscription.paymentMethod = "paystack";
          subscription.paystackReference = reference;
          subscription.lastPaymentDate = now;
          subscription.nextBillingDate = endDate;
          await subscription.save();

          await SubscriptionLog.create({
            business: businessId,
            plan: planId,
            action: actionType,
            date: now,
            paymentMethod: "paystack",
            price: plan.price, // Store original plan price in KES
            paystackReference: reference,
            status: "completed",
            paidAmountUSD: event.data.amount / 100, // Log the amount paid in USD
          });
        } else {
          subscription = await Subscription.create({
            business: businessId,
            plan: planId,
            startDate: now,
            endDate: endDate,
            status: "active",
            autoRenew: true,
            price: plan.price, // Store original plan price in KES
            paymentMethod: "paystack",
            lastPaymentDate: now,
            nextBillingDate: endDate,
            paystackReference: reference,
          });

          await SubscriptionLog.create({
            business: businessId,
            plan: planId,
            action: actionType,
            date: now,
            paymentMethod: "paystack",
            price: plan.price, // Store original plan price in KES
            paystackReference: reference,
            status: "completed",
            paidAmountUSD: event.data.amount / 100, // Log the amount paid in USD
          });
        }
        console.log(
          `Paystack Webhook: Subscription action 'upgrade' processed successfully for business ${businessId}.`
        );
      } else if (action === "updatePaymentMethod") {
        let subscription = await Subscription.findOne({
          business: businessId,
          status: "active",
        });

        if (!subscription) {
          console.error(
            `Paystack Webhook: No active subscription found for business ${businessId} to update payment method.`
          );
          return res.status(404).json({
            message: "No active subscription found for payment method update",
          });
        }
        if (subscription.plan.toString() !== planId) {
          console.warn(
            `Paystack Webhook: Attempted to update payment method for a different plan than active. Expected ${subscription.plan}, got ${planId}. Proceeding with payment method update on existing subscription.`
          );
        }

        subscription.paymentMethod = "paystack";
        subscription.paystackReference = reference;
        subscription.lastPaymentDate = new Date();
        await subscription.save();

        await SubscriptionLog.create({
          business: businessId,
          plan: subscription.plan,
          action: "payment_method_updated",
          date: new Date(),
          paymentMethod: "paystack",
          price: originalAmountKES, // Log original KES amount here
          paystackReference: reference,
          status: "completed",
          paidAmountUSD: event.data.amount / 100, // Log the amount paid in USD
        });
        console.log(
          `Paystack Webhook: Payment method updated for business ${businessId}.`
        );
      } else {
        console.warn(
          `Paystack Webhook: Unknown action type received: ${action} for reference ${reference}.`
        );
      }

      res.status(200).send("Webhook received and processed");
    } catch (error) {
      console.error(
        "Error processing Paystack webhook for event:",
        event,
        "Error:",
        error
      );
      res.status(500).send("Error processing webhook");
    }
  } else {
    console.log(
      `Paystack Webhook: Received non-'charge.success' event or non-successful status: ${event.event}, status: ${event.data.status}`
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
      }
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
      error.response ? error.response.data : error.message
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
      subscription ? subscription._id : "None"
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
    const businessId = req.user.business;
    //console.log("Fetching subscription details for businessId:", businessId);

    const subscription = await Subscription.findOne({ business: businessId })
      .populate("plan")
      .lean();

    if (!subscription) {
      // console.log("No subscription found for businessId:", businessId);
      return res
        .status(404)
        .json({ message: "No active subscription found for this business." });
    }
    // console.log("Subscription details found:", subscription);
    res.status(200).json({ subscription });
  } catch (error) {
    console.error("Error in getSubscriptionDetails:", error);
    res.status(500).json({ message: "Error fetching subscription details" });
  }
};

exports.getSubscriptionHistory = async (req, res) => {
  try {
    const businessId = req.user.business;

    const history = await SubscriptionLog.find({ business: businessId })
      .populate("plan", "name")
      .sort({ date: -1 })
      .lean();

    if (!history || history.length === 0) {
      return res
        .status(200)
        .json({ message: "No subscription history found.", history: [] });
    }

    res.status(200).json({ history });
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
