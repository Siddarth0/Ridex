import { z } from "zod";

/** [longitude, latitude] — GeoJSON order, matching PostGIS. */
export const coordinatesSchema = z.tuple([
  z.number().min(-180).max(180),
  z.number().min(-90).max(90),
]);
export type Coordinates = z.infer<typeof coordinatesSchema>;

export const locationSchema = z.object({
  address: z.string().min(1).max(500),
  coordinates: coordinatesSchema,
  landmark: z.string().max(200).optional(),
});
export type Location = z.infer<typeof locationSchema>;
