import express from "express";
import dotenv from "dotenv";
import userRoutes from "./routes/user.js"
import { connectDB } from "./utils/db.js";
import { v2 as cloudinary } from "cloudinary";
import cors from "cors";
import rateLimit from "express-rate-limit";
import multer from "multer";
import { requestLogger } from "./middleware/requestLogger.js";
import { AppError } from "./utils/errors.js";
dotenv.config();

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
app.use(express.json({ limit: "10mb" }));
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((s) => s.trim())
  : ["http://localhost:5173"];
app.use(cors({ origin: allowedOrigins }));
app.use(requestLogger);
app.use(limiter);
connectDB().catch((error) => {
    console.error("Failed to connect to MongoDB:", error);
    process.exit(1);
});
app.use("/api/v1", userRoutes)

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
const port = process.env.PORT;
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
