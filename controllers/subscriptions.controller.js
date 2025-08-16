const BusinessDetails = require("../models/businessDetails");
const Subscription = require("../models/subscription.model");
const SubscriptionLog = require("../models/subscriptionLog.model");
const Plan = require("../models/plan.model");
const axios = require("axios"); // For making HTTP requests to Paystack

// Load environment variables (ensure PAYSTACK_SECRET_KEY is set in your .env)
require("dotenv").config();

// Placeholder for sendExpiryReminderEmail - YOU WILL NEED TO IMPLEMENT THIS
async function sendExpiryReminderEmail(email, data) {
  console.log(`Sending expiry reminder email to ${email}:`, data);
  // Implement actual email sending logic here (e.g., using Nodemailer, SendGrid, etc.)
  // Example:
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

exports.upgradeSubscription = async (req, res) => {
  try {
    const { businessId, newPlan, durationMonths, phone } = req.body;
    if (!businessId || !newPlan || !durationMonths) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Fetch plan price from DB
    const planDoc = await Plan.findOne({ name: newPlan });
    if (!planDoc) {
      return res.status(400).json({ message: "Selected plan does not exist" });
    }
    const newPlanPrice = planDoc.price;

    // --- Start: New logic for handling current subscription ---

    // Find the current active subscription for this business
    const currentActiveSubscription = await Subscription.findOne({
      business: businessId,
      status: "active",
    });

    if (currentActiveSubscription) {
      // 1. Create a log entry for the expiring subscription
      const expiredLog = await SubscriptionLog.create({
        business: currentActiveSubscription.business,
        plan: currentActiveSubscription.plan, // Use the ID of the plan
        startDate: currentActiveSubscription.startDate,
        endDate: new Date(), // Set end date to now
        status: "expired", // Mark as expired in the log
        price: currentActiveSubscription.price,
        mpesaTransactionId: currentActiveSubscription.mpesaTransactionId, // Keep original transaction ID
        // Add any other relevant fields from the old subscription you want to log
      });
      console.log("Logged expired subscription:", expiredLog);

      // 2. Delete the old active subscription from the main Subscription collection
      await Subscription.deleteOne({ _id: currentActiveSubscription._id });
      console.log(
        "Deleted old active subscription:",
        currentActiveSubscription._id
      );
    }

    // --- End: New logic ---

    // Create new pending subscription
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + Number(durationMonths));
    const newSub = await Subscription.create({
      business: businessId,
      plan: planDoc._id, // Store the actual ObjectId of the plan
      startDate,
      endDate,
      status: "pending", // New subscription starts as pending
      autoRenew: false,
      price: newPlanPrice * durationMonths,
      // mpesaTransactionId will be updated later upon successful payment confirmation
    });

    res.status(200).json({
      message: "New subscription initiated. Awaiting payment confirmation.",
      subscriptionId: newSub._id,
      // You might want to return the new subscription details for frontend tracking
    });
  } catch (error) {
    console.error("Error upgrading subscription:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

exports.cancelSubscription = async (req, res) => {
  try {
    const { businessId } = req.body;
    if (!businessId) {
      return res.status(400).json({ message: "Business ID is required" });
    }

    const subscription = await Subscription.findOne({
      business: businessId,
      status: "active",
    });

    if (!subscription) {
      return res.status(404).json({ message: "Active subscription not found" });
    }

    // Create a log entry for the cancelled subscription
    const cancelledLog = await SubscriptionLog.create({
      business: subscription.business,
      plan: subscription.plan,
      startDate: subscription.startDate,
      endDate: new Date(), // Set end date to now
      status: "cancelled", // Mark as cancelled in the log
      price: subscription.price,
      mpesaTransactionId: subscription.mpesaTransactionId,
    });
    console.log("Logged cancelled subscription:", cancelledLog);

    // Delete the active subscription from the main Subscription collection
    await Subscription.deleteOne({ _id: subscription._id });

    res.status(200).json({ message: "Subscription cancelled successfully" });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

exports.getSubscriptionDetails = async (req, res) => {
  try {
    const businessId = req.user.business; // Assuming businessId is attached to req.user
    if (!businessId) {
      return res.status(400).json({ message: "Business ID is required" });
    }

    const subscription = await Subscription.findOne({
      business: businessId,
      status: "active",
    }).populate("plan"); // Populate plan details

    if (!subscription) {
      return res.status(404).json({ message: "No active subscription found" });
    }

    res.status(200).json({
      message: "Subscription details retrieved successfully",
      subscription,
    });
  } catch (error) {
    console.error("Error getting subscription details:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

exports.getSubscriptionPaymentLogs = async (req, res) => {
  try {
    const businessId = req.user.business;
    if (!businessId) {
      return res.status(400).json({ message: "Business ID is required" });
    }
    const logs = await SubscriptionLog.find({ business: businessId })
      .sort({ date: -1 })
      .populate("business", "businessName")
      .populate("plan", "name price"); // Populate plan name and price
    res.status(200).json({
      message: "Subscription payment logs retrieved successfully",
      logs,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.getSubscriptionPlans = async (req, res) => {
  try {
    const plans = await Plan.find({});
    res.status(200).json({
      message: "Subscription plans retrieved successfully",
      plans,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.getSubscriptionHistory = async (req, res) => {
  try {
    const businessId = req.user.business; // Assuming businessId is attached to req.user
    if (!businessId) {
      return res.status(400).json({ message: "Business ID is required" });
    }

    // Fetch all subscription logs for the business, sorted by end date descending
    const history = await SubscriptionLog.find({ business: businessId })
      .sort({ endDate: -1 })
      .populate("plan", "name price"); // Populate plan name and price for display

    res.status(200).json({
      message: "Subscription history retrieved successfully",
      history,
    });
  } catch (error) {
    console.error("Error getting subscription history:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

exports.initiatePaystackPayment = async (req, res) => {
  try {
    const { businessId, planId, amount, email, reference } = req.body;
    if (!businessId || !planId || !amount || !email || !reference) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Validate plan and get its details
    const planDoc = await Plan.findById(planId);
    if (!planDoc) {
      return res.status(400).json({ message: "Invalid plan selected" });
    }

    // Create or update a pending subscription entry
    let subscription = await Subscription.findOne({
      business: businessId,
      status: "pending",
    });

    if (subscription) {
      // Update existing pending subscription
      subscription.plan = planDoc._id;
      subscription.price = amount;
      subscription.paystackReference = reference; // Store Paystack reference
      await subscription.save();
    } else {
      // Create a new pending subscription
      subscription = await Subscription.create({
        business: businessId,
        plan: planDoc._id,
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)), // Default to 1 month for now
        status: "pending",
        price: amount,
        paymentMethod: "Paystack",
        paystackReference: reference, // Store Paystack reference
      });
    }

    // Paystack API call to initialize transaction
    const paystackResponse = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: email,
        amount: amount * 100, // Amount in kobo (or cents for other currencies)
        reference: reference,
        callback_url: `${process.env.FRONTEND_URL}/subscriptions?payment_status=success&reference=${reference}`, // Redirect URL after payment
        metadata: {
          businessId: businessId,
          planId: planId,
          subscriptionId: subscription._id, // Pass subscription ID for later update
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.status(200).json({
      message: "Paystack initialization successful",
      data: paystackResponse.data.data, // Contains authorization_url and access_code
    });
  } catch (error) {
    console.error(
      "Error initiating Paystack payment:",
      error.response ? error.response.data : error.message
    );
    res.status(500).json({
      message: "Server error initiating Paystack payment",
      error: error.response ? error.response.data : error.message,
    });
  }
};

exports.verifyPaystackPayment = async (req, res) => {
  const { reference } = req.query; // For frontend redirection success/failure
  const { event, data } = req.body; // For webhook callbacks

  try {
    if (event === "charge.success" && data) {
      const { reference: paystackReference, status, metadata } = data;
      const { businessId, planId, subscriptionId } = metadata;

      // Verify transaction with Paystack API
      const paystackVerification = await axios.get(
        `https://api.paystack.co/transaction/verify/${paystackReference}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const verifiedData = paystackVerification.data.data;

      if (verifiedData.status === "success") {
        const subscription = await Subscription.findById(subscriptionId);

        if (subscription) {
          // Update the pending subscription to active
          subscription.status = "active";
          subscription.lastPaymentDate = new Date();
          // Calculate endDate based on plan duration (e.g., 1 month from now)
          subscription.endDate = new Date(
            new Date().setMonth(new Date().getMonth() + 1)
          ); // Example: 1 month
          subscription.paystackTransactionId = verifiedData.id; // Store Paystack transaction ID
          await subscription.save();

          // Log the successful payment
          await SubscriptionLog.create({
            business: businessId,
            plan: planId,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            status: "active",
            price: subscription.price,
            paystackTransactionId: verifiedData.id,
            action: "upgrade", // Or 'renew' if applicable
          });

          // Respond to Paystack webhook
          return res.status(200).send("Webhook received and processed");
        }
      }
    }
    // For frontend verification (if direct polling is used)
    if (reference) {
      const paystackVerification = await axios.get(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const verifiedData = paystackVerification.data.data;

      if (verifiedData.status === "success") {
        const subscription = await Subscription.findOne({
          paystackReference: reference,
        }); // Find by reference
        if (subscription) {
          subscription.status = "active";
          subscription.lastPaymentDate = new Date();
          subscription.endDate = new Date(
            new Date().setMonth(new Date().getMonth() + 1)
          );
          subscription.paystackTransactionId = verifiedData.id;
          await subscription.save();

          // Log the payment
          await SubscriptionLog.create({
            business: subscription.business,
            plan: subscription.plan,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            status: "active",
            price: subscription.price,
            paystackTransactionId: verifiedData.id,
            action: "upgrade",
          });
        }
        return res.status(200).json({
          status: "success",
          message: "Payment verified successfully",
        });
      } else {
        return res
          .status(200)
          .json({ status: "failed", message: "Payment verification failed" });
      }
    }

    res.status(400).send("Invalid request or unhandled event");
  } catch (error) {
    console.error(
      "Error verifying Paystack payment:",
      error.response ? error.response.data : error.message
    );
    res.status(500).send("Server error processing payment verification");
  }
};

exports.checkSubscriptionStatus = async (req, res) => {
  try {
    const businessId = req.business.id; // Assuming you have business ID in the request

    const subscription = await Subscription.findOne({
      business: businessId,
      status: "active",
    }).sort({ endDate: -1 });

    if (!subscription) {
      return res.status(404).json({
        status: "inactive",
        message: "No active subscription found",
      });
    }

    const now = new Date();
    const expiryDate = new Date(subscription.endDate);
    const daysUntilExpiry = Math.ceil(
      (expiryDate - now) / (1000 * 60 * 60 * 24)
    );

    // Send notification emails if within 7 days of expiry
    if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
      // Send reminder email
      await sendExpiryReminderEmail(req.business.email, {
        daysLeft: daysUntilExpiry,
        expiryDate: expiryDate,
      });
    }

    res.json({
      subscription: {
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        daysUntilExpiry,
      },
    });
  } catch (error) {
    console.error("Error checking subscription status:", error);
    res.status(500).json({ message: "Error checking subscription status" });
  }
};
