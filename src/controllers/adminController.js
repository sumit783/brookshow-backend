import Artist from "../models/Artist.js";
import PlannerProfile from "../models/PlannerProfile.js";

export const verifyArtist = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const artist = await Artist.findByIdAndUpdate(
      id,
      { isVerified: true, verificationNote: message || "" },
      { new: true }
    );
    if (!artist) return res.status(404).json({ message: "Artist not found" });
    return res.status(200).json({ message: "Artist verified", artist });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

export const rejectArtist = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    if (!message) return res.status(400).json({ message: "Rejection message is required" });
    const artist = await Artist.findByIdAndUpdate(
      id,
      { isVerified: false, verificationNote: message },
      { new: true }
    );
    if (!artist) return res.status(404).json({ message: "Artist not found" });
    return res.status(200).json({ message: "Artist rejected", artist });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

export const verifyPlanner = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const planner = await PlannerProfile.findByIdAndUpdate(
      id,
      { verified: true, verificationNote: message || "" },
      { new: true }
    );
    if (!planner) return res.status(404).json({ message: "Planner profile not found" });
    return res.status(200).json({ message: "Planner verified", planner });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

export const rejectPlanner = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    if (!message) return res.status(400).json({ message: "Rejection message is required" });
    const planner = await PlannerProfile.findByIdAndUpdate(
      id,
      { verified: false, verificationNote: message },
      { new: true }
    );
    if (!planner) return res.status(404).json({ message: "Planner profile not found" });
    return res.status(200).json({ message: "Planner rejected", planner });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};
