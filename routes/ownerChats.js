import express from "express";
import prisma from "../lib/prisma.js";
import { authenticateOwner } from "../middleware/auth.js";
import { body } from "express-validator";
import { validate } from "../middleware/validate.js";

const router = express.Router();

/**
 * GET /api/owner/chats
 * Get all chats for the owner
 */
router.get("/", authenticateOwner, async (req, res, next) => {
  try {
    const chats = await prisma.chat.findMany({
      where: { ownerId: req.user.id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePic: true,
          },
        },
        order: {
          select: { id: true, total: true, status: true, createdAt: true },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Format response
    const formattedChats = chats.map((chat) => ({
      id: chat.id,
      orderId: chat.orderId,
      order: chat.order,
      user: chat.user,
      lastMessage: chat.messages[0] || null,
      updatedAt: chat.updatedAt,
      unreadCount: 0, // Will be populated below
    }));

    // Get unread counts for each chat
    for (const chat of formattedChats) {
      const unread = await prisma.message.count({
        where: {
          chatId: chat.id,
          senderType: "user",
          isRead: false,
        },
      });
      chat.unreadCount = unread;
    }

    res.json({ chats: formattedChats });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/owner/chats/order/:orderId
 * Get or create chat for a specific order (owner)
 */
router.get("/order/:orderId", authenticateOwner, async (req, res, next) => {
  try {
    const { orderId } = req.params;

    // Verify owner owns a shop with products in this order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        items: {
          include: {
            product: {
              include: {
                shop: {
                  select: { ownerId: true },
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

    // Check if any product in the order belongs to this owner's shop
    const ownsProduct = order.items.some(
      (item) => item.product?.shop?.ownerId === req.user.id
    );

    if (!ownsProduct) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Find existing chat or create new one
    let chat = await prisma.chat.findUnique({
      where: { orderId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePic: true,
          },
        },
        order: {
          select: { id: true, total: true, status: true, createdAt: true },
        },
      },
    });

    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          orderId,
          userId: order.userId,
          ownerId: req.user.id,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePic: true,
            },
          },
          order: {
            select: { id: true, total: true, status: true, createdAt: true },
          },
        },
      });
    }

    res.json({ chat });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/owner/chats/:id/messages
 * Get messages for a chat (owner)
 */
router.get("/:id/messages", authenticateOwner, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limit = 50, before } = req.query;

    // Verify owner is part of this chat
    const chat = await prisma.chat.findUnique({
      where: { id },
    });

    if (!chat || chat.ownerId !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const whereClause = { chatId: id };
    if (before) {
      whereClause.createdAt = { lt: new Date(before) };
    }

    const messages = await prisma.message.findMany({
      where: whereClause,
      include: {
        senderUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePic: true,
          },
        },
        senderOwner: {
          select: { id: true, businessName: true },
        },
      },
      take: parseInt(limit),
      orderBy: { createdAt: "desc" },
    });

    // Mark messages from user as read
    await prisma.message.updateMany({
      where: {
        chatId: id,
        senderType: "user",
        isRead: false,
      },
      data: { isRead: true },
    });

    res.json({ messages: messages.reverse() });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/owner/chats/:id/messages
 * Send a message (owner)
 */
router.post(
  "/:id/messages",
  authenticateOwner,
  [
    body("content")
      .trim()
      .notEmpty()
      .withMessage("Message content is required"),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { content } = req.body;

      // Verify owner is part of this chat
      const chat = await prisma.chat.findUnique({
        where: { id },
      });

      if (!chat || chat.ownerId !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Create message
      const message = await prisma.message.create({
        data: {
          chatId: id,
          senderType: "owner",
          senderOwnerId: req.user.id,
          content,
        },
        include: {
          senderOwner: {
            select: { id: true, businessName: true },
          },
        },
      });

      // Update chat updatedAt
      await prisma.chat.update({
        where: { id },
        data: { updatedAt: new Date() },
      });

      res.status(201).json({ message });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/owner/chats/unread/count
 * Get unread message count (owner)
 */
router.get("/unread/count", authenticateOwner, async (req, res, next) => {
  try {
    const count = await prisma.message.count({
      where: {
        senderType: "user",
        isRead: false,
        chat: {
          ownerId: req.user.id,
        },
      },
    });

    res.json({ unreadCount: count });
  } catch (error) {
    next(error);
  }
});

export default router;
