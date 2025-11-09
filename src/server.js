// src/server.js
import http from "http";
import dotenv from "dotenv";
import app from "./app.js";
import mongoose from "mongoose";
import { dropLegacyArtistIndexes } from "./models/Artist.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI, {
    dbName: process.env.DB_NAME || "brookshow",
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("✅ MongoDB Connected");

    // Optional: add connection event listeners
    mongoose.connection.on("error", (err) =>
      console.error("❌ MongoDB runtime error:", err)
    );

    // Cleanup legacy indexes if needed
    await dropLegacyArtistIndexes();

    // 🧠 Start server *after* MongoDB connects
    const server = http.createServer(app);
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  });
