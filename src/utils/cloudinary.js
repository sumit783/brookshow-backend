import cloudinary from "../config/cloudinary.js";

/**
 * Extracts the public_id from a Cloudinary URL.
 * Example: https://res.cloudinary.com/demo/image/upload/v12345/folder/sample.jpg -> folder/sample
 * @param {string} url - The Cloudinary URL
 * @returns {string|null} - The public_id or null if not a Cloudinary URL
 */
export const extractPublicIdFromUrl = (url) => {
  if (!url || !url.includes("cloudinary.com")) return null;

  try {
    // Split by '/upload/' to get the part after it
    const parts = url.split("/upload/");
    if (parts.length < 2) return null;

    // Remaining part is: [v<version>/]<public_id>.<extension>
    const remaining = parts[1];
    
    // Remove version (v<digits>/) if present
    const versionMatch = remaining.match(/^v\d+\//);
    const withoutVersion = versionMatch ? remaining.replace(versionMatch[0], "") : remaining;

    // Remove file extension
    const lastDotIndex = withoutVersion.lastIndexOf(".");
    const publicId = lastDotIndex !== -1 ? withoutVersion.substring(0, lastDotIndex) : withoutVersion;

    return publicId;
  } catch (error) {
    console.error("Error extracting public_id from URL:", error);
    return null;
  }
};

/**
 * Deletes an asset from Cloudinary.
 * @param {string} publicIdOrUrl - The public_id or the full Cloudinary URL
 * @param {string} resourceType - The resource type (image, video, raw) - defaults to 'image'
 * @returns {Promise<any>} - Cloudinary deletion result
 */
export const deleteFromCloudinary = async (publicIdOrUrl, resourceType = "image") => {
  if (!publicIdOrUrl) return null;

  let publicId = publicIdOrUrl;
  
  // If it's a URL, extract the public_id
  if (publicIdOrUrl.startsWith("http")) {
    publicId = extractPublicIdFromUrl(publicIdOrUrl);
  }

  if (!publicId) return null;

  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    console.log(`Cloudinary deletion result for ${publicId}:`, result);
    return result;
  } catch (error) {
    console.error(`Error deleting ${publicId} from Cloudinary:`, error);
    throw error;
  }
};
