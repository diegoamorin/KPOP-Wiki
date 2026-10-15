// Run intentionally against the content backend, not as a test.
// Credentials are read from stdin and are never written or logged.
import readline from "node:readline";
import { readFileSync } from "node:fs";
const base = (process.env.API_BASE_URL || "http://localhost:8080/api").replace(
  /\/$/,
  "",
);
console.log("Esperando credenciales JSON por stdin (no se guardan).");
process.stdin.setRawMode?.(true);
const rl = readline.createInterface({ input: process.stdin });
let input;
for await (const line of rl) {
  input = JSON.parse(line);
  rl.close();
  process.stdin.setRawMode?.(false);
  break;
}
let token;
async function call(path, method = "GET", body) {
  const response = await fetch(`${base}/${path}`, {
    method,
    headers: {
      Accept: "application/vnd.api+json, application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type":
        path.startsWith("auth/") || /submit|publish/.test(path)
          ? "application/json"
          : "application/vnd.api+json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(`${method} ${path}: ${JSON.stringify(data)}`);
  return data;
}
const one = (doc) => (Array.isArray(doc.data) ? doc.data[0] : doc.data);
try {
  const login = await call("auth/login", "POST", {
    identifier: input.identifier,
    password: input.password,
  });
  token = login.accessToken;
  input = null;
  const me = await call("auth/me");
  console.log(
    `Cuenta editorial: ${me.username}; correo verificado: ${me.emailVerified}`,
  );
  if (!me.emailVerified)
    throw new Error("La cuenta debe verificar el correo antes de contribuir.");
  const identities = await call("catalog-identities?page[size]=100");
  const images = {
    RM: "rm",
    Jin: "jin",
    SUGA: "suga",
    "j-hope": "jhope",
    Jimin: "jimin",
    V: "v",
    "Jung Kook": "jk",
  };
  const items = [];
  const source = one(
    await call("wiki/sources", "POST", {
      data: {
        type: "wiki-sources",
        attributes: {
          sourceType: "url",
          title:
            "BTS — perfil y fotografías oficiales de integrantes, BIGHIT MUSIC",
          url: "https://bts.ibighit.com/eng/profile/",
        },
      },
    }),
  );
  for (const identity of identities.data) {
    const name = identity.attributes.displayName;
    if (!images[name]) continue;
    const pageId = identity.relationships.page.data.id,
      page = one(await call("wiki/pages/" + pageId));
    const snapshot = structuredClone(page.attributes.snapshot);
    const image = `https://bts.ibighit.com/images/profile/proof/member/member-${images[name]}.jpg`;
    if (snapshot.fields.imgProfile === image) continue;
    snapshot.fields.imgProfile = image;
    const revision = one(
      await call("wiki/revisions/" + page.attributes.currentRevisionId),
    );
    items.push({
      pageId,
      operation: "update",
      baseRevisionId: page.attributes.currentRevisionId,
      snapshot,
      sources: [
        ...(revision.attributes.sources || []),
        { sourceId: source.id, targetPath: "fields/imgProfile" },
      ],
    });
  }
  if (process.argv.includes("--catalog")) {
    const official = JSON.parse(
      readFileSync(
        new URL("../content/official-covers.json", import.meta.url),
        "utf8",
      ),
    );
    const evidence = one(
      await call("wiki/sources", "POST", {
        data: {
          type: "wiki-sources",
          attributes: {
            sourceType: "url",
            title: "BTS — catálogo discográfico oficial, BIGHIT MUSIC",
            url: official.source,
          },
        },
      }),
    );
    const normalize = (value) =>
      value
        .toLowerCase()
        .replace(/album cover/g, "")
        .replace(/[^\p{L}\p{N}]/gu, "");
    const releases = await call("releases?page[size]=100");
    for (const release of releases.data) {
      const title = release.attributes.title;
      const cover =
        title === "Butter (digital single)"
          ? official.covers.find((c) => c.url.includes("/butter/"))
          : title === "Butter (single CD)"
            ? official.covers.find((c) => c.url.includes("/butter-2/"))
            : official.covers.find(
                (c) => normalize(c.title) === normalize(title),
              );
      if (!cover || release.attributes.coverArtUrl === cover.url) continue;
      const pageId = release.relationships.page.data.id,
        page = one(await call("wiki/pages/" + pageId)),
        snapshot = structuredClone(page.attributes.snapshot),
        revision = one(
          await call("wiki/revisions/" + page.attributes.currentRevisionId),
        );
      snapshot.fields.coverArtUrl = cover.url;
      items.push({
        pageId,
        operation: "update",
        baseRevisionId: page.attributes.currentRevisionId,
        snapshot,
        sources: [
          ...(revision.attributes.sources || []),
          { sourceId: evidence.id, targetPath: "fields/coverArtUrl" },
        ],
      });
    }
    const socialSource = one(
      await call("wiki/sources", "POST", {
        data: {
          type: "wiki-sources",
          attributes: {
            sourceType: "url",
            title:
              "BTS — canales sociales enlazados desde el perfil oficial de BIGHIT MUSIC",
            url: "https://bighitsmusic.com/bts/profile",
          },
        },
      }),
    );
    const channels = [
      [
        "Instagram",
        "instagram",
        "https://www.instagram.com/bts.bighitofficial/",
      ],
      ["YouTube", "youtube", "https://www.youtube.com/user/BANGTANTV"],
      ["TikTok", "tiktok", "https://www.tiktok.com/@bts_official_bighit"],
      ["Facebook", "facebook", "https://www.facebook.com/bangtan.official"],
      ["Weverse", "weverse", "https://weverse.io/bts/feed"],
      ["X", "x", "https://x.com/bts_bighit"],
    ];
    const platforms = await call("platforms?page[size]=100");
    const bts = identities.data.find((r) => r.attributes.displayName === "BTS");
    if (bts) {
      const pageId = bts.relationships.page.data.id,
        page = one(await call("wiki/pages/" + pageId)),
        snapshot = structuredClone(page.attributes.snapshot),
        revision = one(
          await call("wiki/revisions/" + page.attributes.currentRevisionId),
        );
      const citations = [...(revision.attributes.sources || [])];
      let changed = false;
      for (const [name, slug, url] of channels) {
        let platform = platforms.data.find((p) => p.attributes.slug === slug);
        if (!platform) {
          platform = one(
            await call("platforms", "POST", {
              data: {
                type: "platforms",
                attributes: {
                  name,
                  slug,
                  iconUrl: new URL("/favicon.ico", url).href,
                  supportsCatalogIdentity: true,
                  supportsTrack: false,
                  supportsAlbum: false,
                },
              },
            }),
          );
          platforms.data.push(platform);
        }
        snapshot.components.platformLinks ??= {};
        if (
          Object.values(snapshot.components.platformLinks).some(
            (link) => link.url === url,
          )
        )
          continue;
        const key = crypto.randomUUID();
        snapshot.components.platformLinks[key] = {
          platformId: platform.id,
          url,
        };
        citations.push({
          sourceId: socialSource.id,
          targetPath: `components/platformLinks/${key}/url`,
        });
        changed = true;
      }
      if (changed)
        items.push({
          pageId,
          operation: "update",
          baseRevisionId: page.attributes.currentRevisionId,
          snapshot,
          sources: citations,
        });
    }
  }
  if (!items.length) {
    console.log("Las fotografías ya están curadas.");
  } else {
    const proposal = one(
      await call("wiki/changesets", "POST", {
        data: {
          type: "wiki-changesets",
          attributes: {
            summary:
              "Curar fotografías, portadas y canales oficiales de BTS desde fuentes de BIGHIT MUSIC, conservando los datos, créditos y fuentes anteriores.",
            items,
          },
        },
      }),
    );
    console.log(`Propuesta creada: ${proposal.id}`);
    const result = await call(`wiki/changesets/${proposal.id}/submit`, "POST", {
      expectedDraftVersion: proposal.attributes.draftVersion || 1,
    });
    console.log(`Resultado editorial: ${JSON.stringify(result)}`);
  }
} finally {
  if (token) await call("auth/logout", "POST").catch(() => {});
  token = null;
}
