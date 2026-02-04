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
      .populate("linkedBookingId")
      .sort({ startDate: 1 });
    res.status(200).json({ success: true, calendarBlocks: calendarBlocks.map(block => block.toObject()) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createCalendarBlock = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { startDate, endDate, type, title } = req.body;

    const artist = await Artist.findOne({ userId });
    if (!artist) {
      return res.status(404).json({ success: false, message: "Artist profile not found" });
    }

    const newBlock = new CalendarBlock({
      artistId: artist._id,
      startDate,
      endDate,
      type,
      title,
      createdBy: userId
    });

    await newBlock.save();
    res.status(201).json({ success: true, calendarBlock: newBlock });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCalendarBlock = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { id } = req.params;

    const artist = await Artist.findOne({ userId });
    if (!artist) {
      return res.status(404).json({ success: false, message: "Artist profile not found" });
    }

    const block = await CalendarBlock.findOneAndDelete({ _id: id, artistId: artist._id });
    if (!block) {
      return res.status(404).json({ success: false, message: "Calendar block not found or unauthorized" });
    }

    res.status(200).json({ success: true, message: "Calendar block deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
