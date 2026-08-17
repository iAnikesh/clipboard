import { Hono } from "hono";
import type { Context } from "hono";
import { getRedis } from "../lib/redis";
import { claimShortCode, KeyspacePressureError } from "../lib/shortcode";
import { allowRequest } from "../lib/ratelimit";
import type {
	PasteRecord,
	CreatePasteResponse,
	GetPasteResponse,
	ErrorResponse,
} from "../types";

const DEFAULT_TTL_SECONDS = 3600; // 1 hour, per design doc §1
const DEFAULT_MAX_BYTES = 256 * 1024; // 256 KB, per design doc §2/§7
const CODE_PATTERN = /^[A-Za-z0-9]{4}$/;

const paste = new Hono<{ Bindings: Env }>();

function clientKey(c: Context<{ Bindings: Env }>): string {
	// Cloudflare sets this on every edge request; fall back for local dev
	// where there's no real edge in front of the Worker.
	return c.req.header("cf-connecting-ip") ?? "local";
}

async function verifyTurnstile(token: string, secret: string, ip: string): Promise<boolean> {
	const formData = new FormData();
	formData.append("secret", secret);
	formData.append("response", token);
	formData.append("remoteip", ip);

	const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
		method: "POST",
		body: formData,
	});

	const outcome = (await res.json()) as { success: boolean };
	return !!outcome.success;
}

function ttlSeconds(env: Env): number {
	const raw = env.PASTE_TTL_SECONDS ? Number(env.PASTE_TTL_SECONDS) : NaN;
	return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TTL_SECONDS;
}

function maxBytes(env: Env): number {
	const raw = env.PASTE_MAX_BYTES ? Number(env.PASTE_MAX_BYTES) : NaN;
	return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MAX_BYTES;
}

function err(c: Context, message: string, status: 400 | 404 | 413 | 429 | 503) {
	const body: ErrorResponse = { error: message };
	return c.json(body, status);
}

// POST /api/v1/paste — create a paste. Body: { "content": "..." }
paste.post("/", async (c) => {
	if (!allowRequest(`create:${clientKey(c)}`)) {
		return err(c, "Too many requests, slow down.", 429);
	}

	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return err(c, "Body must be valid JSON.", 400);
	}

	const content = (body as { content?: unknown } | null)?.content;
	const turnstileToken = (body as { turnstileToken?: unknown } | null)?.turnstileToken;

	if (typeof content !== "string" || content.length === 0) {
		return err(c, "`content` is required and must be a non-empty string.", 400);
	}

	if (typeof turnstileToken !== "string" || turnstileToken.length === 0) {
		return err(c, "Captcha token is required.", 400);
	}

	const turnstileSecret = c.env.TURNSTILE_SECRET_KEY || "1x0000000000000000000000000000000AA"; // Dummy test key by default
	const isValid = await verifyTurnstile(turnstileToken, turnstileSecret, clientKey(c));
	
	if (!isValid) {
		return err(c, "Invalid Captcha.", 400);
	}

	const limit = maxBytes(c.env);
	const size = new TextEncoder().encode(content).length;
	if (size > limit) {
		return err(c, `Paste too large: ${size} bytes (max ${limit} bytes).`, 413);
	}

	const ttl = ttlSeconds(c.env);
	const now = new Date();
	const record: PasteRecord = {
		content,
		createdAt: now.toISOString(),
		expiresAt: new Date(now.getTime() + ttl * 1000).toISOString(),
	};

	const redis = getRedis(c.env);

	let code: string;
	try {
		// SET paste:<code> <record> NX EX <ttl> — single atomic round trip,
		// see lib/shortcode.ts for why this avoids a check-then-set race.
		code = await claimShortCode(redis, record, ttl);
	} catch (e) {
		if (e instanceof KeyspacePressureError) {
			return err(c, e.message, 503);
		}
		throw e;
	}

	const origin = new URL(c.req.url).origin;
	const response: CreatePasteResponse = {
		code,
		url: `${origin}/${code}`,
		expiresAt: record.expiresAt,
	};

	return c.json(response, 201);
});

export const getPasteHandler = async (c: Context<{ Bindings: Env }>) => {
	const code = c.req.param("code");

	if (!CODE_PATTERN.test(code)) {
		return err(c, "This paste doesn't exist or has expired.", 404);
	}

	if (!allowRequest(`read:${clientKey(c)}`)) {
		return err(c, "Too many requests, slow down.", 429);
	}

	const redis = getRedis(c.env);
	const raw = await redis.get<PasteRecord | string>(`paste:${code}`);

	if (raw === null || raw === undefined) {
		return err(c, "This paste doesn't exist or has expired.", 404);
	}

	const record: PasteRecord = typeof raw === "string" ? JSON.parse(raw) : raw;

	const response: GetPasteResponse = {
		code,
		content: record.content,
		createdAt: record.createdAt,
		expiresAt: record.expiresAt,
	};

	return c.json(response, 200);
};

// GET /api/v1/paste/:code — fetch raw content + metadata as JSON.
// Kept for backward compatibility if needed.
paste.get("/:code", getPasteHandler);

export default paste;