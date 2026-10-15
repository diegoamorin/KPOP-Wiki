import { describe, it, expect } from "vitest";
import { graph } from "./fixtures/catalog.mjs";
import {
  calendarEntries,
  calendarFilters,
  dayDestination,
  filterEntries,
  artistGroups,
  matchesArtist,
  featuredArtists,
  tourActive,
  tourRange,
  catalogStats,
  validDate,
} from "@/lib/kpop";
import { imageFor } from "@/components/ui";
import type { Resource } from "@/lib/api/types";
const resource = (id: string) =>
  graph.find(
    (r) => r.id === id && ["artists", "events", "tours"].includes(r.type),
  )!;
describe("calendario multigrupo", () => {
  it("repite cumpleaños por año sin duplicar recursos ni desplazar fechas", () => {
    const entries = calendarEntries([...graph, ...graph], 2026);
    expect(
      entries.filter((e) => e.kind === "birthdays").map((e) => e.date),
    ).toEqual(["2026-10-15", "2026-10-15"]);
    expect(
      calendarEntries(graph, 2028).some((e) => e.date === "2028-02-29"),
    ).toBe(true);
    expect(
      calendarEntries(graph, 1998).filter((e) => e.kind === "birthdays"),
    ).toHaveLength(0);
    expect(entries.find((e) => e.resource.id === "luna")?.href).toBe(
      "/artistas/luna",
    );
    expect(entries.some((e) => e.resource.id === "soon")).toBe(false);
  });
  it("valida fechas, consultas y cumpleaños desconocidos", () => {
    expect(validDate("2025-02-29")).toBe(false);
    expect(validDate("2024-02-29")).toBe(true);
    expect(validDate("2026-13-01")).toBe(false);
    expect(
      calendarFilters(
        { month: "2026-13", view: "bad", category: "bad" },
        "2026-10-15",
      ),
    ).toEqual({
      month: "2026-10",
      view: "month",
      category: "all",
      artist: "all",
    });
    const bad = graph.map((r) =>
      r.type === "people"
        ? { ...r, attributes: { birthDate: "not-a-date" } }
        : r,
    );
    expect(
      calendarEntries(bad, 2026).filter((e) => e.kind === "birthdays"),
    ).toHaveLength(0);
  });
  it("resuelve días únicos y múltiples según filtros", () => {
    const filters = calendarFilters({}, "2026-10-15"),
      entries = calendarEntries(graph, 2026).filter(
        (e) => e.date === "2026-10-15",
      );
    expect(entries).toHaveLength(5);
    expect(dayDestination(entries, "2026-10-15", filters)).toContain(
      "/calendario/2026-10-15?",
    );
    const filtered = filterEntries(
      entries,
      { category: "releases", artist: "aurora" },
      graph,
    );
    expect(dayDestination(filtered, "2026-10-15", filters)).toBe(
      "/discografia/glow",
    );
    expect(
      filterEntries(
        entries,
        { category: "birthdays", artist: "aurora" },
        graph,
      ).map((e) => e.resource.id),
    ).toEqual(["luna"]);
  });
});
describe("artistas y fuentes", () => {
  it("resuelve grupos sin contagiar relaciones a otros artistas", () => {
    expect(artistGroups(resource("luna"), graph).map((r) => r.id)).toEqual([
      "aurora",
    ]);
    expect(artistGroups(resource("nova"), graph)).toEqual([]);
    expect(matchesArtist(resource("seoul"), "orbit", graph)).toBe(false);
    expect(
      featuredArtists(graph)
        .slice(0, 2)
        .map((r) => r.id),
    ).toEqual(["aurora", "leap"]);
  });
  it("no asigna fotos por coincidencias de nombres", () => {
    expect(
      imageFor(
        { type: "artists", id: "unrelated", attributes: { displayName: "RM" } },
        graph,
      ),
    ).toBe("");
    expect(
      imageFor({
        type: "events",
        id: "photo",
        attributes: {
          imageUrl:
            "https://bts.ibighit.com/images/profile/proof/member/member-rm.jpg",
        },
      }),
    ).toBe("https://bts.ibighit.com/images/profile/proof/member/member-rm.jpg");
  });
});
describe("tours y estadísticas", () => {
  it("separa estado editorial de periodo y valida extremos", () => {
    expect(tourActive(resource("active"), "2026-10-15")).toBe(true);
    expect(tourActive(resource("historical"), "2026-10-15")).toBe(false);
    expect(tourActive(resource("active"), "2027-01-01")).toBe(false);
    expect(tourRange(resource("incomplete"))).toBeNull();
    expect(
      tourRange({
        ...resource("active"),
        attributes: { ...resource("active").attributes, endYear: 2025 },
      }),
    ).toBeNull();
    expect(
      tourActive(
        {
          type: "tours",
          id: "partial",
          attributes: { status: "in_progress", endYear: 2020 },
        } as Resource,
        "2026-10-15",
      ),
    ).toBe(false);
  });
  it("cuenta recursos únicos, estados cancelados y datos faltantes", () => {
    const stats = catalogStats([...graph, ...graph]);
    expect(stats.years).toEqual([
      [2025, { album: 0, ep: 0, single: 1, other: 0 }],
      [2026, { album: 1, ep: 1, single: 0, other: 0 }],
    ]);
    expect(stats.countries.map((c) => c.count)).toEqual([1, 1]);
    expect(stats.missingYear).toBe(1);
    expect(stats.missingCountry).toBe(1);
    expect(catalogStats(graph, "orbit").years).toEqual([]);
  });
});
