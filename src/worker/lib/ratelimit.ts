/**
 * Cheap, isolate-local token-bucket rate limiter.
 *
 * This is NOT a distributed/global guarantee — each Worker isolate has its
 * own buckets, and isolates get recycled — but it stops obvious single-
 * isolate bursts for free, before anything touches the Upstash command
 * budget. Per the design doc §7, this is the "cheaper first-pass check"
 * option; swap in `@upstash/ratelimit` (backed by Redis) if you need a
 * real cross-isolate limit and can spend the extra commands on it.
 */
const buckets = new Map<string, { tokens: number; updatedAt: number }>();

const CAPACITY = 20; // burst allowance
const REFILL_PER_SEC = 1; // steady-state rate

export function allowRequest(key: string): boolean {
	const now = Date.now();
	const bucket = buckets.get(key) ?? { tokens: CAPACITY, updatedAt: now };

	const elapsedSec = (now - bucket.updatedAt) / 1000;
	bucket.tokens = Math.min(
		CAPACITY,
		bucket.tokens + elapsedSec * REFILL_PER_SEC,
	);
	bucket.updatedAt = now;

	if (bucket.tokens < 1) {
		buckets.set(key, bucket);
		return false;
	}

	bucket.tokens -= 1;
	buckets.set(key, bucket);
	return true;
}