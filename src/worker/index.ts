import { Hono } from "hono";
import paste, { getPasteHandler } from "./routes/paste";

const app = new Hono<{ Bindings: Env }>();

app.get("/api/", (c) => c.json({ name: "Cloudflare" }));

// See pastebin-system-design.md §5 for the full route table.
app.route("/api/v1/paste", paste);

// API route for getting a paste by shortcode directly at the root
app.get("/:code", async (c, next) => {
	// If the request prefers HTML, fall through to the SPA catch-all
	if (c.req.header("accept")?.includes("text/html")) {
		return next();
	}
	return getPasteHandler(c);
});

// Fallback for SPA routing: send unmatched GET requests to index.html
app.get("*", (c) => {
	const url = new URL(c.req.url);
	url.pathname = "/";
	return c.env.ASSETS.fetch(new Request(url.toString(), c.req.raw));
});

export default app;