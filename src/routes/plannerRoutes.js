import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { createPlannerProfile, getPlannerProfile, updatePlannerProfile, deletePlannerProfile, getPlannerWallet, listPlannerTransactions, requestWithdrawal, createArtistBooking, checkArtistAvailabilityWithPricing, getPlannerEvents, listMyWithdrawalRequests, getDashboardRevenue, getDashboardTicketDistribution, getDashboardRecentEvents, getDashboardMetrics } from "../controllers/plannerController.js";
import { checkApiKey } from "../middlewares/apiKeyMiddleware.js";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { createEvent, listEvents, getEventById, updateEvent, deleteEvent, getEventAndId } from "../controllers/eventController.js";
import { createTicketType, listTicketTypes, getTicketTypeById, updateTicketType, deleteTicketType } from "../controllers/ticketController.js";
import { listAllArtists, getArtistDetailsById } from "../controllers/artistController.js";
import { checkArtistAvailability } from "../controllers/userController.js";
import { getSimilarArtists } from "../controllers/userController.js";
import { createEmployee, listEmployees, getEmployeeById, updateEmployee, deleteEmployee, verifyTicket, getTicketDataById } from "../controllers/plannerController.js";
import { addBankDetail, getBankDetails, updateBankDetail, deleteBankDetail } from "../controllers/bankDetailController.js";

const router = express.Router();

// Resolve uploads directory (allow override via env)
const resolvedUploads = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.resolve("uploads");

// Create uploads dir if not exists
if (!fs.existsSync(resolvedUploads)) {
  fs.mkdirSync(resolvedUploads, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, resolvedUploads);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, fileName);
  },
});

const uploadMiddleware = multer({
  storage,
});

router.post("/profile", checkApiKey, verifyToken, uploadMiddleware.single("logo"), createPlannerProfile);
router.get("/profile", checkApiKey, verifyToken, getPlannerProfile);
router.put("/profile", checkApiKey, verifyToken, uploadMiddleware.single("logo"), updatePlannerProfile);
router.delete("/profile", checkApiKey, verifyToken, deletePlannerProfile);

// Events CRUD for planners
router.post("/events", checkApiKey, verifyToken, uploadMiddleware.single("banner"), createEvent);
router.get("/events", checkApiKey, verifyToken, listEvents);
router.get("/events/id", checkApiKey, verifyToken, getEventAndId);
router.get("/events/:id", checkApiKey, verifyToken, getEventById);
router.put("/events/:id", checkApiKey, verifyToken, uploadMiddleware.single("banner"), updateEvent);
router.delete("/events/:id", checkApiKey, verifyToken, deleteEvent);

// Artist Routes for planners
router.get("/artists", checkApiKey, verifyToken, listAllArtists);
router.get("/artists/:id", checkApiKey, verifyToken, getArtistDetailsById);

router.get("/artists/check-availability", checkApiKey, verifyToken, checkArtistAvailability);

router.get("/artists/:id/similar", checkApiKey, verifyToken, getSimilarArtists);

// Ticket Types CRUD for planners
router.post("/tickets", checkApiKey, verifyToken, createTicketType);
router.get("/tickets", checkApiKey, verifyToken, listTicketTypes);
router.get("/tickets/:id", checkApiKey, verifyToken, getTicketTypeById);
router.put("/tickets/:id", checkApiKey, verifyToken, updateTicketType);
router.delete("/tickets/:id", checkApiKey, verifyToken, deleteTicketType);

// Planner Wallet and Transactions
router.get("/wallet", checkApiKey, verifyToken, getPlannerWallet);
router.get("/transactions", checkApiKey, verifyToken, listPlannerTransactions);
router.post("/withdraw", checkApiKey, verifyToken, requestWithdrawal);
router.get("/withdrawals", checkApiKey, verifyToken, listMyWithdrawalRequests);

// Employee Management
router.post("/employees", checkApiKey, verifyToken, createEmployee);
router.get("/employees", checkApiKey, verifyToken, listEmployees);
router.get("/employees/:id", checkApiKey, verifyToken, getEmployeeById);
router.put("/employees/:id", checkApiKey, verifyToken, updateEmployee);
router.delete("/employees/:id", checkApiKey, verifyToken, deleteEmployee);

// Ticket Verification
router.post("/verify-ticket", checkApiKey, verifyToken, verifyTicket);

// Get specific ticket data by ID
router.get("/ticket-data/:id", checkApiKey, verifyToken, getTicketDataById);

// Artist Booking
router.post("/bookings/artist", checkApiKey, verifyToken, createArtistBooking);

// Check Artist Availability with Pricing
router.get("/artists/availability/check", checkApiKey, verifyToken, checkArtistAvailabilityWithPricing);

// Get Planner Events (Title and ID)
router.get("/events-list", checkApiKey, verifyToken, getPlannerEvents);

// Bank Details Management
router.post("/bank-details", checkApiKey, verifyToken, addBankDetail);
router.get("/bank-details", checkApiKey, verifyToken, getBankDetails);
router.put("/bank-details/:id", checkApiKey, verifyToken, updateBankDetail);
router.delete("/bank-details/:id", checkApiKey, verifyToken, deleteBankDetail);

// Dashboard Mock Data
router.get("/dashboard/revenue", checkApiKey, verifyToken, getDashboardRevenue);
router.get("/dashboard/ticket-distribution", checkApiKey, verifyToken, getDashboardTicketDistribution);
router.get("/dashboard/recent-events", checkApiKey, verifyToken, getDashboardRecentEvents);
router.get("/dashboard/metrics", checkApiKey, verifyToken, getDashboardMetrics);

export default router;
