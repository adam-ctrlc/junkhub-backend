import express from "express";
import prisma from "../lib/prisma.js";
import { authenticateUser, authenticateOwner } from "../middleware/auth.js";
import { body } from "express-validator";
import { validate } from "../middleware/validate.js";
import {
  notifyOrderCreated,
  notifyOrderStatusChanged,
} from "../lib/notificationService.js";
const router = express.Router();

/**
 * GET /api/orders
 * Get user's orders
 */
router.get("/", authenticateUser, async (req, res, next) => {
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
 * GET /api/orders/:id
 * Get order by ID
 */
router.get("/:id", authenticateUser, async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              include: {
                shop: {
                  select: { name: true, businessAddress: true },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Verify ownership
    if (order.userId !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json({ order });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/orders
 * Create order
 */
router.post(
  "/",
  authenticateUser,
  [
    body("items")
      .isArray({ min: 1 })
      .withMessage("Order must have at least one item"),
    body("items.*.productId").notEmpty().withMessage("Product ID is required"),
    body("items.*.quantity")
      .isInt({ min: 1 })
      .withMessage("Quantity must be at least 1"),
    body("shippingAddress")
      .trim()
      .notEmpty()
      .withMessage("Shipping address is required"),
    body("shippingCity")
      .trim()
      .notEmpty()
      .withMessage("Shipping city is required"),
    body("shippingZip")
      .trim()
      .notEmpty()
      .withMessage("Shipping ZIP is required"),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { items, shippingAddress, shippingCity, shippingZip } = req.body;

      // Calculate total based on product prices
      let total = 0;
      const orderItems = [];

      for (const item of items) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          return res
            .status(404)
            .json({ error: `Product ${item.productId} not found` });
        }

        if (product.stock < item.quantity) {
          return res.status(400).json({
            error: `Insufficient stock for ${product.name}`,
          });
        }

        const itemTotal = product.price * item.quantity;
        total += itemTotal;

        orderItems.push({
          productId: product.id,
          quantity: item.quantity,
          price: product.price,
        });
      }

      // Create order with items
      const order = await prisma.order.create({
        data: {
          userId: req.user.id,
          total,
          shippingAddress,
          shippingCity,
          shippingZip,
          items: {
            create: orderItems,
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      // Update product stock
      for (const item of items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      // Notify shop owners about new order
      const shopOwnerIds = new Set();
      for (const item of order.items) {
        if (item.product?.shopId) {
          const shop = await prisma.shop.findUnique({
            where: { id: item.product.shopId },
            select: { ownerId: true },
          });
          if (shop?.ownerId) shopOwnerIds.add(shop.ownerId);
        }
      }
      for (const ownerId of shopOwnerIds) {
        await notifyOrderCreated(order, ownerId);
      }

      res.status(201).json({ order });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/orders/:id/cancel
 * Cancel order (user only - can only cancel their own pending orders)
 */
router.put("/:id/cancel", authenticateUser, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get order
    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Verify ownership
    if (order.userId !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Can only cancel pending orders
    if (order.status !== "pending") {
      return res
        .status(400)
        .json({ error: "Only pending orders can be cancelled" });
    }

    // Update order status to cancelled
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status: "cancelled" },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    res.json({ order: updatedOrder });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/orders/:id/status
 * Update order status (owner only)
 */
router.put(
  "/:id/status",
  authenticateOwner,
  [
    body("status")
      .isIn(["pending", "processing", "shipped", "delivered", "cancelled"])
      .withMessage("Invalid status"),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // Get order with items and products
      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              product: {
                include: {
                  shop: true,
                },
              },
            },
          },
        },
      });

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Verify ownership (at least one product belongs to owner's shop)
      const ownsProduct = order.items.some(
        (item) => item.product.shop.ownerId === req.user.id
      );

      if (!ownsProduct) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Update order
      const updatedOrder = await prisma.order.update({
        where: { id },
        data: { status },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      // Notify user about order status change
      await notifyOrderStatusChanged(updatedOrder, status);

      res.json({ order: updatedOrder });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/orders/:id/confirm
 * User confirms order completion (generates system receipt)
 */
router.put("/:id/confirm", authenticateUser, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get order
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              include: {
                shop: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Verify ownership
    if (order.userId !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Can only confirm delivered orders
    if (order.status !== "delivered") {
      return res.status(400).json({
        error: "Can only confirm delivered orders",
      });
    }

    // Check if already confirmed
    if (order.receiptNumber) {
      return res.status(400).json({
        error: "Order has already been confirmed",
        receiptNumber: order.receiptNumber,
      });
    }

    // Generate receipt number: RCP-YYYYMMDD-XXXXXXXX
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const randomPart = Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase();
    const receiptNumber = `RCP-${dateStr}-${randomPart}`;

    // Update order with receipt number and mark as completed
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        receiptNumber,
        completedAt: now,
        status: "completed",
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Notify shop owners about completion
    const shopOwnerIds = new Set();
    for (const item of order.items) {
      if (item.product?.shop?.ownerId) {
        shopOwnerIds.add(item.product.shop.ownerId);
      }
    }

    for (const ownerId of shopOwnerIds) {
      await prisma.notification.create({
        data: {
          ownerId,
          type: "order",
          title: "Order Completed",
          message: `Order #${order.id.slice(
            -6
          )} has been confirmed by the customer. Receipt: ${receiptNumber}`,
          link: "/orders",
        },
      });
    }

    res.json({
      message: "Order confirmed successfully",
      receiptNumber,
      order: updatedOrder,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
