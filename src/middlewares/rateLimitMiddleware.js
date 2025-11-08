// src/middlewares/rateLimitMiddleware.js
import rateLimit from "express-rate-limit";

// Example: OTP routes limiter
export const otpRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // 3 requests per minute per IP
  message: { success: false, message: "Too many OTP requests. Try again later." },
});

// General route limiter
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 100,
  message: { success: false, message: "Too many requests. Please wait a bit." },
});
