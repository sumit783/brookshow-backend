import jwt from "jsonwebtoken";
import { ENV } from "./env.js";

export const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    ENV.JWT_SECRET,
    { expiresIn: ENV.JWT_EXPIRES_IN }
  );
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, ENV.JWT_SECRET);
  } catch {
    return null;
  }
};
