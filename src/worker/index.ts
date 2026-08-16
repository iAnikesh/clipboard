import { Hono } from "hono";
import paste from "./routes/paste";

const app = new Hono<{ Bindings: Env }>();

app.get("/api/", (c) => c.json({ name: "Cloudflare" }));

// See pastebin-system-design.md §5 for the full route table.
app.route("/api/v1/paste", paste);

export default app;