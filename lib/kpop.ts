import type { Resource } from "./api/types";
import { href, related, resourceName } from "./catalog";
import { exactDate } from "./dates";

export const unique = (items: Resource[]) => [
  ...new Map(items.map((r) => [`${r.type}:${r.id}`, r])).values(),
];
export const artistIdentity = (r: Resource, graph: Resource[]) =>
  related(r, "catalogIdentity", graph)[0];
export const isGroup = (r: Resource, graph: Resource[]) =>
  artistIdentity(r, graph)?.attributes.identityType === "organization";
export function artistGroups(artist: Resource, graph: Resource[]) {
  const identity = artistIdentity(artist, graph);
  if (!identity) return [];
  return unique(
    graph.filter(
      (r) =>
        r.type === "artists" &&
        isGroup(r, graph) &&
        related(artistIdentity(r, graph)!, "memberships", graph).some((m) =>
          related(m, "memberIdentity", graph).some((i) => i.id === identity.id),
        ),
    ),
  );
}
export function artistsFor(resource: Resource, graph: Resource[]): Resource[] {
  if (resource.type === "artists") return [resource];
  const direct = ["artists", "artistCredits"]
    .flatMap((key) => related(resource, key, graph))
    .flatMap((r) => (r.type === "artists" ? [r] : related(r, "artist", graph)));
  const inherited =
    resource.type === "events"
      ? related(resource, "tour", graph).flatMap((t) =>
          related(t, "artists", graph).flatMap((r) =>
            related(r, "artist", graph),
          ),
        )
      : [];
  return unique([...direct, ...inherited]);
}
export function matchesArtist(
  resource: Resource,
  artistId: string,
  graph: Resource[],
) {
  return (
    artistId === "all" ||
    artistsFor(resource, graph).some(
      (a) =>
        a.id === artistId ||
        artistGroups(a, graph).some((g) => g.id === artistId),
    )
  );
}
export function featuredArtists(graph: Resource[], limit = 6) {
  const artists = unique(graph.filter((r) => r.type === "artists")).sort(
    (a, b) =>
      resourceName(a, graph).localeCompare(resourceName(b, graph), "es"),
  );
  const groups = artists.filter((r) => isGroup(r, graph)),
    people = artists.filter((r) => !isGroup(r, graph));
  return Array.from(
    { length: Math.max(groups.length, people.length) },
    (_, i) => [groups[i], people[i]],
  )
    .flat()
    .filter(Boolean)
    .slice(0, limit);
}
export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [startYear, startMonth, startDay] = value.split("-").map(Number);
  return exactDate({ startYear, startMonth, startDay }) === value;
}
export type CalendarKind = "events" | "releases" | "birthdays";
export const calendarLabels: Record<CalendarKind, string> = {
  events: "Concierto",
  releases: "Lanzamiento",
  birthdays: "Cumpleaños",
};
export type CalendarEntry = {
  id: string;
  date: string;
  kind: CalendarKind;
  resource: Resource;
  artistIds: string[];
  title: string;
  href: string;
};
export type CalendarFilters = {
  month: string;
  view: "month" | "agenda";
  category: string;
  artist: string;
};
export function calendarFilters(
  query: Record<string, string | string[] | undefined>,
  today: string,
): CalendarFilters {
  return {
    month:
      typeof query.month === "string" && validDate(`${query.month}-01`)
        ? query.month
        : today.slice(0, 7),
    view: query.view === "agenda" ? "agenda" : "month",
    category: ["events", "releases", "birthdays"].includes(
      String(query.category),
    )
      ? String(query.category)
      : "all",
    artist:
      typeof query.artist === "string" && query.artist ? query.artist : "all",
  };
}
export function calendarUrl(path: string, filters: CalendarFilters) {
  return `${path}?${new URLSearchParams(filters)}`;
}
export function calendarEntries(
  graph: Resource[],
  year: number,
): CalendarEntry[] {
  return unique(graph)
    .flatMap((resource): CalendarEntry[] => {
      const kind: CalendarKind | undefined =
        resource.type === "artists"
          ? "birthdays"
          : resource.type === "events"
            ? "events"
            : resource.type === "releases"
              ? "releases"
              : undefined;
      if (!kind) return [];
      let date: string | null;
      if (kind === "birthdays") {
        const identity = artistIdentity(resource, graph);
        const birth =
          identity &&
          related(identity, "person", graph)[0]?.attributes.birthDate;
        if (
          typeof birth !== "string" ||
          !validDate(birth) ||
          year < Number(birth.slice(0, 4))
        )
          return [];
        date = `${String(year).padStart(4, "0")}${birth.slice(4)}`;
        if (!validDate(date)) return [];
      } else
        date = exactDate(
          resource.attributes,
          kind === "releases" ? "release" : "start",
        );
      if (!date) return [];
      return [
        {
          id: `${kind}:${resource.id}:${date}`,
          date,
          kind,
          resource,
          artistIds: artistsFor(resource, graph).map((a) => a.id),
          title:
            kind === "birthdays"
              ? `Cumpleaños de ${resourceName(resource, graph)}`
              : resourceName(resource, graph),
          href: href(resource),
        },
      ];
    })
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.title.localeCompare(b.title, "es") ||
        a.id.localeCompare(b.id),
    );
}
export const filterEntries = (
  entries: CalendarEntry[],
  filters: Pick<CalendarFilters, "category" | "artist">,
  graph: Resource[],
) =>
  entries.filter(
    (e) =>
      (filters.category === "all" || e.kind === filters.category) &&
      matchesArtist(e.resource, filters.artist, graph),
  );
