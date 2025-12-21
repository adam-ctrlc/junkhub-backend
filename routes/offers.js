import express from "express";
import prisma from "../lib/prisma.js";
import { authenticateUser, authenticateOwner } from "../middleware/auth.js";
import { body } from "express-validator";
import { validate } from "../middleware/validate.js";
import {
  notifyOfferReceived,
  notifyOfferStatusChanged,
} from "../lib/notificationService.js";

const router = express.Router();

/**
 * POST /api/offers
 * Create a new offer (user wants to sell to shop)
 */
router.post(
  "/",
  authenticateUser,
  [
    body("productId").notEmpty().withMessage("Product ID is required"),
    body("quantity")
      .isInt({ min: 1 })
      .withMessage("Quantity must be at least 1"),
    body("contactNumber").notEmpty().withMessage("Contact number is required"),
    body("description").optional().trim(),
    body("images").optional().isArray().withMessage("Images must be an array"),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { productId, quantity, contactNumber, description, images } =
        req.body;

      // Verify product exists and is a "Buying" type
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          shop: {
            select: { id: true, name: true },
          },
        },
      });

      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      if (product.type !== "Buying") {
        return res
          .status(400)
          .json({ error: "This product is not available for selling offers" });
      }

      const offer = await prisma.offer.create({
        data: {
          userId: req.user.id,
          productId,
          quantity: parseInt(quantity),
          contactNumber,
          description,
          images: images ? JSON.stringify(images) : "[]",
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              shop: { select: { ownerId: true } },
            },
          },
        },
      });

      // Notify shop owner about new offer
      if (offer.product?.shop?.ownerId) {
        await notifyOfferReceived(offer, offer.product.shop.ownerId);
      }

      res.status(201).json({ offer });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/offers
 * Get user's offers
 */
router.get("/", authenticateUser, async (req, res, next) => {
  try {
    const offers = await prisma.offer.findMany({
      where: { userId: req.user.id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            images: true,
            shop: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ offers });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/offers/shop
 * Get offers for owner's products (owner only)
 */
router.get("/shop", authenticateOwner, async (req, res, next) => {
  try {
    // Get owner's shops
    const shops = await prisma.shop.findMany({
      where: { ownerId: req.user.id },
      select: { id: true },
    });

    const shopIds = shops.map((s) => s.id);

    // Get offers for products in owner's shops
    const offers = await prisma.offer.findMany({
      where: {
        product: {
          shopId: { in: shopIds },
        },
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            images: true,
            shop: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ offers });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/offers/:id/status
 * Update offer status (owner only)
 */
router.put(
  "/:id/status",
  authenticateOwner,
  [
    body("status")
      .isIn(["pending", "accepted", "rejected"])
      .withMessage("Invalid status"),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // Get offer with product and shop
      const offer = await prisma.offer.findUnique({
        where: { id },
        include: {
          product: {
            include: {
              shop: true,
            },
          },
        },
      });

      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }

      // Verify ownership
      if (offer.product.shop.ownerId !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Update offer
      const updatedOffer = await prisma.offer.update({
        where: { id },
        data: { status },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
          product: {
            select: { id: true, name: true, price: true },
          },
        },
      });

      // Notify user about offer status change
      await notifyOfferStatusChanged(updatedOffer, status);

      res.json({ offer: updatedOffer });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
