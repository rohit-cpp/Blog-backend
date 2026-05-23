import { z } from "zod";

export const loginSchema = z.object({
    code: z.string().min(1, "Authorization code is required"),
});

export const updateUserSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    instagram: z.string().optional(),
    facebook: z.string().optional(),
    linkdin: z.string().optional(),
    bio: z.string().max(500).optional(),
});
