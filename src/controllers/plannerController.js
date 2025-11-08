import PlannerProfile from "../models/PlannerProfile.js";

export const createPlannerProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { organization } = req.body;
    if (!organization) return res.status(400).json({ message: "organization is required" });

    const existing = await PlannerProfile.findOne({ userId });
    if (existing) return res.status(409).json({ message: "Planner profile already exists for user" });

    const payload = {
      userId,
      organization,
    };
    if (req.file) {
      payload.logoUrl = "/uploads/" + req.file.filename;
    }

    const profile = await PlannerProfile.create(payload);

    return res.status(201).json({ message: "Planner profile created", profile });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const getPlannerProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const profile = await PlannerProfile.findOne({ userId }).lean();
    if (!profile) return res.status(404).json({ message: "Planner profile not found" });
    return res.status(200).json(profile);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const updatePlannerProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const updates = {};
    const { organization, verified } = req.body;
    if (organization !== undefined) updates.organization = organization;
    if (verified !== undefined) updates.verified = verified;
    if (req.file) updates.logoUrl = "/uploads/" + req.file.filename;

    const profile = await PlannerProfile.findOneAndUpdate({ userId }, updates, { new: true });
    if (!profile) return res.status(404).json({ message: "Planner profile not found" });
    return res.status(200).json({ message: "Planner profile updated", profile });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const deletePlannerProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const profile = await PlannerProfile.findOne({ userId });
    if (!profile) return res.status(404).json({ message: "Planner profile not found" });
    await PlannerProfile.deleteOne({ userId });
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
