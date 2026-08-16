import { Redis } from "@upstash/redis/cloudflare";

// Workers isolates can be reused across requests, so memoizing the client
// avoids rebuilding it every call. The client itself is stateless (just a
// URL + token wrapped around fetch()), so there's no connection to leak.
let cached: Redis | undefined;

export function getRedis(env: Env): Redis {
	if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
		throw new Error(
			"Missing UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN. " +
				"Set them in .dev.vars for local dev, or `wrangler secret put` for deploys.",
		);
	}

	if (!cached) {
		cached = new Redis({
			url: env.UPSTASH_REDIS_REST_URL,
			token: env.UPSTASH_REDIS_REST_TOKEN,
		});
	}

	return cached;
}