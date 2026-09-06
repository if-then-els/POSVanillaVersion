const Sale = require("../models/sale");
const Inventory = require("../models/inventory");
const AIInsight = require("../models/aiInsight.model");

function addDays(d, n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }

// Heuristic forecast: moving average of last 30d sales per product
async function forecastDemand(businessId, days = 30) {
  const since = addDays(new Date(), -30);
  const sales = await Sale.find({ business: businessId, createdAt: { $gte: since } }).populate("items.productId").lean();
  const byProduct = {};
  sales.forEach(s => s.items.forEach(it => {
    const id = it.productId?._id?.toString();
    if (!id) return;
    if (!byProduct[id]) byProduct[id] = { productName: it.productId.productName, qty: 0, daysSeen: new Set() };
    byProduct[id].qty += Number(it.quantity)||0;
    byProduct[id].daysSeen.add(new Date(s.createdAt).toISOString().slice(0,10));
  }));
  const forecasts = Object.entries(byProduct).map(([id, v]) => {
    const avgDaily = v.qty / Math.max(v.daysSeen.size, 1);
    const predicted = Math.ceil(avgDaily * days);
    const reorder = predicted > 0 ? `Reorder ~${predicted} units for next ${days}d` : "No demand";
    return { productId: id, productName: v.productName, soldLast30d: v.qty, avgDaily: Number(avgDaily.toFixed(2)), predictedNext30d: predicted, suggestion: reorder };
  }).sort((a,b)=>b.predictedNext30d - a.predictedNext30d);
  return { forecasts, generatedAt: new Date(), method: "moving_avg_30d" };
}

async function detectDeadStock(businessId, thresholdDays = 60) {
  const since = addDays(new Date(), -thresholdDays);
  const sales = await Sale.find({ business: businessId, createdAt: { $gte: since } }).populate("items.productId").lean();
  const soldIds = new Set();
  sales.forEach(s => s.items.forEach(it => { if (it.productId?._id) soldIds.add(String(it.productId._id)); }));
  const inventory = await Inventory.find({ business: businessId }).lean();
  const dead = inventory.filter(p => !soldIds.has(String(p._id)) && Number(p.productQuantity) > 0).map(p => ({
    productId: p._id, productName: p.productName, quantity: p.productQuantity, category: p.productCategory, daysIdle: thresholdDays, suggestion: `No sale in ${thresholdDays}d — consider discount/bundle or return to supplier`
  }));
  return { deadStock: dead, count: dead.length, thresholdDays };
}

async function anomalyDetection(businessId) {
  const sales = await Sale.find({ business: businessId }).sort({ createdAt: -1 }).limit(200).lean();
  if (sales.length < 10) return { anomalies: [], note: "Not enough data (<10 sales)" };
  const totals = sales.map(s => Number(s.total)||0);
  const avg = totals.reduce((a,b)=>a+b,0)/totals.length;
  const variance = totals.reduce((a,b)=>a+Math.pow(b-avg,2),0)/totals.length;
  const stdev = Math.sqrt(variance);
  const anomalies = sales.filter(s => Math.abs(Number(s.total)-avg) > 2.5*stdev).map(s => ({
    saleId: s._id, total: s.total, createdAt: s.createdAt, deviation: Number(s.total)-avg, flag: Number(s.total) > avg ? "high_value_outlier" : "low_value_outlier"
  }));
  // after-hours discount check (simple heuristic)
  const afterHours = sales.filter(s => { const h=new Date(s.createdAt).getHours(); return h>=22 || h<=5; });
  if (afterHours.length > 5) anomalies.push({ flag: "after_hours_activity", count: afterHours.length, suggestion: "Unusual late-night sales — review cashier activity" });
  return { anomalies, avg: Number(avg.toFixed(2)), stdev: Number(stdev.toFixed(2)), count: anomalies.length };
}

