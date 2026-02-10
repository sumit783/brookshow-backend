import express from "express";
import { getTopArtists, createReview, getArtistReviews, getArtistById, getSimilarArtists, checkArtistAvailability, getArtistServices, getEvents, getAllArtists, getEventById, buyTicket, verifyTicketPayment, getTicketById, getUserProfile, createArtistBooking, verifyArtistBookingPayment, getArtistPrice, getTicketTypesByEvent, getUserBookings, getUserBookingById } from "../controllers/userController.js";
import { checkApiKey } from "../middlewares/apiKeyMiddleware.js";
import { verifyToken } from "../middlewares/authMiddleware.js";
import {updateBookingStatus} from "../controllers/bookingController.js";

const router = express.Router();

// Get top 4 artists (public route, no auth required)
router.get("/top-artists", checkApiKey, getTopArtists);

// Get all published events/tickets (public route, no auth required)
router.get("/events", checkApiKey, getEvents);

// Get all verified artists (public route, no auth required)
router.get("/artists", checkApiKey, getAllArtists);

// Get event details by ID (public route, no auth required)
router.get("/event/:id", checkApiKey, getEventById);

// Get ticket types for an event
router.get("/event/:eventId/ticket-types", checkApiKey, getTicketTypesByEvent);

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

// Get reviews for an artist (public route, no auth required)
router.get("/artist/:artistId/reviews", checkApiKey, getArtistReviews);

// Buy ticket (requires authentication)
router.post("/buy-ticket", checkApiKey, verifyToken, buyTicket);
router.post("/buy-ticket/verify", checkApiKey, verifyToken, verifyTicketPayment);
// Artist booking route
router.post("/artist/:artistId/book", checkApiKey, verifyToken, createArtistBooking);
router.post("/artist/booking/verify", checkApiKey, verifyToken, verifyArtistBookingPayment);
router.get("/artist/:artistId/price", checkApiKey, getArtistPrice);

// Get ticket details (requires authentication)
router.get("/ticket/:id", checkApiKey, verifyToken, getTicketById);

// Get user profile and history (requires authentication)
router.get("/profile", checkApiKey, verifyToken, getUserProfile);

router.get("/bookings", checkApiKey, verifyToken, getUserBookings);
router.get("/bookings/:id", checkApiKey, verifyToken, getUserBookingById);
router.patch("/bookings/:id/status", checkApiKey, verifyToken, updateBookingStatus);

export default router;

