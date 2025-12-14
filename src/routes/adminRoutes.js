import express from "express";
import { verifySupabaseAdmin } from "../middlewares/adminAuthMiddleware.js";
import { verifyArtist, rejectArtist, verifyPlanner, rejectPlanner, getAllArtists, getArtistById, getAllEvents, getEventById, getAllTransactions, getAllBookings, getBookingById, getTransactionById, getDashboardStats, getRevenueChartData, getBookingTrends, getAllPlanners, getPlannerById, getBookingStats } from "../controllers/adminController.js";
import { createCategory, listCategories, getCategoryById, updateCategory, deleteCategory } from "../controllers/categoryController.js";
import { checkApiKey } from "../middlewares/apiKeyMiddleware.js";

const router = express.Router();

// Artist verification routes
router.get("/artists", checkApiKey, verifySupabaseAdmin, getAllArtists);
router.get("/artists/:id", checkApiKey, verifySupabaseAdmin, getArtistById);
router.put("/artists/:id/verify", checkApiKey, verifySupabaseAdmin, verifyArtist);
router.put("/artists/:id/reject", checkApiKey, verifySupabaseAdmin, rejectArtist);

// Event routes
router.get("/events", checkApiKey, verifySupabaseAdmin, getAllEvents);
router.get("/events/:id", checkApiKey, verifySupabaseAdmin, getEventById);

// Transaction routes
router.get("/transactions", checkApiKey, verifySupabaseAdmin, getAllTransactions);
router.get("/transactions/:id", checkApiKey, verifySupabaseAdmin, getTransactionById);

// Booking routes
router.get("/bookings", checkApiKey, verifySupabaseAdmin, getAllBookings);
router.get("/bookings/:id", checkApiKey, verifySupabaseAdmin, getBookingById);

// Dashboard Stats
router.get("/stats", checkApiKey, verifySupabaseAdmin, getDashboardStats);
router.get("/revenue-chart", checkApiKey, verifySupabaseAdmin, getRevenueChartData);
router.get("/booking-trends", checkApiKey, verifySupabaseAdmin, getBookingTrends);
router.get("/booking-stats", checkApiKey, verifySupabaseAdmin, getBookingStats);

// Planner verification routes
router.get("/planners", checkApiKey, verifySupabaseAdmin, getAllPlanners);
router.get("/planners/:id", checkApiKey, verifySupabaseAdmin, getPlannerById);
router.put("/planners/:id/verify", checkApiKey, verifySupabaseAdmin, verifyPlanner);
router.put("/planners/:id/reject", checkApiKey, verifySupabaseAdmin, rejectPlanner);

// Category CRUD routes
router.post("/categories", checkApiKey, verifySupabaseAdmin, createCategory);
router.get("/categories", checkApiKey, listCategories);
router.get("/categories/:id", checkApiKey, getCategoryById);
router.put("/categories/:id", checkApiKey, verifySupabaseAdmin, updateCategory);
router.delete("/categories/:id", checkApiKey, verifySupabaseAdmin, deleteCategory);

export default router;
