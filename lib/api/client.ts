import type { Document, Resource } from "./types";
export class ApiError extends Error {
  constructor(
    public status: number,
    public document?: {
      errors?: {
        detail?: string;
        title?: string;
        source?: { pointer?: string };
      }[];
    },
  ) {
    super(
      document?.errors?.map((e) => e.detail || e.title).join(" · ") ||
        `No se pudo completar la solicitud (${status})`,
    );
  }
}
export async function request<T>(
  base: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(
    `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`,
    {
      ...init,
      cache: "no-store",
      signal: init.signal || AbortSignal.timeout(20000),
      headers: {
        Accept: "application/vnd.api+json, application/json",
        ...init.headers,
      },
    },
  );
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new ApiError(response.ok ? 502 : response.status);
  }
  if (!response.ok) throw new ApiError(response.status, body);
  return body as T;
}
export async function allPages(
  base: string,
  path: string,
): Promise<{ data: Resource[]; included: Resource[] }> {
  const data: Resource[] = [],
    included = new Map<string, Resource>();
  let page = 1,
    pages = 1;
  do {
    const separator = path.includes("?") ? "&" : "?";
    const doc = await request<Document>(
      base,
      `${path}${separator}page[size]=100&page[number]=${page}`,
    );
    data.push(...(Array.isArray(doc.data) ? doc.data : [doc.data]));
    doc.included?.forEach((r) => included.set(`${r.type}:${r.id}`, r));
    pages = doc.meta?.pages || 1;
    page++;
    if (page > 1000) throw new Error("La API devolvió una paginación inválida");
  } while (page <= pages);
  return { data, included: [...included.values()] };
}
