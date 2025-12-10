import mongoose from "mongoose";

const plannerEmployeeSchema = new mongoose.Schema(
  {
    plannerProfileId: { type: mongoose.Schema.Types.ObjectId, ref: "PlannerProfile", required: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    name: String,
    email: String,
    phone: String,
    role: { type: String, enum: ["scanner"], default: "scanner" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("PlannerEmployee", plannerEmployeeSchema);
