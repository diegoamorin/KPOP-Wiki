import "server-only";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { request } from "./client";
import { apiBase } from "./server";
import { refreshCoordinator } from "./refresh";
import type { TokenPair } from "./types";
type Session = Partial<TokenPair> & { expiresAt?: number };
const globalSession = globalThis as typeof globalThis & {
  btsSessionSecret?: string;
  btsRefresh?: ReturnType<typeof refreshCoordinator>;
};
function password() {
  if (process.env.SESSION_PASSWORD && process.env.SESSION_PASSWORD.length >= 32)
    return process.env.SESSION_PASSWORD;
  if (process.env.NODE_ENV === "production")
    throw new Error("Configura SESSION_PASSWORD con al menos 32 caracteres");
  return (globalSession.btsSessionSecret ??= randomBytes(48).toString("hex"));
}
export async function getSession() {
  return getIronSession<Session>(await cookies(), {
    cookieName: "btswiki.session",
    password: password(),
    ttl: 60 * 60 * 24 * 30,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
  });
}
export const renew = (globalSession.btsRefresh ??= refreshCoordinator((token) =>
  request<TokenPair>(apiBase(), "auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: token }),
  }),
));
export function setTokens(session: Session, tokens: TokenPair) {
  Object.assign(session, tokens, {
    expiresAt: Date.now() + tokens.expiresIn * 1000,
  });
}
