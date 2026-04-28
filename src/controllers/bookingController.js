import Booking from "../models/Booking.js";
import CalendarBlock from "../models/CalendarBlock.js";
import Artist from "../models/Artist.js";
import WalletTransaction from "../models/WalletTransaction.js";
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

    // Mark artist as unavailable when a booking is received
    artist.isAvailable = false;
    await artist.save();

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

    // Handle fund transfer if status becomes "completed"
    // Wallet is only for advance receive, so we move advance amount - commission
    if (status === "completed" && !booking.isFundsTransferred && (booking.paymentStatus === "paid" || booking.paymentStatus === "advance")) {
      const artist = await Artist.findById(booking.artistId);
      if (artist) {
        // netAmount is based on advanceAmount as requested (wallet is only for advance)
        const netAmount = (booking.advanceAmount || 0) - (booking.commissionAmount || 0);
        
        // Move funds in wallet
        artist.wallet = artist.wallet || { balance: 0, pendingAmount: 0, transactions: [] };
        artist.wallet.pendingAmount = Math.max(0, artist.wallet.pendingAmount - netAmount);
        artist.wallet.balance += netAmount;
        await artist.save();

        // Update WalletTransaction status to completed
        await WalletTransaction.findOneAndUpdate(
          { referenceId: booking._id.toString(), ownerId: artist._id, status: "pending" },
          { status: "completed", description: booking.source === "planner" 
            ? `Payment cleared for planner booking (Event Completed). Net: ${netAmount}`
            : `Payment cleared for booking (Event Completed). Net: ${netAmount}` 
          }
        );

        booking.isFundsTransferred = true;
      }
    }

    // Toggle artist isAvailable based on new booking status
    const bookingArtist = await Artist.findById(booking.artistId);
    if (bookingArtist) {
      if (status === "completed" || status === "cancelled") {
        bookingArtist.isAvailable = true;  // Free up the artist
      } else if (status === "confirmed" || status === "pending") {
        bookingArtist.isAvailable = false; // Artist is occupied
      }
      await bookingArtist.save();
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
export const getArtistBookings = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User ID not found in token" });
    }

    const artist = await Artist.findOne({ userId });
    if (!artist) {
      return res.status(404).json({ success: false, message: "Artist profile not found for this user" });
    }

    const bookings = await Booking.find({ artistId: artist._id })
      .populate("clientId", "displayName email phone countryCode")
      .populate("serviceId")
      .populate("eventId")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, bookings });
  } catch (error) {
    console.error("getArtistBookings error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
