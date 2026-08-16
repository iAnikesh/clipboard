// This file has no top-level import/export, so it's ambient (global) — it
// merges with `interface Env extends Cloudflare.Env {}` from
// worker-configuration.d.ts. `wrangler types` regenerates that file from
// wrangler.json bindings only, and won't know about secrets, so we declare
// them here by hand.
interface Env {
	/**
	 * Upstash Redis REST URL, e.g. https://xxx-xxx.upstash.io
	 * Local dev: put in .dev.vars
	 * Deployed:  wrangler secret put UPSTASH_REDIS_REST_URL
	 */
	UPSTASH_REDIS_REST_URL: "string";

	/**
	 * Upstash Redis REST token.
	 * Local dev: put in .dev.vars
	 * Deployed:  wrangler secret put UPSTASH_REDIS_REST_TOKEN
	 */
	UPSTASH_REDIS_REST_TOKEN: string;

	/** Optional override for the paste size cap in bytes. Default: 262144 (256 KB). */
	PASTE_MAX_BYTES?: string;

	/** Optional override for the paste TTL in seconds. Default: 3600 (1 hour). */
	PASTE_TTL_SECONDS?: string;
}