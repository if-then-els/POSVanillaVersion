const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    name: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "manager", "cashier", "inventory"],
      required: true,
    },
    phone: { type: String, required: true },
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusinessDetails",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
    store: { type: mongoose.Schema.Types.ObjectId, ref: "Store" },
    permissions: [{ type: String }],
    mustChangePassword: { type: Boolean, default: false },
    lastActive: { type: Date },
    avatar: { type: String },
  },
  { timestamps: true }
);

const tenantPlugin = require("../utils/tenantPlugin");
userSchema.plugin(tenantPlugin);
userSchema.index({ business: 1, email: 1 }, { unique: true });
userSchema.index({ business: 1, role: 1 });

// Password hash middleware
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("User", userSchema);
