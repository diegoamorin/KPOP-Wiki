import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { allPages, ApiError, request } from "@/lib/api/client";
const base = "http://api.test";
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
describe("cliente JSON:API", () => {
  it("recupera también el lanzamiento 21 y deduplica included", async () => {
    const pages: number[] = [];
    server.use(
      http.get(base + "/releases", ({ request }) => {
        const page = Number(
          new URL(request.url).searchParams.get("page[number]"),
        );
        pages.push(page);
        return HttpResponse.json({
          data: Array.from({ length: page === 1 ? 20 : 1 }, (_, i) => ({
            type: "releases",
            id: String((page - 1) * 20 + i + 1),
            attributes: { title: "Álbum" },
          })),
          included: [{ type: "artists", id: "bts", attributes: {} }],
          meta: { pages: 2, page, total: 21, limit: 20 },
        });
      }),
    );
    const result = await allPages(base, "releases");
    expect(result.data).toHaveLength(21);
    expect(result.data.at(-1)?.id).toBe("21");
    expect(result.included).toHaveLength(1);
    expect(pages).toEqual([1, 2]);
  });
  it("conserva los errores de validación y su ubicación", async () => {
    server.use(
      http.post(base + "/wiki/changesets", () =>
        HttpResponse.json(
          {
            errors: [
              {
                detail: "La revisión base cambió",
                source: { pointer: "/data/attributes/items/0/baseRevisionId" },
              },
            ],
          },
          { status: 409 },
        ),
      ),
    );
    try {
      await request(base, "wiki/changesets", { method: "POST" });
      expect.fail();
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(409);
      expect((error as ApiError).message).toContain("revisión base");
    }
  });
  it("maneja respuestas sin cuerpo y backend no JSON", async () => {
    server.use(
      http.delete(
        base + "/me/recording-likes/1",
        () => new HttpResponse(null, { status: 204 }),
      ),
      http.get(
        base + "/bad",
        () => new HttpResponse("gateway error", { status: 502 }),
      ),
    );
    expect(
      await request(base, "me/recording-likes/1", { method: "DELETE" }),
    ).toEqual({});
    await expect(request(base, "bad")).rejects.toMatchObject({ status: 502 });
  });
});
