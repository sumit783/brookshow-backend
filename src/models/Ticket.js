import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema(
  {
    ticketTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "TicketType" },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event" },
    userId:{type: mongoose.Schema.Types.ObjectId, ref: "User"},
    buyerName: String,
    buyerPhone: String,
    qrPayload: Object,
    persons: Number,
    scannedPersons: Number,
    isValide: { type: Boolean, default: true },
    qrDataUrl: String,
    issuedAt: Date,
    scanned: { type: Boolean, default: false },
    scannedAt: { type: Date, default: null },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    paymentStatus: { type: String, enum: ["unpaid", "paid"], default: "unpaid" }
  },
  { timestamps: true }
);

export default mongoose.model("Ticket", ticketSchema);
