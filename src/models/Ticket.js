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
  },
  { timestamps: true }
);

export default mongoose.model("Ticket", ticketSchema);
