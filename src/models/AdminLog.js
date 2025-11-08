import mongoose from "mongoose";

const adminLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    action: String,
    targetType: String,
    targetId: String,
    payload: Object,
  },
  { timestamps: true }
);

export default mongoose.model("AdminLog", adminLogSchema);
