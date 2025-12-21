import express from "express";
import prisma from "../lib/prisma.js";
import { authenticateAdmin } from "../middleware/auth.js";

const router = express.Router();

/**
 * GET /api/admin/notifications
 * Get all notifications for the current admin
 */
router.get("/", authenticateAdmin, async (req, res, next) => {
  try {
    const { limit = 50, unreadOnly = false } = req.query;

    const where = { adminId: req.user.id };
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
 * GET /api/admin/notifications/unread/count
 * Get unread notification count
 */
router.get("/unread/count", authenticateAdmin, async (req, res, next) => {
  try {
    const count = await prisma.notification.count({
      where: {
        adminId: req.user.id,
        isRead: false,
      },
    });

    res.json({ unreadCount: count });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/notifications/:id/read
 * Mark a notification as read
 */
router.put("/:id/read", authenticateAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    if (notification.adminId !== req.user.id) {
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
 * PUT /api/admin/notifications/read-all
 * Mark all notifications as read
 */
router.put("/read-all", authenticateAdmin, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: {
        adminId: req.user.id,
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
 * DELETE /api/admin/notifications/:id
 * Delete a notification
 */
router.delete("/:id", authenticateAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    if (notification.adminId !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    await prisma.notification.delete({ where: { id } });

    res.json({ message: "Notification deleted" });
  } catch (error) {
    next(error);
  }
});

export default router;
