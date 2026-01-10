import { body } from "express-validator";

// User registration validation
export const registerUserValidation = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("firstName").trim().notEmpty().withMessage("First name is required"),
  body("lastName").trim().notEmpty().withMessage("Last name is required"),
  body("phone")
    .optional()
    .isMobilePhone()
    .withMessage("Please provide a valid phone number"),
];

// Owner registration validation
export const registerOwnerValidation = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("businessName")
    .trim()
    .notEmpty()
    .withMessage("Business name is required"),
  body("businessAddress")
    .trim()
    .notEmpty()
    .withMessage("Business address is required"),
  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required")
    .isMobilePhone()
    .withMessage("Please provide a valid phone number"),
];

// Login validation
export const loginValidation = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

// Admin login validation
export const adminLoginValidation = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

// Forgot password verification validation
export const forgotPasswordVerifyValidation = [
  body("accountType")
    .isIn(["user", "owner"])
    .withMessage("Account type must be 'user' or 'owner'"),
  body("firstName").trim().notEmpty().withMessage("First name is required"),
  body("lastName").trim().notEmpty().withMessage("Last name is required"),
  body("contactNumber")
    .trim()
    .notEmpty()
    .withMessage("Contact number is required"),
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
];

// Forgot password reset validation
export const forgotPasswordResetValidation = [
  body("accountType")
    .isIn(["user", "owner"])
    .withMessage("Account type must be 'user' or 'owner'"),
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
  body("verificationToken")
    .notEmpty()
    .withMessage("Verification token is required"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("confirmPassword")
    .notEmpty()
    .withMessage("Confirm password is required"),
];
