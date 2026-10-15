import type { Resource } from "./api/types";
export const sections: Record<
  string,
  { type: string; title: string; eyebrow: string; description: string }
> = {
  artistas: {
    type: "artists",
    title: "Artistas. Todos tus universos.",
    eyebrow: "ARTISTAS",
    description: "Las personas, la música y las historias que nos conectan.",
  },
  discografia: {
    type: "releases",
    title: "La banda sonora del K-pop.",
    eyebrow: "DISCOGRAFÍA",
    description:
      "Cada era tiene una historia. Explora álbumes, EPs y singles de tus artistas.",
  },
  canciones: {
    type: "recordings",
    title: "Una canción, mil recuerdos.",
    eyebrow: "CANCIONES Y OBRAS",
    description:
      "Descubre las grabaciones, sus versiones y las personas detrás de la música.",
  },
  obras: {
    type: "works",
    title: "Donde empieza la música.",
    eyebrow: "OBRAS MUSICALES",
    description: "Composiciones, autoría y sus grabaciones relacionadas.",
  },
  eventos: {
    type: "events",
    title: "Nos encontramos en la música.",
    eyebrow: "EVENTOS",
    description: "Conciertos, escenarios y momentos para recordar.",
  },
  tours: {
    type: "tours",
    title: "El K-pop recorre el mundo.",
    eyebrow: "TOURS",
    description:
      "Explora las giras, sus conciertos y las ciudades que forman parte de la historia.",
  },
  equipo: {
    type: "catalog-identities",
    title: "Detrás de cada canción.",
    eyebrow: "EQUIPO CREATIVO",
    description:
      "Personas, organizaciones y créditos que hacen posible su universo.",
  },
  usuarios: {
    type: "users",
    title: "Nuestra comunidad.",
    eyebrow: "FANS",
    description: "Las personas que construyen KPOPWIKI.",
  },
};
export const typeSection: Record<string, string> = {
  artists: "artistas",
  "catalog-identities": "equipo",
  people: "equipo",
  organizations: "equipo",
  releases: "discografia",
  recordings: "canciones",
  works: "obras",
  events: "eventos",
  tours: "tours",
  users: "usuarios",
  "wiki-pages": "wiki/paginas",
  "wiki-changesets": "wiki/propuestas",
};
export function href(r: { type: string; id: string }) {
  return `/${typeSection[r.type] || "explorar/" + r.type}/${encodeURIComponent(r.id)}`;
}
export function related(
  r: Resource,
  key: string,
  graph: Resource[],
): Resource[] {
  const data = r.relationships?.[key]?.data;
  return (Array.isArray(data) ? data : data ? [data] : []).flatMap((ref) => {
    const found = graph.find(
      (item) => item.type === ref.type && item.id === ref.id,
    );
    return found ? [found] : [];
  });
}
export function resourceName(r: Resource, graph: Resource[] = []): string {
  const a = r.attributes;
  if (a.displayName || a.title || a.name || a.username || a.label)
    return String(a.displayName || a.title || a.name || a.username || a.label);
  const identity = related(r, "catalogIdentity", graph)[0];
  if (identity) return resourceName(identity, graph);
  return r.type === "artists" ? "Artista" : r.id;
}
export const statusLabels: Record<string, string> = {
  announced: "Anunciado",
  scheduled: "Programado",
  in_progress: "En curso",
  postponed: "Pospuesto",
  cancelled: "Cancelado",
  completed: "Finalizado",
  performed: "Realizado",
  published: "Publicado",
  draft: "Borrador",
  submitted: "En revisión",
  withdrawn: "Retirado",
  approved: "Aprobado",
  rejected: "Rechazado",
  album: "Álbum",
  single: "Single",
  ep: "EP",
  compilation: "Compilación",
};
