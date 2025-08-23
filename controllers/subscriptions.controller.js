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
    const { businessId, planId, amount, email, reference, action } = req.body;

    // amount check is crucial here, Paystack won't process 0
    if (
      !businessId ||
      !planId ||
      amount === undefined ||
      amount === null ||
      !email ||
      !reference ||
      !action
    ) {
      console.error("Missing required fields for Paystack initiation:", {
        businessId,
        planId,
        amount,
        email,
        reference,
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
      // For amounts 0 or less, we indicate success to the frontend
      // The actual subscription update for free plans is handled by a direct /subscriptions/upgrade call
      return res.status(200).json({
        status: true,
        message: "Payment not required for free plan.",
        data: { reference: "FREE_PLAN_REF" },
      });
    }

    const metadata = {
      businessId: businessId,
      planId: planId,
      action: action, // Pass the action type (upgrade or updatePaymentMethod)
    };

    const paystackResponse = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      {
        email,
        amount: amount * 100, // Amount in kobo
        reference,
        callback_url: `${req.protocol}://${req.get("host")}/subscriptions`, // Redirect back to subscriptions page
        metadata: metadata,
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.status(200).json(paystackResponse.data);
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
      const amount = event.data.amount / 100; // Convert kobo to actual amount
      // const email = event.data.customer.email; // Email from Paystack, not always reliable for our business logic
      const metadata = event.data.metadata;
      const businessId = metadata.businessId;
      const planId = metadata.planId; // This is the plan ID relevant to the transaction
      const action = metadata.action; // Get the action from metadata

      console.log(
        `Paystack Webhook: Received successful charge for reference ${reference}, action: ${action}`
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

        let subscription = await Subscription.findOne({ business: businessId }); // Find any subscription for the business
        if (subscription && subscription.status === "active") {
          // If active, update existing subscription to the new plan
          console.log(
            `Upgrading existing active subscription for business ${businessId} to plan ${plan.name}.`
          );
          subscription.plan = planId;
          subscription.startDate = new Date(); // Start new period
          subscription.endDate = new Date(subscription.startDate);
          subscription.endDate.setMonth(subscription.startDate.getMonth() + 1); // Default to 1 month
          subscription.status = "active";
          subscription.price = plan.price;
          subscription.paymentMethod = "paystack";
          subscription.paystackReference = reference;
          subscription.lastPaymentDate = new Date();
          subscription.nextBillingDate = subscription.endDate;
          await subscription.save();

          await SubscriptionLog.create({
            business: businessId,
            plan: planId,
            action: "subscription_upgraded",
            date: new Date(),
            paymentMethod: "paystack",
            price: plan.price,
            paystackReference: reference,
            status: "completed",
          });
        } else if (subscription && subscription.status !== "active") {
          // If exists but not active (e.g., expired or cancelled), reactivate it
          console.log(
            `Reactivating non-active subscription for business ${businessId} to plan ${plan.name}.`
          );
          subscription.plan = planId;
          subscription.startDate = new Date();
          subscription.endDate = new Date(subscription.startDate);
          subscription.endDate.setMonth(subscription.startDate.getMonth() + 1);
          subscription.status = "active";
          subscription.price = plan.price;
          subscription.paymentMethod = "paystack";
          subscription.paystackReference = reference;
          subscription.lastPaymentDate = new Date();
          subscription.nextBillingDate = subscription.endDate;
          await subscription.save();

          await SubscriptionLog.create({
            business: businessId,
            plan: planId,
            action: "subscription_reactivated",
            date: new Date(),
            paymentMethod: "paystack",
            price: plan.price,
            paystackReference: reference,
            status: "completed",
          });
        } else {
          // No subscription exists, create a new one
          console.log(
            `Creating new subscription for business ${businessId} with plan ${plan.name}.`
          );
          subscription = await Subscription.create({
            business: businessId,
            plan: planId,
            startDate: new Date(),
            endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
            status: "active",
            autoRenew: true,
            price: plan.price,
            paymentMethod: "paystack",
            lastPaymentDate: new Date(),
            nextBillingDate: new Date(
              new Date().setMonth(new Date().getMonth() + 1)
            ),
            paystackReference: reference,
          });

          await SubscriptionLog.create({
            business: businessId,
            plan: planId,
            action: "subscription_created",
            date: new Date(),
            paymentMethod: "paystack",
            price: plan.price,
            paystackReference: reference,
            status: "completed",
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
        // Ensure the plan being updated is the same as the current active plan
        // This check is more for logging/warning; the primary goal is to update the payment method details
        if (subscription.plan.toString() !== planId) {
          console.warn(
            `Paystack Webhook: Attempted to update payment method for a different plan than active. Expected ${subscription.plan}, got ${planId}. Proceeding with payment method update on existing subscription.`
          );
        }

        subscription.paymentMethod = "paystack";
        subscription.paystackReference = reference;
        subscription.lastPaymentDate = new Date(); // Update last payment date for this payment method update
        // nextBillingDate is not changed for just a payment method update, it stays based on subscription cycle
        await subscription.save();

        await SubscriptionLog.create({
          business: businessId,
          plan: subscription.plan, // Reference the existing plan
          action: "payment_method_updated",
          date: new Date(),
          paymentMethod: "paystack",
          price: amount, // Log the amount paid in this transaction for the update
          paystackReference: reference,
          status: "completed",
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
    // If it's not a successful charge event, just acknowledge
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
      // Frontend can use this for immediate feedback, but the webhook is the source of truth for DB updates.
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

    // Validate inputs
    if (!businessId || !planId) {
      console.error("Missing required fields:", { businessId, planId });
      return res.status(400).json({
        message: "Missing required fields for upgrade",
      });
    }

    // Log the upgrade attempt
    console.log("Upgrade attempt:", {
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

    let subscription = await Subscription.findOne({ business: businessId }); // Find any subscription for the business
    console.log(
      "Existing subscription found:",
      subscription ? subscription._id : "None"
    );

    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(now.getMonth() + 1); // Default to 1 month subscription

    // Determine the action type for logging
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
        action: actionType, // will be 'subscription_created' here
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
    const businessId = req.user.business; // Use from auth middleware

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
    const businessId = req.user.business; // Correctly get businessId from auth middleware
    console.log("Fetching subscription details for businessId:", businessId);

    const subscription = await Subscription.findOne({ business: businessId })
      .populate("plan")
      .lean();

    if (!subscription) {
      console.log("No subscription found for businessId:", businessId);
      return res
        .status(404)
        .json({ message: "No active subscription found for this business." });
    }
    console.log("Subscription details found:", subscription);
    res.status(200).json({ subscription });
  } catch (error) {
    console.error("Error in getSubscriptionDetails:", error);
    res.status(500).json({ message: "Error fetching subscription details" });
  }
};

exports.getSubscriptionHistory = async (req, res) => {
  try {
    const businessId = req.user.business; // Correctly get businessId from auth middleware

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
  // This function's direct use from frontend will be minimal for Paystack flow.
  // It's mainly called internally by verifyPaystackPayment now.
  try {
    const businessId = req.user?.business || req.body.businessId; // Get businessId from middleware or body
    const { paymentMethod, paymentDetails } = req.body;

    const subscription = await Subscription.findOne({
      business: businessId,
      status: "active",
    });

    if (!subscription) {
      return res.status(404).json({ message: "No active subscription found" });
    }

    // Update payment method
    subscription.paymentMethod = paymentMethod;

    // Store payment specific details
    if (paymentMethod === "paystack") {
      subscription.paystackReference = paymentDetails.reference;
    } else if (paymentMethod === "mpesa") {
      subscription.mpesaTransactionId = paymentDetails.transactionId;
    }
    // Update last payment date
    subscription.lastPaymentDate = new Date();

    await subscription.save();

    // Create log entry
    await SubscriptionLog.create({
      business: businessId,
      plan: subscription.plan,
      action: "payment_method_update_direct",
      date: new Date(),
      paymentMethod: paymentMethod,
      status: "completed", // Assuming successful update
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
