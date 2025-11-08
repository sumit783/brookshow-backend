import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    email: { type: String },
    phone: { type: String },
    otp: { type: String, required: true },
    purpose: {
      type: String,
      enum: ["signup", "login", "verify", "reset"],
      required: true,
    },
    expiresAt: { type: Date, required: true },
    verified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("OtpVerification", otpSchema);
