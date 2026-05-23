import { z } from "zod";

export const createBlogSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters").max(255),
    description: z.string().min(10, "Description must be at least 10 characters").max(255),
    blogcontent: z.string().min(10, "Content must be at least 10 characters"),
    category: z.string().min(1, "Category is required"),
});

export const updateBlogSchema = z.object({
    title: z.string().min(3).max(255).optional(),
    description: z.string().min(10).max(255).optional(),
    blogcontent: z.string().min(10).optional(),
    category: z.string().min(1).optional(),
});

export const createCommentSchema = z.object({
    blogid: z.string().min(1, "blogid is required"),
    comment: z.string().min(1, "Comment cannot be empty").max(255),
});
