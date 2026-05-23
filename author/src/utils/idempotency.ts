const store = new Map<string, { result: unknown; expiry: number }>();

const TTL_MS = 24 * 60 * 60 * 1000;

setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
        if (entry.expiry < now) {
            store.delete(key);
        }
    }
}, 60_000);

export function checkIdempotency(key: string): { isDuplicate: boolean; cachedResponse?: unknown } {
    const entry = store.get(key);
    if (entry && entry.expiry > Date.now()) {
        return { isDuplicate: true, cachedResponse: entry.result };
    }
    return { isDuplicate: false };
}

export function storeIdempotencyKey(key: string, result: unknown): void {
    store.set(key, { result, expiry: Date.now() + TTL_MS });
}
