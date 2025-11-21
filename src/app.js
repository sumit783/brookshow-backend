// src/app.js
import express from "express";
import cors from "cors";
import { corsOptions } from "./cors.js"
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import path from "path";

import { errorHandler } from "./utils/errorHandler.js";
import { verifyXApiKey } from "./middlewares/apiKeyMiddleware.js";
import authRoutes from "./routes/authRoutes.js";
import artistRoutes from "./routes/artistRoutes.js";
import plannerRoutes from "./routes/plannerRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import calendarBlockRoutes from "./routes/calendarBlockRoutes.js";
import userRoutes from "./routes/userRoutes.js";

// All routes


dotenv.config();

const app = express();

// Disable ETag for API responses to prevent 304 on JSON
app.set("etag", false);

// Static folder for uploaded files (disable caching to avoid 304)
const uploadsPath = process.env.UPLOADS_DIR ? path.resolve(process.env.UPLOADS_DIR) : path.resolve("uploads");
app.use(
  "/uploads",
  express.static(uploadsPath, {
    etag: false,
    lastModified: false,
    cacheControl: true,
    maxAge: 0,
    fallthrough: false, // return 404 if file not found
    setHeaders: (res) => {
      res.setHeader("Cache-Control", "no-store");
    },
  })
);

// Global Middlewares
app.use(helmet());
app.use(cors(corsOptions));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());
app.use(morgan("dev"));

// Add no-cache headers for all API routes to avoid 304
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }
  next();
});

// Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200, // limit each IP
});
app.use("/api", limiter);
app.set('trust proxy', 1);

// API Key verification middleware (global or per-route)
app.use("/api", verifyXApiKey);

// API Routes
app.get("/", (req, res) => res.send("🚀 BrookShow API is running"));

app.use("/api/auth", authRoutes);
app.use("/api/artist", artistRoutes);
app.use("/api/planner", plannerRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/calendar-blocks", calendarBlockRoutes);
app.use("/api/user", userRoutes);
// app.use("/api/bookings", bookingRoutes);
// app.use("/api/events", eventRoutes);
// app.use("/api/users", usersRoutes);
// app.use("/api/payments", paymentRoutes);

// Error Handler (must be last)
app.use(errorHandler);

export default app;
