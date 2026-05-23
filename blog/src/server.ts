import express from "express";
import dotenv from "dotenv";
import blogRoutes from "./routes/blog.js";
import { createClient } from "redis";
import { startCacheConsumer } from "./utils/consumer.js";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { requestLogger } from "./middlewares/requestLogger.js";
import { AppError } from "./utils/errors.js";
dotenv.config();

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests, please try again later" },
});

const app = express();

app.use(express.json({ limit: "10mb" }));
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((s) => s.trim())
  : ["http://localhost:5173"];
app.use(cors({ origin: allowedOrigins }));
app.use(requestLogger);
app.use(limiter);
app.use("/api/v1", blogRoutes);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof AppError) {
        res.status(err.statusCode).json({ message: err.message });
        return;
    }
    if (err.type === "entity.too.large") {
        res.status(413).json({ message: "Request body too large" });
        return;
    }
    console.error("Unhandled error:", err);
    res.status(500).json({ message: "Internal server error" });
});

const port = process.env.PORT
startCacheConsumer();
const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
    throw new Error("REDIS_URL environment variable is not defined");
}

export const redisClient = createClient({
    url: redisUrl,
});

redisClient.connect().then(() => {
    console.log("Connected to Redis");
}).catch((err) => {
    console.warn("Redis connection failed — cache disabled, falling back to DB:", err.message);
});

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