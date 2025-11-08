import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";
const JWT_EXPIRES_IN = "7d"; // you can adjust

/**
 * Create a JWT token for the user
 * @param {Object} payload - data to include in the token (e.g. user id, email)
 * @returns {string} JWT token
 */
export const createToken = (payload) => {
  try {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  } catch (error) {
    console.error("JWT create error:", error.message);
    throw new Error("Token creation failed");
  }
};

/**
 * Verify a JWT token
 * @param {string} token - the token to verify
 * @returns {Object|null} - decoded data or null if invalid
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error("JWT verify error:", error.message);
    return null;
  }
};

// alias for backward compatibility
export const generateToken = createToken;
