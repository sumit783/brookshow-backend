export const errorHandler = (err, req, res, next) => {
    console.error("❌ Error:", err.stack || err.message);
    console.error("Request details:", {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      body: req.body,
    });
    res.status(err.status || 500).json({
      success: false,
      message: err.message || "Server Error",
    });
  };
  