import { z } from "zod";
import { SURGE_MAX, SURGE_MIN } from "../constants.js";

/**
 * Admin edit of one ride type's pricing. All fields optional so the console can
 * PATCH a single dial; at least one must be present (enforced server-side).
 */
export const fareConfigUpdateSchema = z
  .object({
    baseFare: z.number().min(0).max(100_000).optional(),
    perKm: z.number().min(0).max(100_000).optional(),
    perMin: z.number().min(0).max(100_000).optional(),
    minFare: z.number().min(0).max(100_000).optional(),
    surgeMultiplier: z.number().min(SURGE_MIN).max(SURGE_MAX).optional(),
    cancelFreeWindowS: z.number().int().min(0).max(3600).optional(),
    cancelFee: z.number().min(0).max(100_000).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "No fields to update" });
export type FareConfigUpdate = z.infer<typeof fareConfigUpdateSchema>;
