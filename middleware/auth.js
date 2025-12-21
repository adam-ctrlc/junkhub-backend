import { verifyToken } from "../utils/jwt.js";
import prisma from "../lib/prisma.js";

/**
 * Extract token from request (cookie or Authorization header)
 */
function extractToken(req) {
  // Check cookie first
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }

  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  return null;
}

/**
 * General authentication middleware
 */
export async function authenticate(req, res, next) {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Middleware to check if user has a specific role
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    next();
  };
}

/**
 * Middleware specifically for user routes
 */
export async function authenticateUser(req, res, next) {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const decoded = verifyToken(token);

    if (decoded.role !== "user") {
      return res.status(403).json({ error: "User access required" });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        address: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = { ...decoded, ...user };
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Middleware specifically for owner routes
 */
export async function authenticateOwner(req, res, next) {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const decoded = verifyToken(token);

    if (decoded.role !== "owner") {
      return res.status(403).json({ error: "Owner access required" });
    }

    const owner = await prisma.owner.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        businessName: true,
        phone: true,
        approved: true,
      },
    });

    if (!owner) {
      return res.status(401).json({ error: "Owner not found" });
    }

    if (!owner.approved) {
      return res.status(403).json({
        error: "Your account is pending approval.",
        code: "PENDING_APPROVAL",
      });
    }

    req.user = { ...decoded, ...owner };
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Middleware specifically for admin routes
 */
export async function authenticateAdmin(req, res, next) {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const decoded = verifyToken(token);

    if (decoded.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const admin = await prisma.admin.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!admin) {
      return res.status(401).json({ error: "Admin not found" });
    }

    req.user = { ...decoded, ...admin };
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
