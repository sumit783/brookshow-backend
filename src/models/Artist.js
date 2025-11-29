// src/models/Artist.js
import mongoose from "mongoose";

const artistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // Media files
    profileImage: {
      type: String, // local file path (uploads/profile/filename.jpg)
      default: "",
    },

    bio: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    category: [
      {
        type: String,
      }
    ],

    location: {
      city: String,
      state: String,
      country: String,
    },

    calendar: [
      {
        date: { type: Date },
        eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event" },
        status: { type: String, enum: ["Booked", "Available"], default: "Available" },
      },
    ],
    verificationStatus:{
      type:String,
      enum:["verified","rejecteed","pending"],
      default:"pending"
    },

    bookings: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Booking",
      },
    ],

    wallet: {
      balance: { type: Number, default: 0 },
      pendingAmount: { type: Number, default: 0 },
      transactions: [
        {
          amount: Number,
          type: { type: String, enum: ["credit", "debit"] },
          eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event" },
          description: String,
          date: { type: Date, default: Date.now },
        },
      ],
    },

    whatsappUpdates: {
      type: Boolean,
      default: true,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    verificationNote: { type: String, default: "" },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export async function dropLegacyArtistIndexes() {
  try {
    const coll = mongoose.connection.collection("artists");
    const indexes = await coll.indexes();
    const legacy = ["email_1", "phone_1"];
    for (const name of legacy) {
      const has = indexes.some((i) => i.name === name);
      if (has) {
        await coll.dropIndex(name);
        console.log(`🧹 Dropped legacy artists.${name} index`);
      }
    }
  } catch (e) {
    if (e?.codeName !== "IndexNotFound") {
      console.warn("Could not drop legacy artists indexes:", e.message);
    }
  }
}

export default mongoose.model("Artist", artistSchema);
