import Booking from "../models/Booking.js";
import CalendarBlock from "../models/CalendarBlock.js";
import Artist from "../models/Artist.js";
import mongoose from "mongoose";

export const createOfflineBooking = async (req, res) => {
  try {
    // Get user ID from JWT token
    const userId = req.user.id || req.user.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User ID not found in token" });
    }

    // Find the artist associated with this user
    const artist = await Artist.findOne({ userId });
    if (!artist) {
      return res.status(404).json({ success: false, message: "Artist profile not found for this user" });
    }

    const { serviceId, startAt, endAt, totalPrice } = req.body;

    const newBooking = new Booking({
      artistId: artist._id,
      serviceId,
      startAt,
      endAt,
      totalPrice,
      source: "offline",
      status: "confirmed", 
      paymentStatus: "unpaid", 
    });

    const savedBooking = await newBooking.save();

    // Create a calendar block for the offline booking
    const newCalendarBlock = new CalendarBlock({
      artistId: artist._id,
      startDate: savedBooking.startAt,
      endDate: savedBooking.endAt,
      type: "offlineBooking",
      title: `Offline Booking`,
      linkedBookingId: savedBooking._id,
      createdBy: userId,
    });
    await newCalendarBlock.save();

    res.status(201).json({ success: true, message: "Offline booking created successfully", booking: savedBooking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({}).populate("artistId clientId serviceId eventId");
    res.status(200).json({ success: true, bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID format" });
    }

    const booking = await Booking.findById(id)
      .populate("artistId")
      .populate("clientId")
      .populate("serviceId")
      .populate("eventId");

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    res.status(200).json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    // Validate status
    const allowedStatuses = ["pending", "confirmed", "completed", "cancelled"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${allowedStatuses.join(", ")}`,
      });
    }

    // Get the artist ID associated with the logged-in user
    // const artist = await Artist.findOne({ userId });

    // if (!artist) {
    //   return res.status(404).json({ success: false, message: "Artist profile not found" });
    // }

    // Find the booking and ensure it belongs to this artist
    const booking = await Booking.findOne({ _id: id });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found or you are not authorized to update it",
      });
    }

    // Update the status
    booking.status = status;
    await booking.save();

    res.status(200).json({
      success: true,
      message: `Booking status updated to ${status}`,
      booking,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
