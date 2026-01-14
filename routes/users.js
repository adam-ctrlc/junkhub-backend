import express from "express";
import prisma from "../lib/prisma.js";
import { authenticateUser } from "../middleware/auth.js";
import { body } from "express-validator";
import { validate } from "../middleware/validate.js";
import { hashPassword } from "../utils/password.js";
import { validateBase64Image } from "../utils/imageValidator.js";

const router = express.Router();

/**
 * GET /api/users/profile
 * Get user profile
 */
router.get("/profile", authenticateUser, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        address: true,
        profilePic: true,
        wishlist: true,
        createdAt: true,
      },
    });

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/users/profile
 * Update user profile
 */
router.put(
  "/profile",
  authenticateUser,
  [
    body("firstName")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("First name cannot be empty")
      .isLength({ min: 2, max: 50 })
      .withMessage("First name must be between 2 and 50 characters"),
    body("lastName")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Last name cannot be empty")
      .isLength({ min: 2, max: 50 })
      .withMessage("Last name must be between 2 and 50 characters"),
    body("phone")
      .optional()
      .trim()
      .custom((value) => {
        if (!value) return true;
        const phoneRegex = /^(\+63|0)?9\d{9}$/;
        if (!phoneRegex.test(value.replace(/\s/g, ""))) {
          throw new Error("Invalid phone number format (e.g., 09123456789)");
        }
        return true;
      }),
    body("address")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Address must not exceed 500 characters"),
    body("profilePic")
      .optional()
      .custom((value) => {
        if (!value) return true;
        const result = validateBase64Image(value);
        if (!result.valid) {
          throw new Error(result.error);
        }
        return true;
      }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { firstName, lastName, phone, address, profilePic } = req.body;

      const updateData = {};
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (phone !== undefined) updateData.phone = phone;
      if (address !== undefined) updateData.address = address;
      if (profilePic !== undefined) updateData.profilePic = profilePic;

      const user = await prisma.user.update({
        where: { id: req.user.id },
        data: updateData,
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

      res.json({ user });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/users/password
 * Change password
 */
router.put(
  "/password",
  authenticateUser,
  [
    body("currentPassword")
      .notEmpty()
      .withMessage("Current password is required"),
    body("newPassword")
      .isLength({ min: 6 })
      .withMessage("New password must be at least 6 characters"),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;

      // Get user with password
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });

      // Verify current password
      const { comparePassword } = await import("../utils/password.js");
      const isValid = await comparePassword(currentPassword, user.password);

      if (!isValid) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update password
      await prisma.user.update({
        where: { id: req.user.id },
        data: { password: hashedPassword },
      });

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/users/wishlist
 * Get user wishlist
 */
router.get("/wishlist", authenticateUser, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { wishlist: true },
    });

    // Parse wishlist if it's a string
    let wishlistIds = user.wishlist || [];
    if (typeof wishlistIds === "string") {
      try {
        wishlistIds = JSON.parse(wishlistIds);
      } catch {
        wishlistIds = [];
      }
    }

    // Ensure it's an array
    if (!Array.isArray(wishlistIds)) {
      wishlistIds = [];
    }

    // If empty wishlist, return empty array
    if (wishlistIds.length === 0) {
      return res.json({ wishlist: [] });
    }

    // Get product details for wishlist items
    const products = await prisma.product.findMany({
      where: { id: { in: wishlistIds } },
      include: {
        shop: {
          select: { name: true, id: true },
        },
      },
    });

    res.json({ wishlist: products });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/users/wishlist
 * Update wishlist (add/remove product)
 */
router.put(
  "/wishlist",
  authenticateUser,
  [body("productId").notEmpty().withMessage("Product ID is required")],
  validate,
  async (req, res, next) => {
    try {
      const { productId } = req.body;

      // Get current wishlist
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { wishlist: true },
      });

      // Parse wishlist if it's a string
      let currentWishlist = user.wishlist || [];
      if (typeof currentWishlist === "string") {
        try {
          currentWishlist = JSON.parse(currentWishlist);
        } catch {
          currentWishlist = [];
        }
      }
      if (!Array.isArray(currentWishlist)) {
        currentWishlist = [];
      }

      // Toggle product in wishlist
      let newWishlist;
      if (currentWishlist.includes(productId)) {
        newWishlist = currentWishlist.filter((id) => id !== productId);
      } else {
        newWishlist = [...currentWishlist, productId];
      }

      // Update wishlist
      const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: { wishlist: newWishlist },
        select: { wishlist: true },
      });

      res.json({ wishlist: updatedUser.wishlist });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/users/orders
 * Get user orders
 */
router.get("/orders", authenticateUser, async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, price: true, images: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ orders });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/users/reviews
 * Submit a review for a product (user must have purchased the product)
 */
router.post(
  "/reviews",
  authenticateUser,
  [
    body("productId").notEmpty().withMessage("Product ID is required"),
    body("rating")
      .isInt({ min: 1, max: 5 })
      .withMessage("Rating must be between 1 and 5"),
    body("comment")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Comment must not exceed 500 characters"),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { productId, rating, comment } = req.body;

      // Check if product exists
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      // Check if user has a completed order for this product
      const completedOrder = await prisma.order.findFirst({
        where: {
          userId: req.user.id,
          status: "completed",
          items: {
            some: {
              productId: productId,
            },
          },
        },
      });

      if (!completedOrder) {
        return res.status(403).json({
          error: "You can only review products from completed orders",
        });
      }

      // Check if user has already reviewed this product
      const existingReview = await prisma.review.findFirst({
        where: {
          userId: req.user.id,
          productId,
        },
      });

      if (existingReview) {
        // Update existing review
        const updatedReview = await prisma.review.update({
          where: { id: existingReview.id },
          data: { rating, comment },
          include: {
            user: {
              select: { firstName: true, lastName: true },
            },
          },
        });
        return res.json({ review: updatedReview, message: "Review updated" });
      }

      // Create new review
      const review = await prisma.review.create({
        data: {
          userId: req.user.id,
          productId,
          rating,
          comment,
        },
        include: {
          user: {
            select: { firstName: true, lastName: true },
          },
        },
      });

      res.status(201).json({ review, message: "Review submitted" });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/users/reviews
 * Get user's own reviews
 */
router.get("/reviews", authenticateUser, async (req, res, next) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { userId: req.user.id },
      include: {
        product: {
          select: { id: true, name: true, images: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ reviews });
  } catch (error) {
    next(error);
  }
});

export default router;
