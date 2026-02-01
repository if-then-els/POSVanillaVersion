const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
  const token = req.cookies.token;
  // console.log("this is the Token: ", token);

  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Token is not valid" });
    }

    req.user = user; // Contains { id: user._id, business: user.business }
    next();
  });
}

module.exports = { verifyToken };
