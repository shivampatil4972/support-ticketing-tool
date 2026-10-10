const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const ticketRoutes = require("./routes/ticketRoutes");
const adminRoutes = require("./routes/adminRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const { sendResponse } = require("./utils/response");

const app = express();

// ==============================
// Middlewares
// ==============================
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("combined"));
}
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Uploads are not served statically: attachments are downloaded through
// authenticated /api/tickets/:id/attachment routes.

// ==============================
// Rate Limiter
// ==============================
// Same JSON shape as every other API response
const rateLimitMessage = (message) => ({
  success: false,
  data: null,
  message,
  error: null,
});

const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 900000),
  max: Number(process.env.RATE_LIMIT_MAX || 100),
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage("Too many login attempts. Please try again later."),
});

// Each signup creates an organization, so it gets a much tighter limit
const signupLimiter = rateLimit({
  windowMs: Number(process.env.SIGNUP_RATE_LIMIT_WINDOW_MS || 3600000),
  max: Number(process.env.SIGNUP_RATE_LIMIT_MAX || 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage("Too many signups. Please try again later."),
});

// Ceiling for everything else under /api
const apiLimiter = rateLimit({
  windowMs: Number(process.env.API_RATE_LIMIT_WINDOW_MS || 900000),
  max: Number(process.env.API_RATE_LIMIT_MAX || 1000),
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage("Too many requests. Please slow down."),
});

app.use("/api", apiLimiter);
app.use("/api/auth/login", limiter);
app.use("/api/auth/signup", signupLimiter);

// ==============================
// Routes
// ==============================
app.use("/api/auth", authRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);

// ==============================
// Health Check
// ==============================
app.get("/health", (req, res) => {
  return sendResponse(res, 200, true, { status: "ok" }, "Service healthy");
});

// ==============================
// Error Handler
// ==============================
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  // Upload and body-parsing problems are the caller's fault
  const statusCode =
    err.statusCode || err.status || (err.name === "MulterError" ? 400 : 500);

  if (statusCode >= 500) {
    console.error("EXPRESS ERROR");
    console.error(err);

    return sendResponse(res, 500, false, null, "Internal Server Error");
  }

  return sendResponse(res, statusCode, false, null, err.message);
});

module.exports = app;
