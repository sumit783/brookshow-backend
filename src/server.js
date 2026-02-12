// src/server.js
import http from "http";
import dotenv from "dotenv";
import app from "./app.js";
import mongoose from "mongoose";
import { dropLegacyArtistIndexes } from "./models/Artist.js";
import { initCronJobs } from "./utils/cronJobs.js";

dotenv.config();

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || "brookshow";

async function startServer() {
  try {
    await mongoose.connect(MONGO_URI, {
      dbName: DB_NAME,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB connected to database: ${DB_NAME}`);

    await dropLegacyArtistIndexes();
    initCronJobs();

    const server = http.createServer(app);
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
}

startServer();
