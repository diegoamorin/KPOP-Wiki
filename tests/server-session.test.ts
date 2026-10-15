// @vitest-environment node
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
const jar = vi.hoisted(() => {
  const values = new Map<string, string>();
  return {
    values,
    get: (name: string) =>
      values.has(name) ? { name, value: values.get(name)! } : undefined,
    getAll: () => [...values].map(([name, value]) => ({ name, value })),
    set: vi.fn((name: string, value: string) => {
      values.set(name, value);
    }),
  };
});
vi.mock("next/headers", () => ({ cookies: async () => jar }));
import { getSession, setTokens } from "@/lib/api/session";
import { apiBase, getCatalog } from "@/lib/api/server";
import { resourceName } from "@/lib/catalog";
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterAll(() => server.close());
afterEach(() => {
  server.resetHandlers();
  vi.unstubAllEnvs();
});
beforeEach(() => {
  jar.values.clear();
  vi.clearAllMocks();
  vi.stubEnv(
    "SESSION_PASSWORD",
    "test-only-session-secret-with-more-than-32-characters",
  );
});
describe("cookies cifradas y capa de datos de servidor", () => {
  it("sella la sesión, la recupera y usa atributos de cookie seguros", async () => {
    const session = await getSession();
    setTokens(session, {
      accessToken: "test-access-only",
      refreshToken: "test-refresh-only",
      expiresIn: 900,
      tokenType: "Bearer",
    });
    await session.save();
    const sealed = jar.values.get("btswiki.session");
    expect(sealed).toBeTruthy();
    expect(sealed).not.toContain("test-access-only");
    expect(sealed).not.toContain("test-refresh-only");
    expect(jar.set).toHaveBeenCalledWith(
      "btswiki.session",
      expect.any(String),
      expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/" }),
    );
    const restored = await getSession();
    expect(restored.accessToken).toBe("test-access-only");
    expect(restored.refreshToken).toBe("test-refresh-only");
    restored.destroy();
    expect(jar.values.get("btswiki.session")).toBe("");
  });
  it("producción exige un secreto configurado y cookies Secure", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SESSION_PASSWORD", "");
    await expect(getSession()).rejects.toThrow("SESSION_PASSWORD");
    vi.stubEnv(
      "SESSION_PASSWORD",
      "another-test-only-session-secret-long-enough",
    );
    const session = await getSession();
    setTokens(session, {
      accessToken: "test",
      refreshToken: "test",
      expiresIn: 900,
      tokenType: "Bearer",
    });
    await session.save();
    expect(jar.set).toHaveBeenCalledWith(
      "btswiki.session",
      expect.any(String),
      expect.objectContaining({ secure: true }),
    );
  });
  it("una cookie alterada no restaura la identidad anterior", async () => {
    jar.values.set("btswiki.session", "invalid-seal");
    const session = await getSession();
    expect(session.accessToken).toBeUndefined();
    expect(session.refreshToken).toBeUndefined();
  });
  it("ensambla colecciones públicas y relaciones incluidas sin duplicar recursos", async () => {
    vi.stubEnv("API_BASE_URL", "http://catalog.test/api/");
    expect(apiBase()).toBe("http://catalog.test/api");
    server.use(
      http.get("http://catalog.test/api/:resource", ({ params }) => {
        const name = String(params.resource);
        const artist = {
          type: "artists",
          id: "opaque-artist",
          attributes: {},
          relationships: {
            catalogIdentity: {
              data: { type: "catalog-identities", id: "opaque-identity" },
            },
          },
        };
        return HttpResponse.json({
          data:
            name === "artists"
              ? [artist]
              : name === "catalog-identities"
                ? [
                    {
                      type: name,
                      id: "opaque-identity",
                      attributes: { displayName: "RM" },
                    },
                  ]
                : [],
          included: name === "catalog-identities" ? [artist] : [],
          meta: { total: 1, page: 1, pages: 1, limit: 100 },
        });
      }),
    );
    const graph = await getCatalog();
    expect(graph.filter((r) => r.type === "artists")).toHaveLength(1);
    expect(
      resourceName(
        graph.find((r) => r.type === "artists")!,
        graph,
      ),
    ).toBe("RM");
  });
});
