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

// Aggregated, PII-free business snapshot used as grounded context for the LLM.
async function buildBusinessSnapshot(businessId) {
  const [sales, forecast, dead] = await Promise.all([
    Sale.find({ business: businessId }).populate("items.productId").lean(),
    forecastDemand(businessId, 30).catch(() => ({ forecasts: [] })),
    detectDeadStock(businessId, 60).catch(() => ({ deadStock: [], count: 0 })),
  ]);
  let revenue = 0, cogs = 0, units = 0;
  sales.forEach(s => s.items.forEach(it => {
    const q = Number(it.quantity) || 0;
    revenue += Number(it.price) * q;
    cogs += Number(it.costPrice ?? it.productId?.costPrice ?? 0) * q;
    units += q;
  }));
  const top = (forecast.forecasts || []).slice(0, 5).map(f => `${f.productName} (sold ${f.soldLast30d}, ~${f.avgDaily}/day)`).join("; ");
  return [
    `Sales: ${sales.length} orders, ${units} units, revenue KES ${Math.round(revenue)}, gross KES ${Math.round(revenue - cogs)}.`,
    `Top products (30d): ${top || "not enough data"}.`,
    `Dead stock (60d idle): ${dead.count || 0} lines${dead.deadStock?.length ? " e.g. " + dead.deadStock.slice(0, 3).map(d => d.productName).join(", ") : ""}.`,
  ].join("\n");
}

// Free-form answers via Gemini (key from .env: GEMINI_API_KEY, legacy `gemini` also accepted).
// REST call — no extra SDK dependency. Returns answer text or null when unconfigured/failing.
async function askGemini(question, snapshot) {
  const key = (process.env.GEMINI_API_KEY || process.env.gemini || "").trim();
  if (!key) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: "You are a POS business assistant. Answer concisely (max 4 sentences) using ONLY the business snapshot below. Use KES currency. Never invent products or numbers not in the snapshot." }] },
        contents: [{ parts: [{ text: `Business snapshot:\n${snapshot}\n\nQuestion: ${question}` }] }],
        generationConfig: { maxOutputTokens: 300, temperature: 0.3 },
      }),
    });
    if (!r.ok) throw new Error(`Gemini HTTP ${r.status}`);
    const j = await r.json();
    const text = j.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("").trim();
    return text || null;
  } catch (e) {
    console.error("askGemini failed:", e.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Simple NL query: instant heuristics for known topics, Gemini for free-form questions.
async function naturalQuery(businessId, question) {
  const q = (question||"").toLowerCase();
  // v2 cache key — v1 entries may contain retired wording, never serve them.
  const cacheKey = "v2:" + question.slice(0,120);
  const cached = await AIInsight.findOne({ business: businessId, type: "query", "payload.question": cacheKey }).sort({ createdAt: -1 });
  if (cached && cached.expiresAt > new Date()) {
    return { answer: cached.payload.answer, cached: true, followUps: cached.payload.followUps };
  }
  let answer = "";
  let data = null;
  let llmProvider = "heuristic";
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
    // free-form: Gemini grounded on the business snapshot; user-safe fallback otherwise.
    try {
      const snapshot = await buildBusinessSnapshot(businessId);
      const aiText = await askGemini(question, snapshot);
      if (aiText) {
        answer = aiText;
        data = { provider: "gemini" };
        llmProvider = "gemini";
      } else {
        answer = `Smart answers are limited right now — please ask your admin to enable AI responses. Meanwhile I can answer questions about best sellers, profit and margins, dead stock, and demand forecasts. Try: "what sold best last week?"`;
      }
    } catch (e) {
      answer = `Smart answers are limited right now — please ask your admin to enable AI responses. Meanwhile I can answer questions about best sellers, profit and margins, dead stock, and demand forecasts. Try: "what sold best last week?"`;
    }
  }
  const toCache = { question: cacheKey, answer, data, followUps: ["Show profit breakdown", "Which items are dead stock?", "Forecast next 30 days"] };
  await AIInsight.create({ business: businessId, type: "query", payload: toCache, expiresAt: addDays(new Date(), 1), provider: llmProvider });
  return { answer, data, followUps: toCache.followUps, cached: false };
}

async function getOrForecast(businessId, useCache=true, days=30) {
  const horizon = Math.min(Math.max(Number(days) || 30, 7), 90);
  if (useCache && horizon === 30) {
    const cached = await AIInsight.findOne({ business: businessId, type: "forecast" }).sort({ createdAt: -1 });
    if (cached && cached.expiresAt > new Date()) return { ...cached.payload, cached: true };
  }
  const payload = await forecastDemand(businessId, horizon);
  if (horizon === 30) await AIInsight.create({ business: businessId, type: "forecast", payload, expiresAt: addDays(new Date(), 1) });
  return { ...payload, cached: false };
}

module.exports = { forecastDemand, detectDeadStock, anomalyDetection, naturalQuery, getOrForecast };
