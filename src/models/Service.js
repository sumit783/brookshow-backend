import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    artistId: { type: mongoose.Schema.Types.ObjectId, ref: "Artist", required: true },
    category: { type: String, required: true },
    unit: { type: String, enum: ["hour", "event", "day"], required: true,default:"day" },
    price_for_user: Number,
    price_for_planner: Number,
    advance:Number
  },
  { timestamps: true }
);

export default mongoose.model("Service", serviceSchema);
