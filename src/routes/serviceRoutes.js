import express from "express";
import { getServiceById, updateService, getAllServicesByUserId,getAllServicesAndId } from "../controllers/serviceController.js";
import { checkApiKey } from "../middlewares/apiKeyMiddleware.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", checkApiKey, verifyToken, getAllServicesByUserId);
router.get("/services-and-id", checkApiKey, verifyToken, getAllServicesAndId);
router.get("/:id", checkApiKey, verifyToken, getServiceById);
router.put("/:id", checkApiKey, verifyToken, updateService);

export default router;
