import { describe, it, expect } from "vitest";
import { AppError, NotFoundError, ValidationError, UnauthorizedError } from "../utils/errors.js";

describe("AppError", () => {
    it("creates an error with the correct status code", () => {
        const err = new AppError("Something went wrong", 418);
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe("Something went wrong");
        expect(err.statusCode).toBe(418);
        expect(err.name).toBe("AppError");
    });
});

describe("NotFoundError", () => {
    it("uses default message and 404 status", () => {
        const err = new NotFoundError();
        expect(err.message).toBe("Resource not found");
        expect(err.statusCode).toBe(404);
    });

    it("uses custom resource name", () => {
        const err = new NotFoundError("Blog");
        expect(err.message).toBe("Blog not found");
        expect(err.statusCode).toBe(404);
    });
});

describe("ValidationError", () => {
    it("uses default message and 400 status", () => {
        const err = new ValidationError();
        expect(err.message).toBe("Validation failed");
        expect(err.statusCode).toBe(400);
    });

    it("uses custom message", () => {
        const err = new ValidationError("Title is required");
        expect(err.message).toBe("Title is required");
        expect(err.statusCode).toBe(400);
    });
});

describe("UnauthorizedError", () => {
    it("uses default message and 401 status", () => {
        const err = new UnauthorizedError();
        expect(err.message).toBe("Unauthorized");
        expect(err.statusCode).toBe(401);
    });
});
