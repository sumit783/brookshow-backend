import Artist from "../models/Artist.js";
import User from "../models/User.js";
import Service from "../models/Service.js";
import Review from "../models/Review.js";
import MediaItem from "../models/MediaItem.js";
import Booking from "../models/Booking.js";
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

    // Rating is calculated from reviews when needed, no need to update ArtistProfile

    res.status(201).json({
      success: true,
      message: existingReview ? "Review updated successfully" : "Review created successfully",
      review,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getArtistById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid artist ID format" });
    }

    // Find the artist
    const artist = await Artist.findById(id).populate("userId", "displayName");
    if (!artist) {
      return res.status(404).json({ success: false, message: "Artist not found" });
    }

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

    // Get media items for portfolio
    const mediaItems = await MediaItem.find({ 
      ownerType: "artist", 
      ownerId: artist._id 
    });

    // Separate images and videos
    const portfolioImages = mediaItems
      .filter((item) => item.type === "image")
      .map((item) => item.url || "");
    
    const portfolioVideos = mediaItems
      .filter((item) => item.type === "video")
      .map((item) => item.url || "");

    // Get bookings count for stats
    const bookingsCount = await Booking.countDocuments({ 
      artistId: artist._id,
      status: { $in: ["confirmed", "completed"] }
    });

    // Calculate experience from createdAt
    const yearsSinceCreation = artist.createdAt
      ? Math.floor((new Date() - new Date(artist.createdAt)) / (1000 * 60 * 60 * 24 * 365))
      : 0;
    const experience = yearsSinceCreation > 0 ? `${yearsSinceCreation}+ Years` : "New Artist";

    // Format response
    const artistData = {
      id: artist._id,
      name: artist.userId?.displayName || "Unknown Artist",
      category: category || "",
      rating: Math.round(rating * 10) / 10, // Round to 1 decimal place
      location: location || "Location not specified",
      image: image,
      specialties: specialties.length > 0 ? specialties : [],
      bio: artist.bio || "",
      price: price,
      portfolio: {
        images: portfolioImages.length > 0 ? portfolioImages : [],
        videos: portfolioVideos.length > 0 ? portfolioVideos : [],
      },
      stats: {
        events: bookingsCount,
        experience: experience,
      },
    };

    res.status(200).json({ success: true, ...artistData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSimilarArtists = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid artist ID format" });
    }

    // Find the current artist
    const currentArtist = await Artist.findById(id);
    if (!currentArtist) {
      return res.status(404).json({ success: false, message: "Artist not found" });
    }

    // Build query to find similar artists
    const query = {
      _id: { $ne: currentArtist._id }, // Exclude current artist
      verificationStatus: "verified", // Only verified artists
    };

    // Find artists with matching categories
    if (currentArtist.category && currentArtist.category.length > 0) {
      query.category = { $in: currentArtist.category };
    }

    // Optionally match by location (city and state)
    if (currentArtist.location?.city && currentArtist.location?.state) {
      query["location.city"] = currentArtist.location.city;
      query["location.state"] = currentArtist.location.state;
    }

    // Find similar artists
    let similarArtists = await Artist.find(query)
      .populate("userId", "displayName")
      .limit(6) // Get up to 6 similar artists
      .sort({ createdAt: -1 });

    // If not enough results, try without location filter
    if (similarArtists.length < 4 && currentArtist.location?.city && currentArtist.location?.state) {
      const queryWithoutLocation = {
        _id: { $ne: currentArtist._id },
        verificationStatus: "verified",
      };
      if (currentArtist.category && currentArtist.category.length > 0) {
        queryWithoutLocation.category = { $in: currentArtist.category };
      }
      similarArtists = await Artist.find(queryWithoutLocation)
        .populate("userId", "displayName")
        .limit(6)
        .sort({ createdAt: -1 });
    }

    if (similarArtists.length === 0) {
      return res.status(200).json({ success: true, artists: [] });
    }

    // Process each similar artist to get the required data
    const formattedArtists = await Promise.all(
      similarArtists.map(async (artist) => {
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

    res.status(200).json({ success: true, artists: formattedArtists });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

