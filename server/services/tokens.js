const jwt = require("jsonwebtoken");

// The token holds only ids and the role: no names (č ć š ž đ break atob in the browser)
// and nothing private. The client loads the profile from GET /users/me.
const createToken = (user) => {
  const payload = { _id: user._id, role: user.role };
  return jwt.sign({ payload }, process.env.JWT_SECRET, { expiresIn: "8h" });
};

module.exports = { createToken };
