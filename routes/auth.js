import express from "express";
import prisma from "../lib/prisma.js";
import { hashPassword, comparePassword } from "../utils/password.js";
import { signToken } from "../utils/jwt.js";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/auth.js";
import {
  registerUserValidation,
  registerOwnerValidation,
  loginValidation,
  adminLoginValidation,
  forgotPasswordVerifyValidation,
  forgotPasswordResetValidation,
} from "../validators/auth.js";

const router = express.Router();

/**
 * POST /api/auth/register/user
 * Register a new user
 */
router.post(
  "/register/user",
  registerUserValidation,
  validate,
  async (req, res, next) => {
    try {
      const { email, password, firstName, lastName, phone, address } = req.body;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          phone,
          address,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          address: true,
          profilePic: true,
          createdAt: true,
        },
      });

      // Generate token
      const token = signToken({ id: user.id, email: user.email, role: "user" });

      // Set cookie
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(201).json({ user, token });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/register/owner
 * Register a new owner
 */
router.post(
  "/register/owner",
  registerOwnerValidation,
  validate,
  async (req, res, next) => {
    try {
      const { email, password, businessName, businessAddress, phone } =
        req.body;

      // Check if owner already exists
      const existingOwner = await prisma.owner.findUnique({ where: { email } });
      if (existingOwner) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create owner
      const owner = await prisma.owner.create({
        data: {
          email,
          password: hashedPassword,
          businessName,
          businessAddress,
          phone,
        },
        select: {
          id: true,
          email: true,
          businessName: true,
          businessAddress: true,
          phone: true,
          createdAt: true,
          approved: true,
        },
      });

      // Only generate token if owner is approved (usually false on registration)
      if (owner.approved) {
        const token = signToken({
          id: owner.id,
          email: owner.email,
          role: "owner",
        });

        // Set cookie
        res.cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        return res.status(201).json({ owner, token });
      }

      // If not approved, just return success message
      res.status(201).json({
        message:
          "Registration successful. Your account is pending admin approval.",
        owner,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/login/user
 * User login
 */
router.post(
  "/login/user",
  loginValidation,
  validate,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Verify password
      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Generate token
      const token = signToken({ id: user.id, email: user.email, role: "user" });

      // Set cookie
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;

      res.json({ user: userWithoutPassword, token });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/login/owner
 * Owner login
 */
router.post(
  "/login/owner",
  loginValidation,
  validate,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      // Find owner
      const owner = await prisma.owner.findUnique({ where: { email } });
      if (!owner) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Verify password
      const isPasswordValid = await comparePassword(password, owner.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Check if owner is approved
      if (!owner.approved) {
        return res.status(403).json({
          error:
            "Your business is pending approval. Please wait for admin approval before logging in.",
          code: "PENDING_APPROVAL",
        });
      }

      // Generate token
      const token = signToken({
        id: owner.id,
        email: owner.email,
        role: "owner",
      });

      // Set cookie
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Return owner without password
      const { password: _, ...ownerWithoutPassword } = owner;

      res.json({ owner: ownerWithoutPassword, token });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/login/admin
 * Admin login
 */
router.post(
  "/login/admin",
  adminLoginValidation,
  validate,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      // Find admin
      const admin = await prisma.admin.findUnique({ where: { email } });
      if (!admin) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Verify password
      const isPasswordValid = await comparePassword(password, admin.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Generate token
      const token = signToken({
        id: admin.id,
        email: admin.email,
        role: "admin",
      });

      // Set cookie
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Return admin without password
      const { password: _, ...adminWithoutPassword } = admin;

      res.json({ admin: adminWithoutPassword, token });
    } catch (error) {
      next(error);
    }
  }
);

// In-memory store for verification tokens (in production, use Redis or database)
const verificationTokens = new Map();

/**
 * POST /api/auth/forgot-password/verify
 * Verify user identity for password reset
 */
router.post(
  "/forgot-password/verify",
  forgotPasswordVerifyValidation,
  validate,
  async (req, res, next) => {
    try {
      const { accountType, firstName, lastName, contactNumber, email } =
        req.body;

      let account;

      if (accountType === "user") {
        // Find user by email and verify other details
        account = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        });

        if (!account) {
          return res.status(404).json({
            error: "No account found with this email address",
          });
        }

        // Verify the details match (case-insensitive comparison for names)
        const firstNameMatch =
          account.firstName.toLowerCase() === firstName.toLowerCase();
        const lastNameMatch =
          account.lastName.toLowerCase() === lastName.toLowerCase();
        const phoneMatch = account.phone === contactNumber;

        if (!firstNameMatch || !lastNameMatch || !phoneMatch) {
          return res.status(400).json({
            error: "The information you provided does not match our records",
          });
        }
      } else if (accountType === "owner") {
        // Find owner by email and verify other details
        // For owners, we use businessName parts as first/last name verification
        account = await prisma.owner.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            businessName: true,
            phone: true,
          },
        });

        if (!account) {
          return res.status(404).json({
            error: "No account found with this email address",
          });
        }

        // For owners, verify phone and business name contains the provided names
        const businessNameLower = account.businessName.toLowerCase();
        const containsFirstName = businessNameLower.includes(
          firstName.toLowerCase()
        );
        const containsLastName = businessNameLower.includes(
          lastName.toLowerCase()
        );
        const phoneMatch = account.phone === contactNumber;

        // If businessName doesn't contain provided names, try exact first+last match
        const fullNameMatch =
          businessNameLower === `${firstName} ${lastName}`.toLowerCase();

        if (
          (!containsFirstName && !containsLastName && !fullNameMatch) ||
          !phoneMatch
        ) {
          return res.status(400).json({
            error: "The information you provided does not match our records",
          });
        }
      }

      // Generate a verification token (simple approach - in production use JWT or secure random)
      const verificationToken = Buffer.from(
        JSON.stringify({
          id: account.id,
          email: account.email,
          accountType,
          timestamp: Date.now(),
        })
      ).toString("base64");

      // Store the token with expiration (15 minutes)
      verificationTokens.set(verificationToken, {
        accountId: account.id,
        accountType,
        email: account.email,
        expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
      });

      res.json({
        success: true,
        message:
          "Account verified successfully. You can now reset your password.",
        verificationToken,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/forgot-password/reset
 * Reset password after verification
 */
router.post(
  "/forgot-password/reset",
  forgotPasswordResetValidation,
  validate,
  async (req, res, next) => {
    try {
      const {
        accountType,
        email,
        verificationToken,
        newPassword,
        confirmPassword,
      } = req.body;

      // Check if passwords match
      if (newPassword !== confirmPassword) {
        return res.status(400).json({ error: "Passwords do not match" });
      }

      // Verify the token
      const tokenData = verificationTokens.get(verificationToken);

      if (!tokenData) {
        return res.status(400).json({
          error:
            "Invalid or expired verification token. Please verify your identity again.",
        });
      }

      // Check if token is expired
      if (Date.now() > tokenData.expiresAt) {
        verificationTokens.delete(verificationToken);
        return res.status(400).json({
          error:
            "Verification token has expired. Please verify your identity again.",
        });
      }

      // Verify token matches the request
      if (tokenData.email !== email || tokenData.accountType !== accountType) {
        return res.status(400).json({
          error: "Token does not match the account information",
        });
      }

      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);

      // Update the password
      if (accountType === "user") {
        await prisma.user.update({
          where: { id: tokenData.accountId },
          data: { password: hashedPassword },
        });
      } else if (accountType === "owner") {
        await prisma.owner.update({
          where: { id: tokenData.accountId },
          data: { password: hashedPassword },
        });
      }

      // Remove the used token
      verificationTokens.delete(verificationToken);

      res.json({
        success: true,
        message:
          "Password reset successfully. You can now login with your new password.",
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/logout
 * Logout (clear cookie)
 */
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out successfully" });
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get("/me", authenticate, async (req, res, next) => {
  try {
    const { id, role } = req.user;

    let user;
    if (role === "user") {
      user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          address: true,
          profilePic: true,
        },
      });
    } else if (role === "owner") {
      user = await prisma.owner.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          businessName: true,
          businessAddress: true,
          phone: true,
          profilePic: true,
          approved: true,
        },
      });

      if (user && !user.approved) {
        return res.status(403).json({
          error: "Your account is pending approval.",
          code: "PENDING_APPROVAL",
        });
      }
    } else if (role === "admin") {
      user = await prisma.admin.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          name: true,
          profilePic: true,
          role: true,
        },
      });
    }

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user: { ...user, role } });
  } catch (error) {
    next(error);
  }
});

export default router;
