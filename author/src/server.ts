import express from 'express';
import dotnev from "dotenv"
import { sql } from './utils/db.js';
import blogRoutes from './routes/blog.js'
import { v2 as cloudinary } from "cloudinary";
import { connectRabbitMQ } from './utils/rabbitmq.js';
import cors from "cors";
import rateLimit from "express-rate-limit";
import multer from "multer";
import { requestLogger } from "./middlewares/requestLogger.js";
import { AppError } from "./utils/errors.js";
dotnev.config();

cloudinary.config({
    cloud_name: process.env.Cloud_Name as string,
    api_key: process.env.Cloud_Api_Key as string,
    api_secret:process.env.Cloud_Api_Secret as string,
})

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests, please try again later" },
});

const app = express();

connectRabbitMQ();
app.use(express.json({ limit: "10mb" }));
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((s) => s.trim())
  : ["http://localhost:5173"];
app.use(cors({ origin: allowedOrigins }));
app.use(requestLogger);
app.use(limiter);
app.use("/api/v1", blogRoutes)

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof AppError) {
        res.status(err.statusCode).json({ message: err.message });
        return;
    }
    if (err instanceof multer.MulterError || err?.message?.includes("Only image files")) {
        res.status(400).json({ message: err.message });
        return;
    }
    console.error("Unhandled error:", err);
    res.status(500).json({ message: "Internal server error" });
});

const port = process.env.PORT



async function initDB() {
    await sql`
    CREATE TABLE IF NOT EXISTS blogs(
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description VARCHAR(255) NOT NULL,
        blogcontent TEXT NOT NULL,
        image VARCHAR(255) NOT NULL,
        category VARCHAR(255) NOT NULL,
        author VARCHAR(255) NOT NULL,
        create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`;

    await sql`
    CREATE TABLE IF NOT EXISTS comments(
        id SERIAL PRIMARY KEY,
        comment VARCHAR(255) NOT NULL,
        userid VARCHAR(255) NOT NULL,
        username TEXT NOT NULL,
        blogid TEXT NOT NULL,
        create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`;
    await sql`
    CREATE TABLE IF NOT EXISTS savedblogs(
        id SERIAL PRIMARY KEY,
        userid VARCHAR(255) NOT NULL,
        blogid TEXT NOT NULL,
        create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(userid, blogid)
    );`;

    console.log("Database initialized successfully");
}

initDB().then(() => {
    const server = app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });

    const gracefulShutdown = (signal: string) => {
        console.log(`\n${signal} received — shutting down gracefully`);
        server.close(() => {
            console.log("Server closed");
            process.exit(0);
        });
        setTimeout(() => {
            console.error("Forced shutdown after 10s");
            process.exit(1);
        }, 10000);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
}).catch((error) => {
    console.error("Failed to initialize database:", error);
    process.exit(1);
});
