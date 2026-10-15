"use client";
import { useState } from "react";
import type { Resource } from "@/lib/api/types";
import { resourceName } from "@/lib/catalog";
import { catalogStats, unique } from "@/lib/kpop";
const kinds = {
  album: "Álbumes",
  ep: "EPs",
  single: "Singles",
  other: "Otros",
};
export function CatalogCharts({ graph }: { graph: Resource[] }) {
  const [artist, setArtist] = useState("all");
  const stats = catalogStats(graph, artist),
    maxYear = Math.max(
      1,
      ...stats.years.map(([, c]) =>
        Object.values(c).reduce((a, b) => a + b, 0),
      ),
    ),
    maxCountry = Math.max(1, ...stats.countries.map((c) => c.count));
  return (
    <section className="content-section catalog-charts">
      <div className="section-heading">
        <div>
          <p className="eyebrow">EL K-POP EN NUESTRA WIKI</p>
          <h2>Historias en números.</h2>
          <p>
            Estadísticas del catálogo registrado, una historia que sigue
            creciendo.
          </p>
        </div>
        <select
          className="field"
          aria-label="Artista de las estadísticas"
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
        >
          <option value="all">Todos los artistas</option>
          {unique(graph.filter((r) => r.type === "artists")).map((r) => (
            <option key={r.id} value={r.id}>
              {resourceName(r, graph)}
            </option>
          ))}
        </select>
      </div>
      <div className="grid two">
        <section className="panel">
          <h3>Lanzamientos por año</h3>
          <div className="chart-legend">
            {Object.entries(kinds).map(([k, v]) => (
              <span className={`chart-key ${k}`} key={k}>
                {v}
              </span>
            ))}
          </div>
          <div
            className="chart-bars"
            role="img"
            aria-label="Lanzamientos por año; valores disponibles en la tabla inferior"
          >
            {stats.years.map(([year, counts]) => (
              <div className="chart-row" key={year}>
                <span>{year}</span>
                <div className="stacked-track">
                  {Object.entries(counts).map(([kind, count]) => (
                    <span
                      key={kind}
                      className={`chart-segment ${kind}`}
                      style={{ width: `${(count / maxYear) * 100}%` }}
                      title={`${kinds[kind as keyof typeof kinds]}: ${count}`}
                    />
                  ))}
                </div>
                <b>{Object.values(counts).reduce((a, b) => a + b, 0)}</b>
              </div>
            ))}
          </div>
          {!stats.years.length && (
            <p>No hay lanzamientos con año registrado.</p>
          )}
          <p className="small-text">Sin año: {stats.missingYear}</p>
          <details>
            <summary>Ver tabla de lanzamientos</summary>
            <div className="table-scroll">
              <table>
                <caption>Lanzamientos registrados por año y tipo</caption>
                <thead>
                  <tr>
                    <th>Año</th>
                    {Object.values(kinds).map((k) => (
                      <th key={k}>{k}</th>
                    ))}
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.years.map(([year, c]) => (
                    <tr key={year}>
                      <th>{year}</th>
                      {Object.keys(kinds).map((k) => (
                        <td key={k}>{c[k]}</td>
                      ))}
                      <td>{Object.values(c).reduce((a, b) => a + b, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>
        <section className="panel">
          <h3>Conciertos por país</h3>
          <p className="small-text">
            Incluye todos los estados publicados, también cancelados y
            pospuestos. No representa actuaciones realizadas.
          </p>
          <div
            className="chart-bars"
            role="img"
            aria-label="Conciertos por país; valores disponibles en la tabla inferior"
          >
            {stats.countries.map((c) => (
              <div className="chart-row country-row" key={c.name}>
                <span>{c.name}</span>
                <div className="stacked-track">
                  <span
                    className="chart-segment country"
                    style={{ width: `${(c.count / maxCountry) * 100}%` }}
                  />
                </div>
                <b>{c.count}</b>
              </div>
            ))}
          </div>
          {!stats.countries.length && (
            <p>No hay conciertos con país registrado.</p>
          )}
          <p className="small-text">Sin país: {stats.missingCountry}</p>
          <details>
            <summary>Ver tabla de conciertos</summary>
            <table>
              <caption>Conciertos registrados por país</caption>
              <thead>
                <tr>
                  <th>País</th>
                  <th>Conciertos</th>
                </tr>
              </thead>
              <tbody>
                {stats.countries.map((c) => (
                  <tr key={c.name}>
                    <th>{c.name}</th>
                    <td>{c.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </section>
      </div>
    </section>
  );
}
