import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "./config/index.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

// Import routes
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import shopRoutes from "./routes/shops.js";
import productRoutes from "./routes/products.js";
import orderRoutes from "./routes/orders.js";
import offerRoutes from "./routes/offers.js";
import ownerRoutes from "./routes/owner.js";
import adminRoutes from "./routes/admin.js";
import chatRoutes from "./routes/chats.js";
import notificationRoutes from "./routes/notifications.js";
import ownerNotificationRoutes from "./routes/ownerNotifications.js";
import adminNotificationRoutes from "./routes/adminNotifications.js";
import ownerChatRoutes from "./routes/ownerChats.js";
import seedRoutes, { seedDatabase } from "./routes/seed.js";

const app = express();

// Middleware
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check route
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/shops", shopRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/owner", ownerRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/owner/notifications", ownerNotificationRoutes);
app.use("/api/admin/notifications", adminNotificationRoutes);
app.use("/api/owner/chats", ownerChatRoutes);
app.use("/api/seed", seedRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
if (process.env.NODE_ENV !== "production") {
  app.listen(config.port, () => {
    console.log(`🚀 Server running on port ${config.port}`);
    console.log(`📝 Environment: ${config.nodeEnv}`);
    console.log(`🌐 CORS origin: ${config.corsOrigin}`);
  });
}

export default app;
