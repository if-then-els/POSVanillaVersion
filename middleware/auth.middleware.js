const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
  const token = req.cookies.token || req.header("x-auth-token") || (req.headers.authorization && req.headers.authorization.split(" ")[1]);

  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Token is not valid" });
    }
    req.user = user; // Contains { id: user._id, business: user.business, role }
    next();
  });
}

function verifyAdminToken(req, res, next) {
  const token =
    req.cookies.adminToken ||
    req.header("x-admin-token") ||
    (req.headers.authorization && req.headers.authorization.split(" ")[1]);

  if (!token) {
    return res.status(401).json({ message: "No admin token, authorization denied" });
  }

  const secret = process.env.JWT_SECRET_SUPERADMIN || process.env.JWT_SECRET + "_superadmin";
  // Try superadmin secret first, fallback to JWT_SECRET for backwards compat
  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      // fallback to JWT_SECRET
      jwt.verify(token, process.env.JWT_SECRET, (err2, decoded2) => {
        if (err2) return res.status(403).json({ message: "Admin token is not valid" });
        if (decoded2.role !== "superadmin" && !decoded2.email) {
          return res.status(403).json({ message: "Not a superadmin token" });
        }
        req.user = decoded2;
        next();
      });
      return;
    }
    req.user = decoded;
    // enforce role
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Not a superadmin" });
    }
    next();
  });
}

module.exports = { verifyToken, verifyAdminToken };
