import express from "express";
import prisma from "../lib/prisma.js";
import { hashPassword } from "../utils/password.js";

const router = express.Router();

/**
 * Seed the database with sample data
 */
export async function seedDatabase() {
  console.log("🌱 Checking if database needs seeding...");

  // Check if data already exists
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.log("✅ Database already has data, skipping seed.");
    return;
  }

  console.log("🌱 Seeding database...");

  try {
    // Create Owners
    const owner1 = await prisma.owner.create({
      data: {
        email: "owner1@example.com",
        password: await hashPassword("password123"),
        businessName: "Tech Haven",
        businessAddress: "123 Tech Street, Silicon Valley, CA 94025",
        phone: "+1234567890",
        approved: true, // Pre-approved for immediate login
      },
    });

    const owner2 = await prisma.owner.create({
      data: {
        email: "owner2@example.com",
        password: await hashPassword("password123"),
        businessName: "Fashion Hub",
        businessAddress: "456 Fashion Ave, New York, NY 10001",
        phone: "+1234567891",
        approved: true, // Pre-approved for immediate login
      },
    });

    const owner3 = await prisma.owner.create({
      data: {
        email: "owner3@example.com",
        password: await hashPassword("password123"),
        businessName: "Home Essentials",
        businessAddress: "789 Home Road, Austin, TX 78701",
        phone: "+1234567892",
        approved: false, // Pending approval - for testing admin approval flow
      },
    });

    // Create Shops
    const shop1 = await prisma.shop.create({
      data: {
        name: "Tech Haven",
        description: "Your one-stop shop for all things tech",
        logo: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzRGNDZFNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjQwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlRIPC90ZXh0Pjwvc3ZnPg==",
        businessAddress: "123 Tech Street, Silicon Valley, CA 94025",
        ownerId: owner1.id,
      },
    });

    const shop2 = await prisma.shop.create({
      data: {
        name: "Fashion Hub",
        description: "Trendy fashion for everyone",
        logo: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI0VDNDA3QSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjQwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkZIPC90ZXh0Pjwvc3ZnPg==",
        businessAddress: "456 Fashion Ave, New York, NY 10001",
        ownerId: owner2.id,
      },
    });

    const shop3 = await prisma.shop.create({
      data: {
        name: "Home Essentials",
        description: "Everything you need for your home",
        logo: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzEwQjk4MSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjQwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkhFPC90ZXh0Pjwvc3ZnPg==",
        businessAddress: "789 Home Road, Austin, TX 78701",
        ownerId: owner3.id,
      },
    });

    // Create Products
    await prisma.product.createMany({
      data: [
        {
          name: "Wireless Bluetooth Headphones",
          description:
            "Premium noise-cancelling headphones with 30-hour battery life",
          price: 149.99,
          images: JSON.stringify([
            "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2Y4ZmFmYyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjNjM2YzcyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SGVhZHBob25lczwvdGV4dD48L3N2Zz4=",
          ]),
          shopId: shop1.id,
          category: "Electronics",
          stock: 50,
          type: "Selling",
        },
        {
          name: "Smart Watch Series 5",
          description:
            "Fitness tracking, heart rate monitoring, and notifications on your wrist",
          price: 299.99,
          images: JSON.stringify([
            "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2Y4ZmFmYyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjNjM2YzcyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+U21hcnQgV2F0Y2g8L3RleHQ+PC9zdmc+",
          ]),
          shopId: shop1.id,
          category: "Electronics",
          stock: 30,
          type: "Selling",
        },
        {
          name: "Designer Leather Jacket",
          description: "Premium genuine leather jacket with modern fit",
          price: 399.99,
          images: JSON.stringify([
            "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2Y4ZmFmYyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjNjM2YzcyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+TGVhdGhlciBKYWNrZXQ8L3RleHQ+PC9zdmc+",
          ]),
          shopId: shop2.id,
          category: "Fashion",
          stock: 15,
          type: "Selling",
        },
        {
          name: "Casual Cotton T-Shirt",
          description:
            "Comfortable and breathable cotton t-shirt, available in multiple colors",
          price: 29.99,
          images: JSON.stringify([
            "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2Y4ZmFmYyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjNjM2YzcyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Q290dG9uIFQtU2hpcnQ8L3RleHQ+PC9zdmc+",
          ]),
          shopId: shop2.id,
          category: "Fashion",
          stock: 100,
          type: "Selling",
        },
        {
          name: "Modern Coffee Table",
          description: "Sleek wooden coffee table with storage compartment",
          price: 249.99,
          images: JSON.stringify([
            "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2Y4ZmFmYyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjNjM2YzcyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Q29mZmVlIFRhYmxlPC90ZXh0Pjwvc3ZnPg==",
          ]),
          shopId: shop3.id,
          category: "Furniture",
          stock: 20,
          type: "Selling",
        },
        {
          name: "Decorative Wall Art Set",
          description: "Set of 3 canvas prints for modern home decor",
          price: 89.99,
          images: JSON.stringify([
            "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2Y4ZmFmYyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjNjM2YzcyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+V2FsbCBBcnQgU2V0PC90ZXh0Pjwvc3ZnPg==",
          ]),
          shopId: shop3.id,
          category: "Home Decor",
          stock: 45,
          type: "Selling",
        },
        {
          name: "Used Gaming Laptop",
          description:
            "High-performance gaming laptop, gently used, great condition",
          price: 899.99,
          images: JSON.stringify([
            "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2Y4ZmFmYyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjNjM2YzcyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+R2FtaW5nIExhcHRvcDwvdGV4dD48L3N2Zz4=",
          ]),
          shopId: shop1.id,
          category: "Electronics",
          stock: 1,
          type: "Buying",
        },
        {
          name: "Vintage Denim Jacket",
          description: "Classic vintage denim jacket from the 90s",
          price: 79.99,
          images: JSON.stringify([
            "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2Y4ZmFmYyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjNjM2YzcyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+RGVuaW0gSmFja2V0PC90ZXh0Pjwvc3ZnPg==",
          ]),
          shopId: shop2.id,
          category: "Fashion",
          stock: 3,
          type: "Buying",
        },
      ],
    });

    // Create Users
    const user1 = await prisma.user.create({
      data: {
        email: "john.doe@example.com",
        password: await hashPassword("password123"),
        firstName: "John",
        lastName: "Doe",
        phone: "+1234567890",
        address: "123 Main St, Anytown, USA",
        wishlist: JSON.stringify([]),
      },
    });

    await prisma.user.create({
      data: {
        email: "jane.smith@example.com",
        password: await hashPassword("password123"),
        firstName: "Jane",
        lastName: "Smith",
        phone: "+1234567891",
        address: "456 Oak Ave, Somewhere, USA",
        wishlist: JSON.stringify([]),
      },
    });

    await prisma.user.create({
      data: {
        email: "bob.johnson@example.com",
        password: await hashPassword("password123"),
        firstName: "Bob",
        lastName: "Johnson",
        phone: "+1234567892",
        address: "789 Pine Rd, Elsewhere, USA",
        wishlist: JSON.stringify([]),
      },
    });

    // Create Admin
    await prisma.admin.create({
      data: {
        email: "admin@example.com",
        password: await hashPassword("admin123"),
        name: "Admin User",
        role: "admin",
      },
    });

    console.log("✅ Database seeded successfully!");
    console.log("📧 Test accounts created:");
    console.log("   - User: john.doe@example.com / password123");
    console.log("   - Owner (approved): owner1@example.com / password123");
    console.log("   - Owner (approved): owner2@example.com / password123");
    console.log("   - Owner (pending): owner3@example.com / password123");
    console.log("   - Admin: admin@example.com / admin123");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
  }
}

/**
 * POST /api/seed/run
 * Manually trigger database seeding
 */
router.post("/run", async (req, res, next) => {
  try {
    await seedDatabase();
    res.json({ message: "Database seeding completed" });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/seed/data
 * Returns sample data (for frontend testing without database)
 */
router.get("/data", async (req, res, next) => {
  try {
    const shops = await prisma.shop.findMany({
      include: { owner: { select: { businessName: true } } },
    });
    const products = await prisma.product.findMany({
      include: { shop: { select: { name: true } } },
    });
    const users = await prisma.user.findMany({
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    res.json({ shops, products, users });
  } catch (error) {
    next(error);
  }
});

export default router;
