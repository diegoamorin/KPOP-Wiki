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
import { NextRequest } from "next/server";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
const state = vi.hoisted(() => ({
  session: {
    accessToken: undefined as string | undefined,
    refreshToken: undefined as string | undefined,
    expiresAt: undefined as number | undefined,
    save: vi.fn(),
    destroy: vi.fn(),
  },
  renew: vi.fn(),
}));
vi.mock("@/lib/api/session", () => ({
  getSession: async () => state.session,
  renew: state.renew,
  setTokens: (s: Record<string, unknown>, t: Record<string, unknown>) =>
    Object.assign(s, t, { expiresAt: Date.now() + 900000 }),
}));
vi.mock("@/lib/api/server", () => ({ apiBase: () => "http://backend.test" }));
import { GET, POST, PATCH } from "@/app/api/gateway/[...path]/route";
import { ApiError } from "@/lib/api/client";
const server = setupServer();
beforeAll(() => server.listen());
afterAll(() => server.close());
afterEach(() => server.resetHandlers());
beforeEach(() => {
  vi.clearAllMocks();
  state.session.accessToken = undefined;
  state.session.refreshToken = undefined;
  state.session.expiresAt = undefined;
});
function req(
  path: string,
  method = "GET",
  body?: unknown,
  origin = "http://frontend.test",
) {
  return new NextRequest("http://frontend.test/api/gateway/" + path, {
    method,
    headers: { Origin: origin, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
const context = (path: string) => ({
  params: Promise.resolve({ path: path.split("/") }),
});
describe("BFF y límites de sesión", () => {
  it("rechaza acceso protegido anónimo", async () => {
    const response = await GET(req("auth/me"), context("auth/me"));
    expect(response.status).toBe(401);
  });
  it("rechaza mutaciones de otro origen antes de contactar a la API", async () => {
    const response = await POST(
      req(
        "auth/login",
        "POST",
        { identifier: "army", password: "secret" },
        "https://other.test",
      ),
      context("auth/login"),
    );
    expect(response.status).toBe(403);
  });
  it("no permite métodos arbitrarios sobre catálogo", async () => {
    const response = await POST(req("artists", "POST", {}), context("artists"));
    expect(response.status).toBe(404);
  });
  it("guarda la sesión sin devolver tokens al navegador", async () => {
    server.use(
      http.post("http://backend.test/auth/login", () =>
        HttpResponse.json({
          accessToken: "secret-access",
          refreshToken: "secret-refresh",
          expiresIn: 900,
          tokenType: "Bearer",
        }),
      ),
    );
    const response = await POST(
      req("auth/login", "POST", {
        identifier: "army",
        password: "valid-secret",
      }),
      context("auth/login"),
    );
    expect(await response.json()).toEqual({ authenticated: true });
    expect(state.session.save).toHaveBeenCalledOnce();
    expect(state.session.accessToken).toBe("secret-access");
  });
  it("valida campos antes de enviar un formulario", async () => {
    const response = await PATCH(
      req("users/me", "PATCH", {
        data: { type: "users", id: "uuid", attributes: { displayName: 42 } },
      }),
      context("users/me"),
    );
    expect(response.status).toBe(422);
  });
  it("reintenta una sola vez tras renovar y mantiene la autorización en servidor", async () => {
    state.session.accessToken = "old";
    state.session.refreshToken = "refresh";
    state.session.expiresAt = Date.now() + 900000;
    state.renew.mockResolvedValue({
      accessToken: "new",
      refreshToken: "next",
      expiresIn: 900,
    });
    let calls = 0;
    server.use(
      http.get("http://backend.test/auth/me", ({ request }) => {
        calls++;
        return request.headers.get("authorization") === "Bearer new"
          ? HttpResponse.json({ username: "army" })
          : HttpResponse.json(
              { errors: [{ detail: "Expired" }] },
              { status: 401 },
            );
      }),
    );
    const response = await GET(req("auth/me"), context("auth/me"));
    expect(response.status).toBe(200);
    expect(calls).toBe(2);
    expect(state.renew).toHaveBeenCalledOnce();
  });
  it("respeta permisos denegados por el backend sin intentar elevar privilegios", async () => {
    state.session.accessToken = "valid";
    state.session.expiresAt = Date.now() + 900000;
    server.use(
      http.get("http://backend.test/wiki/admin/outbox", () =>
        HttpResponse.json(
          { errors: [{ detail: "Forbidden" }] },
          { status: 403 },
        ),
      ),
    );
    expect(
      (await GET(req("wiki/admin/outbox"), context("wiki/admin/outbox")))
        .status,
    ).toBe(403);
    expect(state.renew).not.toHaveBeenCalled();
  });
  it("destruye una sesión revocada cuando falla su renovación", async () => {
    state.session.accessToken = "old";
    state.session.refreshToken = "revoked";
    state.renew.mockRejectedValue(new ApiError(401));
    const response = await GET(req("auth/me"), context("auth/me"));
    expect(response.status).toBe(401);
    expect(state.session.destroy).toHaveBeenCalledOnce();
  });
  it("renueva usando la cookie y nunca exige el refresh token al cliente", async () => {
    state.session.accessToken = "old";
    state.session.refreshToken = "cookie-secret";
    state.renew.mockResolvedValue({
      accessToken: "new",
      refreshToken: "next",
      expiresIn: 900,
    });
    const response = await POST(
      req("auth/refresh", "POST"),
      context("auth/refresh"),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ refreshed: true });
    expect(state.renew).toHaveBeenCalledWith("cookie-secret");
  });
  it("no expone ni almacena en caché el contenido privado", async () => {
    state.session.accessToken = "valid";
    state.session.expiresAt = Date.now() + 900000;
    server.use(
      http.get("http://backend.test/auth/me", () =>
        HttpResponse.json({ username: "army" }),
      ),
    );
    const response = await GET(req("auth/me"), context("auth/me"));
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });
});
