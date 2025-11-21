import Artist from "../models/Artist.js";
import User from "../models/User.js";
import Service from "../models/Service.js";
import Review from "../models/Review.js";
import mongoose from "mongoose";

export const getTopArtists = async (req, res) => {
  try {
    // Get top 4 verified artists
    const artists = await Artist.find({ verificationStatus: "verified" })
      .populate("userId", "displayName")
      .limit(4)
      .sort({ createdAt: -1 }); // You can change sorting criteria (e.g., by rating, bookings count, etc.)

    if (artists.length === 0) {
      return res.status(200).json({ success: true, artists: [] });
    }

    // Process each artist to get the required data
    const topArtists = await Promise.all(
      artists.map(async (artist) => {
        // Get all services for this artist
        const services = await Service.find({ artistId: artist._id });

        // Get service categories
        const serviceCategories = services.map((s) => s.category).filter(Boolean);
        
        // Get first service category as "category", fallback to first artist category
        let category = "";
        let specialties = [];
        
        if (serviceCategories.length > 0) {
          // Use first service category as "category"
          category = serviceCategories[0];
          // Remaining service categories as "specialties"
          specialties = serviceCategories.slice(1);
        } else if (artist.category && artist.category.length > 0) {
          // Fallback to artist categories if no services
          category = artist.category[0];
          specialties = artist.category.slice(1);
        }

        // Get minimum price from all services
        const prices = services
          .map((s) => s.price_for_user)
          .filter((price) => price != null && price > 0);
        const price = prices.length > 0 ? Math.min(...prices) : 0;

        // Calculate rating from reviews using artistId
        let rating = 0;
        const reviews = await Review.find({ artistId: artist._id });
        if (reviews.length > 0) {
          const totalRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
          rating = totalRating / reviews.length;
        }

        // Format location
        const location = artist.location
          ? `${artist.location.city || ""}, ${artist.location.state || ""}`.trim().replace(/^,\s*|,\s*$/g, "")
          : "";

        // Get profile image URL
        const image = artist.profileImage || "";

        return {
          id: artist._id,
          name: artist.userId?.displayName || "Unknown Artist",
          category: category || "",
          rating: Math.round(rating * 10) / 10, // Round to 1 decimal place
          location: location || "Location not specified",
          image: image,
          specialties: specialties.length > 0 ? specialties : [],
          price: price,
        };
      })
    );

    res.status(200).json({ success: true, artists: topArtists });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createReview = async (req, res) => {
  try {
    // Get user ID from JWT token
    const userId = req.user.id || req.user.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User ID not found in token" });
    }

    const { artistId, rating, message } = req.body;

    // Validate required fields
    if (!artistId) {
      return res.status(400).json({ success: false, message: "Artist ID is required" });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
    }

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(artistId)) {
      return res.status(400).json({ success: false, message: "Invalid artist ID format" });
    }

    // Find the artist
    const artist = await Artist.findById(artistId);
    if (!artist) {
      return res.status(404).json({ success: false, message: "Artist not found" });
    }

    // Check if user has already reviewed this artist
    const existingReview = await Review.findOne({
      artistId: artist._id,
      clientId: userId,
    });

    let review;
    if (existingReview) {
      // Update existing review
      existingReview.rating = rating;
      existingReview.message = message || existingReview.message;
      review = await existingReview.save();
    } else {
      // Create new review
      review = await Review.create({
        artistId: artist._id,
        clientId: userId,
        rating,
        message: message || "",
      });
    }

    // Update artist profile rating
    const allReviews = await Review.find({ artistId: artist._id });
    const totalRating = allReviews.reduce((sum, rev) => sum + (rev.rating || 0), 0);
    const averageRating = allReviews.length > 0 ? totalRating / allReviews.length : 0;

    // Find and update ArtistProfile rating
    const artistProfile = await ArtistProfile.findOne({ userId: artist.userId });
    if (artistProfile) {
      artistProfile.ratingAverage = Math.round(averageRating * 10) / 10; // Round to 1 decimal place
      artistProfile.ratingCount = allReviews.length;
      await artistProfile.save();
    }

    res.status(201).json({
      success: true,
      message: existingReview ? "Review updated successfully" : "Review created successfully",
      review,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

