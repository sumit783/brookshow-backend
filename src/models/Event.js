import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    plannerProfileId: { type: mongoose.Schema.Types.ObjectId, ref: "PlannerProfile" },
    title: String,
    description: String,
    venue: String,
    address: String,
    city: String,
    state: String,
    lat: Number,
    lng: Number,
    startAt: Date,
    endAt: Date,
    published: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Event", eventSchema);
