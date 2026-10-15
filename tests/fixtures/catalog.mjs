/** @typedef {import('../../lib/api/types').Resource} Resource */
/** @param {string} type @param {string} id @param {Resource['attributes']} attributes @param {Record<string,Resource | Resource[]>} [rels] @returns {Resource} */
const r = (type, id, attributes = {}, rels = {}) => ({
  type,
  id,
  attributes,
  relationships: Object.fromEntries(
    Object.entries(rels).map(([k, v]) => [
      k,
      {
        data: Array.isArray(v)
          ? v.map(({ type, id }) => ({ type, id }))
          : { type: v.type, id: v.id },
      },
    ]),
  ),
});
const korea = r("countries", "kr", { name: "Corea del Sur" }),
  peru = r("countries", "pe", { name: "Perú" });
const lunaPerson = r("people", "luna", { birthDate: "2000-10-15" }),
  novaPerson = r("people", "nova", { birthDate: "1999-10-15" }),
  leapPerson = r("people", "leap", { birthDate: "2000-02-29" });
const lunaIdentity = r(
  "catalog-identities",
  "luna",
  { displayName: "Luna", identityType: "person" },
  { person: lunaPerson },
);
const novaIdentity = r(
  "catalog-identities",
  "nova",
  { displayName: "Nova", identityType: "person" },
  { person: novaPerson },
);
const leapIdentity = r(
  "catalog-identities",
  "leap",
  { displayName: "Leap", identityType: "person" },
  { person: leapPerson },
);
const membership = r(
  "organization-memberships",
  "member",
  { status: "current" },
  { memberIdentity: lunaIdentity },
);
const platform = r("platforms", "official", { name: "Sitio oficial" });
const groupLink = r(
  "catalog-identity-platform-links",
  "aurora-link",
  { url: "https://example.com/aurora" },
  { platform },
);
const auroraIdentity = r(
  "catalog-identities",
  "aurora",
  { displayName: "AURORA", identityType: "organization" },
  { memberships: [membership], platformLinks: [groupLink] },
);
const orbitIdentity = r("catalog-identities", "orbit", {
  displayName: "ORBIT",
  identityType: "organization",
});
const aurora = r("artists", "aurora", {}, { catalogIdentity: auroraIdentity }),
  orbit = r("artists", "orbit", {}, { catalogIdentity: orbitIdentity }),
  luna = r("artists", "luna", {}, { catalogIdentity: lunaIdentity }),
  nova = r("artists", "nova", {}, { catalogIdentity: novaIdentity }),
  leap = r("artists", "leap", {}, { catalogIdentity: leapIdentity });
const credit = r("release-artist-credits", "credit", {}, { artist: aurora }),
  eventArtist = r("event-artists", "main", {}, { artist: aurora }),
  tourArtist = r("tour-artists", "tour-main", {}, { artist: aurora });
const wikiPage = r("wiki-pages", "8293178f-19af-4c15-95ad-9664239455aa", {});
const recording = r("recordings", "glow-recording", {
  title: "Glow recording",
});
const track = r(
  "tracks",
  "glow-track",
  { title: "Glow intro", discNumber: 1, trackNumber: 1 },
  { recording },
);
const release = r(
  "releases",
  "glow",
  {
    title: "Glow",
    releaseType: "album",
    releaseYear: 2026,
    releaseMonth: 10,
    releaseDay: 15,
  },
  { artistCredits: [credit], page: wikiPage, tracks: [track] },
);
const single = r(
  "releases",
  "spark",
  {
    title: "Spark",
    releaseType: "single",
    releaseYear: 2025,
    releaseMonth: 6,
    releaseDay: 10,
  },
  { artistCredits: [credit] },
);
const partial = r(
  "releases",
  "soon",
  { title: "Soon", releaseType: "ep", releaseYear: 2026 },
  { artistCredits: [credit] },
);
const unknown = r("releases", "unknown", {
  title: "Sin fecha",
  releaseType: "ep",
});
const event = r(
  "events",
  "seoul",
  {
    title: "AURORA en Seoul",
    status: "scheduled",
    startYear: 2026,
    startMonth: 10,
    startDay: 15,
    startTime: "19:00",
    timezone: "Asia/Seoul",
    city: "Seoul",
    venueName: "Arena",
    description: "Un encuentro con AURORA.",
  },
  { artists: [eventArtist], country: korea },
);
const event2 = r(
  "events",
  "lima",
  {
    title: "AURORA en Lima",
    status: "cancelled",
    startYear: 2026,
    startMonth: 10,
    startDay: 15,
  },
  { artists: [eventArtist], country: peru },
);
const solo = r(
  "events",
  "solo",
  {
    title: "Un solo concierto",
    status: "scheduled",
    startYear: 2026,
    startMonth: 10,
    startDay: 20,
  },
  { artists: [eventArtist] },
);
const active = r(
  "tours",
  "active",
  {
    title: "Glow World Tour",
    status: "in_progress",
    startYear: 2026,
    startMonth: 1,
    startDay: 1,
    endYear: 2026,
    endMonth: 12,
    endDay: 31,
  },
  { artists: [tourArtist] },
);
const historical = r(
  "tours",
  "historical",
  {
    title: "First Era Tour",
    status: "announced",
    startYear: 2020,
    startMonth: 2,
    startDay: 1,
    endYear: 2020,
    endMonth: 10,
    endDay: 1,
  },
  { artists: [tourArtist] },
);
const incomplete = r(
  "tours",
  "incomplete",
  { title: "Next Era", status: "announced", startYear: 2027 },
  { artists: [tourArtist] },
);
/** @type {Resource[]} */
export const graph = [
  aurora,
  orbit,
  luna,
  nova,
  leap,
  auroraIdentity,
  orbitIdentity,
  lunaIdentity,
  novaIdentity,
  leapIdentity,
  lunaPerson,
  novaPerson,
  leapPerson,
  membership,
  groupLink,
  platform,
  credit,
  eventArtist,
  tourArtist,
  korea,
  peru,
  release,
  single,
  partial,
  unknown,
  event,
  event2,
  solo,
  active,
  historical,
  incomplete,
  wikiPage,
  recording,
  track,
];
