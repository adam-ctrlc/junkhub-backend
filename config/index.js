import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  jwtSecret:
    process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production",
  jwtExpire: process.env.JWT_EXPIRE || "7d",
nodeEnv: process.env.NODE_ENV || "development",
  corsOrigin:
    process.env.CORS_ORIGIN ||
    (process.env.NODE_ENV === "production"
      ? "https://junkhub.vercel.app"
      : "http://localhost:5173"),
  databaseUrl: process.env.DATABASE_URL,
};
