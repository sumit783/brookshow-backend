import mongoose from "../config/firestore.js";

const ticketSchema = new mongoose.Schema(
  {
    ticketTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "TicketType" },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    buyerName: String,
    buyerPhone: String,
    buyerEmail: String,
    qrPayload: Object,
    quantity: Number,
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
    paymentStatus: { type: String, enum: ["unpaid", "paid"], default: "unpaid" },
    commissionAmount: { type: Number, default: 0 },
    isOffline: { type: Boolean, default: false },
    soldAt: { type: Date, default: null },
    soldBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    soldByType: { type: String, enum: ["planner", "employee", "online"], default: "online" },
    paymentMethod: { type: String, default: "razorpay" }
  },
  { timestamps: true }
);

export default mongoose.model("Ticket", ticketSchema);
