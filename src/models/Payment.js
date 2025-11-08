import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
    ticketId: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket", default: null },
    amount: Number,
    currency: { type: String, default: "INR" },
    method: String,
    providerPaymentId: String,
    status: { type: String, enum: ["pending", "succeeded", "failed", "refunded"], default: "pending" },
  },
  { timestamps: true }
);

export default mongoose.model("Payment", paymentSchema);
