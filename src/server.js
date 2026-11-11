// src/server.js
import http from "http";
import dotenv from "dotenv";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { dropLegacyArtistIndexes } from "./models/Artist.js";
import { initCronJobs } from "./utils/cronJobs.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();

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
    console.error("Server startup error:", err.message);
    process.exit(1);
  }
}

startServer();