// Simple NL query over aggregated data (heuristic, no external LLM required for demo)
// If OPENAI_API_KEY present, it will try to use OpenAI, else heuristic.
async function naturalQuery(businessId, question) {
  const q = (question||"").toLowerCase();
  // cache key
  const cacheKey = question.slice(0,120);
  const cached = await AIInsight.findOne({ business: businessId, type: "query", "payload.question": cacheKey }).sort({ createdAt: -1 });
  if (cached && cached.expiresAt > new Date()) {
    return { answer: cached.payload.answer, cached: true, followUps: cached.payload.followUps };
  }
  let answer = "";
  let data = null;
  if (q.includes("best") && (q.includes("product") || q.includes("selling"))) {
    const overview = await forecastDemand(businessId, 30);
    const top = overview.forecasts[0];
    answer = top ? `Top seller (last 30d): ${top.productName} — sold ${top.soldLast30d} units, avg ${top.avgDaily}/day. Predicted next 30d: ${top.predictedNext30d}.` : "Not enough sales data to determine best product.";
    data = top;
  } else if (q.includes("profit") || q.includes("margin")) {
    const sales = await Sale.find({ business: businessId }).populate("items.productId").lean();
    let revenue=0, cogs=0;
    sales.forEach(s=> s.items.forEach(it=>{ revenue+= Number(it.price)*Number(it.quantity); cogs+= Number(it.costPrice ?? it.productId?.costPrice ?? 0)*Number(it.quantity); }));
    const gross = revenue - cogs;
    const margin = revenue ? (gross/revenue*100).toFixed(1) : 0;
    answer = `Revenue KES ${revenue.toLocaleString()}, COGS KES ${cogs.toLocaleString()}, Gross KES ${gross.toLocaleString()} (${margin}% margin) over ${sales.length} sales.`;
    data = { revenue, cogs, gross, margin };
  } else if (q.includes("dead") || q.includes("slow")) {
    const dead = await detectDeadStock(businessId, 60);
    answer = dead.count ? `Dead stock (${dead.thresholdDays}d): ${dead.deadStock.slice(0,3).map(d=>d.productName).join(", ")} — ${dead.count} total. Consider discount.` : "No dead stock in last 60d — healthy movement.";
    data = dead;
  } else if (q.includes("forecast") || q.includes("reorder")) {
    const f = await forecastDemand(businessId, 30);
    answer = f.forecasts.slice(0,3).map(x=>`${x.productName}: reorder ~${x.predictedNext30d}`).join("; ") || "No forecast — add sales first.";
    data = f;
  } else {
    // generic fallback: try OpenAI if key present
    if (process.env.OPENAI_API_KEY) {
      try {
        const OpenAI = require("openai");
        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        // build tiny context (no PII, aggregated only)
        const context = `Business ${businessId} has aggregated sales/inventory. Question: ${question}. Answer concisely, no disallowed content.`;
        const resp = await client.chat.completions.create({ model: "gpt-4o-mini", messages:[{role:"user", content: context}], max_tokens: 200 });
        answer = resp.choices[0]?.message?.content || "No answer.";
        data = { provider: "openai" };
      } catch (e) {
        answer = `I can answer: best product, profit/margin, dead stock, forecast. Try: "what sold best last week?"`;
      }
    } else {
      answer = `I can answer: best product, profit/margin, dead stock, forecast. Try: "what sold best last week?" — set OPENAI_API_KEY for free-form Q&A.`;
    }
  }
  const toCache = { question: cacheKey, answer, data, followUps: ["Show profit breakdown", "Which items are dead stock?", "Forecast next 30 days"] };
  await AIInsight.create({ business: businessId, type: "query", payload: toCache, expiresAt: addDays(new Date(), 1), provider: process.env.OPENAI_API_KEY ? "openai" : "heuristic" });
  return { answer, data, followUps: toCache.followUps, cached: false };
}

async function getOrForecast(businessId, useCache=true) {
  if (useCache) {
    const cached = await AIInsight.findOne({ business: businessId, type: "forecast" }).sort({ createdAt: -1 });
    if (cached && cached.expiresAt > new Date()) return { ...cached.payload, cached: true };
  }
  const payload = await forecastDemand(businessId, 30);
  await AIInsight.create({ business: businessId, type: "forecast", payload, expiresAt: addDays(new Date(), 1) });
  return { ...payload, cached: false };
}

module.exports = { forecastDemand, detectDeadStock, anomalyDetection, naturalQuery, getOrForecast };
