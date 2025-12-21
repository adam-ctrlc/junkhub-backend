import { body } from "express-validator";
import { validateBase64Images } from "../utils/imageValidator.js";

// Create product validation
export const createProductValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Product name is required")
    .isLength({ min: 3, max: 200 })
    .withMessage("Product name must be between 3 and 200 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Description must not exceed 1000 characters"),
  body("price")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),
  body("shopId").trim().notEmpty().withMessage("Shop ID is required"),
  body("category").trim().notEmpty().withMessage("Category is required"),
  body("stock")
    .isInt({ min: 0 })
    .withMessage("Stock must be a non-negative integer"),
  body("type")
    .isIn(["Buying", "Selling"])
    .withMessage('Type must be either "Buying" or "Selling"'),
  body("images")
    .optional()
    .isArray()
    .withMessage("Images must be an array")
    .custom((value) => {
      if (!value || value.length === 0) return true; // Optional field
      const result = validateBase64Images(value);
      if (!result.valid) {
        throw new Error(result.error);
      }
      return true;
    }),
];

// Update product validation
export const updateProductValidation = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage("Product name must be between 3 and 200 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Description must not exceed 1000 characters"),
  body("price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),
  body("category")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Category cannot be empty"),
  body("stock")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Stock must be a non-negative integer"),
  body("type")
    .optional()
    .isIn(["Buying", "Selling"])
    .withMessage('Type must be either "Buying" or "Selling"'),
  body("images")
    .optional()
    .isArray()
    .withMessage("Images must be an array")
    .custom((value) => {
      if (!value || value.length === 0) return true; // Optional field
      const result = validateBase64Images(value);
      if (!result.valid) {
        throw new Error(result.error);
      }
      return true;
    }),
];
