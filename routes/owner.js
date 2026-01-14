import express from "express";
import prisma from "../lib/prisma.js";
import { authenticateOwner } from "../middleware/auth.js";
import { body } from "express-validator";
import { validate } from "../middleware/validate.js";
import { validateBase64Image } from "../utils/imageValidator.js";

const router = express.Router();

/**
 * GET /api/owner/stats
 * Get owner dashboard statistics
 */
router.get("/stats", authenticateOwner, async (req, res, next) => {
  try {
    const { period = "7d" } = req.query;

    // Calculate date range
    let startDate = new Date();
    switch (period) {
      case "30d":
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "1y":
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default: // 7d
        startDate.setDate(startDate.getDate() - 7);
    }

    // Get owner's shops
    const shops = await prisma.shop.findMany({
      where: { ownerId: req.user.id },
      select: { id: true },
    });
    const shopIds = shops.map((s) => s.id);

    // Get active products count
    const activeProducts = await prisma.product.count({
      where: { shopId: { in: shopIds } },
    });

    // Get orders for owner's products
    const orders = await prisma.order.findMany({
      where: {
        items: {
          some: {
            product: {
              shopId: { in: shopIds },
            },
          },
        },
        createdAt: { gte: startDate },
      },
      include: {
        items: {
          where: {
            product: {
              shopId: { in: shopIds },
            },
          },
        },
      },
    });

    // Calculate total sales and orders
    let totalSales = 0;
    orders.forEach((order) => {
      order.items.forEach((item) => {
        totalSales += item.price * item.quantity;
      });
    });

    // Get pending offers count
    const pendingOffers = await prisma.offer.count({
      where: {
        product: {
          shopId: { in: shopIds },
        },
        status: "pending",
      },
    });

    res.json({
      stats: {
        totalSales,
        totalOrders: orders.length,
        pendingOffers,
        activeProducts,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/owner/activity
 * Get recent activity for owner dashboard
 */
router.get("/activity", authenticateOwner, async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    // Get owner's shops
    const shops = await prisma.shop.findMany({
      where: { ownerId: req.user.id },
      select: { id: true },
    });
    const shopIds = shops.map((s) => s.id);

    // Get recent orders
    const recentOrders = await prisma.order.findMany({
      where: {
        items: {
          some: {
            product: {
              shopId: { in: shopIds },
            },
          },
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: { name: true },
            },
          },
        },
        user: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: parseInt(limit),
    });

    // Get recent offers
    const recentOffers = await prisma.offer.findMany({
      where: {
        product: {
          shopId: { in: shopIds },
        },
      },
      include: {
        user: {
          select: { firstName: true, lastName: true },
        },
        product: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: parseInt(limit),
    });

    // Combine and format activity
    const activity = [];

    recentOrders.forEach((order) => {
      activity.push({
        id: order.id,
        type: "order",
        message: `Order #${order.id.slice(-6)} from ${order.user.firstName} ${
          order.user.lastName
        }`,
        status: order.status,
        time: order.createdAt,
      });
    });

    recentOffers.forEach((offer) => {
      activity.push({
        id: offer.id,
        type: "offer",
        message: `Sell offer for "${offer.product.name}" from ${offer.user.firstName} ${offer.user.lastName}`,
        status: offer.status,
        time: offer.createdAt,
      });
    });

    // Sort by time and limit
    activity.sort((a, b) => new Date(b.time) - new Date(a.time));
    const limitedActivity = activity.slice(0, parseInt(limit));

    res.json({ activity: limitedActivity });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/owner/products
 * Get owner's products with search/filter
 */
router.get("/products", authenticateOwner, async (req, res, next) => {
  try {
    const { search, category, type, limit = 50, offset = 0 } = req.query;

    // Get owner's shops
    const shops = await prisma.shop.findMany({
      where: { ownerId: req.user.id },
      select: { id: true },
    });
    const shopIds = shops.map((s) => s.id);

    // Build where clause
    const where = {
      shopId: { in: shopIds },
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (category) where.category = category;
    if (type) where.type = type;

    const products = await prisma.product.findMany({
      where,
      include: {
        shop: {
          select: { id: true, name: true },
        },
      },
      take: parseInt(limit),
      skip: parseInt(offset),
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.product.count({ where });

    res.json({ products, total });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/owner/orders
 * Get orders for owner's shops
 */
router.get("/orders", authenticateOwner, async (req, res, next) => {
  try {
    // Get owner's shops
    const shops = await prisma.shop.findMany({
      where: { ownerId: req.user.id },
      select: { id: true },
    });
    const shopIds = shops.map((s) => s.id);

    // Get orders containing products from owner's shops
    const orders = await prisma.order.findMany({
      where: {
        items: {
          some: {
            product: {
              shopId: { in: shopIds },
            },
          },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            address: true,
          },
        },
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
 * PUT /api/owner/profile
 * Update owner profile (including password)
 */
router.put(
  "/profile",
  authenticateOwner,
  [
    body("businessName")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Business name cannot be empty")
      .isLength({ min: 2, max: 100 })
      .withMessage("Business name must be between 2 and 100 characters"),
    body("businessAddress")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Business address cannot be empty")
      .isLength({ max: 500 })
      .withMessage("Address must not exceed 500 characters"),
    body("phone")
      .optional()
      .trim()
      .custom((value) => {
        if (!value) return true;
        // Philippine phone format: 09XXXXXXXXX or +639XXXXXXXXX
        const phoneRegex = /^(\+63|0)?9\d{9}$/;
        if (!phoneRegex.test(value.replace(/\s/g, ""))) {
          throw new Error("Invalid phone number format (e.g., 09123456789)");
        }
        return true;
      }),
    body("newPassword")
      .optional()
      .isLength({ min: 6 })
      .withMessage("New password must be at least 6 characters"),
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
      const {
        businessName,
        businessAddress,
        phone,
        currentPassword,
        newPassword,
        profilePic,
      } = req.body;

      // If changing password, verify current password first
      if (newPassword) {
        if (!currentPassword) {
          return res
            .status(400)
            .json({ error: "Current password is required to change password" });
        }

        // Get current owner with password
        const owner = await prisma.owner.findUnique({
          where: { id: req.user.id },
        });

        // Import password utils
        const { comparePassword, hashPassword } = await import(
          "../utils/password.js"
        );

        const isValid = await comparePassword(currentPassword, owner.password);
        if (!isValid) {
          return res
            .status(400)
            .json({ error: "Current password is incorrect" });
        }

        // Hash new password and update
        const hashedPassword = await hashPassword(newPassword);

        const updatedOwner = await prisma.owner.update({
          where: { id: req.user.id },
          data: {
            ...(businessName && { businessName }),
            ...(businessAddress && { businessAddress }),
            ...(phone && { phone }),
            ...(profilePic !== undefined && { profilePic }),
            password: hashedPassword,
          },
          select: {
            id: true,
            email: true,
            businessName: true,
            businessAddress: true,
            phone: true,
            profilePic: true,
            createdAt: true,
          },
        });

        return res.json({ owner: updatedOwner });
      }

      // Update without password change
      const updatedOwner = await prisma.owner.update({
        where: { id: req.user.id },
        data: {
          ...(businessName && { businessName }),
          ...(businessAddress && { businessAddress }),
          ...(phone && { phone }),
          ...(profilePic !== undefined && { profilePic }),
        },
        select: {
          id: true,
          email: true,
          businessName: true,
          businessAddress: true,
          phone: true,
          profilePic: true,
          createdAt: true,
        },
      });

      res.json({ owner: updatedOwner });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/owner/profile
 * Get owner profile
 */
router.get("/profile", authenticateOwner, async (req, res, next) => {
  try {
    const owner = await prisma.owner.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        businessName: true,
        businessAddress: true,
        phone: true,
        profilePic: true,
        createdAt: true,
      },
    });

    if (!owner) {
      return res.status(404).json({ error: "Owner not found" });
    }

    res.json({ owner });
  } catch (error) {
    next(error);
  }
});

export default router;
