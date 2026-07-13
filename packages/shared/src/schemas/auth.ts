import { z } from "zod";
import { RIDE_TYPES, USER_ROLES } from "../constants.js";

export const emailSchema = z.email().max(255).transform((v) => v.toLowerCase().trim());
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{7,15}$/, "Enter a valid phone number");
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128);

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });
export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});
export const resendVerificationSchema = z.object({ email: emailSchema });

export const vehicleSchema = z.object({
  rideType: z.enum(RIDE_TYPES),
  make: z.string().trim().min(1).max(100),
  model: z.string().trim().min(1).max(100),
  year: z.coerce.number().int().min(1980).max(new Date().getFullYear() + 1).optional(),
  plateNumber: z.string().trim().min(1).max(20),
  color: z.string().trim().max(50).optional(),
});

export const driverRegisterSchema = registerSchema.extend({
  licenseNumber: z.string().trim().min(1, "License number is required").max(50),
  vehicle: vehicleSchema,
});
export type DriverRegisterInput = z.infer<typeof driverRegisterSchema>;

/** The user shape the API returns — never includes credentials. */
export interface PublicUser {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: (typeof USER_ROLES)[number];
  emailVerified: boolean;
  avatarUrl: string | null;
  createdAt: string;
}
