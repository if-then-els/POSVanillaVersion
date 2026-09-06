/**
 * RBAC middleware
 * Usage: authorize("admin","manager") or authorize("admin")
 * Also supports checkPermission("inventory:write")
 */

const ROLE_PERMISSIONS = {
  admin: ["*"],
  manager: [
    "inventory:read", "inventory:write",
    "sales:read", "sales:write",
    "reports:read",
    "users:read", "users:write:cashier", "users:write:inventory",
    "settings:read", "settings:write",
    "customers:read", "customers:write",
  ],
  cashier: [
    "sales:write", "sales:read:own",
    "inventory:read",
    "customers:read",
  ],
  inventory: [
    "inventory:read", "inventory:write",
    "reports:read:stock",
  ],
  superadmin: ["*"],
};

function hasPermission(role, required) {
  const perms = ROLE_PERMISSIONS[role] || [];
  if (perms.includes("*")) return true;
  if (perms.includes(required)) return true;
  // wildcard like sales:*
  const [ns] = required.split(":");
  if (perms.includes(`${ns}:*`) || perms.includes(`${ns}:read`) && required.endsWith(":read")) return false;
  return false;
}

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ message: "Role missing in token" });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: `Forbidden: requires one of [${allowedRoles.join(", ")}]` });
    }
    next();
  };
}

function checkPermission(requiredPerm) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role) return res.status(401).json({ message: "Role missing" });
    if (hasPermission(role, requiredPerm)) return next();
    // also check explicit user.permissions if attached (via DB lookup optional)
    return res.status(403).json({ message: `Forbidden: missing permission ${requiredPerm}` });
  };
}

module.exports = { authorize, checkPermission, ROLE_PERMISSIONS, hasPermission };
