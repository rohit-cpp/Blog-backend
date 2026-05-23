import { v2 as cloudinary } from "cloudinary";
import getBuffer from "../utils/dataUrI.js";
import { sql } from "../utils/db.js";
import { invalidateChacheJob } from "../utils/rabbitmq.js";
import TryCatch from "../utils/TryCatch.js";
import type { AuthenticatedRequest } from "../middlewares/isAuth.js";
import { createBlogSchema, updateBlogSchema, createCommentSchema } from "../schemas/blog.js";
import { ValidationError, NotFoundError } from "../utils/errors.js";

export const createBlog = TryCatch(async (req: AuthenticatedRequest, res) => {
    const parsed = createBlogSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new ValidationError(parsed.error.issues.map((e: { message: string }) => e.message).join("; "));
    }
    const { title, description, blogcontent, category } = parsed.data;
    const file = req.file;

    if (!file) {
        throw new ValidationError("No file to upload");
    }

    const fileBuffer = getBuffer(file);
    if (!fileBuffer || !fileBuffer.content) {
        throw new ValidationError("Failed to process file");
    }

    const cloud = await cloudinary.uploader.upload(fileBuffer.content, { folder: "blogs" });

    await invalidateChacheJob(["blogs:*"]);

    const result = await sql`
        INSERT INTO blogs (title, description, image, blogcontent, category, author)
        VALUES (${title}, ${description}, ${cloud.secure_url}, ${blogcontent}, ${category}, ${req.user?._id})
        RETURNING *
    `;

    res.json({ message: "Blog Created", blog: result[0] });
});

export const updateBlog = TryCatch(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;

    const parsed = updateBlogSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new ValidationError(parsed.error.issues.map((e: { message: string }) => e.message).join("; "));
    }
    const { title, description, blogcontent, category } = parsed.data;
    const file = req.file;

    const blog = await sql`SELECT * FROM blogs WHERE id = ${id}`;
    if (!blog.length || !blog[0]) {
        throw new NotFoundError("Blog");
    }

    if (blog[0].author !== req.user?._id) {
        throw new ValidationError("You are not the author of this blog");
    }

    let imageUrl = blog[0].image;
    if (file) {
        const fileBuffer = getBuffer(file);
        if (!fileBuffer || !fileBuffer.content) {
            throw new ValidationError("Failed to process file");
        }
        const cloud = await cloudinary.uploader.upload(fileBuffer.content, { folder: "blogs" });
        imageUrl = cloud.secure_url;
    }

    const updatedBlog = await sql`
        UPDATE blogs SET
            title = ${title ?? blog[0].title},
            description = ${description ?? blog[0].description},
            image = ${imageUrl},
            blogcontent = ${blogcontent ?? blog[0].blogcontent},
            category = ${category ?? blog[0].category}
        WHERE id = ${id}
        RETURNING *
    `;

    await invalidateChacheJob(["blogs:*"]);

    res.json({ message: "Blog Updated", blog: updatedBlog[0] });
});

export const deleteBlog = TryCatch(async (req: AuthenticatedRequest, res) => {
    const blog = await sql`SELECT * FROM blogs WHERE id = ${req.params.id}`;
    if (!blog.length || !blog[0]) {
        throw new NotFoundError("Blog");
    }

    if (blog[0].author !== req.user?._id) {
        throw new ValidationError("You are not the author of this blog");
    }

    await sql`DELETE FROM savedblogs WHERE blogid = ${req.params.id}`;
    await sql`DELETE FROM comments WHERE blogid = ${req.params.id}`;
    await sql`DELETE FROM blogs WHERE id = ${req.params.id}`;

    await invalidateChacheJob(["blogs:*"]);

    res.json({ message: "Blog Deleted" });
});

export const createComment = TryCatch(async (req: AuthenticatedRequest, res) => {
    const parsed = createCommentSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new ValidationError(parsed.error.issues.map((e: { message: string }) => e.message).join("; "));
    }
    const { blogid, comment } = parsed.data;

    const blog = await sql`SELECT * FROM blogs WHERE id = ${blogid}`;
    if (!blog.length || !blog[0]) {
        throw new NotFoundError("Blog");
    }

    const result = await sql`
        INSERT INTO comments (comment, userid, username, blogid)
        VALUES (${comment}, ${req.user?._id}, ${req.user?.name}, ${blogid})
        RETURNING *
    `;

    res.json({ message: "Comment Created", comment: result[0] });
});

export const getBlogComments = TryCatch(async (req, res) => {
    const { blogid } = req.params;

    const comments = await sql`
        SELECT * FROM comments WHERE blogid = ${blogid} ORDER BY create_at DESC
    `;

    res.json(comments);
});

export const deleteComment = TryCatch(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;

    const comment = await sql`SELECT * FROM comments WHERE id = ${id}`;
    if (!comment.length || !comment[0]) {
        throw new NotFoundError("Comment");
    }

    if (comment[0].userid !== req.user?._id) {
        throw new ValidationError("You are not the owner of this comment");
    }

    await sql`DELETE FROM comments WHERE id = ${id}`;

    res.json({ message: "Comment Deleted" });
});

export const saveBlog = TryCatch(async (req: AuthenticatedRequest, res) => {
    const { blogid } = req.params;

    try {
        const result = await sql`
            INSERT INTO savedblogs (userid, blogid)
            VALUES (${req.user?._id}, ${blogid})
            RETURNING *
        `;
        return res.json({ message: "Blog Saved", saved: result[0] });
    } catch {
        throw new ValidationError("Blog already saved");
    }
});

export const unsaveBlog = TryCatch(async (req: AuthenticatedRequest, res) => {
    const { blogid } = req.params;

    const result = await sql`
        DELETE FROM savedblogs WHERE userid = ${req.user?._id} AND blogid = ${blogid}
        RETURNING *
    `;

    if (!result.length) {
        throw new NotFoundError("Saved blog");
    }

    res.json({ message: "Blog Unsaved" });
});

export const getSavedBlogs = TryCatch(async (req: AuthenticatedRequest, res) => {
    const saved = await sql`
        SELECT * FROM savedblogs WHERE userid = ${req.user?._id} ORDER BY create_at DESC
    `;

    res.json(saved);
});
