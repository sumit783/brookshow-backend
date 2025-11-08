// src/utils/otpUtils.js
import nodemailer from "nodemailer";
import twilio from "twilio";

const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

// Temporary OTP store (for dev use only, use Redis or DB in production)
const otpStore = new Map();

// --- Generate OTP ---
const generateOtp = () => {
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  console.log("Generated OTP:", otp); // ✅ log to confirm
  return otp;
};

// --- Manually set OTP for an identifier (used in non-production) ---
export const setOtpForIdentifier = (identifier, otp, ttlMs = 5 * 60 * 1000) => {
  otpStore.set(identifier, { otp, expiresAt: Date.now() + ttlMs });
  console.log(`OTP set for ${identifier}: ${otp} (expires in ${ttlMs}ms)`);
};

// --- Send Email OTP ---
export const sendEmailOtp = async (email) => {
  try {
    const isProd = process.env.NODE_ENV === "production";
    const otp = isProd ? generateOtp() : "1234";

    // Store OTP temporarily (5 min expiry)
    otpStore.set(email, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });

    if (!isProd) {
      console.log(`DEV: Skipping email send. OTP for ${email}: ${otp}`);
      return otp;
    }

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: `"BrookShow" <${process.env.SMTP_EMAIL}>`,
      to: email,
      subject: "🔐 BrookShow OTP Verification",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 16px;">
          <h2>🔐 BrookShow OTP Verification</h2>
          <p>Your OTP code is:</p>
          <h1 style="color:#4CAF50; font-size: 32px;">${otp}</h1>
          <p>This code will expire in <b>5 minutes</b>.</p>
          <br/>
          <p>Thank you,<br/>BrookShow Team</p>
        </div>
      `,
    });

    console.log(`✅ Email sent successfully: ${info.messageId}, OTP: ${otp}`);
    return otp;
  } catch (error) {
    console.error("❌ Error sending email OTP:", error);
    throw new Error("Failed to send email OTP");
  }
};
  

// --- Send SMS OTP ---
export const sendSmsOtp = async (phone) => {
  try {
    const isProd = process.env.NODE_ENV === "production";
    const otp = isProd ? generateOtp() : "1234";

    otpStore.set(phone, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });

    if (!isProd) {
      console.log(`DEV: Skipping SMS send. OTP for ${phone}: ${otp}`);
      return otp;
    }

    await twilioClient.messages.create({
      body: `Your BrookShow OTP is ${otp}. It is valid for 5 minutes.`,
      from: process.env.TWILIO_PHONE,
      to: phone,
    });

    console.log(`✅ OTP sent to phone: ${phone} (${otp})`);
    return otp;
  } catch (error) {
    console.error("❌ Error sending SMS OTP:", error.message);
    throw new Error("Failed to send phone OTP");
  }
};

// --- Verify OTP ---
export const verifyOtpHelper = (identifier, otp) => {
  const record = otpStore.get(identifier);

  if (!record) return false;
  if (record.expiresAt < Date.now()) {
    otpStore.delete(identifier);
    return false;
  }
  if (record.otp !== otp) return false;

  otpStore.delete(identifier);
  return true;
};
