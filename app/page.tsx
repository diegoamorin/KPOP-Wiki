import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import {
  ArrowUpRight,
  Disc3,
  CalendarDays,
  Globe2,
  UsersRound,
  Sparkles,
} from "lucide-react";
import { getCatalog } from "@/lib/api/server";
import { RetryButton } from "@/components/retry";
import { href, resourceName } from "@/lib/catalog";
import { localToday, isUpcoming, dateLabel } from "@/lib/dates";
import {
  featuredArtists,
  calendarEntries,
  calendarLabels,
  tourActive,
  unique,
} from "@/lib/kpop";
import {
  Artwork,
  Empty,
  Loading,
  ResourceCard,
  SectionTitle,
} from "@/components/ui";
import { CatalogCharts } from "@/components/catalog-charts";
export default function Home() {
  return (
    <Suspense fallback={<Loading />}>
      <Dashboard />
    </Suspense>
  );
}
async function Dashboard() {
  await connection();
  let graph;
  try {
    graph = await getCatalog();
  } catch {
    return (
      <>
        <div className="page-heading">
          <h1>Tu universo K-pop.</h1>
        </div>
        <Empty
          title="No pudimos conectar con el archivo."
          text="Vuelve a intentarlo en unos momentos."
        />
        <RetryButton />
      </>
    );
  }
  const artists = featuredArtists(graph),
    releases = unique(graph.filter((r) => r.type === "releases")).sort(
      (a, b) =>
        Number(b.attributes.releaseYear) - Number(a.attributes.releaseYear) ||
        Number(b.attributes.releaseMonth) - Number(a.attributes.releaseMonth) ||
        Number(b.attributes.releaseDay) - Number(a.attributes.releaseDay) ||
        resourceName(a).localeCompare(resourceName(b)),
    );
  const tours = graph.filter((r) => r.type === "tours"),
    today = localToday(),
    year = Number(today.slice(0, 4));
  const agenda = [
    ...new Map(
      [...calendarEntries(graph, year), ...calendarEntries(graph, year + 1)]
        .filter(
          (e) =>
            e.date >= today &&
            (e.kind === "birthdays" ||
              (e.kind === "events" && isUpcoming(e.resource, today))),
        )
        .map((e) => [e.id, e]),
    ).values(),
  ]
    .sort(
      (a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title),
    )
    .slice(0, 4);
  return (
    <>
      <section className="hero kpop-hero">
        <div className="hero-content">
          <span className="hero-kicker">
            <Sparkles size={15} /> YOUR NEXT FAVORITE ERA
          </span>
          <h2>
            Un bias.
            <br />
            Mil historias.
            <br />
            <em>Todo el K-pop.</em>
          </h2>
          <p>
            Descubre nuevas voces, celebra sus días
            <br />y guarda un lugar para el próximo comeback.
          </p>
          <Link className="button white" href="/artistas">
            Encuentra tu próximo favorito <ArrowUpRight size={17} />
          </Link>
          <div className="hero-foot">
            <span>MUSIC · FANDOM · TOGETHER</span>
            <span>✦ KPOPWIKI</span>
          </div>
        </div>
        <div className="kpop-collage" aria-label="Artistas del catálogo">
          {artists.slice(0, 4).map((r, i) => (
            <Link
              className={`hero-photocard photo-${i}`}
              key={r.id}
              href={href(r)}
            >
              <Artwork resource={r} graph={graph} />
              <span>
                {resourceName(r, graph)} <span>✧</span>
              </span>
            </Link>
          ))}
          <span className="collage-sticker">
            ALL MY
            <br />
            FAVORITES ♡
          </span>
        </div>
      </section>
      <div className="quick-stats">
        {[
          [
            UsersRound,
            graph.filter((r) => r.type === "artists").length,
            "Artistas",
            "/artistas",
          ],
          [Disc3, releases.length, "Lanzamientos", "/discografia"],
          [
            CalendarDays,
            graph.filter((r) => r.type === "events" && isUpcoming(r, today))
              .length,
            "Próximos conciertos",
            "/calendario",
          ],
          [
            Globe2,
            tours.filter((r) => tourActive(r, today)).length,
            "Tours en curso",
            "/tours",
          ],
        ].map(([Icon, count, label, url]) => {
          const I = Icon as typeof Disc3;
          return (
            <Link className="stat" href={String(url)} key={String(label)}>
              <span className="stat-icon">
                <I size={20} />
              </span>
              <span>
                <b>{String(count)}</b>
                <small>{String(label)}</small>
              </span>
              <ArrowUpRight size={15} />
            </Link>
          );
        })}
      </div>
      <section className="content-section">
        <SectionTitle
          title="Tu bias está aquí. El siguiente, también."
          subtitle="Grupos y artistas para conocer, escuchar y volver a descubrir."
          link="/artistas"
          label="Todos los artistas"
        />
        <div className="artists-grid">
          {artists.map((r) => (
            <ResourceCard key={r.id} resource={r} graph={graph} />
          ))}
        </div>
      </section>
      <div className="dashboard-columns">
        <section className="content-section">
          <SectionTitle
            title="En modo comeback."
            subtitle="Las últimas eras registradas en nuestra wiki."
            link="/discografia"
            label="Toda la discografía"
          />
          <div className="grid three">
            {releases.slice(0, 3).map((r) => (
              <ResourceCard key={r.id} resource={r} graph={graph} />
            ))}
          </div>
        </section>
        <section className="agenda-panel">
          <div className="agenda-heading">
            <span className="eyebrow">APÚNTALO EN TU AGENDA</span>
            <CalendarDays size={18} />
          </div>
          <h2>Días para celebrar.</h2>
          <p className="muted">Próximos conciertos y cumpleaños.</p>
          {agenda.length ? (
            agenda.map((e) => (
              <Link className="agenda-item" key={e.id} href={e.href}>
                <span>
                  {e.date.slice(5).split("-").reverse().join("/")} ·{" "}
                  {calendarLabels[e.kind]}
                </span>
                <b>{e.title}</b>
                <ArrowUpRight size={16} />
              </Link>
            ))
          ) : (
            <p className="quiet-agenda">
              Pronto habrá más momentos para compartir.
            </p>
          )}
          <Link className="agenda-footer" href="/calendario">
            Abrir calendario <ArrowUpRight size={16} />
          </Link>
        </section>
      </div>
      <CatalogCharts graph={graph} />
      <section className="contribute-banner">
        <span className="contribute-mark">✦</span>
        <div>
          <p className="eyebrow">DE FANS, PARA TODOS LOS FANDOMS</p>
          <h2>Tu conocimiento tiene un lugar aquí.</h2>
          <p>Añade una fuente, conecta historias y haz crecer KPOPWIKI.</p>
        </div>
        <Link className="button primary" href="/wiki">
          Colaborar <ArrowUpRight size={16} />
        </Link>
      </section>
      <section className="content-section">
        <SectionTitle
          title="Del escenario al mundo."
          subtitle="Explora las giras y sus historias en nuestra línea de tiempo."
          link="/tours"
          label="Ver tours"
        />
        <div className="grid two">
          {tours
            .slice()
            .sort(
              (a, b) =>
                Number(b.attributes.startYear) - Number(a.attributes.startYear),
            )
            .slice(0, 2)
            .map((r) => (
              <Link className="tour-feature" href={href(r)} key={r.id}>
                <Globe2 size={28} />
                <div>
                  <span className="eyebrow">ARCHIVO DE TOURS</span>
                  <h3>{resourceName(r, graph)}</h3>
                  <p>
                    {dateLabel(r.attributes)} — {dateLabel(r.attributes, "end")}
                  </p>
                </div>
                <ArrowUpRight size={22} />
              </Link>
            ))}
        </div>
      </section>
    </>
  );
}
