/**
 * Global error handling middleware
 */
export function errorHandler(err, req, res, next) {
  console.error("Error:", err);

  // Prisma errors
  if (err.code === "P2002") {
    return res.status(400).json({
      error: "A record with this value already exists",
      field: err.meta?.target?.[0] || "unknown",
    });
  }

  if (err.code === "P2025") {
    return res.status(404).json({ error: "Record not found" });
  }

  // Validation errors
  if (err.name === "ValidationError") {
    return res.status(400).json({ error: err.message, details: err.details });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ error: "Invalid token" });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ error: "Token expired" });
  }

  // Default error
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || "Internal server error",
  });
}

/**
 * 404 handler
 */
export function notFoundHandler(req, res) {
  res.status(404).json({ error: "Route not found" });
}
