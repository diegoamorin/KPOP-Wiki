"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { Resource } from "@/lib/api/types";
import { artistIdentity } from "@/lib/kpop";
import { resourceName } from "@/lib/catalog";
import { isUpcoming } from "@/lib/dates";
import { Empty, ResourceCard } from "./ui";
export function CatalogList({
  resources,
  graph,
  today,
}: {
  resources: Resource[];
  graph: Resource[];
  today: string;
}) {
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("all"),
    [order, setOrder] = useState("newest");
  const types = [
    ...new Set(
      resources
        .map((r) =>
          String(
            r.attributes.releaseType ||
              r.attributes.status ||
              r.attributes.identityType ||
              (r.type === "artists"
                ? artistIdentity(r, graph)?.attributes.identityType
                : "") ||
              "",
          ),
        )
        .filter(Boolean),
    ),
  ];
  const names: Record<string, string> = {
    album: "Álbumes",
    ep: "EPs",
    single: "Singles",
    compilation: "Compilaciones",
    announced: "Anunciados",
    scheduled: "Programados",
    in_progress: "En curso",
    postponed: "Pospuestos",
    cancelled: "Cancelados",
    completed: "Finalizados",
    performed: "Realizados",
    person: "Artistas individuales",
    organization: "Grupos",
  };
  const results = useMemo(
    () =>
      resources
        .filter(
          (r) =>
            resourceName(r, graph)
              .toLowerCase()
              .includes(query.toLowerCase()) &&
            (category === "all" ||
              (category === "upcoming" && isUpcoming(r, today)) ||
              String(
                r.attributes.releaseType ||
                  r.attributes.status ||
                  r.attributes.identityType ||
                  (r.type === "artists"
                    ? artistIdentity(r, graph)?.attributes.identityType
                    : ""),
              ) === category),
        )
        .sort((a, b) =>
          order === "az"
            ? resourceName(a, graph).localeCompare(resourceName(b, graph))
            : Number(b.attributes.releaseYear || b.attributes.startYear || 0) -
              Number(a.attributes.releaseYear || a.attributes.startYear || 0),
        ),
    [resources, graph, query, category, order, today],
  );
  return (
    <>
      <div className="toolbar">
        <input
          className="filter-input"
          aria-label="Filtrar contenido"
          placeholder="Encuentra una historia…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="field"
          aria-label="Filtrar por categoría"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="all">Todas las categorías</option>
          {resources.some((r) => ["tours", "events"].includes(r.type)) && (
            <option value="upcoming">Próximos / vigentes</option>
          )}
          {types.map((t) => (
            <option key={t} value={t}>
              {names[t] || t}
            </option>
          ))}
        </select>
        <select
          className="field"
          aria-label="Ordenar contenido"
          value={order}
          onChange={(e) => setOrder(e.target.value)}
        >
          <option value="newest">Más recientes</option>
          <option value="az">Nombre A–Z</option>
        </select>
        <span className="count">
          {results.length} {results.length === 1 ? "historia" : "historias"}
        </span>
      </div>
      {results.length ? (
        <div
          className={`grid ${resources[0]?.type === "artists" ? "four" : "three"}`}
        >
          {results.map((r) => (
            <ResourceCard key={r.type + r.id} resource={r} graph={graph} />
          ))}
        </div>
      ) : (
        <Empty text="No hay resultados para estos filtros." action />
      )}
      <div className="form-actions">
        <Link className="button secondary" href="/wiki/nueva">
          Añadir contenido a la wiki ↗
        </Link>
        {resources[0]?.type === "recordings" && (
          <Link className="button secondary" href="/obras">
            Explorar obras musicales ↗
          </Link>
        )}
      </div>
    </>
  );
}
