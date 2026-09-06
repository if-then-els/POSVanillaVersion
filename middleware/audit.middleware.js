const AuditLog = require("../models/auditLog.model");

function audit(action, entity) {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = async (body) => {
      // only log on success (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          await AuditLog.create({
            business: req.user?.business,
            user: req.user?.id,
            action,
            entity,
            entityId: body?.sale?._id || body?.product?._id || body?.store?._id || req.params.id,
            details: { body: req.body, response: body?.message || "ok" },
            ip: req.ip,
          });
        } catch (e) { console.error("audit log failed", e.message); }
      }
      return originalJson(body);
    };
    next();
  };
}

module.exports = { audit };
