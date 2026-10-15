import "server-only";
import { cache } from "react";
import { allPages, request } from "./client";
import type { Document, Resource } from "./types";
export const apiBase = () =>
  (process.env.API_BASE_URL || "http://localhost:8080/api").replace(/\/$/, "");
const collections = [
  "artists?include=catalogIdentity",
  "catalog-identities?include=person,organization,aliases,memberships,membershipRoles,nationalities,organizationTypes,affiliations,platformLinks",
  "releases?include=tracks,artistCredits,trackCredits,trackLinks,contributions",
  "recordings?include=contributions,works,genres",
  "works?include=contributions",
  "events?include=artists,organizers,links",
  "tours?include=artists,organizers,links",
  "countries",
  "platforms",
  "genres",
  "contribution-roles",
  "organization-types",
  "users",
];
export const getCatalog = cache(async (): Promise<Resource[]> => {
  const results = await Promise.all(
    collections.map((path) => allPages(apiBase(), path)),
  );
  const graph = new Map<string, Resource>();
  results.forEach((doc) =>
    [...doc.included, ...doc.data].forEach((r) =>
      graph.set(`${r.type}:${r.id}`, r),
    ),
  );
  return [...graph.values()];
});
export const getResource = (type: string, id: string) =>
  request<Document>(apiBase(), `${type}/${encodeURIComponent(id)}`);
