/**
 * Middleware to verify x-api-key header for internal or admin routes
 */

export const checkApiKey = (req, res, next) => {
    try {
      const apiKey = req.headers["x-api-key"];
  
      if (!apiKey) {
        return res.status(401).json({
          success: false,
          message: "Missing x-api-key header",
        });
      }
  
      if (apiKey !== process.env.X_API_KEY) {
        return res.status(403).json({
          success: false,
          message: "Invalid x-api-key",
        });
      }
  
      // ✅ API key valid → continue request
      next();
    } catch (error) {
      console.error("x-api-key middleware error:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
      });
    }
  };

  export const verifyXApiKey = (req, res, next) => {
    const apiKey = req.header("x-api-key");
  
    if (!apiKey) {
      return res.status(401).json({ success: false, message: "Missing API key" });
    }
  
    if (apiKey !== process.env.X_API_KEY) {
      return res.status(403).json({ success: false, message: "Invalid API key" });
    }
  
    next();
  };
  