/**
 * tenant isolation helper
 * ensureBusiness: validates req.user.business exists, optionally loads business doc
 * scopeQuery: building scoped filter object
 */
const mongoose = require("mongoose");
const BusinessDetails = require("../models/businessDetails");

function ensureBusiness(req, res, next) {
  if (!req.user || !req.user.business) {
    return res.status(400).json({ message: "Business ID missing in token" });
  }
  if (!mongoose.Types.ObjectId.isValid(req.user.business)) {
    return res.status(400).json({ message: "Invalid business ID format" });
  }
  next();
}

async function loadBusiness(req, res, next) {
  try {
    if (!req.user || !req.user.business) return res.status(400).json({ message: "Business missing" });
    const business = await BusinessDetails.findById(req.user.business).lean();
    if (!business) return res.status(404).json({ message: "Business not found" });
    if (business.status === "suspended") {
      return res.status(403).json({ message: "Business suspended. Contact support." });
    }
    req.business = business;
    next();
  } catch (e) {
    console.error("loadBusiness error", e);
    res.status(500).json({ message: "Failed to load business" });
  }
}

function scopedFilter(req, extra = {}) {
  return { business: req.user.business, ...extra };
}

module.exports = { ensureBusiness, loadBusiness, scopedFilter };
