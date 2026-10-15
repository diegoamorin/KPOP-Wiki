import { NextRequest, NextResponse } from "next/server";
import { getSession, renew, setTokens } from "@/lib/api/session";
import { apiBase } from "@/lib/api/server";
import { operationFor, validate } from "@/lib/api/contract";
import { ApiError, request } from "@/lib/api/client";
import type { TokenPair } from "@/lib/api/types";
import { z } from "zod";
const registerSchema = z.object({
  username: z.string().min(3).max(32),
  email: z.email(),
  password: z.string().min(12).max(128),
  displayName: z.string().trim().min(1),
});
type Context = { params: Promise<{ path: string[] }> };
async function handle(req: NextRequest, context: Context) {
  const { path: parts } = await context.params;
  const path = "/api/" + parts.join("/");
  const operation = operationFor(req.method, path);
  const fail = (status: number, detail: string) =>
    NextResponse.json(
      { errors: [{ status: String(status), detail }] },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  if (!operation) return fail(404, "Operación no disponible");
  if (req.method !== "GET" && req.headers.get("origin") !== req.nextUrl.origin)
    return fail(403, "Origen de solicitud inválido");
  try {
    const session = await getSession();
    let body: unknown;
    if (operation.body && path !== "/api/auth/refresh") {
      body = await req.json();
      const errors = validate(operation.body, body);
      if (errors.length) return fail(422, errors.slice(0, 8).join(" · "));
      if (
        path === "/api/auth/register" &&
        !registerSchema.safeParse(body).success
      )
        return fail(
          422,
          "Revisa tu nombre, correo y contraseña antes de continuar.",
        );
    }
    if (path === "/api/auth/refresh") {
      if (!session.refreshToken)
        return fail(401, "Inicia sesión para continuar");
      setTokens(session, await renew(session.refreshToken));
      await session.save();
      return NextResponse.json(
        { refreshed: true },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    if (operation.protected && !session.accessToken)
      return fail(401, "Inicia sesión para continuar");
    const headers: Record<string, string> = {};
    if (operation.contentType) headers["Content-Type"] = operation.contentType;
    const key = req.headers.get("idempotency-key");
    if (key) headers["Idempotency-Key"] = key;
    if (
      operation.parameters.some(
        (p) => p.in === "header" && p.name.toLowerCase() === "idempotency-key",
      ) &&
      !key
    )
      return fail(422, "Falta la clave de idempotencia");
    const query = req.nextUrl.search;
    async function upstream() {
      if (operation!.protected && session.accessToken)
        headers.Authorization = `Bearer ${session.accessToken}`;
      return request<Record<string, unknown>>(
        apiBase(),
        path.slice(5) + query,
        {
          method: req.method,
          headers,
          ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        },
      );
    }
    const refresh = async () => {
      if (!session.refreshToken) throw new ApiError(401);
      setTokens(session, await renew(session.refreshToken));
      await session.save();
    };
    if (operation.protected && (session.expiresAt || 0) < Date.now() + 10000)
      await refresh();
    let result;
    try {
      result = await upstream();
    } catch (error) {
      if (
        !(error instanceof ApiError) ||
        error.status !== 401 ||
        !operation.protected ||
        path.includes("/auth/logout")
      )
        throw error;
      await refresh();
      result = await upstream();
    }
    if (path === "/api/auth/login") {
      setTokens(session, result as unknown as TokenPair);
      await session.save();
      result = { authenticated: true };
    }
    if (
      path === "/api/auth/logout" ||
      path === "/api/auth/logout-all" ||
      (path === "/api/users/me" && req.method === "DELETE")
    )
      session.destroy();
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store, private" },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) (await getSession()).destroy();
      return NextResponse.json(
        error.document || { errors: [{ detail: error.message }] },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (error instanceof SyntaxError)
      return fail(400, "El formulario no contiene datos válidos");
    if (process.env.NODE_ENV === "development")
      console.error(
        "KPOPWIKI gateway:",
        error instanceof Error ? error.message : "Fallo interno",
      );
    return fail(
      502,
      "No pudimos conectar con KPOPWIKI. Inténtalo de nuevo en unos momentos.",
    );
  }
}
export {
  handle as GET,
  handle as POST,
  handle as PATCH,
  handle as DELETE,
  handle as PUT,
};
