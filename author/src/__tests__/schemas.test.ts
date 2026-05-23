import { describe, it, expect } from "vitest";
import { createBlogSchema, updateBlogSchema, createCommentSchema } from "../schemas/blog.js";


describe("createBlogSchema", () => {
    it("accepts valid blog data", () => {
        const result = createBlogSchema.safeParse({
            title: "My Blog Post",
            description: "A description that is long enough",
            blogcontent: "This is the blog content with enough characters",
            category: "Tech",
        });
        expect(result.success).toBe(true);
    });

    it("rejects short title", () => {
        const result = createBlogSchema.safeParse({
            title: "AB",
            description: "A description that is long enough",
            blogcontent: "This is the blog content with enough characters",
            category: "Tech",
        });
        expect(result.success).toBe(false);
    });

    it("rejects empty category", () => {
        const result = createBlogSchema.safeParse({
            title: "My Blog Post",
            description: "A description that is long enough",
            blogcontent: "This is the blog content with enough characters",
            category: "",
        });
        expect(result.success).toBe(false);
    });

    it("rejects short description", () => {
        const result = createBlogSchema.safeParse({
            title: "My Blog Post",
            description: "Short",
            blogcontent: "This is the blog content with enough characters",
            category: "Tech",
        });
        expect(result.success).toBe(false);
    });

    it("rejects missing fields", () => {
        const result = createBlogSchema.safeParse({});
        expect(result.success).toBe(false);
    });
});

describe("updateBlogSchema", () => {
    it("accepts partial data", () => {
        const result = updateBlogSchema.safeParse({ title: "New Title" });
        expect(result.success).toBe(true);
    });

    it("accepts empty object (no fields to update)", () => {
        const result = updateBlogSchema.safeParse({});
        expect(result.success).toBe(true);
    });

    it("rejects too short title", () => {
        const result = updateBlogSchema.safeParse({ title: "AB" });
        expect(result.success).toBe(false);
    });
});

describe("createCommentSchema", () => {
    it("accepts valid comment", () => {
        const result = createCommentSchema.safeParse({
            blogid: "123",
            comment: "Nice post!",
        });
        expect(result.success).toBe(true);
    });

    it("rejects empty comment", () => {
        const result = createCommentSchema.safeParse({
            blogid: "123",
            comment: "",
        });
        expect(result.success).toBe(false);
    });

    it("rejects missing blogid", () => {
        const result = createCommentSchema.safeParse({
            comment: "Nice post!",
        });
        expect(result.success).toBe(false);
    });
});
