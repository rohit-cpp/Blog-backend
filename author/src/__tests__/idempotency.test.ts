import { describe, it, expect, beforeEach } from "vitest";
import { checkIdempotency, storeIdempotencyKey } from "../utils/idempotency.js";


describe("idempotency", () => {
    const testKey = "test-key-12345";

    beforeEach(() => {
        // Simulate cleanup by relying on fresh module state per test run
    });

    it("returns isDuplicate false for unknown key", () => {
        const result = checkIdempotency("unknown-key");
        expect(result.isDuplicate).toBe(false);
        expect(result.cachedResponse).toBeUndefined();
    });

    it("returns isDuplicate true after storing a key", () => {
        storeIdempotencyKey(testKey, { message: "Created" });
        const result = checkIdempotency(testKey);
        expect(result.isDuplicate).toBe(true);
        expect(result.cachedResponse).toEqual({ message: "Created" });
    });

    it("handles multiple keys independently", () => {
        storeIdempotencyKey("key-a", { result: "A" });
        storeIdempotencyKey("key-b", { result: "B" });

        expect(checkIdempotency("key-a").cachedResponse).toEqual({ result: "A" });
        expect(checkIdempotency("key-b").cachedResponse).toEqual({ result: "B" });
        expect(checkIdempotency("key-c").isDuplicate).toBe(false);
    });
});
