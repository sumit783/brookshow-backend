import express from "express";
import { requestLoginOtp, requestEmailOtp, requestPhoneOtp, registerUser, verifyEmailOtp, verifyPhoneOtp, verifyRegistrationOtp, adminLogin ,adminLogout } from "../controllers/authController.js";
import {checkApiKey} from "../middlewares/apiKeyMiddleware.js"

const router = express.Router();

// Request OTP for login (generic email path kept for backward compat)
router.post("/request-otp",checkApiKey, requestLoginOtp);

// Request OTP for email
router.post("/request-email-otp",checkApiKey, requestEmailOtp);

// Request OTP for phone
router.post("/request-phone-otp",checkApiKey, requestPhoneOtp);

// Create a new user
router.post("/register",checkApiKey, registerUser);

// Verify registration email OTP (returns JWT token)
router.post("/verify-registration-otp",checkApiKey, verifyRegistrationOtp);

// Verify email OTP
router.post("/verify-email-otp",checkApiKey, verifyEmailOtp);

// Verify phone OTP
router.post("/verify-phone-otp",checkApiKey, verifyPhoneOtp);

router.post("/admin-login",checkApiKey, adminLogin);

router.post("/logout",checkApiKey, adminLogout);

export default router;


