import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    artistId: { type: mongoose.Schema.Types.ObjectId, ref: "Artist" },
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", default: null },
    eventName: { type: String, default: null },
    eventAddress: { type: String, default: null },
    eventCity: { type: String, default: null },
    eventState: { type: String, default: null },
    eventCountry: { type: String, default: null },
    eventPincode: { type: String, default: null },
    eventLat: { type: String, default: null },
    clientPhoneNumber:{type:String,default:null},
    clientName:{type:String,default:null},
    eventLng: { type: String, default: null },
    source: { type: String, enum: ["user", "planner", "offline"], default: "user" },
    startAt: Date,
    endAt: Date,
    totalPrice: Number,
    paidAmount: Number,
    advanceAmount: Number,
    commissionAmount: Number,
    status: { type: String, enum: ["pending", "confirmed", "completed", "cancelled"], default: "pending" },
    paymentStatus: { type: String, enum: ["unpaid","advance", "authorized", "paid", "refunded"], default: "unpaid" },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String }
  },
  { timestamps: true }
);

export default mongoose.model("Booking", bookingSchema);
