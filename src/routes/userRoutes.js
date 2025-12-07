import express from "express";
import { getTopArtists, createReview, getArtistById, getSimilarArtists, checkArtistAvailability, getArtistServices, getEvents, getAllArtists, getEventById, buyTicket, getTicketById } from "../controllers/userController.js";
import { checkApiKey } from "../middlewares/apiKeyMiddleware.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Get top 4 artists (public route, no auth required)
router.get("/top-artists", checkApiKey, getTopArtists);

// Get all published events/tickets (public route, no auth required)
router.get("/events", checkApiKey, getEvents);

// Get all verified artists (public route, no auth required)
router.get("/artists", checkApiKey, getAllArtists);

// Get event details by ID (public route, no auth required)
router.get("/event/:id", checkApiKey, getEventById);

// Get similar artists by artist ID (public route, no auth required) - must come before /artist/:id
router.get("/artist/:id/similar", checkApiKey, getSimilarArtists);

// Get all services for an artist (public route, no auth required) - must come before /artist/:id
router.get("/artist/:artistId/services", checkApiKey, getArtistServices);

// Check artist availability by service, date, and time (public route, no auth required) - must come before /artist/:id
router.get("/artist/availability", checkApiKey, checkArtistAvailability);

// Get artist details by ID (public route, no auth required)
router.get("/artist/:id", checkApiKey, getArtistById);

// Create or update review for an artist (requires authentication)
router.post("/review", checkApiKey, verifyToken, createReview);

// Buy ticket (requires authentication) - direct wallet update
router.post("/buy-ticket", checkApiKey, verifyToken, buyTicket);

// Get ticket details (requires authentication)
router.get("/ticket/:id", checkApiKey, verifyToken, getTicketById);

export default router;

