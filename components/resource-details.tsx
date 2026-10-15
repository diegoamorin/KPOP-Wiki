import Link from "next/link";
import { ArrowUpRight, Pencil, ExternalLink } from "lucide-react";
import type { Resource, Value } from "@/lib/api/types";
import { href, related, resourceName, statusLabels } from "@/lib/catalog";
import { artistGroups, artistIdentity } from "@/lib/kpop";
import { dateLabel, eventTime } from "@/lib/dates";
import { label } from "@/lib/labels";
import { Artwork } from "./ui";
import { PageActions, Discussion } from "./social";
import { Sources } from "./sources";
export function ValueView({ value }: { value: Value | undefined }) {
  if (value === null || value === undefined || value === "")
    return <span className="muted">Sin información confirmada</span>;
  if (typeof value === "boolean") return <>{value ? "Sí" : "No"}</>;
  if (typeof value === "object")
    return (
      <>
        {Array.isArray(value)
          ? value
              .map((v) =>
                typeof v === "object" ? JSON.stringify(v) : String(v),
              )
              .join(" · ")
          : JSON.stringify(value)}
      </>
    );
  if (typeof value === "string" && /^https?:\/\//.test(value))
    return (
      <a href={value} target="_blank" rel="noopener noreferrer">
        Abrir enlace <ExternalLink size={12} style={{ display: "inline" }} />
      </a>
    );
  return <>{statusLabels[String(value)] || String(value)}</>;
}
function relationName(r: Resource, graph: Resource[]) {
  for (const key of [
    "artist",
    "recording",
    "work",
    "memberIdentity",
    "organization",
    "catalogIdentity",
    "country",
    "platform",
    "genre",
    "contributionRole",
  ]) {
    const target = related(r, key, graph)[0];
    if (target) return { target, name: resourceName(target, graph) };
  }
  return { target: r, name: resourceName(r, graph) };
}
export function ResourceDetails({
  resource: r,
  graph,
}: {
  resource: Resource;
  graph: Resource[];
}) {
  const identity =
    r.type === "artists" ? related(r, "catalogIdentity", graph)[0] : r;
  const page =
    r.relationships?.page?.data || identity?.relationships?.page?.data;
  const pageId =
    page && !Array.isArray(page)
      ? page.id
      : r.type === "wiki-pages"
        ? r.id
        : undefined;
  const name = resourceName(r, graph),
    bio =
      identity?.attributes.bio || r.attributes.desc || r.attributes.description;
  const main = identity || r;
  const hidden = [
    "bio",
    "desc",
    "description",
    "displayName",
    "title",
    "imgProfile",
    "imageUrl",
    "coverArtUrl",
    "snapshot",
    "schemaVersion",
    "scopeVersion",
    "currentRevisionId",
  ];
  const keys = Object.keys(main.attributes).filter(
    (k) =>
      !hidden.includes(k) &&
      !k.endsWith("Year") &&
      !k.endsWith("Month") &&
      !k.endsWith("Day"),
  );
  const relationshipKeys = Object.keys(main.relationships || {}).filter(
    (k) => !["page", "artist", "catalogIdentity"].includes(k),
  );
  const groups =
    r.type === "artists"
      ? artistGroups(r, graph).filter(
          (g) =>
            related(artistIdentity(g, graph)!, "platformLinks", graph).length,
        )
      : [];
  return (
    <>
      <Link
        className="small-text"
        href={`/${r.type === "artists" ? "artistas" : r.type === "releases" ? "discografia" : r.type === "recordings" ? "canciones" : r.type === "events" ? "eventos" : r.type === "tours" ? "tours" : "equipo"}`}
      >
        ← Volver al archivo
      </Link>
      <header className="detail-header">
        <Artwork resource={r} graph={graph} />
        <div>
          <p className="eyebrow">KPOPWIKI · HISTORIAS CONECTADAS</p>
          <h1>{name}</h1>
          <div className="detail-meta">
            {r.attributes.status && (
              <span className="badge">
                {statusLabels[String(r.attributes.status)] ||
                  String(r.attributes.status)}
              </span>
            )}
            {["releases", "events", "tours"].includes(r.type) && (
              <span className="badge">
                {dateLabel(
                  r.attributes,
                  r.type === "releases" ? "release" : "start",
                )}
              </span>
            )}
            {r.type === "events" && (
              <span className="badge">{eventTime(r.attributes)}</span>
            )}
          </div>
          {bio && <p className="rich-text">{String(bio)}</p>}
          <div className="form-actions">
            {pageId && (
              <Link
                className="button secondary"
                href={`/wiki/editar/${pageId}`}
              >
                <Pencil size={14} /> Proponer una mejora
              </Link>
            )}
            {pageId && (
              <Link
                className="button secondary"
                href={`/wiki/historial/${pageId}`}
              >
                Historial
              </Link>
            )}
          </div>
          {pageId && (
            <PageActions
              pageId={pageId}
              recordingId={r.type === "recordings" ? r.id : undefined}
            />
          )}
        </div>
      </header>
      <div className="detail-columns">
        <div>
          {relationshipKeys.map((key) => {
            let items = related(main, key, graph);
            if (key === "tracks")
              items = items.sort(
                (a, b) =>
                  Number(a.attributes.discNumber) -
                    Number(b.attributes.discNumber) ||
                  Number(a.attributes.trackNumber) -
                    Number(b.attributes.trackNumber),
              );
            if (!items.length) return null;
            return (
              <section key={key} className="panel relation-group">
                <h2>{label(key)}</h2>
                {items.map((item) => {
                  const target = relationName(item, graph);
                  return (
                    <div key={item.type + item.id}>
                      <Link className="resource-row" href={href(target.target)}>
                        {item.attributes.trackNumber && (
                          <span className="badge">
                            {String(item.attributes.discNumber)}.
                            {String(item.attributes.trackNumber)}
                          </span>
                        )}
                        <b>
                          {String(
                            item.attributes.title ||
                              item.attributes.creditedAs ||
                              item.attributes.label ||
                              target.name,
                          )}
                        </b>
                        <ArrowUpRight size={14} />
                      </Link>
                      <dl className="data-list">
                        {Object.entries(item.attributes)
                          .filter(
                            ([k]) =>
                              ![
                                "title",
                                "name",
                                "creditedAs",
                                "trackNumber",
                                "discNumber",
                              ].includes(k),
                          )
                          .map(([k, v]) => (
                            <div style={{ display: "contents" }} key={k}>
                              <dt>{label(k)}</dt>
                              <dd>
                                <ValueView value={v} />
                              </dd>
                            </div>
                          ))}
                      </dl>
                      {Object.entries(item.relationships || {})
                        .filter(
                          ([k]) => !["page", "catalogIdentity"].includes(k),
                        )
                        .flatMap(([k]) =>
                          related(item, k, graph).map((target) => (
                            <Link
                              className="small-text relation-link"
                              href={href(target)}
                              key={target.type + target.id}
                            >
                              {label(k)}: {resourceName(target, graph)} ↗{" "}
                            </Link>
                          )),
                        )}
                    </div>
                  );
                })}
              </section>
            );
          })}
          {r.type === "tours" && (
            <section className="panel">
              <h2>Conciertos de la gira</h2>
              {graph
                .filter(
                  (item) =>
                    item.type === "events" &&
                    related(item, "tour", graph).some((t) => t.id === r.id),
                )
                .map((event) => (
                  <Link
                    className="resource-row"
                    href={href(event)}
                    key={event.id}
                  >
                    {resourceName(event, graph)}
                    <small>{dateLabel(event.attributes)}</small>
                  </Link>
                ))}
            </section>
          )}
          {pageId && <Discussion pageId={pageId} />}
        </div>
        <aside>
          {groups.map((group) => (
            <section className="panel" key={group.id}>
              <h2>Canales oficiales de {resourceName(group, graph)}</h2>
              <p className="small-text">
                Grupo relacionado con {name} según las membresías documentadas.
                Estos enlaces pertenecen al grupo.
              </p>
              {related(
                artistIdentity(group, graph)!,
                "platformLinks",
                graph,
              ).map((link) => (
                <a
                  className="resource-row"
                  href={String(link.attributes.url)}
                  key={link.id}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {resourceName(
                    related(link, "platform", graph)[0] || link,
                    graph,
                  )}{" "}
                  <ExternalLink size={13} />
                </a>
              ))}
            </section>
          ))}
          <section className="panel">
            <h2>En detalle</h2>
            <dl className="data-list">
              {keys.map((k) => (
                <div style={{ display: "contents" }} key={k}>
                  <dt>{label(k)}</dt>
                  <dd>
                    <ValueView value={main.attributes[k]} />
                  </dd>
                </div>
              ))}
              {r.type === "tours" && (
                <>
                  <dt>Inicio</dt>
                  <dd>{dateLabel(r.attributes)}</dd>
                  <dt>Cierre</dt>
                  <dd>{dateLabel(r.attributes, "end")}</dd>
                </>
              )}
            </dl>
          </section>
          {pageId && <Sources pageId={pageId} />}
          {pageId && (
            <section className="panel">
              <h3>Una wiki que hacemos juntas.</h3>
              <p className="small-text">
                Si falta una fuente o conoces un dato que podemos mejorar, tu
                contribución es bienvenida.
              </p>
              <Link
                className="button secondary"
                href={`/wiki/editar/${pageId}`}
                style={{ marginTop: 18 }}
              >
                Contribuir <ArrowUpRight size={14} />
              </Link>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
