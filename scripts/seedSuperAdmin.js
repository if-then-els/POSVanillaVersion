require("dotenv").config();
const mongoose = require("mongoose");
const SuperAdmin = require("../models/SuperAdmin");

async function run() {
  const email = process.argv.find((a) => a.startsWith("--email="))?.split("=")[1] || process.env.SUPERADMIN_EMAIL || "owner@swiftpos.co.ke";
  const password = process.argv.find((a) => a.startsWith("--password="))?.split("=")[1] || process.env.SUPERADMIN_PASSWORD || "Admin123!";
  const name = process.argv.find((a) => a.startsWith("--name="))?.split("=")[1] || "Platform Owner";

  await mongoose.connect(process.env.MONGO_URL);
  console.log("Connected to DB");

  const existing = await SuperAdmin.findOne({ email });
  if (existing) {
    console.log(`SuperAdmin already exists: ${email}`);
    // Optionally update password if --force
    if (process.argv.includes("--force")) {
      existing.password = password;
      // will be hashed by pre-save
      await existing.save();
      console.log("Password updated");
    }
    await mongoose.disconnect();
    return;
  }

  const admin = new SuperAdmin({ name, email, password });
  await admin.save();
  console.log(`SuperAdmin created: ${email} / ${password}`);
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