export function dayDestination(
  entries: CalendarEntry[],
  date: string,
  filters: CalendarFilters,
) {
  return entries.length === 1
    ? entries[0].href
    : calendarUrl(`/calendario/${date}`, filters);
}
export function tourActive(r: Resource, today: string) {
  const start = exactDate(r.attributes),
    end = exactDate(r.attributes, "end");
  // Partial years/months can still contradict an active editorial status.
  const startBound =
    start ||
    (r.attributes.startYear
      ? `${r.attributes.startYear}-${String(r.attributes.startMonth || 1).padStart(2, "0")}-01`
      : null);
  const endBound =
    end ||
    (r.attributes.endYear
      ? `${r.attributes.endYear}-${String(r.attributes.endMonth || 12).padStart(2, "0")}-31`
      : null);
  return (
    r.attributes.status === "in_progress" &&
    (!startBound || startBound <= today) &&
    (!endBound || endBound >= today) &&
    (!startBound || !endBound || startBound <= endBound)
  );
}
export function tourRange(r: Resource) {
  const start = exactDate(r.attributes),
    end = exactDate(r.attributes, "end");
  return start && end && start <= end ? { start, end } : null;
}
export function catalogStats(graph: Resource[], artist = "all") {
  const rows = unique(graph).filter((r) => matchesArtist(r, artist, graph));
  const releases = rows.filter((r) => r.type === "releases"),
    events = rows.filter((r) => r.type === "events");
  const years = new Map<number, Record<string, number>>();
  let missingYear = 0,
    missingCountry = 0;
  releases.forEach((r) => {
    const year = Number(r.attributes.releaseYear);
    if (!Number.isInteger(year) || year < 1 || year > 9999) {
      missingYear++;
      return;
    }
    const kind = ["album", "ep", "single"].includes(
      String(r.attributes.releaseType),
    )
      ? String(r.attributes.releaseType)
      : "other";
    const counts = years.get(year) || { album: 0, ep: 0, single: 0, other: 0 };
    counts[kind]++;
    years.set(year, counts);
  });
  const countries = new Map<string, { name: string; count: number }>();
  events.forEach((r) => {
    const c = related(r, "country", graph)[0];
    if (!c) {
      missingCountry++;
      return;
    }
    const row = countries.get(c.id) || {
      name: resourceName(c, graph),
      count: 0,
    };
    row.count++;
    countries.set(c.id, row);
  });
  return {
    years: [...years].sort((a, b) => a[0] - b[0]),
    countries: [...countries.values()].sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name),
    ),
    missingYear,
    missingCountry,
  };
}
