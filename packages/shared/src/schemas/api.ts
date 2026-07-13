import { z } from "zod";

/** Uniform envelope every API endpoint responds with. */
export const apiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
