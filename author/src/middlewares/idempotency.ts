import type { NextFunction, Response } from "express";
import { checkIdempotency, storeIdempotencyKey } from "../utils/idempotency.js";
import type { LoggedRequest } from "./requestLogger.js";
import { ValidationError } from "../utils/errors.js";

export function idempotency(req: LoggedRequest, res: Response, next: NextFunction) {
    const key = req.headers["idempotency-key"] as string | undefined;

    if (!key) {
        next();
        return;
    }

    if (typeof key !== "string" || key.length < 8 || key.length > 64) {
        throw new ValidationError("Idempotency-Key must be 8-64 characters");
    }

    const { isDuplicate, cachedResponse } = checkIdempotency(key);

    if (isDuplicate && cachedResponse) {
        res.status(200).json(cachedResponse);
        return;
    }

    const originalJson = res.json.bind(res);
    res.json = function (body: unknown) {
        if (res.statusCode < 500) {
            storeIdempotencyKey(key, body);
        }
        return originalJson(body);
    };

    next();
}
