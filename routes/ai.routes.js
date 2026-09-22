const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth.middleware");
const { requireFeature } = require("../middleware/tier.middleware");
const ai = require("../services/aiService");

// All AI routes are Premium only (reportsAIS)
router.get("/insights/forecast", verifyToken, requireFeature("reportsAIS", "AI forecast requires Premium"), async (req,res)=>{
  try{
    const days = Math.min(Math.max(Number(req.query.days) || 30, 7), 90);
    const data = await ai.getOrForecast(req.user.business, true, days);
    res.json({ insight: data });
  } catch(e){ console.error(e); res.status(500).json({message:"Forecast failed"}); }
});

router.get("/insights/dead-stock", verifyToken, requireFeature("reportsAIS"), async (req,res)=>{
  try{
    const days = Number(req.query.days)||60;
    const data = await ai.detectDeadStock(req.user.business, days);
    res.json(data);
  } catch(e){ res.status(500).json({message:"Dead stock failed"}); }
});

router.get("/insights/anomalies", verifyToken, requireFeature("reportsAIS"), async (req,res)=>{
  try{
    const data = await ai.anomalyDetection(req.user.business);
    res.json(data);
  } catch(e){ res.status(500).json({message:"Anomaly detection failed"}); }
});

router.post("/query", verifyToken, requireFeature("reportsAIS"), async (req,res)=>{
  try{
    const { question } = req.body;
    if(!question || question.length<3) return res.status(400).json({message:"question required"});
    const ans = await ai.naturalQuery(req.user.business, question);
    res.json(ans);
  } catch(e){ console.error(e); res.status(500).json({message:"AI query failed"}); }
});

router.get("/insights/overview", verifyToken, requireFeature("reportsAIS"), async (req,res)=>{
  try{
    const horizon = Math.min(Math.max(Number(req.query.days) || 30, 7), 90);
    const idleDays = Math.min(Math.max(Number(req.query.idleDays) || 60, 30), 180);
    const [forecast, dead, anomalies] = await Promise.all([
      ai.getOrForecast(req.user.business, true, horizon),
      ai.detectDeadStock(req.user.business, idleDays),
      ai.anomalyDetection(req.user.business),
    ]);
    res.json({
      forecast: forecast.forecasts?.slice(0,8),
      deadStock: dead.deadStock?.slice(0,8),
      anomalies: anomalies.anomalies?.slice(0,8),
      counts: { dead: dead.count, anomalies: anomalies.count, forecast: forecast.forecasts?.length || 0 },
      meta: { horizon, idleDays, method: forecast.method, cached: !!forecast.cached },
    });
  } catch(e){ res.status(500).json({message:"Overview failed"}); }
});

module.exports = router;
