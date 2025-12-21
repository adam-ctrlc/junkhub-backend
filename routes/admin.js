import express from "express";
import prisma from "../lib/prisma.js";
import { authenticateAdmin } from "../middleware/auth.js";
import { notifyOwnerApproved } from "../lib/notificationService.js";
import { body } from "express-validator";
import { validate } from "../middleware/validate.js";
import { validateBase64Image } from "../utils/imageValidator.js";

const router = express.Router();

/**
 * GET /api/admin/users
 * Get all users
 */
router.get("/users", authenticateAdmin, async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        profilePic: true,
        createdAt: true,
        _count: {
          select: { orders: true },
        },
      },
      take: parseInt(limit),
      skip: parseInt(offset),
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.user.count();

    res.json({ users, total });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/owners
 * Get all owners
 */
router.get("/owners", authenticateAdmin, async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const owners = await prisma.owner.findMany({
      select: {
        id: true,
        email: true,
        businessName: true,
        businessAddress: true,
        phone: true,
        profilePic: true,
        approved: true,
        createdAt: true,
        _count: {
          select: { shops: true },
        },
      },
      take: parseInt(limit),
      skip: parseInt(offset),
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.owner.count();

    res.json({ owners, total });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/owners/:id/approve
 * Approve an owner's business
 */
router.put("/owners/:id/approve", authenticateAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    const owner = await prisma.owner.update({
      where: { id },
      data: { approved: true },
      select: {
        id: true,
        email: true,
        businessName: true,
        approved: true,
      },
    });

    // Notify owner about approval
    await notifyOwnerApproved(id, true);

    res.json({ message: "Owner approved successfully", owner });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/products
 * Get all products with optional status filter
 */
router.get("/products", authenticateAdmin, async (req, res, next) => {
  try {
    const { limit = 50, offset = 0, status } = req.query;

    const where = {};
    if (status && status !== "all") {
      where.status = status;
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        shop: {
          select: { name: true, owner: { select: { businessName: true } } },
        },
      },
      take: parseInt(limit),
      skip: parseInt(offset),
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.product.count({ where });

    // Also get counts by status for tabs
    const counts = await prisma.product.groupBy({
      by: ["status"],
      _count: { id: true },
    });

    const statusCounts = {
      pending: 0,
      approved: 0,
      rejected: 0,
    };
    counts.forEach((c) => {
      if (c.status in statusCounts) {
        statusCounts[c.status] = c._count.id;
      }
    });

    res.json({ products, total, statusCounts });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/stats
 * Get dashboard statistics
 */
router.get("/stats", authenticateAdmin, async (req, res, next) => {
  try {
    const [userCount, ownerCount, productCount, orderCount, totalRevenue] =
      await Promise.all([
        prisma.user.count(),
        prisma.owner.count(),
        prisma.product.count(),
        prisma.order.count(),
        prisma.order.aggregate({
          _sum: { total: true },
        }),
      ]);

    res.json({
      stats: {
        users: userCount,
        owners: ownerCount,
        products: productCount,
        orders: orderCount,
        revenue: totalRevenue._sum.total || 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/users/:id
 * Delete user
 */
router.delete("/users/:id", authenticateAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.user.delete({ where: { id } });

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/owners/:id
 * Delete owner
 */
router.delete("/owners/:id", authenticateAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.owner.delete({ where: { id } });

    res.json({ message: "Owner deleted successfully" });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/products/:id
 * Delete product
 */
router.delete("/products/:id", authenticateAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.product.delete({ where: { id } });

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/products/:id/approve
 * Approve a product
 */
router.put(
  "/products/:id/approve",
  authenticateAdmin,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const product = await prisma.product.update({
        where: { id },
        data: { status: "approved" },
        include: {
          shop: {
            select: {
              name: true,
              ownerId: true,
            },
          },
        },
      });

      // Notify the owner about approval
      await prisma.notification.create({
        data: {
          ownerId: product.shop.ownerId,
          type: "approval",
          title: "Product Approved",
          message: `Your product "${product.name}" has been approved and is now visible to customers.`,
          link: "/products",
        },
      });

      res.json({ message: "Product approved successfully", product });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/admin/products/:id/reject
 * Reject a product
 */
router.put(
  "/products/:id/reject",
  authenticateAdmin,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { reason } = req.body; // Optional rejection reason

      const product = await prisma.product.update({
        where: { id },
        data: { status: "rejected" },
        include: {
          shop: {
            select: {
              name: true,
              ownerId: true,
            },
          },
        },
      });

      // Notify the owner about rejection
      await prisma.notification.create({
        data: {
          ownerId: product.shop.ownerId,
          type: "approval",
          title: "Product Rejected",
          message: reason
            ? `Your product "${product.name}" has been rejected. Reason: ${reason}`
            : `Your product "${product.name}" has been rejected. Please review and update your product listing.`,
          link: "/products",
        },
      });

      res.json({ message: "Product rejected successfully", product });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/admin/profile
 * Get admin profile
 */
router.get("/profile", authenticateAdmin, async (req, res, next) => {
  try {
    const admin = await prisma.admin.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        profilePic: true,
        role: true,
        createdAt: true,
      },
    });

    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    res.json({ admin });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/profile
 * Update admin profile (name, profilePic)
 */
router.put(
  "/profile",
  authenticateAdmin,
  [
    body("name").optional().trim().notEmpty(),
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
      const { name, profilePic } = req.body;

      const updatedAdmin = await prisma.admin.update({
        where: { id: req.user.id },
        data: {
          ...(name && { name }),
          ...(profilePic !== undefined && { profilePic }),
        },
        select: {
          id: true,
          email: true,
          name: true,
          profilePic: true,
          role: true,
          createdAt: true,
        },
      });

      res.json({ admin: updatedAdmin });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/admin/profile/password
 * Update admin password
 */
router.put("/profile/password", authenticateAdmin, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ error: "Current and new password are required" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: "New password must be at least 6 characters" });
    }

    // Get admin with password
    const admin = await prisma.admin.findUnique({
      where: { id: req.user.id },
    });

    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    // Import password utils
    const { comparePassword, hashPassword } = await import(
      "../utils/password.js"
    );

    // Verify current password
    const isValid = await comparePassword(currentPassword, admin.password);
    if (!isValid) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await prisma.admin.update({
      where: { id: req.user.id },
      data: { password: hashedPassword },
    });

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    next(error);
  }
});

export default router;
