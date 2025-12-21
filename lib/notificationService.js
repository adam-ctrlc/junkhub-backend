import prisma from "./prisma.js";

/**
 * Notification Service - Helper to create notifications
 */

/**
 * Create a notification for a user
 */
export async function notifyUser(userId, { type, title, message, link }) {
  try {
    return await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        link,
      },
    });
  } catch (error) {
    console.error("Failed to create user notification:", error);
  }
}

/**
 * Create a notification for an owner
 */
export async function notifyOwner(ownerId, { type, title, message, link }) {
  try {
    return await prisma.notification.create({
      data: {
        ownerId,
        type,
        title,
        message,
        link,
      },
    });
  } catch (error) {
    console.error("Failed to create owner notification:", error);
  }
}

/**
 * Create a notification for an admin
 */
export async function notifyAdmin(adminId, { type, title, message, link }) {
  try {
    return await prisma.notification.create({
      data: {
        adminId,
        type,
        title,
        message,
        link,
      },
    });
  } catch (error) {
    console.error("Failed to create admin notification:", error);
  }
}

/**
 * Notify all admins
 */
export async function notifyAllAdmins({ type, title, message, link }) {
  try {
    const admins = await prisma.admin.findMany({ select: { id: true } });
    const notifications = admins.map((admin) => ({
      adminId: admin.id,
      type,
      title,
      message,
      link,
    }));
    return await prisma.notification.createMany({ data: notifications });
  } catch (error) {
    console.error("Failed to notify all admins:", error);
  }
}

// Convenience functions for common notification types

export async function notifyOrderCreated(order, shopOwnerId) {
  await notifyOwner(shopOwnerId, {
    type: "order",
    title: "New Order Received",
    message: `New order #${order.id.slice(
      -8
    )} received for ₱${order.total.toLocaleString()}`,
    link: `/dashboard/orders`,
  });
}

export async function notifyOrderStatusChanged(order, newStatus) {
  const statusMessages = {
    processing: "Your order is now being processed",
    shipped: "Your order has been shipped",
    delivered: "Your order has been delivered",
    cancelled: "Your order has been cancelled",
  };

  await notifyUser(order.userId, {
    type: "order",
    title: `Order ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
    message:
      statusMessages[newStatus] || `Your order status changed to ${newStatus}`,
    link: `/profile/orders`,
  });
}

export async function notifyOfferReceived(offer, shopOwnerId) {
  await notifyOwner(shopOwnerId, {
    type: "offer",
    title: "New Sell Offer",
    message: `New offer received for ${offer.quantity} units of "${offer.product?.name}"`,
    link: `/dashboard/orders`,
  });
}

export async function notifyOfferStatusChanged(offer, newStatus) {
  const statusMessages = {
    accepted:
      "Your sell offer has been accepted! The shop will contact you soon.",
    rejected: "Your sell offer has been declined.",
    pending: "Your sell offer status has been reverted to pending.",
  };

  await notifyUser(offer.userId, {
    type: "offer",
    title: `Offer ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
    message: statusMessages[newStatus],
    link: `/profile/orders`,
  });
}

export async function notifyOwnerApproved(ownerId, approved) {
  await notifyOwner(ownerId, {
    type: "approval",
    title: approved ? "Account Approved!" : "Account Status Changed",
    message: approved
      ? "Your owner account has been approved. You can now access your dashboard."
      : "Your owner account status has changed. Please contact support for more info.",
    link: `/dashboard`,
  });
}

export async function notifyNewOwnerRegistration(owner) {
  await notifyAllAdmins({
    type: "approval",
    title: "New Owner Registration",
    message: `New owner "${owner.businessName}" is pending approval`,
    link: `/admin/owners`,
  });
}
