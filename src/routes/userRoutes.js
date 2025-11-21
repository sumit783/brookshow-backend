import express from "express";
import { getTopArtists, createReview } from "../controllers/userController.js";
import { checkApiKey } from "../middlewares/apiKeyMiddleware.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Get top 4 artists (public route, no auth required)
router.get("/top-artists", checkApiKey, getTopArtists);
// Create or update review for an artist (requires authentication)
router.post("/review", checkApiKey, verifyToken, createReview);

export default router;

