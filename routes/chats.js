import express from "express";
import prisma from "../lib/prisma.js";
import { authenticateUser, authenticateOwner } from "../middleware/auth.js";
import { body } from "express-validator";
import { validate } from "../middleware/validate.js";

const router = express.Router();

/**
 * GET /api/chats
 * Get all chats for the current user
 */
router.get("/", authenticateUser, async (req, res, next) => {
  try {
    const chats = await prisma.chat.findMany({
      where: { userId: req.user.id },
      include: {
        owner: {
          select: { id: true, businessName: true },
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
      owner: chat.owner,
      lastMessage: chat.messages[0] || null,
      updatedAt: chat.updatedAt,
    }));

    res.json({ chats: formattedChats });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/chats/order/:orderId
 * Get or create chat for a specific order (user)
 */
router.get("/order/:orderId", authenticateUser, async (req, res, next) => {
  try {
    const { orderId } = req.params;

    // Verify user owns this order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              include: {
                shop: {
                  select: { ownerId: true, name: true },
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

    if (order.userId !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get the shop owner from the first order item
    const ownerId = order.items[0]?.product?.shop?.ownerId;
    if (!ownerId) {
      return res
        .status(400)
        .json({ error: "Could not find shop owner for this order" });
    }

    // Find existing chat or create new one
    let chat = await prisma.chat.findUnique({
      where: { orderId },
      include: {
        owner: {
          select: { id: true, businessName: true },
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
          userId: req.user.id,
          ownerId,
        },
        include: {
          owner: {
            select: { id: true, businessName: true },
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
 * GET /api/chats/:id/messages
 * Get messages for a chat (user)
 */
router.get("/:id/messages", authenticateUser, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limit = 50, before } = req.query;

    // Verify user is part of this chat
    const chat = await prisma.chat.findUnique({
      where: { id },
    });

    if (!chat || chat.userId !== req.user.id) {
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

    // Mark messages from owner as read
    await prisma.message.updateMany({
      where: {
        chatId: id,
        senderType: "owner",
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
 * POST /api/chats/:id/messages
 * Send a message (user)
 */
router.post(
  "/:id/messages",
  authenticateUser,
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

      // Verify user is part of this chat
      const chat = await prisma.chat.findUnique({
        where: { id },
      });

      if (!chat || chat.userId !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Create message
      const message = await prisma.message.create({
        data: {
          chatId: id,
          senderType: "user",
          senderUserId: req.user.id,
          content,
        },
        include: {
          senderUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePic: true,
            },
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
 * GET /api/chats/unread/count
 * Get unread message count (user)
 */
router.get("/unread/count", authenticateUser, async (req, res, next) => {
  try {
    const count = await prisma.message.count({
      where: {
        senderType: "owner",
        isRead: false,
        chat: {
          userId: req.user.id,
        },
      },
    });

    res.json({ unreadCount: count });
  } catch (error) {
    next(error);
  }
});

export default router;
