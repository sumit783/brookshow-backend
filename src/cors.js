import dotenv from "dotenv";
dotenv.config();

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map(o => o.trim())
  : [];

console.log("Allowed Origins:", allowedOrigins);

export const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., Postman, mobile apps)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Allow any localhost / 127.0.0.1 port in development or local testing
    if (
      process.env.NODE_ENV === "development" ||
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
    ) {
      return callback(null, true);
    }

    console.warn(`CORS blocked request from origin: ${origin}`);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS","PATCH"],
};
