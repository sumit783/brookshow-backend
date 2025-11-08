// src/server.js
import http from "http";
import dotenv from "dotenv";
import app from "./app.js";
import mongoose from "mongoose";
import { dropLegacyArtistIndexes } from "./models/Artist.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

// 🧩 MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, {
    dbName: process.env.DB_NAME || "brookshow",
  })
  .then(async () => {
    console.log("✅ MongoDB Connected");
    // cleanup legacy indexes
    await dropLegacyArtistIndexes();
  })
  .catch((err) => {
    console.error("❌ MongoDB Error:", err.message);
    process.exit(1);
  });

// 🧠 Start HTTP Server
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
