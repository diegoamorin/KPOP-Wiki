"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/browser";
import type { Document, Resource } from "@/lib/api/types";
import { ClientBoundary } from "./client-boundary";
function one(doc: Document) {
  return Array.isArray(doc.data) ? doc.data[0] : doc.data;
}
export function Sources({ pageId }: { pageId: string }) {
  return (
    <ClientBoundary>
      <SourceList pageId={pageId} />
    </ClientBoundary>
  );
}
function SourceList({ pageId }: { pageId: string }) {
  const sources = useQuery({
    queryKey: ["published-sources", pageId],
    queryFn: async () => {
      const page = one(await api("wiki/pages/" + pageId));
      const revisionId = page.attributes.currentRevisionId;
      if (!revisionId) return [];
      const revision = one(await api("wiki/revisions/" + revisionId));
      const refs = revision.attributes.sources as
        { sourceId: string; targetPath: string }[] | undefined;
      const ids = [...new Set((refs || []).map((ref) => ref.sourceId))];
      return Promise.all(
        ids.map(async (id) => one(await api("wiki/sources/" + id))),
      );
    },
  });
  if (sources.isPending)
    return <p className="small-text">Consultando fuentes publicadas…</p>;
  if (sources.error)
    return (
      <p className="small-text">
        Las fuentes de esta versión no están disponibles.
      </p>
    );
  if (!sources.data?.length) return null;
  return (
    <section className="panel">
      <h2>Fuentes de esta historia</h2>
      {sources.data.map((r: Resource) => (
        <article key={r.id} className="result-record">
          <p className="small-text">
            {String(r.attributes.title || "Referencia bibliográfica")}
          </p>
          {r.attributes.url &&
            /^https?:\/\//.test(String(r.attributes.url)) && (
              <a
                className="small-text"
                href={String(r.attributes.url)}
                rel="noopener noreferrer"
                target="_blank"
              >
                Consultar fuente ↗
              </a>
            )}
          {r.attributes.citation && (
            <p className="small-text">{String(r.attributes.citation)}</p>
          )}
        </article>
      ))}
    </section>
  );
}
