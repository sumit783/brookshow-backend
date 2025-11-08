import twilio from "twilio";
import dotenv from "dotenv";
dotenv.config();

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

export const sendSMS = async (phone, message) => {
  try {
    await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE,
      to: phone,
    });
    console.log(`📱 SMS sent to ${phone}`);
    return true;
  } catch (err) {
    console.error("❌ SMS sending failed:", err.message);
    return false;
  }
};
