import express from "express";
import { isAuth } from "../middlewares/isAuth.js";
import uploadFile from "../middlewares/multer.js";
import { idempotency } from "../middlewares/idempotency.js";
import {
    createBlog,
    deleteBlog,
    updateBlog,
    createComment,
    getBlogComments,
    deleteComment,
    saveBlog,
    unsaveBlog,
    getSavedBlogs,
} from "../controllers/blog.js";

const router = express.Router();
router.post("/blog/new", isAuth, idempotency, uploadFile, createBlog);
router.post("/blog/:id", isAuth, uploadFile, updateBlog);
router.delete("/blog/:id", isAuth, deleteBlog);

router.post("/comment/new", isAuth, createComment);
router.get("/comment/:blogid", getBlogComments);
router.delete("/comment/:id", isAuth, deleteComment);

router.post("/save/:blogid", isAuth, saveBlog);
router.delete("/save/:blogid", isAuth, unsaveBlog);
router.get("/save", isAuth, getSavedBlogs);

export default router;