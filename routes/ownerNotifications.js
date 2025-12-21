import express from "express";
import prisma from "../lib/prisma.js";
import { authenticateOwner } from "../middleware/auth.js";

const router = express.Router();

/**
 * GET /api/owner/notifications
 * Get all notifications for the current owner
 */
router.get("/", authenticateOwner, async (req, res, next) => {
  try {
    const { limit = 50, unreadOnly = false } = req.query;

    const where = { ownerId: req.user.id };
    if (unreadOnly === "true") {
      where.isRead = false;
    }

    const notifications = await prisma.notification.findMany({
      where,
      take: parseInt(limit),
      orderBy: { createdAt: "desc" },
    });

    res.json({ notifications });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/owner/notifications/unread/count
 * Get unread notification count
 */
router.get("/unread/count", authenticateOwner, async (req, res, next) => {
  try {
    const count = await prisma.notification.count({
      where: {
        ownerId: req.user.id,
        isRead: false,
      },
    });

    res.json({ unreadCount: count });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/owner/notifications/:id/read
 * Mark a notification as read
 */
router.put("/:id/read", authenticateOwner, async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    if (notification.ownerId !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    res.json({ notification: updated });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/owner/notifications/read-all
 * Mark all notifications as read
 */
router.put("/read-all", authenticateOwner, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: {
        ownerId: req.user.id,
        isRead: false,
      },
      data: { isRead: true },
    });

    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/owner/notifications/:id
 * Delete a notification
 */
router.delete("/:id", authenticateOwner, async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    if (notification.ownerId !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    await prisma.notification.delete({ where: { id } });

    res.json({ message: "Notification deleted" });
  } catch (error) {
    next(error);
  }
});

export default router;
