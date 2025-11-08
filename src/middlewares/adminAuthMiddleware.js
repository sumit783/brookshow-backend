import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

/**
 * Middleware to verify Admin access via:
 * 1) x-api-key == SUPABASE_ADMIN_KEY
 * 2) Our own JWT (JWT_SECRET) with role==='admin'
 * 3) Supabase access token (SUPABASE_JWT_SECRET) — any Supabase user is treated as admin
 */
export const verifySupabaseAdmin = async (req, res, next) => {
  try {
    // 1️⃣ API key verification
    const apiKey = req.headers["x-api-key"];
    if (apiKey && apiKey === process.env.SUPABASE_ADMIN_KEY) {
      req.admin = { method: "api-key" };
      return next();
    }

    // 2️⃣ Bearer token verification
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Missing or invalid authorization header",
      });
    }

    const token = authHeader.split(" ")[1];

    // 3️⃣ Try verifying with your app JWT (custom admin)
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded && decoded.role === "admin") {
        req.admin = decoded;
        return next();
      }
      // if decoded but not admin → continue to supabase
    } catch (err) {
      // ignore and continue to Supabase validation
    }

    // 4️⃣ Try verifying Supabase JWT
    if (!process.env.SUPABASE_JWT_SECRET) {
      return res.status(403).json({
        success: false,
        message: "Missing SUPABASE_JWT_SECRET in environment",
      });
    }

    try {
      const supa = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);

      // Supabase JWT typically includes 'email' or inside 'user_metadata'
      const email = supa?.email || supa?.user_metadata?.email;
      const sub = supa?.sub; // user ID (UUID)

      if (!email && !sub) {
        return res.status(403).json({
          success: false,
          message: "Access denied: missing email or sub in token",
        });
      }

      // ✅ Treat any verified Supabase user as an admin
      req.admin = {
        id: sub || "unknown",
        email: email || "unknown",
        role: "admin",
        method: "supabase-jwt",
      };

      return next();
    } catch (err) {
      console.error("verifySupabaseAdmin Supabase JWT error:", err.message);
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired Supabase token" });
    }
  } catch (error) {
    console.error("verifySupabaseAdmin general error:", error.message);
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized or invalid token" });
  }
};
