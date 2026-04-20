// src/server.js
import http from "http";
import dotenv from "dotenv";
import app from "./app.js";
import mongoose from "mongoose";
import { dropLegacyArtistIndexes } from "./models/Artist.js";
import { initCronJobs } from "./utils/cronJobs.js";

dotenv.config();

const PORT = process.env.PORT;
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME;

async function startServer() {
  try {
    await mongoose.connect(MONGO_URI, {
      dbName: DB_NAME,
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // Wait 30s before failing
      socketTimeoutMS: 45000,       // Close sockets after 45s of inactivity
      connectTimeoutMS: 30000,      // Give up initial connection after 30s
      heartbeatFrequencyMS: 10000,  // Check server status every 10s
    });

    console.log(`MongoDB connected to database: ${DB_NAME}`);

    await dropLegacyArtistIndexes();
    initCronJobs();

    const server = http.createServer(app);

    // Increase server timeouts for large file uploads (Hero Images)
    server.timeout = 300000;         // 5 minutes
    server.keepAliveTimeout = 65000; // slightly higher than browser default
    server.headersTimeout = 66000;   // must be higher than keepAliveTimeout

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
}

startServer();
