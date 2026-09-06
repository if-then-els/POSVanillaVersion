require("dotenv").config();
const mongoose = require("mongoose");
const Plan = require("../models/plan.model");

const matrix = {
  basic: {
    maxUsers: 2, maxProducts: 500, maxStores: 1, roleManagement: false, multiStore: false, barcode: false, offlineMode: false, mpesa: true, cardPayments: false, bankPayments: false, printerBluetooth: false, printerNetwork: false, reportsBasic: true, reportsAdvanced: false, reportsAIS: false, loyalty: false, apiAccess: false,
  },
  Standard: {
    maxUsers: 5, maxProducts: 0, maxStores: 3, roleManagement: true, multiStore: true, barcode: true, offlineMode: true, mpesa: true, cardPayments: true, bankPayments: false, printerBluetooth: true, printerNetwork: false, reportsBasic: true, reportsAdvanced: true, reportsAIS: false, loyalty: true, apiAccess: false,
  },
  premium: {
    maxUsers: 20, maxProducts: 0, maxStores: 0, roleManagement: true, multiStore: true, barcode: true, offlineMode: true, mpesa: true, cardPayments: true, bankPayments: true, printerBluetooth: true, printerNetwork: true, reportsBasic: true, reportsAdvanced: true, reportsAIS: true, loyalty: true, apiAccess: true,
  },
  trial: {
    maxUsers: 1, maxProducts: 50, maxStores: 1, roleManagement: false, multiStore: false, barcode: false, offlineMode: false, mpesa: false, cardPayments: false, bankPayments: false, printerBluetooth: false, printerNetwork: false, reportsBasic: true, reportsAdvanced: false, reportsAIS: false, loyalty: false, apiAccess: false,
  },
};

async function run() {
  await mongoose.connect(process.env.MONGO_URL);
  console.log("Connected");
  for (const [name, features] of Object.entries(matrix)) {
    const plan = await Plan.findOne({ name });
    if (!plan) {
      console.log(`Plan ${name} not found, skipping`);
      continue;
    }
    // merge features
    const merged = { ...(plan.features instanceof Map ? Object.fromEntries(plan.features) : plan.features || {}), ...features };
    plan.features = merged;
    // ensure fields
    if (!plan.billingCycle) plan.billingCycle = "monthly";
    if (plan.isActive === undefined) plan.isActive = true;
    await plan.save();
    console.log(`Migrated ${name}:`, merged);
  }
  await mongoose.disconnect();
  console.log("Done");
}

run().catch((e) => { console.error(e); process.exit(1); });
