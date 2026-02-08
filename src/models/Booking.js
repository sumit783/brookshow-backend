import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    artistId: { type: mongoose.Schema.Types.ObjectId, ref: "Artist" },
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", default: null },
    source: { type: String, enum: ["user", "planner", "offline"], default: "user" },
    startAt: Date,
    endAt: Date,
    totalPrice: Number,
    paidAmount: Number,
    advanceAmount: Number,
    status: { type: String, enum: ["pending", "confirmed", "completed", "cancelled"], default: "pending" },
    paymentStatus: { type: String, enum: ["unpaid","advance", "authorized", "paid", "refunded"], default: "unpaid" },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String }
  },
  { timestamps: true }
);

export default mongoose.model("Booking", bookingSchema);
