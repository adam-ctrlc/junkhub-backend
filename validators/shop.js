import { body } from "express-validator";
import { validateBase64Image } from "../utils/imageValidator.js";

// Create shop validation
export const createShopValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Shop name is required")
    .isLength({ min: 3, max: 100 })
    .withMessage("Shop name must be between 3 and 100 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description must not exceed 500 characters"),
  body("businessAddress")
    .trim()
    .notEmpty()
    .withMessage("Business address is required"),
  body("logo")
    .optional()
    .custom((value) => {
      if (!value) return true; // Optional field
      const result = validateBase64Image(value);
      if (!result.valid) {
        throw new Error(result.error);
      }
      return true;
    }),
];

// Update shop validation
export const updateShopValidation = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Shop name must be between 3 and 100 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description must not exceed 500 characters"),
  body("businessAddress")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Business address cannot be empty"),
  body("logo")
    .optional()
    .custom((value) => {
      if (!value) return true; // Optional field
      const result = validateBase64Image(value);
      if (!result.valid) {
        throw new Error(result.error);
      }
      return true;
    }),
];
