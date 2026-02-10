import Service from "../models/Service.js";
import Artist from "../models/Artist.js";

export const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Service.findById(id).select("-artistId");
    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }
    res.status(200).json({ success: true, service: service.toObject() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}
export const getAllServicesByUserId = async (req, res) => {
  try {
    const userId = req.user.id; 
    const artist = await Artist.findOne({ userId }).select("_id");

    if (!artist) {
      return res.status(404).json({ success: false, message: "Artist profile not found for this user" });
    }

    const services = await Service.find({ artistId: artist._id }).select("-artistId");
    res.status(200).json({ success: true, services: services.map(service => service.toObject()) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllServicesAndId = async (req, res) => {
  try {
    const userId = req.user.id; 
    const artist = await Artist.findOne({ userId }).select("_id");

    if (!artist) {
      return res.status(404).json({ success: false, message: "Artist profile not found for this user" });
    }

    const services = await Service.find({ artistId: artist._id });
    res.status(200).json({ success: true, services: services.map(service => ({ id: service._id, category: service.category })) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const service = await Service.findByIdAndUpdate(id, updates, { new: true }).select("-artistId");
    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }
    res.status(200).json({ success: true, message: "Service updated successfully", service: service.toObject() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
