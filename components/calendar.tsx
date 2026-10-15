"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Resource } from "@/lib/api/types";
import { dateLabel, exactDate, eventTime } from "@/lib/dates";
import { href, related, resourceName, statusLabels } from "@/lib/catalog";
import {
  calendarEntries,
  calendarFilters,
  calendarUrl,
  calendarLabels,
  dayDestination,
  filterEntries,
  matchesArtist,
  unique,
  type CalendarEntry,
  type CalendarFilters,
} from "@/lib/kpop";
import { Empty } from "./ui";

export function Calendar({
  graph,
  today,
  day,
}: {
  graph: Resource[];
  today: string;
  day?: string;
}) {
  const search = useSearchParams(),
    pathname = usePathname();
  const filters = calendarFilters(
    Object.fromEntries(search.entries()),
    day || today,
  );
  const { month, view, category, artist } = filters;
  const update = (patch: Partial<CalendarFilters>) =>
    window.history.replaceState(
      null,
      "",
      calendarUrl(pathname, { ...filters, ...patch }),
    );
  const year = Number((day || month).slice(0, 4));
  const entries = filterEntries(calendarEntries(graph, year), filters, graph);
  const current = entries.filter((e) =>
    day ? e.date === day : e.date.startsWith(month),
  );
  const artists = unique(graph.filter((r) => r.type === "artists")).sort(
    (a, b) =>
      resourceName(a, graph).localeCompare(resourceName(b, graph), "es"),
  );
  const first = new Date(`${month}-01T12:00:00Z`),
    m = Number(month.slice(5)),
    offset = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, m, 0)).getUTCDate();
  const move = (n: number) => {
    const d = new Date(`${month}-01T12:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + n);
    const next = d.toISOString().slice(0, 7);
    if (/^\d{4}-/.test(next) && !next.startsWith("0000"))
      update({ month: next });
  };
  const incomplete = unique(graph).filter(
    (r) =>
      ["events", "releases"].includes(r.type) &&
      (category === "all" || r.type === category) &&
      matchesArtist(r, artist, graph) &&
      !exactDate(r.attributes, r.type === "releases" ? "release" : "start"),
  );
  const grouped = [...new Set(current.map((e) => e.date))].map((date) => ({
    date,
    items: current.filter((e) => e.date === date),
  }));
  return (
    <>
      {day && (
        <div className="form-actions">
          <Link
            className="button secondary"
            href={calendarUrl("/calendario", {
              ...filters,
              month: day.slice(0, 7),
            })}
          >
            ← Volver al calendario
          </Link>
          <Link
            className="button secondary"
            href={calendarUrl(`/calendario/${day}`, {
              ...filters,
              category: "all",
              artist: "all",
            })}
          >
            Ver todo el día
          </Link>
        </div>
      )}
      <div className="toolbar">
        <select
          className="field"
          aria-label="Tipo de entrada"
          value={category}
          onChange={(e) => update({ category: e.target.value })}
        >
          <option value="all">Todos los eventos</option>
          <option value="events">Conciertos</option>
          <option value="releases">Lanzamientos</option>
          <option value="birthdays">Cumpleaños</option>
        </select>
        <select
          className="field"
          aria-label="Filtrar por artista"
          value={artist}
          onChange={(e) => update({ artist: e.target.value })}
        >
          <option value="all">Todos los artistas</option>
          {artists.map((r) => (
            <option key={r.id} value={r.id}>
              {resourceName(r, graph)}
            </option>
          ))}
        </select>
        {!day && (
          <button
            className="button secondary"
            onClick={() =>
              update({ view: view === "month" ? "agenda" : "month" })
            }
          >
            {view === "month" ? "Ver agenda" : "Ver mes"}
          </button>
        )}
      </div>
      {day ? (
        <>
          <p className="day-count" role="status">
            {current.length} {current.length === 1 ? "entrada" : "entradas"}{" "}
            para este día
          </p>
          <div className="grid two">
            {current.map((entry) => (
              <EntryCard key={entry.id} entry={entry} graph={graph} />
            ))}
          </div>
          {!current.length && (
            <Empty text="No hay entradas para este día con los filtros seleccionados." />
          )}
        </>
      ) : (
        <>
          <div className="calendar-header">
            <h2>
              {new Intl.DateTimeFormat("es", {
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              }).format(first)}
            </h2>
            <input
              className="field"
              type="month"
              min="0001-01"
              max="9999-12"
              aria-label="Ir a un mes"
              value={month}
              onChange={(e) =>
                e.target.value && update({ month: e.target.value })
              }
            />
            <button
              className="button secondary"
              onClick={() => update({ month: today.slice(0, 7) })}
            >
              Hoy
            </button>
            <button
              className="icon-button"
              aria-label="Mes anterior"
              onClick={() => move(-1)}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              className="icon-button"
              aria-label="Mes siguiente"
              onClick={() => move(1)}
            >
              <ChevronRight size={20} />
            </button>
          </div>
          {view === "month" ? (
            <div className="calendar-grid">
              {["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"].map((d) => (
                <div className="calendar-weekday" key={d}>
                  {d}
                </div>
              ))}
              {Array.from(
                { length: Math.ceil((offset + days) / 7) * 7 },
                (_, i) => {
                  const d = i - offset + 1,
                    valid = d > 0 && d <= days,
                    date = `${month}-${String(d).padStart(2, "0")}`,
                    items = current.filter((e) => e.date === date);
                  const content = (
                    <>
                      <span className="calendar-number">{valid ? d : ""}</span>
                      {items.length > 0 && (
                        <>
                          <span className="day-total" aria-hidden="true">
                            {items.length}
                          </span>
                          {items.slice(0, 2).map((e, index) => (
                            <span
                              className={`calendar-entry ${e.kind} ${index === 1 ? "second-entry" : ""}`}
                              key={e.id}
                            >
                              <span className="entry-type">
                                {calendarLabels[e.kind]}
                              </span>
                              {e.title}
                            </span>
                          ))}
                          {items.length > 2 && (
                            <span className="more-desktop">
                              +{items.length - 2} más
                            </span>
                          )}
                          {items.length > 1 && (
                            <span className="more-mobile">
                              +{items.length - 1} más
                            </span>
                          )}
                        </>
                      )}
                    </>
                  );
                  const className = `calendar-day ${!valid ? "outside" : ""} ${date === today ? "today" : ""}`;
                  return valid && items.length ? (
                    <Link
                      key={date}
                      className={className}
                      href={dayDestination(items, date, filters)}
                      aria-label={`${d}: ${items.length === 1 ? items[0].title : `${items.length} entradas, ver resumen del día`}`}
                      aria-current={date === today ? "date" : undefined}
                    >
                      {content}
                    </Link>
                  ) : (
                    <div key={i} className={className}>
                      {content}
                    </div>
                  );
                },
              )}
            </div>
          ) : (
            <div className="panel">
              {grouped.map(({ date, items }) => (
                <Link
                  className="resource-row agenda-day"
                  href={dayDestination(items, date, filters)}
                  key={date}
                >
                  <span className="badge">{date.slice(8)}</span>
                  <span>
                    <b>
                      {items.length === 1
                        ? items[0].title
                        : `${items.length} entradas`}
                    </b>
                    <small>{items.map((e) => e.title).join(" · ")}</small>
                  </span>
                  <span>↗</span>
                </Link>
              ))}
            </div>
          )}
          <div className="calendar-legend kpop-legend">
            {Object.entries(calendarLabels).map(([key, label]) => (
              <span key={key} className={key}>
                {label}
              </span>
            ))}
          </div>
          {!current.length && (
            <div className="notice">
              No hay entradas este mes.{" "}
              {entries.length > 0 && (
                <button
                  className="link-button"
                  onClick={() =>
                    update({ month: entries.at(-1)!.date.slice(0, 7) })
                  }
                >
                  Explorar el último mes del archivo →
                </button>
              )}
            </div>
          )}
          {incomplete.length > 0 && (
            <section className="panel">
              <h2>Fecha por confirmar</h2>
              {incomplete.map((r) => (
                <Link
                  className="resource-row"
                  key={r.type + r.id}
                  href={href(r)}
                >
                  {resourceName(r, graph)}
                  <small>
                    {dateLabel(
                      r.attributes,
                      r.type === "releases" ? "release" : "start",
                    )}
                  </small>
                </Link>
              ))}
            </section>
          )}
        </>
      )}
    </>
  );
}
export function EntryCard({
  entry,
  graph,
}: {
  entry: CalendarEntry;
  graph: Resource[];
}) {
  const a = entry.resource.attributes;
  return (
    <Link className={`panel day-entry ${entry.kind}`} href={entry.href}>
      <span className="badge">{calendarLabels[entry.kind]}</span>
      {entry.kind === "events" && a.status && (
        <span className="badge">
          {statusLabels[String(a.status)] || String(a.status)}
        </span>
      )}
      <h2>{entry.title}</h2>
      <p>
        {entry.artistIds
          .map((id) => graph.find((r) => r.type === "artists" && r.id === id))
          .filter((r): r is Resource => Boolean(r))
          .map((r) => resourceName(r, graph))
          .join(" · ")}
      </p>
      {entry.kind === "events" && (
        <>
          <p>{eventTime(a)}</p>
          <p>
            {[
              a.venueName,
              a.city,
              ...related(entry.resource, "country", graph).map((c) =>
                resourceName(c, graph),
              ),
            ]
              .filter(Boolean)
              .join(" · ") || "Lugar por confirmar"}
          </p>
        </>
      )}
      {a.description && (
        <p className="entry-description">{String(a.description)}</p>
      )}
      <span className="small-text">
        {entry.kind === "birthdays" ? "Conoce al artista" : "Ver detalles"} ↗
      </span>
    </Link>
  );
}
