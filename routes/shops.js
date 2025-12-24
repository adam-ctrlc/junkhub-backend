import express from "express";
import prisma from "../lib/prisma.js";
import { authenticateOwner } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createShopValidation,
  updateShopValidation,
} from "../validators/shop.js";

const router = express.Router();

/**
 * GET /api/shops
 * Get all shops (public)
 */
router.get("/", async (req, res, next) => {
  try {
    const { search, limit = 20, offset = 0 } = req.query;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};

    const shops = await prisma.shop.findMany({
      where,
      include: {
        owner: {
          select: { businessName: true, email: true },
        },
        _count: {
          select: {
            products: {
              where: { status: "approved" }, // Only count approved products
            },
          },
        },
      },
      take: parseInt(limit),
      skip: parseInt(offset),
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.shop.count({ where });

    res.json({ shops, total });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/shops/:id
 * Get shop by ID (public - only shows approved products)
 */
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const shop = await prisma.shop.findUnique({
      where: { id },
      include: {
        owner: {
          select: { businessName: true, email: true, phone: true },
        },
        products: {
          where: { status: "approved" }, // Only show approved products
          take: 10,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!shop) {
      return res.status(404).json({ error: "Shop not found" });
    }

    res.json({ shop });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/shops/owner/my-shops
 * Get owner's shops (auto-creates one if approved owner has none)
 */
router.get("/owner/my-shops", authenticateOwner, async (req, res, next) => {
  try {
    let shops = await prisma.shop.findMany({
      where: { ownerId: req.user.id },
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Auto-create shop for approved owners who don't have one
    if (shops.length === 0) {
      const owner = await prisma.owner.findUnique({
        where: { id: req.user.id },
        select: {
          approved: true,
          businessName: true,
          businessAddress: true,
          profilePic: true,
        },
      });

      if (owner && owner.approved) {
        const newShop = await prisma.shop.create({
          data: {
            name: owner.businessName,
            businessAddress: owner.businessAddress,
            logo: owner.profilePic || null,
            ownerId: req.user.id,
          },
          include: {
            _count: {
              select: { products: true },
            },
          },
        });
        shops = [newShop];
      }
    }

    res.json({ shops });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/shops
 * Create shop (owner only)
 */
router.post(
  "/",
  authenticateOwner,
  createShopValidation,
  validate,
  async (req, res, next) => {
    try {
      const { name, description, businessAddress, logo } = req.body;

      const shop = await prisma.shop.create({
        data: {
          name,
          description,
          businessAddress,
          logo,
          ownerId: req.user.id,
        },
        include: {
          owner: {
            select: { businessName: true, email: true },
          },
        },
      });

      res.status(201).json({ shop });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/shops/:id
 * Update shop (owner only)
 */
router.put(
  "/:id",
  authenticateOwner,
  updateShopValidation,
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { name, description, businessAddress, logo } = req.body;

      // Check ownership
      const existingShop = await prisma.shop.findUnique({ where: { id } });
      if (!existingShop) {
        return res.status(404).json({ error: "Shop not found" });
      }

      if (existingShop.ownerId !== req.user.id) {
        return res.status(403).json({ error: "You do not own this shop" });
      }

      // Update shop
      const shop = await prisma.shop.update({
        where: { id },
        data: { name, description, businessAddress, logo },
        include: {
          owner: {
            select: { businessName: true, email: true },
          },
        },
      });

      res.json({ shop });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/shops/:id
 * Delete shop (owner only)
 */
router.delete("/:id", authenticateOwner, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check ownership
    const existingShop = await prisma.shop.findUnique({ where: { id } });
    if (!existingShop) {
      return res.status(404).json({ error: "Shop not found" });
    }

    if (existingShop.ownerId !== req.user.id) {
      return res.status(403).json({ error: "You do not own this shop" });
    }

    // Delete shop (cascade will delete products)
    await prisma.shop.delete({ where: { id } });

    res.json({ message: "Shop deleted successfully" });
  } catch (error) {
    next(error);
  }
});

export default router;
