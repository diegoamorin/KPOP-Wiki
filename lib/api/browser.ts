import { ApiError } from "./client";
import type { Document } from "./types";
export async function api<T = Document>(
  path: string,
  method = "GET",
  body?: unknown,
  key?: string,
): Promise<T> {
  const response = await fetch(
    `/api/gateway/${path.replace(/^\/?api\//, "").replace(/^\//, "")}`,
    {
      method,
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(key ? { "Idempotency-Key": key } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    },
  );
  const result = await response.json();
  if (!response.ok) throw new ApiError(response.status, result);
  return result as T;
}
export function envelope(
  type: string,
  attributes?: unknown,
  relationships?: unknown,
  id?: string,
) {
  return {
    data: {
      type,
      ...(id ? { id } : {}),
      ...(attributes ? { attributes } : {}),
      ...(relationships ? { relationships } : {}),
    },
  };
}
