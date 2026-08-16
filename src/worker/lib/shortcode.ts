import type { Redis } from "@upstash/redis/cloudflare";

const ALPHABET =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const CODE_LENGTH = 4;
const MAX_ATTEMPTS = 5;

export class KeyspacePressureError extends Error {
	constructor() {
		super("keyspace pressure — widen code length or shorten TTL");
		this.name = "KeyspacePressureError";
	}
}

function randomCode(length: number): string {
	const bytes = new Uint8Array(length);
	crypto.getRandomValues(bytes);
	let out = "";
	for (let i = 0; i < length; i++) {
		out += ALPHABET[bytes[i] % ALPHABET.length];
	}
	return out;
}

/**
 * Atomically claims a random 4-char code for `value`, retrying on collision.
 *
 * `SET key value NX EX ttlSeconds` is a single round trip that both checks
 * "is this code taken?" and claims it if not — no race window between check
 * and claim, and no wasted Redis command on a separate existence check.
 *
 * At the collision rate estimated in the design doc (~1.2% at peak
 * concurrency), 5 attempts is generous. Raising it costs one more billed
 * Upstash command per retry, so don't bump it without a reason.
 */
export async function claimShortCode<T>(
	redis: Redis,
	value: T,
	ttlSeconds: number,
	keyPrefix = "paste:",
): Promise<string> {
	for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
		const code = randomCode(CODE_LENGTH);
		const ok = await redis.set(`${keyPrefix}${code}`, value, {
			nx: true,
			ex: ttlSeconds,
		});
		if (ok) return code;
	}
	throw new KeyspacePressureError();
}