import nodemailer from "nodemailer";
import twilio from "twilio";
import dotenv from "dotenv";
dotenv.config();

/**
 * Send OTP via Email
 */
export const sendEmailOtp = async (email, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_EMAIL, // your Gmail ID
        pass: process.env.SMTP_PASSWORD, // your App Password
      },
    });

    const mailOptions = {
      from: `"BrookShow" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your BrookShow OTP Code",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 10px;">
          <h2>🔐 BrookShow OTP Verification</h2>
          <p>Your OTP code is:</p>
          <h1 style="color: #2e86de;">${otp}</h1>
          <p>This code will expire in 5 minutes.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP sent to email: ${email}`);
  } catch (error) {
    console.error("❌ Email OTP Error:", error.message);
    throw new Error("Failed to send OTP email");
  }
};

/**
 * Send OTP via SMS using Twilio
 */
export const sendPhoneOtp = async (phone, otp) => {
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    await client.messages.create({
      body: `Your BrookShow OTP is ${otp}. It will expire in 5 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });

    console.log(`✅ OTP sent to phone: ${phone}`);
  } catch (error) {
    console.error("❌ SMS OTP Error:", error.message);
    throw new Error("Failed to send OTP SMS");
  }
};
