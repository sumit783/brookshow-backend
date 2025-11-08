import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { createPlannerProfile, getPlannerProfile, updatePlannerProfile, deletePlannerProfile } from "../controllers/plannerController.js";
import { checkApiKey } from "../middlewares/apiKeyMiddleware.js";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { createEvent, listEvents, getEventById, updateEvent, deleteEvent, getEventAndId } from "../controllers/eventController.js";
import { createTicketType, listTicketTypes, getTicketTypeById, updateTicketType, deleteTicketType } from "../controllers/ticketController.js";

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
router.get("/profile", checkApiKey, verifyToken,getPlannerProfile);
router.put("/profile", checkApiKey, verifyToken,uploadMiddleware.single("logo"), updatePlannerProfile);
router.delete("/profile", checkApiKey, verifyToken, deletePlannerProfile);

// Events CRUD for planners
router.post("/events", checkApiKey, verifyToken, uploadMiddleware.single("banner"), createEvent);
router.get("/events", checkApiKey, verifyToken, listEvents);
router.get("/events/:id", checkApiKey, verifyToken, getEventById);
router.get("/events/id", checkApiKey, verifyToken, getEventAndId);
router.put("/events/:id", checkApiKey, verifyToken, uploadMiddleware.single("banner"), updateEvent);
router.delete("/events/:id", checkApiKey, verifyToken, deleteEvent);

// Ticket Types CRUD for planners
router.post("/tickets", checkApiKey, verifyToken, createTicketType);
router.get("/tickets", checkApiKey, verifyToken, listTicketTypes);
router.get("/tickets/:id", checkApiKey, verifyToken, getTicketTypeById);
router.put("/tickets/:id", checkApiKey, verifyToken, updateTicketType);
router.delete("/tickets/:id", checkApiKey, verifyToken, deleteTicketType);

export default router;
