import { describe, expect, it } from "vitest";
import { dateLabel, exactDate, isUpcoming, calendarItems } from "@/lib/dates";
import { editCandidate } from "@/lib/editor";
import { related, resourceName } from "@/lib/catalog";
import type { Resource } from "@/lib/api/types";
const resource = (attributes: Resource["attributes"]): Resource => ({
  type: "events",
  id: "public-id",
  attributes,
});
describe("fechas editoriales", () => {
  it("no inventa precisión", () => {
    expect(dateLabel({ releaseYear: 2026 }, "release")).toBe("2026");
    expect(
      exactDate({ releaseYear: 2026, releaseMonth: 3 }, "release"),
    ).toBeNull();
    expect(calendarItems([resource({ startYear: 2026 })])).toHaveLength(0);
  });
  it("valida años bisiestos", () => {
    expect(exactDate({ startYear: 2024, startMonth: 2, startDay: 29 })).toBe(
      "2024-02-29",
    );
    expect(
      exactDate({ startYear: 2025, startMonth: 2, startDay: 29 }),
    ).toBeNull();
  });
  it("un evento histórico anunciado no se convierte en próximo", () => {
    expect(
      isUpcoming(
        resource({
          status: "scheduled",
          startYear: 2017,
          startMonth: 2,
          startDay: 18,
        }),
        "2026-10-13",
      ),
    ).toBe(false);
    expect(
      isUpcoming(
        resource({
          status: "cancelled",
          startYear: 2027,
          startMonth: 2,
          startDay: 18,
        }),
        "2026-10-13",
      ),
    ).toBe(false);
    expect(
      isUpcoming(
        resource({
          status: "scheduled",
          startYear: 2027,
          startMonth: 2,
          startDay: 18,
        }),
        "2026-10-13",
      ),
    ).toBe(true);
  });
});
describe("identificadores y relaciones JSON:API", () => {
  it("resuelve por tipo e ID, sin confundir UUID de página", () => {
    const artist: Resource = {
      type: "artists",
      id: "opaque",
      attributes: {},
      relationships: {
        catalogIdentity: {
          data: { type: "catalog-identities", id: "identity" },
        },
        page: { data: { type: "wiki-pages", id: "page-uuid" } },
      },
    };
    const identity: Resource = {
      type: "catalog-identities",
      id: "identity",
      attributes: { displayName: "RM" },
    };
    expect(resourceName(artist, [artist, identity])).toBe("RM");
    expect(related(artist, "page", [identity])).toEqual([]);
  });
});
describe("edición sin pérdida", () => {
  it("preserva componentes desconocidos y claves estables", () => {
    const snapshot = {
      kind: "identity",
      fields: { displayName: "RM", type: "person" },
      components: {
        aliases: { stable: { name: "Namjoon" } },
        future: { key: { value: 3 } },
      },
    };
    const candidate = editCandidate("page-uuid", "revision-2", snapshot, {
      displayName: "Kim Namjoon",
    });
    expect(candidate.snapshot.components).toEqual(snapshot.components);
    expect(candidate.baseRevisionId).toBe("revision-2");
    expect(snapshot.fields.displayName).toBe("RM");
  });
});
