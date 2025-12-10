import Artist from "../models/Artist.js";
import User from "../models/User.js";
import Service from "../models/Service.js";
import Review from "../models/Review.js";
import MediaItem from "../models/MediaItem.js";
import Booking from "../models/Booking.js";
import Event from "../models/Event.js";
import TicketType from "../models/TicketType.js";
import PlannerProfile from "../models/PlannerProfile.js";
import Ticket from "../models/Ticket.js";
import WalletTransaction from "../models/WalletTransaction.js";
import mongoose from "mongoose";
import QRCode from "qrcode";

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
        // Determine which price field to use based on user role
        const priceField = req.user?.role === "planner" ? "price_for_planner" : "price_for_user";

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
          .map((s) => s[priceField])
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

export const checkArtistAvailability = async (req, res) => {
  try {
    const { artistId, serviceId, date, startTime } = req.query;

    // Validate required fields
    if (!artistId) {
      return res.status(400).json({ success: false, message: "Artist ID is required" });
    }

    if (!serviceId) {
      return res.status(400).json({ success: false, message: "Service ID is required" });
    }

    if (!date) {
      return res.status(400).json({ success: false, message: "Date is required" });
    }

    if (!startTime) {
      return res.status(400).json({ success: false, message: "Start time is required" });
    }

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(artistId)) {
      return res.status(400).json({ success: false, message: "Invalid artist ID format" });
    }

    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({ success: false, message: "Invalid service ID format" });
    }

    // Check if artist exists
    const artist = await Artist.findById(artistId);
    if (!artist) {
      return res.status(404).json({ success: false, message: "Artist not found" });
    }

    // Check if service exists and belongs to the artist
    const service = await Service.findOne({ _id: serviceId, artistId: artistId });
    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found for this artist" });
    }

    // Parse date and time to create start and end datetime objects
    const requestedDate = new Date(date);
    if (isNaN(requestedDate.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid date format. Use YYYY-MM-DD" });
    }

    // Parse time strings (expected format: "HH:MM" or "HH:MM:SS")
    const [startHour, startMinute] = startTime.split(':').map(Number);

    if (isNaN(startHour) || isNaN(startMinute)) {
      return res.status(400).json({ success: false, message: "Invalid time format. Use HH:MM" });
    }

    // Create start and end datetime objects
    const requestedStartAt = new Date(requestedDate);
    requestedStartAt.setHours(startHour, startMinute, 0, 0);

    // Check for conflicting bookings
    // A booking conflicts if it overlaps with the requested time range
    const conflictingBookings = await Booking.find({
      artistId: artistId,
      status: { $in: ["pending", "confirmed"] }, // Only check active bookings
      $or: [
        // Case 1: Existing booking starts during requested time
        {
          startAt: { $gte: requestedStartAt }
        },
        // Case 2: Existing booking ends during requested time
        {
          endAt: { $gt: requestedStartAt }
        },
        // Case 3: Existing booking completely encompasses requested time
        {
          startAt: { $lte: requestedStartAt },
          endAt: { $gte: requestedStartAt }
        }
      ]
    }).populate('serviceId', 'category unit');

    const isAvailable = conflictingBookings.length === 0;

    // Format response
    const response = {
      success: true,
      available: isAvailable,
      artist: {
        id: artist._id,
        name: artist.userId?.displayName || "Unknown Artist"
      },
      service: {
        id: service._id,
        category: service.category,
        unit: service.unit
      },
      requestedTime: {
        date: requestedDate.toISOString().split('T')[0],
        startTime: startTime,
        startAt: requestedStartAt.toISOString(),
      }
    };

    if (!isAvailable) {
      response.conflictingBookings = conflictingBookings.map(booking => ({
        id: booking._id,
        startAt: booking.startAt,
        endAt: booking.endAt,
        service: booking.serviceId?.category || "Unknown",
        status: booking.status
      }));
      response.message = "Artist is not available for the requested time slot";
    } else {
      response.message = "Artist is available for the requested time slot";
    }

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getArtistServices = async (req, res) => {
  try {
    const { artistId } = req.params;

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(artistId)) {
      return res.status(400).json({ success: false, message: "Invalid artist ID format" });
    }

    // Check if artist exists
    const artist = await Artist.findById(artistId);
    if (!artist) {
      return res.status(404).json({ success: false, message: "Artist not found" });
    }

    // Get all services for this artist
    const services = await Service.find({ artistId: artistId });

    if (services.length === 0) {
      return res.status(200).json({ 
        success: true, 
        artistId: artistId,
        services: [],
        message: "No services found for this artist"
      });
    }

    // Format services response
    const formattedServices = services.map(service => ({
      id: service._id,
      category: service.category,
      unit: service.unit,
      price_for_user: service.price_for_user || 0,
      price_for_planner: service.price_for_planner || 0,
      advance: service.advance || 0
    }));

    res.status(200).json({
      success: true,
      artistId: artistId,
      services: formattedServices,
      count: formattedServices.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getEvents = async (req, res) => {
  try {
    // Get all published events
    const events = await Event.find({ published: true })
      .populate('plannerProfileId')
      .sort({ startAt: 1 }); // Sort by start date ascending

    if (events.length === 0) {
      return res.status(200).json({ 
        success: true, 
        events: [],
        message: "No events found"
      });
    }

    // Process each event to format the data
    const formattedEvents = await Promise.all(
      events.map(async (event) => {
        const eventData = {};

        // Always include id
        eventData.id = event._id;

        // Add title if available
        if (event.title) {
          eventData.title = event.title;
        }

        // Get artist information from bookings
        const bookings = await Booking.find({ eventId: event._id })
          .populate({
            path: 'artistId',
            populate: {
              path: 'userId',
              select: 'displayName'
            }
          })
          .limit(3); // Get up to 3 artists

        if (bookings.length > 0) {
          const artistNames = bookings
            .filter(b => b.artistId?.userId?.displayName)
            .map(b => b.artistId.userId.displayName);
          
          if (artistNames.length > 0) {
            eventData.artist = artistNames.join(', ');
          }
        }

        // Format date if available
        if (event.startAt) {
          const eventDate = new Date(event.startAt);
          eventData.date = eventDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });

          // Format time
          eventData.time = eventDate.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          });
        }

        // Add venue if available
        if (event.venue) {
          eventData.venue = event.venue;
        }

        // Add location (city, state)
        if (event.city || event.state) {
          const locationParts = [];
          if (event.city) locationParts.push(event.city);
          if (event.state) locationParts.push(event.state);
          eventData.location = locationParts.join(', ');
        }

        // Add latitude and longitude if available
        if (event.lat != null) {
          eventData.latitude = event.lat;
        }
        if (event.lng != null) {
          eventData.longitude = event.lng;
        }

        // Get ticket types for this event
        const ticketTypes = await TicketType.find({ eventId: event._id });
        
        if (ticketTypes.length > 0) {
          // Get minimum price
          const prices = ticketTypes.map(t => t.price).filter(p => p != null && p > 0);
          if (prices.length > 0) {
            const minPrice = Math.min(...prices);
            eventData.price = `${minPrice}`;
          }

          // Calculate total attendance (sold tickets)
          const totalSold = ticketTypes.reduce((sum, t) => sum + (t.sold || 0), 0);
          if (totalSold > 0) {
            if (totalSold >= 1000) {
              eventData.attendance = `${(totalSold / 1000).toFixed(1)}K+ going`;
            } else {
              eventData.attendance = `${totalSold}+ going`;
            }
          }

          // Determine status based on ticket availability
          const totalQuantity = ticketTypes.reduce((sum, t) => sum + (t.quantity || 0), 0);
          const soldPercentage = totalQuantity > 0 ? (totalSold / totalQuantity) * 100 : 0;
          
          if (soldPercentage >= 90) {
            eventData.status = "Almost Sold Out";
          } else if (soldPercentage >= 70) {
            eventData.status = "Selling Fast";
          } else if (soldPercentage >= 50) {
            eventData.status = "Popular";
          } else {
            eventData.status = "Available";
          }
        }

        // Get event image from MediaItem
        const mediaItem = await MediaItem.findOne({ 
          ownerType: "event", 
          ownerId: event._id,
          type: "image"
        });

        if (mediaItem?.url) {
          eventData.image = mediaItem.url;
        }

        // Add organizer logo if available
        if (event.plannerProfileId?.logoUrl) {
          eventData.logo = event.plannerProfileId.logoUrl;
        }

        return eventData;
      })
    );

    res.status(200).json({
      success: true,
      events: formattedEvents,
      count: formattedEvents.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllArtists = async (req, res) => {
  try {
    // Get all verified artists
    const artists = await Artist.find({ verificationStatus: "verified" })
      .populate("userId", "displayName")
      .sort({ createdAt: -1 }); // Sort by creation date, newest first

    if (artists.length === 0) {
      return res.status(200).json({ success: true, artists: [] });
    }

    // Process each artist to get the required data
    const allArtists = await Promise.all(
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

    res.status(200).json({ success: true, artists: allArtists, count: allArtists.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getEventById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid event ID format" });
    }

    // Find the event
    const event = await Event.findById(id).populate('plannerProfileId');
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    // Build event data object
    const eventData = {};

    // Always include id
    eventData.id = event._id;

    // Add title if available
    if (event.title) {
      eventData.title = event.title;
    }

    // Get artist information from bookings and build lineup
    const bookings = await Booking.find({ eventId: event._id })
      .populate({
        path: 'artistId',
        populate: {
          path: 'userId',
          select: 'displayName'
        }
      });

    if (bookings.length > 0) {
      const artistNames = bookings
        .filter(b => b.artistId?.userId?.displayName)
        .map(b => b.artistId.userId.displayName);
      
      if (artistNames.length > 0) {
        // Artist field: comma-separated names
        eventData.artist = artistNames.join(', ');
        
        // Lineup field: array of artist names
        eventData.lineup = artistNames;
      }
    }

    // Format date if available
    if (event.startAt) {
      const eventDate = new Date(event.startAt);
      eventData.date = eventDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

      // Format time
      eventData.time = eventDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });

      // Calculate doors time (1 hour before start time)
      const doorsDate = new Date(eventDate.getTime() - 60 * 60 * 1000);
      eventData.doors = doorsDate.toLocaleTimeString('en-IN', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    }

    // Add venue if available
    if (event.venue) {
      eventData.venue = event.venue;
    }

    // Add location (city, state)
    if (event.city || event.state) {
      const locationParts = [];
      if (event.city) locationParts.push(event.city);
      if (event.state) locationParts.push(event.state);
      eventData.location = locationParts.join(', ');
    }

    // Add full address if available
    if (event.address) {
      eventData.fullAddress = event.address;
    }

    // Add latitude and longitude if available
    if (event.lat != null) {
      eventData.latitude = event.lat;
    }
    if (event.lng != null) {
      eventData.longitude = event.lng;
    }

    // Add description if available
    if (event.description) {
      eventData.description = event.description;
    }

    // Get ticket types for this event
    const ticketTypes = await TicketType.find({ eventId: event._id });
    
    if (ticketTypes.length > 0) {
      // Get minimum price
      const prices = ticketTypes.map(t => t.price).filter(p => p != null && p > 0);
      if (prices.length > 0) {
        const minPrice = Math.min(...prices);
        eventData.price = `${minPrice}`;
      }

      // Calculate total attendance (sold tickets)
      const totalSold = ticketTypes.reduce((sum, t) => sum + (t.sold || 0), 0);
      if (totalSold > 0) {
        if (totalSold >= 1000) {
          eventData.attendance = `${(totalSold / 1000).toFixed(1)}K+ going`;
        } else {
          eventData.attendance = `${totalSold}+ going`;
        }
      }

      // Determine status based on ticket availability
      const totalQuantity = ticketTypes.reduce((sum, t) => sum + (t.quantity || 0), 0);
      const soldPercentage = totalQuantity > 0 ? (totalSold / totalQuantity) * 100 : 0;
      
      if (soldPercentage >= 90) {
        eventData.status = "Almost Sold Out";
      } else if (soldPercentage >= 70) {
        eventData.status = "Selling Fast";
      } else if (soldPercentage >= 50) {
        eventData.status = "Popular";
      } else {
        eventData.status = "Available";
      }
    }

    // Get event image from MediaItem
    const mediaItem = await MediaItem.findOne({ 
      ownerType: "event", 
      ownerId: event._id,
      type: "image"
    });

    if (mediaItem?.url) {
      eventData.image = mediaItem.url;
    }

    // Add organizer logo if available
    if (event.plannerProfileId?.logoUrl) {
      eventData.logo = event.plannerProfileId.logoUrl;
    }

    // Add age restriction (default to "18+" if not specified in model)
    // Note: This field doesn't exist in the Event model, so we'll set a default
    eventData.ageRestriction = "18+";

    res.status(200).json({
      success: true,
      ...eventData
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


export const buyTicket = async (req, res) => {
  try {
    const { ticketTypeId, quantity, buyerName, buyerPhone } = req.body;
    const userId = req.user?.id || req.user?.userId;

    // Validate required fields
    if (!ticketTypeId) {
      return res.status(400).json({ success: false, message: "Ticket Type ID is required" });
    }

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ success: false, message: "Invalid quantity" });
    }

    if (!buyerName || !buyerPhone) {
      return res.status(400).json({ success: false, message: "Buyer name and phone are required" });
    }

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(ticketTypeId)) {
      return res.status(400).json({ success: false, message: "Invalid ticket type ID format" });
    }

    // Find the ticket type
    const ticketType = await TicketType.findById(ticketTypeId);
    if (!ticketType) {
      return res.status(404).json({ success: false, message: "Ticket type not found" });
    }

    // Check availability
    if (ticketType.sold + quantity > ticketType.quantity) {
      return res.status(400).json({ success: false, message: "Not enough tickets available" });
    }

    // Find the event to get planner profile
    const event = await Event.findById(ticketType.eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event associated with ticket not found" });
    }

    // Find planner profile
    const plannerProfile = await PlannerProfile.findById(event.plannerProfileId);
    if (!plannerProfile) {
      return res.status(404).json({ success: false, message: "Planner profile not found" });
    }

    // Calculate total price
    const totalPrice = ticketType.price * quantity;

    // Create the ticket instance (don't save yet)
    const ticket = new Ticket({
      ticketTypeId: ticketType._id,
      eventId: event._id,
      userId,
      buyerName,
      buyerPhone,
      persons: quantity,
      scannedPersons: 0,
      isValide: true,
      issuedAt: new Date()
    });

    // Generate QR Data content and URL
    const qrPayload = {
      ticketId: ticket._id,
      eventId: event._id,
      buyerName,
      quantity,
      timestamp: Date.now()
    };
    
    ticket.qrPayload = qrPayload;
    
    // Generate QR Code
    try {
      ticket.qrDataUrl = await QRCode.toDataURL(JSON.stringify(qrPayload));
    } catch (qrError) {
      console.error("QR Code generation failed:", qrError);
      // Decide if we should fail the whole transaction or proceed without QR
      // For now, let's proceed but maybe log it. Or fail? 
      // User requested "create qr code", so failure to create it should probably be an error.
      throw new Error("Failed to generate ticket QR code");
    }

    // Save the ticket
    await ticket.save();

    // Update ticket type sold count
    ticketType.sold += quantity;
    await ticketType.save();

    // Update planner's wallet balance
    plannerProfile.walletBalance += totalPrice;
    await plannerProfile.save();

    // Create wallet transaction record
    await WalletTransaction.create({
      ownerId: plannerProfile.userId, // Using the user ID of the planner
      ownerType: "planner",
      type: "credit",
      amount: totalPrice,
      source: "booking", // Using booking as closest match
      referenceId: ticket._id.toString(),
      description: `Ticket sale for ${event.title} (${quantity} qty)`,
      status: "completed"
    });

    res.status(201).json({
      success: true,
      message: "Ticket purchased successfully",
      ticket,
      walletUpdated: true
    });

  } catch (error) {
    console.error("Buy ticket error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTicketById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid ticket ID format" });
    }

    const ticket = await Ticket.findById(id)
      .populate({
        path: "eventId",
        select: "title startAt venue address city state lat lng plannerProfileId",
        populate: {
          path: "plannerProfileId",
          select: "organization logoUrl"
        }
      })
      .populate("ticketTypeId", "title price");

    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    return res.status(200).json({
      success: true,
      ticket
    });
  } catch (error) {
    console.error("Get ticket error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "User ID not found in token" });
    }

    // 1. Fetch User Details
    const user = await User.findById(userId).select("-password"); // Exclude password if it exists
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // 2. Fetch Tickets (linked by buyerPhone)
    // Note: User must have a phone number to match tickets
    let tickets = [];
    if (user.phone) {
      tickets = await Ticket.find({ userId }).select("-qrDataUrl -scanned")
        .populate({
          path: "eventId",
          select: "title startAt venue address city state lat lng",
          populate: {
            path: "plannerProfileId",
            select: "organization logoUrl"
          }
        })
        .populate("ticketTypeId", "title price")
        .sort({ createdAt: -1 }); // Newest tickets first
    }

    // 3. Fetch Artist Bookings (linked by clientId)
    const bookings = await Booking.find({ clientId: user._id })
      .populate({
        path: "artistId",
        select: "profileImage category location rating",
        populate: {
          path: "userId",
          select: "displayName"
        }
      })
      .populate("serviceId", "category unit")
      .sort({ createdAt: -1 });

    // Format response
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        displayName: user.displayName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        countryCode: user.countryCode,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        createdAt: user.createdAt
      },
      tickets: tickets.map(ticket => ({
        id: ticket._id,
        event: ticket.eventId ? {
          id: ticket.eventId._id,
          title: ticket.eventId.title,
          date: ticket.eventId.startAt,
          venue: ticket.eventId.venue,
          location: `${ticket.eventId.city || ''}, ${ticket.eventId.state || ''}`,
          image: ticket.eventId.plannerProfileId?.logoUrl // Or event image if available, logic might need adjustment based on Event model
        } : null,
        ticketType: ticket.ticketTypeId?.title,
        quantity: ticket.persons,
        totalPrice: ticket.ticketTypeId?.price ? ticket.ticketTypeId.price * ticket.persons : 0,
        purchaseDate: ticket.createdAt,
        qrDataUrl: ticket.qrDataUrl,
        isValid: ticket.isValide,
        scanned: ticket.scanned
      })),
      bookings: bookings.map(booking => ({
        id: booking._id,
        artist: booking.artistId ? {
          id: booking.artistId._id,
          name: booking.artistId.userId?.displayName || "Unknown",
          image: booking.artistId.profileImage,
          category: booking.artistId.category
        } : null,
        service: booking.serviceId?.category,
        date: booking.startAt,
        status: booking.status,
        price: booking.totalPrice
      }))
    });

  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
