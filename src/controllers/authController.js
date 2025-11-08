import User from "../models/User.js";
import {
  sendEmailOtp,
  sendSmsOtp,
  verifyOtpHelper,
} from "../utils/otpUtils.js";
import { createToken } from "../utils/tokenUtils.js";
import { supabase } from "../config/supabaseClient.js";

/**
 * Request OTP for login
 * If user exists for provided email/phone, send OTP. Otherwise, return 404.
 */
export const requestLoginOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email or phone is required" });
    }

    const identifier = email;
    const user = await User.findOne({
      $or: [
        email ? { email } : undefined,
      ].filter(Boolean),
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found. Please sign up." });
    }

    if (email) await sendEmailOtp(email);

    return res
      .status(200)
      .json({ success: true, message: "OTP sent successfully" });
  } catch (error) {
    console.error("requestLoginOtp error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to send OTP" });
  }
};

/**
 * Create a new user (signup)
 */
export const registerUser = async (req, res) => {
  try {
    const { email, phone, displayName, countryCode, role } = req.body;

    if (!email && !phone) {
      return res
        .status(400)
        .json({ success: false, message: "Email or phone is required" });
    }

    const existing = await User.findOne({
      $or: [
        email ? { email } : undefined,
        phone ? { phone } : undefined,
      ].filter(Boolean),
    });

    if (existing) {
      return res
        .status(409)
        .json({ success: false, message: "User already exists with this email or phone" });
    }
    const isAdminVerified = role=="user"?true:false
    const user = await User.create({
      email: email || null,
      phone: phone || null,
      displayName,
      countryCode,
      role:role || "user",
      isAdminVerified,
    });

    // Send email OTP if email is provided
    if (email) {
      try {
        await sendEmailOtp(email);
      } catch (otpError) {
        console.error("Failed to send email OTP:", otpError.message);
        // Continue even if OTP send fails
      }
    }

    return res.status(201).json({
      success: true,
      message: "User created successfully. OTP sent to email if provided.",
      user,
    });
  } catch (error) {
    console.error("registerUser error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to create user" });
  }
};

/**
 * Request OTP only for Email
 */
export const requestEmailOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found. Please sign up." });
    }

    await sendEmailOtp(email);
    return res
      .status(200)
      .json({ success: true, message: "OTP sent to email" });
  } catch (error) {
    console.error("requestEmailOtp error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to send email OTP" });
  }
};

/**
 * Request OTP only for Phone
 */
export const requestPhoneOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res
        .status(400)
        .json({ success: false, message: "Phone is required" });
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found. Please sign up." });
    }

    await sendSmsOtp(phone);
    return res
      .status(200)
      .json({ success: true, message: "OTP sent to phone" });
  } catch (error) {
    console.error("requestPhoneOtp error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to send phone OTP" });
  }
};

/**
 * Verify Email OTP
 */
export const verifyEmailOtp = async (req, res) => {
  try {
    const { email, otp,isLogin } = req.body;
    if (!email || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "email and otp are required" });
    }

    const isValid = verifyOtpHelper(email, otp);
    if (!isValid) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired OTP" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (!user.isEmailVerified) {
      user.isEmailVerified = true;
      await user.save();
    }
    const jwtToken = createToken({ id: user._id, role: user.role });
   if(isLogin){
    return res
    .status(200)
    .json({ success: true, message: "Email verified successfully", user,jwtToken });
   }else{
    return res
    .status(200)
    .json({ success: true, message: "Email verified successfully", user});
   }
  } catch (error) {
    console.error("verifyEmailOtp error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to verify email" });
  }
};

/**
 * Verify Phone OTP
 */
export const verifyPhoneOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "phone and otp are required" });
    }

    const isValid = verifyOtpHelper(phone, otp);
    if (!isValid) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired OTP" });
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (!user.isPhoneVerified) {
      user.isPhoneVerified = true;
      await user.save();
    }

    const jwtToken = createToken({ id: user._id, role: user.role });

    return res
      .status(200)
      .json({ success: true, message: "Phone verified successfully", user, jwtToken });
  } catch (error) {
    console.error("verifyPhoneOtp error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to verify phone" });
  }
};

/**
 * Verify registration email OTP and send JWT token
 */
export const verifyRegistrationOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "email and otp are required" });
    }

    const isValid = verifyOtpHelper(email, otp);
    if (!isValid) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired OTP" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (!user.isEmailVerified) {
      user.isEmailVerified = true;
      await user.save();
    }

    const jwtToken = createToken({ id: user._id, role: user.role });

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
      user,
      jwtToken,
    });
  } catch (error) {
    console.error("verifyRegistrationOtp error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to verify registration OTP" });
  }
};

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return res.status(400).json({ error: error.message });

    // Extract only email and access token from the response
    const { user, session } = data;
    const response = {
      message: "Admin login successful",
      email: user.email,
      access_token: session.access_token
    };

    return res.json(response);
  } catch (err) {
    console.error("Error in adminLogin:", err);
    res.status(500).json({ error: "Server error" });
  }
};
 
export const adminLogout = async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) return res.status(400).json({ error: error.message });

    res.json({ message: "Admin logged out successfully" });
  } catch (err) {
    console.error("Error in adminLogout:", err);
    res.status(500).json({ error: "Server error" });
  }
};

