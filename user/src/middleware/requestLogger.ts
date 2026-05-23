import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export interface LoggedRequest extends Request {
    reqId?: string;
    startTime?: number;
}

export function requestLogger(req: LoggedRequest, res: Response, next: NextFunction) {
    req.reqId = crypto.randomUUID().slice(0, 8);
    req.startTime = Date.now();

    const { method, originalUrl } = req;

    res.on("finish", () => {
        const duration = Date.now() - (req.startTime || Date.now());
        const { statusCode } = res;
        const logLine = `[${req.reqId}] ${method} ${originalUrl} ${statusCode} ${duration}ms`;
        if (statusCode >= 500) {
            console.error(logLine);
        } else {
            console.log(logLine);
        }
    });

    next();
}
