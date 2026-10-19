
import { z } from "zod";

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username cannot exceed 30 characters")
    .regex(
      /^[a-z0-9_]+$/,
      "Use lowercase letters, numbers, and underscores only"
    ),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address")
    .max(254, "Email is too long"),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password cannot exceed 72 characters"),

  displayName: z
    .string()
    .trim()
    .max(50, "Display name cannot exceed 50 characters")
    .optional()
    .or(z.literal("")),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address")
    .max(254, "Email is too long"),

  password: z
    .string()
    .min(1, "Password is required")
    .max(72, "Invalid credentials"),
});
