import mongoose from "mongoose";

const platformSettingSchema = new mongoose.Schema({
  platformChargePercentage: { type: Number, default: 10.0 },
  minWithdrawAmount: { type: Number, default: 500 },
  supportEmail: String,
  supportPhone: String,
}, { timestamps: true });

export default mongoose.model("PlatformSetting", platformSettingSchema);
