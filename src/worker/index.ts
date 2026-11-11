import { Hono } from "hono";
import paste, { getPasteHandler } from "./routes/paste";

const app = new Hono<{ Bindings: Env }>();

app.get("/api/", (c) => c.json({ name: "Cloudflare" }));

// See pastebin-system-design.md §5 for the full route table.
app.route("/api/v1/paste", paste);

// SEO: Dynamic robots.txt
app.get("/robots.txt", (c) => {
	const origin = new URL(c.req.url).origin;
	const robotsTxt = `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${origin}/sitemap.xml\n`;
	return c.text(robotsTxt, 200, {
		"Content-Type": "text/plain; charset=utf-8",
		"Cache-Control": "public, max-age=86400",
	});
});

// SEO: Dynamic sitemap.xml
app.get("/sitemap.xml", (c) => {
	const origin = new URL(c.req.url).origin;
	const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${origin}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
	return c.text(sitemapXml, 200, {
		"Content-Type": "application/xml; charset=utf-8",
		"Cache-Control": "public, max-age=86400",
	});
});

// API route for getting a paste by shortcode directly at the root
app.get("/:code", async (c, next) => {
	// If the request prefers HTML, fall through to the SPA catch-all
	if (c.req.header("accept")?.includes("text/html")) {
		return next();
	}
	return getPasteHandler(c);
});

// Fallback for SPA routing: serve static asset if available, otherwise send to index.html
app.get("*", async (c) => {
	const assetRes = await c.env.ASSETS.fetch(c.req.raw);
	if (assetRes.status !== 404) {
		return assetRes;
	}
	const url = new URL(c.req.url);
	url.pathname = "/";
	return c.env.ASSETS.fetch(new Request(url.toString(), c.req.raw));
});

export default app;