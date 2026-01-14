import express from "express";
import prisma from "../lib/prisma.js";
import { authenticateOwner } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createProductValidation,
  updateProductValidation,
} from "../validators/product.js";

const router = express.Router();

/**
 * GET /api/products
 * Get all products with filters (public)
 */
router.get("/", async (req, res, next) => {
  try {
    const {
      search,
      category,
      type,
      minPrice,
      maxPrice,
      shopId,
      limit = 20,
      offset = 0,
    } = req.query;

    // Only show approved products to the public
    const where = { status: "approved" };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (category) where.category = category;
    if (type) where.type = type;
    if (shopId) where.shopId = shopId;

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            logo: true,
            owner: {
              select: { profilePic: true },
            },
          },
        },
      },
      take: parseInt(limit),
      skip: parseInt(offset),
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.product.count({ where });

    res.json({ products, total });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/products/home/bestsellers
 * Get best-selling products (by order count)
 */
router.get("/home/bestsellers", async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    // Get products ordered by how many times they appear in orders
    const orderItems = await prisma.orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: parseInt(limit) * 2, // Get more to filter out non-approved
    });

    const productIds = orderItems.map((item) => item.productId);

    // Only show approved products
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        status: "approved",
      },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            logo: true,
            owner: {
              select: { profilePic: true },
            },
          },
        },
      },
    });

    // Sort by sales count and limit
    const sortedProducts = productIds
      .map((id) => products.find((p) => p.id === id))
      .filter(Boolean)
      .slice(0, parseInt(limit));

    res.json({ products: sortedProducts });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/products/home/categories
 * Get unique categories with product counts (only approved products)
 */
router.get("/home/categories", async (req, res, next) => {
  try {
    // Only count approved products
    const categoryCounts = await prisma.product.groupBy({
      by: ["category"],
      where: { status: "approved" },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    const categories = categoryCounts.map((c) => ({
      name: c.category,
      count: c._count.id,
    }));

    res.json({ categories });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/products/:id
 * Get product by ID (public - only approved products visible)
 */
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            logo: true,
            businessAddress: true,
            owner: {
              select: { profilePic: true, businessName: true },
            },
          },
        },
        reviews: {
          include: {
            user: {
              select: { firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    // Only show approved products to public
    if (!product || product.status !== "approved") {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({ product });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/products
 * Create product (owner only)
 */
router.post(
  "/",
  authenticateOwner,
  createProductValidation,
  validate,
  async (req, res, next) => {
    try {
      const {
        name,
        description,
        price,
        shopId,
        category,
        stock,
        type,
        images,
      } = req.body;

      // Verify shop ownership
      const shop = await prisma.shop.findUnique({ where: { id: shopId } });
      if (!shop) {
        return res.status(404).json({ error: "Shop not found" });
      }

      if (shop.ownerId !== req.user.id) {
        return res.status(403).json({ error: "You do not own this shop" });
      }

      // Create product with pending status for admin approval
      const product = await prisma.product.create({
        data: {
          name,
          description,
          price,
          shopId,
          category,
          stock,
          type,
          images: images || [],
          status: "pending", // Requires admin approval
        },
        include: {
          shop: {
            select: { id: true, name: true, logo: true },
          },
        },
      });

      // Notify all admins about new product pending approval
      const admins = await prisma.admin.findMany({ select: { id: true } });
      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            adminId: admin.id,
            type: "approval",
            title: "New Product Pending Approval",
            message: `A new product "${name}" from shop "${product.shop.name}" is waiting for your approval.`,
            link: "/products",
          },
        });
      }

      res.status(201).json({ product });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/products/:id
 * Update product (owner only)
 */
router.put(
  "/:id",
  authenticateOwner,
  updateProductValidation,
  validate,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { name, description, price, category, stock, type, images } =
        req.body;

      // Get product with shop
      const existingProduct = await prisma.product.findUnique({
        where: { id },
        include: { shop: true },
      });

      if (!existingProduct) {
        return res.status(404).json({ error: "Product not found" });
      }

      // Check ownership
      if (existingProduct.shop.ownerId !== req.user.id) {
        return res.status(403).json({ error: "You do not own this product" });
      }

      // Update product
      const product = await prisma.product.update({
        where: { id },
        data: { name, description, price, category, stock, type, images },
        include: {
          shop: {
            select: { id: true, name: true, logo: true },
          },
        },
      });

      res.json({ product });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/products/:id
 * Delete product (owner only)
 */
router.delete("/:id", authenticateOwner, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get product with shop
    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: { shop: true },
    });

    if (!existingProduct) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Check ownership
    if (existingProduct.shop.ownerId !== req.user.id) {
      return res.status(403).json({ error: "You do not own this product" });
    }

    // Delete product
    await prisma.product.delete({ where: { id } });

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    next(error);
  }
});

export default router;
