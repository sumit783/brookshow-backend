import Artist from "../models/Artist.js";
import User from "../models/User.js";
import fs from "fs";
import MediaItem from "../models/MediaItem.js";
import Category from "../models/Category.js";
import Service from "../models/Service.js";
import Review from "../models/Review.js";
import WithdrawalRequest from "../models/WithdrawalRequest.js";
import WalletTransaction from "../models/WalletTransaction.js";

function getBodyField(value) {
  if (typeof value === "string") {
    try { return JSON.parse(value); } catch { return value; }
  }
  return value;
}

// Create Artist Profile
export const createArtistProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bio, city, state, country } = req.body;
    const location = { city, state, country };
    let _category = req.body.category;
    // Accept array or comma-separated string
    let categories = Array.isArray(_category)
      ? _category
      : (typeof _category === 'string' ? _category.split(',').map(x => x.trim()).filter(Boolean) : []);

    // Fetch active categories from database
    const activeCategories = await Category.find({ isActive: true }).select("name");
    const allowedCats = activeCategories.map(cat => cat.name);
    categories = categories.filter(x => allowedCats.includes(x));

    let eventPricing = req.body.eventPricing;
    if (typeof eventPricing === 'string') {
      try { eventPricing = JSON.parse(eventPricing); } catch { eventPricing = {}; }
    }
    if (!bio || categories.length === 0) {
      return res.status(400).json({ message: 'bio and at least one category are required' });
    }
    const profileImage = req.files['profileImage']?.[0] ? "/uploads/" + req.files['profileImage'][0].filename : "";
    const artist = await Artist.create({
      userId,
      profileImage,
      bio,
      category: categories,
      location,
      eventPricing: eventPricing || {},
    });

    // Create or update services based on eventPricing
    if (eventPricing) {
      for (const categoryName of categories) {
        if (eventPricing[categoryName]) {
          const serviceData = eventPricing[categoryName];
          await Service.create({
            artistId: artist._id,
            category: categoryName,
            unit: serviceData.unit || "day",
            price_for_user: serviceData.userPrice,
            price_for_planner: serviceData.eventPlannerPrice,
            advance: serviceData.advance,
          });
        }
      }
    }

    return res.status(201).json({ success: true, message: 'Artist profile created', artist });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// Update Artist Profile (by logged-in user)
