import { validationResult } from "express-validator";

/**
 * Middleware to check validation results
 */
export function validate(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorArray = errors.array();
    return res.status(400).json({
      error: "Validation failed",
      errors: errorArray.map((err) => ({
        path: err.path || err.param,
        msg: err.msg,
      })),
      // Keep details for backward compatibility
      details: errorArray.map((err) => ({
        field: err.path || err.param,
        message: err.msg,
      })),
    });
  }

  next();
}
