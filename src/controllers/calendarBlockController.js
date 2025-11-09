import CalendarBlock from "../models/CalendarBlock.js";
import Artist from "../models/Artist.js";

export const getAllCalendarBlocks = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User ID not found in token" });
    }
    const artist = await Artist.findOne({ userId });
    if (!artist) {
      return res.status(404).json({ success: false, message: "Artist profile not found for this user" });
    }
    const calendarBlocks = await CalendarBlock.find({ artistId: artist._id })
      .sort({ startDate: 1 });
    res.status(200).json({ success: true, calendarBlocks: calendarBlocks.map(block => block.toObject()) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
