import { z } from "zod";
import { PAYMENT_METHODS, RIDE_TYPES } from "../constants.js";
import { coordinatesSchema, locationSchema } from "./geo.js";

export const estimateRequestSchema = z.object({
  pickup: coordinatesSchema,
  destination: coordinatesSchema,
});
export type EstimateRequest = z.infer<typeof estimateRequestSchema>;

export const rideRequestSchema = z.object({
  pickup: locationSchema,
  destination: locationSchema,
  rideType: z.enum(RIDE_TYPES),
  paymentMethod: z.enum(PAYMENT_METHODS).default("cash"),
});
export type RideRequest = z.infer<typeof rideRequestSchema>;

export const cancelRideSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export const ratingSchema = z.object({
  score: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
});
export type RatingInput = z.infer<typeof ratingSchema>;

export const driverOnlineSchema = z.object({
  online: z.boolean(),
});

export const locationUpdateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  heading: z.number().int().min(0).max(359).optional(),
  speedKmh: z.number().min(0).max(300).optional(),
});
export type LocationUpdate = z.infer<typeof locationUpdateSchema>;
