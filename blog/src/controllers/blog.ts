import { sql } from "../utils/db.js";
import TryCatch from "../utils/TryCatch.js";
import axios from "axios";
import { redisClient } from "../server.js";
import { NotFoundError } from "../utils/errors.js";

export const getAllBlogs = TryCatch(async (req, res) => {
    const searchQuery = req.query.searchQuery as string | undefined;
    const category = req.query.category as string | undefined;
    const cursor = req.query.cursor as string | undefined;
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    const fetchLimit = limit + 1;

    const cacheKey = `blogs:${searchQuery || 'all'}:${category || 'all'}:${limit}:${cursor || 'first'}`;

    try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
            return res.json(JSON.parse(cached));
        }
    } catch {
        console.warn("Redis unavailable — skipping cache read");
    }

    const baseCondition = searchQuery && category
        ? sql`WHERE (title ILIKE ${`%${searchQuery}%`} OR description ILIKE ${`%${searchQuery}%`}) AND category = ${category}`
        : searchQuery
            ? sql`WHERE (title ILIKE ${`%${searchQuery}%`} OR description ILIKE ${`%${searchQuery}%`})`
            : category
                ? sql`WHERE category = ${category}`
                : sql``;

    const cursorCondition = cursor
        ? sql`${sql`AND id < ${Number(cursor)}`}`
        : sql``;

    const combinedCondition = cursor
        ? sql`${baseCondition} ${cursorCondition}`
        : baseCondition;

    const blogs = await sql`
        SELECT id, title, description, image, category, author, create_at
        FROM blogs ${combinedCondition}
        ORDER BY id DESC
        LIMIT ${fetchLimit}
    `;

    const hasMore = blogs.length > limit;
    if (hasMore) {
        blogs.pop();
    }

    const nextCursor = hasMore && blogs.length > 0
        ? String(blogs[blogs.length - 1]!.id)
        : null;

    const result = {
        blogs,
        pagination: {
            limit,
            nextCursor,
            hasMore,
        },
    };

    try {
        await redisClient.setEx(cacheKey, 1800, JSON.stringify(result));
    } catch {
        console.warn("Redis unavailable — skipping cache write");
    }

    res.json(result);
})


export const getSingleBlog = TryCatch(async (req, res) => {
    const { id } = req.params;

    const blog = await sql`SELECT * FROM blogs WHERE id = ${id}`;

    if (!blog.length || !blog[0]) {
        throw new NotFoundError("Blog");
    }

    const {data} = await axios.get(`${process.env.USER_SERVICE}/api/v1/user/${blog[0].author}`)

    res.json({blog:blog[0], author: data});
})