export const updateArtistProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = {};
    const { bio } = req.body;
    if (bio !== undefined) updates.bio = bio;
    let _category = req.body.category;
    if (_category !== undefined) {
      let categories = Array.isArray(_category)
        ? _category
        : (typeof _category === 'string' ? _category.split(',').map(x => x.trim()).filter(Boolean) : []);
      // Fetch active categories from database
      const activeCategories = await Category.find({ isActive: true }).select("name");
      const allowedCats = activeCategories.map(cat => cat.name);
      updates.category = categories.filter(x => allowedCats.includes(x));
    }
    if (req.body.eventPricing !== undefined) {
      try { updates.eventPricing = typeof req.body.eventPricing === 'string' ? JSON.parse(req.body.eventPricing) : req.body.eventPricing; } catch { updates.eventPricing = {}; }
    }
    if (req.body.location !== undefined) updates.location = getBodyField(req.body.location);
    if (req.files['profileImage']) updates.profileImage = "/uploads/" + req.files['profileImage'][0].filename;
    const artist = await Artist.findOne({ userId });
    if (!artist) return res.status(404).json({ message: 'Artist profile not found for user' });

    // Update or create services based on eventPricing
    if (updates.eventPricing) {
      for (const categoryName of updates.category || artist.category) {
        if (updates.eventPricing[categoryName]) {
          const serviceData = updates.eventPricing[categoryName];
          await Service.findOneAndUpdate(
            { artistProfileId: artist._id, category: categoryName },
            {
              unit: serviceData.unit || "day",
              price_for_user: serviceData.price_for_user,
              price_for_planner: serviceData.price_for_planner,
              advance: serviceData.advance,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        }
      }
      // Clear eventPricing from the artist profile itself after processing
      updates.eventPricing = undefined;
    }

    Object.assign(artist, updates);
    await artist.save();
    return res.status(200).json({ success: true, message: 'Artist profile updated', artist });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// Get Artist Profile (for current user)
export const getArtistProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const artist = await Artist.findOne({ userId }).lean().populate("userId");
    if (!artist || !artist.userId) return res.status(404).json({ message: 'Artist profile not found for user' });
    const exclude = (({ eventPricing, bookings, wallet, calendar, ...obj }) => obj);
    const artistData = exclude(artist);
    const media = await MediaItem.find({ ownerType: "artist", ownerId: artist._id });
    return res.status(200).json({ success: true, ...artistData, media });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// List all media for current artist
export const listArtistMedia = async (req, res) => {
  try {
    const userId = req.user.id;
    const artist = await Artist.findOne({ userId }).select("_id");
    if (!artist) return res.status(404).json({ message: 'Artist profile not found for user' });
    const media = await MediaItem.find({ ownerType: 'artist', ownerId: artist._id }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, items: media });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Delete Artist Profile (for user)
export const deleteArtistProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const artist = await Artist.findOne({ userId });
    if (!artist) return res.status(404).json({ message: 'Artist profile not found for user' });
    // Optionally: delete uploaded files from disk (
    [artist.profileImage, ...(artist.photos || []), ...(artist.videos || [])].forEach(f => {
      if (f && f.startsWith("/uploads/")) {
        fs.existsSync('.' + f) && fs.unlinkSync('.' + f);
      }
    });
    await Artist.deleteOne({ userId });
    await User.findByIdAndUpdate(userId, { $unset: { artistProfile: 1 } });
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Upload photos/videos for artist
export const uploadArtistMedia = async (req, res) => {
  try {
    const userId = req.user.id;
    const artist = await Artist.findOne({ userId });
    if (!artist) return res.status(404).json({ message: 'Artist profile not found for user' });
    const files = [...(req.files["photos"] || []), ...(req.files["videos"] || [])];
    if (!files.length) return res.status(400).json({ message: 'No files uploaded' });
    const items = await Promise.all(
      files.map(async (f) => {
        const type = f.mimetype.startsWith("video") ? "video" : "image";
        const media = await MediaItem.create({
          ownerType: "artist",
          ownerId: artist._id,
          type,
          url: "/uploads/" + f.filename
        });
        return media;
      })
    );
    return res.status(201).json({ message: "Media uploaded", items });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Delete photo/video MediaItem by ID
export const deleteArtistMedia = async (req, res) => {
  try {
    const itemId = req.params.id;
    const userId = req.user.id;
    const artist = await Artist.findOne({ userId });
    if (!artist) return res.status(404).json({ message: 'Artist profile not found for user' });
    const item = await MediaItem.findById(itemId);
    if (!item || item.ownerType !== "artist" || String(item.ownerId) !== String(artist._id)) {
      return res.status(404).json({ message: 'No such media item for your artist profile' });
    }
    const filePath = "." + item.url;
    if (item.url && filePath.startsWith("./uploads/") && require('fs').existsSync(filePath)) {
      require('fs').unlinkSync(filePath);
    }
    await item.deleteOne();
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Get active categories for artist selection
export const listCategories = async (req, res) => {
  try {
    const { activeOnly } = req.query;
    const filter = activeOnly === "true" ? { isActive: true } : {};
    const arrayOfCategories = [];
    const categories = await Category.find(filter).sort({ name: 1 }).select("name -_id");
    categories.forEach(category => arrayOfCategories.push(category.name));
    return res.status(200).json({ categories: arrayOfCategories });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, error: err.message });
  }
};

export const listAllArtists = async (req, res) => {
  try {
    const artists = await Artist.find().lean().populate("userId");

    if (artists.length === 0) {
      return res.status(200).json({ success: true, artists: [] });
    }

    const formattedArtists = await Promise.all(
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

        // Get minimum price from all services, using price_for_planner
        const prices = services
          .map((s) => s.price_for_planner)
          .filter((price) => price != null && price > 0);
        const price = prices.length > 0 ? Math.min(...prices) : 0;

        // Calculate rating from reviews using artistId (if reviews model is available)
        let rating = 0;
        // Assuming Review model is imported and used for rating calculation
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
    return res.status(200).json({ success: true, artists: formattedArtists });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getArtistDetailsById = async (req, res) => {
  try {
    const { id } = req.params;
    const artist = await Artist.findById(id).lean().populate("userId");
    if (!artist) return res.status(404).json({ message: "Artist not found" });

    const media = await MediaItem.find({ ownerType: "artist", ownerId: artist._id });
    const reviews = await Review.find({ artistId: artist._id }).populate("clientId", "displayName");
    const exclude = (({ eventPricing, bookings, wallet, calendar, ...obj }) => obj);
    const artistData = exclude(artist);

    return res.status(200).json({ success: true, ...artistData, media, reviews });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const requestWithdrawal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, bankDetails } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }

    const artist = await Artist.findOne({ userId });
    if (!artist) {
      return res.status(404).json({ success: false, message: "Artist profile not found" });
    }

    if (artist.walletBalance < amount) {
      return res.status(400).json({ success: false, message: "Insufficient balance" });
    }

    // Deduct balance
    artist.walletBalance -= amount;
    await artist.save();

    // Create Transaction
    const transaction = await WalletTransaction.create({
      ownerId: artist._id,
      ownerType: "artist",
      type: "debit",
      amount,
      source: "withdraw",
      description: "Withdrawal Request",
      status: "pending"
    });

    // Create Withdrawal Request
    const withdrawalRequest = await WithdrawalRequest.create({
      userId: userId,
      userType: "artist",
      amount,
      bankDetails,
      transactionId: transaction._id
    });

    return res.status(201).json({
      success: true,
      message: "Withdrawal request created successfully",
      withdrawalRequest,
      newBalance: artist.walletBalance
    });

  } catch (err) {
    console.error("requestWithdrawal error:", err);
    return res.status(500).json({ success: false, message: "Failed to process withdrawal request" });
  }
};
