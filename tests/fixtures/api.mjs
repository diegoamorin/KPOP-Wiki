import { createServer } from "node:http";
import { graph } from "./catalog.mjs";
const server = createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");
  if (req.method !== "GET") {
    res.writeHead(405);
    res.end("{}");
    return;
  }
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/health") {
    res.end("{}");
    return;
  }
  const [, , type, id] = url.pathname.split("/");
  if (type === "wiki") {
    const item = graph.find(
      (r) => r.type === "wiki-pages" && r.id === url.pathname.split("/")[4],
    );
    res.end(JSON.stringify({ data: item || [] }));
    return;
  }
  if (type === "search") {
    const query = (url.searchParams.get("filter[q]") || "").toLowerCase();
    res.end(
      JSON.stringify({
        data: graph.filter(
          (r) =>
            r.type === "releases" &&
            String(r.attributes.title).toLowerCase().includes(query),
        ),
        meta: { total: 1, page: 1, limit: 20, pages: 1 },
      }),
    );
    return;
  }
  if (type === "auth") {
    res.writeHead(401);
    res.end(JSON.stringify({ errors: [{ detail: "Inicia sesión" }] }));
    return;
  }
  const items = graph.filter((r) => r.type === type),
    page = Number(url.searchParams.get("page[number]") || 1),
    size = 2;
  const included = graph.filter(
    (r) =>
      !["artists", "releases", "events", "tours"].includes(r.type) &&
      r.type !== type,
  );
  if (id) {
    const item = items.find((r) => r.id === id);
    if (!item) {
      res.writeHead(404);
      res.end("{}");
      return;
    }
    res.end(JSON.stringify({ data: item, included }));
    return;
  }
  res.end(
    JSON.stringify({
      data: items.slice((page - 1) * size, page * size),
      included,
      meta: {
        total: items.length,
        page,
        limit: size,
        pages: Math.ceil(items.length / size),
      },
    }),
  );
});
server.listen(8081, "127.0.0.1");
