"use client";
import { useState } from "react";
import Link from "next/link";
import type { Resource } from "@/lib/api/types";
import { href, resourceName, statusLabels } from "@/lib/catalog";
import { matchesArtist, tourActive, tourRange, unique } from "@/lib/kpop";
import { dateLabel } from "@/lib/dates";
import { Empty, ResourceCard } from "./ui";
const time = (s: string) => Date.parse(`${s}T12:00:00Z`);
export function Tours({ graph, today }: { graph: Resource[]; today: string }) {
  const [view, setView] = useState<"auto" | "timeline" | "cards">("auto"),
    [artist, setArtist] = useState("all"),
    [status, setStatus] = useState("all"),
    [period, setPeriod] = useState("all");
  const tours = unique(graph.filter((r) => r.type === "tours"));
  const selected = tours.filter(
    (r) =>
      matchesArtist(r, artist, graph) &&
      (status === "all" ||
        (status === "in_progress"
          ? tourActive(r, today)
          : r.attributes.status === status)) &&
      (period === "all" ||
        (String(r.attributes.startYear || "") <= period &&
          String(r.attributes.endYear || r.attributes.startYear || "") >=
            period)),
  );
  const valid = selected
    .flatMap((r) => {
      const range = tourRange(r);
      return range ? [{ r, ...range }] : [];
    })
    .sort((a, b) => a.start.localeCompare(b.start));
  const incomplete = selected.filter((r) => !tourRange(r));
  const min = valid.length
      ? Math.min(...valid.map((t) => time(t.start)))
      : time(today),
    max = valid.length ? Math.max(...valid.map((t) => time(t.end))) : min,
    span = Math.max(86400000, max - min);
  const years = [
    ...new Set(
      tours.flatMap((r) => {
        const start = Number(r.attributes.startYear),
          end = Number(r.attributes.endYear || start);
        return start > 0 && end >= start && end - start < 200
          ? Array.from({ length: end - start + 1 }, (_, i) => String(start + i))
          : [];
      }),
    ),
  ]
    .sort()
    .reverse();
  return (
    <div className={`tours-view view-${view}`}>
      <div className="toolbar">
        <select
          className="field"
          aria-label="Artista de los tours"
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
        >
          <option value="all">Todos los artistas</option>
          {graph
            .filter((r) => r.type === "artists")
            .map((r) => (
              <option key={r.id} value={r.id}>
                {resourceName(r, graph)}
              </option>
            ))}
        </select>
        <select
          className="field"
          aria-label="Estado del tour"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">Todos los estados</option>
          {[
            "announced",
            "scheduled",
            "in_progress",
            "postponed",
            "cancelled",
            "completed",
          ].map((s) => (
            <option key={s} value={s}>
              {statusLabels[s]}
            </option>
          ))}
        </select>
        <select
          className="field"
          aria-label="Periodo de tours"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option value="all">Todos los años</option>
          {years.map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
        <div className="view-switch">
          <button
            className={`button secondary ${view === "auto" ? "auto-timeline" : ""}`}
            aria-pressed={view === "timeline"}
            onClick={() => setView("timeline")}
          >
            Línea de tiempo
          </button>
          <button
            className={`button secondary ${view === "auto" ? "auto-cards" : ""}`}
            aria-pressed={view === "cards"}
            onClick={() => setView("cards")}
          >
            Tarjetas
          </button>
        </div>
      </div>
      <p className="small-text tour-note">
        {selected.length} tours · El estado editorial y las fechas se muestran
        por separado.
      </p>
      {!selected.length && <Empty text="No hay tours para estos filtros." />}
      <div className="tour-cards grid three">
        {selected.map((r) => (
          <ResourceCard key={r.id} resource={r} graph={graph} />
        ))}
      </div>
      <div className="tour-timeline">
        {valid.length > 0 && (
          <div
            className="timeline-scroll"
            tabIndex={0}
            role="region"
            aria-label="Línea de tiempo de tours"
          >
            <div className="timeline-inner">
              <div className="timeline-axis">
                <span>Tour / estado editorial</span>
                <div>
                  <span>{new Date(min).toISOString().slice(0, 10)}</span>
                  <span>{new Date(max).toISOString().slice(0, 10)}</span>
                </div>
              </div>
              {valid.map(({ r, start, end }) => (
                <div className="timeline-row" key={r.id}>
                  <div>
                    <Link href={href(r)}>
                      <b>{resourceName(r, graph)}</b>
                    </Link>
                    <small>
                      {statusLabels[String(r.attributes.status)]} ·{" "}
                      {tourActive(r, today)
                        ? "En curso"
                        : end < today
                          ? "Periodo pasado"
                          : start > today
                            ? "Periodo futuro"
                            : "Periodo actual"}
                    </small>
                  </div>
                  <div className="timeline-track">
                    {time(today) >= min && time(today) <= max && (
                      <span
                        className="today-marker"
                        style={{
                          left: `${((time(today) - min) / span) * 100}%`,
                        }}
                        title="Hoy"
                      />
                    )}
                    <Link
                      className={`tour-bar status-${r.attributes.status}`}
                      style={{
                        left: `${((time(start) - min) / span) * 100}%`,
                        width: `${Math.max(0.5, ((time(end) - time(start)) / span) * 100)}%`,
                      }}
                      href={href(r)}
                      aria-label={`${resourceName(r, graph)}: ${dateLabel(r.attributes)} a ${dateLabel(r.attributes, "end")}`}
                      title={`${start} → ${end}`}
                    />
                    <span className="timeline-dates">
                      {start} → {end}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {incomplete.length > 0 && (
          <section className="panel">
            <h2>Fechas incompletas o por confirmar</h2>
            {incomplete.map((r) => (
              <Link className="resource-row" key={r.id} href={href(r)}>
                <b>{resourceName(r, graph)}</b>
                <small>
                  {dateLabel(r.attributes)} → {dateLabel(r.attributes, "end")}
                </small>
              </Link>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
