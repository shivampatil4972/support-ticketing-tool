const { sendResponse, handle } = require("../utils/response");
const { registerUser, loginUser } = require("../services/authService");
const { sendEmail } = require("../utils/email");
const { welcomeEmail } = require("../utils/emailTemplates");

const signup = handle(async (req, res) => {
  // Public signup always creates a client with its own organization.
  // Agents and admins are created by an admin (POST /api/admin/users)
  // or with `npm run create-admin`.
  const user = await registerUser({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    role: "client",
    clientId: null,
  });

  // Send Welcome Email (non-blocking - don't fail signup if email fails)
  sendEmail(welcomeEmail(user)).catch((err) =>
    console.error("Welcome email failed:", err.message),
  );

  return sendResponse(res, 201, true, user, "User created successfully");
}, "Signup failed");

const login = handle(async (req, res) => {
  const result = await loginUser({
    email: req.body.email,
    password: req.body.password,
  });

  return sendResponse(res, 200, true, result, "Login successful");
}, "Login failed");

module.exports = {
  signup,
  login,
};
