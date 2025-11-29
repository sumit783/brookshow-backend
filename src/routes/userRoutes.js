import express from "express";
import { getTopArtists, createReview, getArtistById, getSimilarArtists } from "../controllers/userController.js";
import { checkApiKey } from "../middlewares/apiKeyMiddleware.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Get top 4 artists (public route, no auth required)
router.get("/top-artists", checkApiKey, getTopArtists);

// Get similar artists by artist ID (public route, no auth required) - must come before /artist/:id
router.get("/artist/:id/similar", checkApiKey, getSimilarArtists);

// Get artist details by ID (public route, no auth required)
router.get("/artist/:id", checkApiKey, getArtistById);

// Create or update review for an artist (requires authentication)
router.post("/review", checkApiKey, verifyToken, createReview);

export default router;

