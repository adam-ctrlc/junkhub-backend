import jwt from "jsonwebtoken";
import { config } from "../config/index.js";

/**
 * Sign a JWT token
 * @param {object} payload - Data to encode in the token
 * @returns {string} JWT token
 */
export function signToken(payload) {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpire,
  });
}

/**
 * Verify a JWT token
 * @param {string} token - JWT token to verify
 * @returns {object} Decoded token payload
 * @throws {Error} If token is invalid
 */
export function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}
