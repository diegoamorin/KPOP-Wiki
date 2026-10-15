"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api, envelope } from "@/lib/api/browser";
import { operations, validate } from "@/lib/api/contract";
import type {
  Document,
  Resource,
  Schema,
  Snapshot,
  User,
  Value,
} from "@/lib/api/types";
import schemas from "@/lib/api/field-schemas.json";
import { SchemaField, defaults } from "./schema-form";
import { Empty, ErrorNotice } from "./ui";
import { editCandidate } from "@/lib/editor";
import { Discussion } from "./social";
import { OperationForm, ResultView } from "./workbench";
import { ClientBoundary } from "./client-boundary";
const names: Record<string, string> = {
  identity: "Identidad / artista",
  recording: "Grabación / canción",
  release: "Álbum / lanzamiento",
  work: "Obra musical",
  event: "Evento",
  tour: "Tour",
};
const prefixes: Record<string, string> = {
  identity: "Identity",
  recording: "Recording",
  release: "Release",
  work: "Work",
  event: "Event",
  tour: "Tour",
};
function single(doc: Document) {
  return Array.isArray(doc.data) ? doc.data[0] : doc.data;
}
function snapshotSchema(kind: string) {
  const op =
    operations.find((o) => o.id === "ChangesetsController_create") ||
    operations.find(
      (o) => o.path === "/api/wiki/changesets" && o.method === "POST",
    );
  return op?.body?.properties?.data?.properties?.attributes?.properties?.items?.items?.properties?.snapshot?.oneOf?.find(
    (s) => s.properties?.kind?.enum?.includes(kind),
  );
}
export function WikiEditor(props: Parameters<typeof WikiEditorContent>[0]) {
  return (
    <ClientBoundary>
      <WikiEditorContent {...props} />
    </ClientBoundary>
  );
}
function WikiEditorContent({
  pageId,
  graph,
}: {
  pageId?: string;
  graph: Resource[];
}) {
  const me = useQuery({
    queryKey: ["session"],
    queryFn: () => api<User>("auth/me"),
  });
  const page = useQuery({
    queryKey: ["wiki-page", pageId],
    queryFn: () => api(`wiki/pages/${pageId}`),
    enabled: !!pageId,
  });
  const original = page.data ? single(page.data) : undefined;
  const revisionId = original?.attributes.currentRevisionId;
  const revision = useQuery({
    queryKey: ["wiki-revision", revisionId],
    queryFn: () => api(`wiki/revisions/${revisionId}`),
    enabled: !!revisionId,
  });
  if (me.isPending || (pageId && (page.isPending || revision.isPending)))
    return (
      <p className="notice" role="status">
        Preparando tu espacio de edición…
      </p>
    );
  if (!me.data)
    return (
      <>
        <Empty
          title="Cada dato cuenta."
          text="Inicia sesión para proponer una mejora o añadir una nueva historia."
        />
        <Link className="button primary" href="/login">
          Iniciar sesión
        </Link>
      </>
    );
  if (!me.data.emailVerified)
    return (
      <div className="notice">
        Verifica tu correo antes de contribuir.{" "}
        <Link href="/solicitar-verificacion">Enviar verificación →</Link>
      </div>
    );
  if (page.error) return <ErrorNotice message={page.error.message} />;
  if (revision.error) return <ErrorNotice message={revision.error.message} />;
  const sources = revision.data ? single(revision.data).attributes.sources : [];
  return (
    <EditorForm
      key={pageId || "new"}
      original={original}
      graph={graph}
      existingSources={
        Array.isArray(sources)
          ? (sources as { sourceId: string; targetPath: string }[])
          : []
      }
    />
  );
}
function EditorForm({
  original,
  graph,
  existingSources,
}: {
  original?: Resource;
  graph: Resource[];
  existingSources: { sourceId: string; targetPath: string }[];
}) {
  const initial = original?.attributes.snapshot as unknown as
    Snapshot | undefined;
  const [kind, setKind] = useState(initial?.kind || "recording"),
    [fields, setFields] = useState<Value>(
      initial?.fields ||
        defaults((schemas as Record<string, Schema>).RecordingFieldsDto),
    ),
    [components, setComponents] = useState<Value>(initial?.components || {}),
    [summary, setSummary] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [preview, setPreview] = useState(false),
    [sourceIds, setSources] =
      useState<{ sourceId: string; targetPath: string }[]>(existingSources),
    [sourceState, setSourceState] = useState(""),
    [conflict, setConflict] = useState<unknown>();
  const router = useRouter(),
    prefix = prefixes[kind],
    schema = snapshotSchema(kind),
    fieldSchema = (schemas as Record<string, Schema>)[prefix + "FieldsDto"];
  const fieldRecord = fields as Record<string, Value>,
    componentRecord = components as Record<string, Record<string, Value>>;
  const snapshot: Snapshot = {
    ...(initial || {}),
    kind,
    fields: fieldRecord,
    components: componentRecord,
  };
  const candidate = original
    ? {
        ...editCandidate(
          original.id,
          String(original.attributes.currentRevisionId || ""),
          initial!,
          fieldRecord,
        ),
        snapshot,
        sources: sourceIds,
      }
    : { operation: "create", snapshot, sources: sourceIds };
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const errors = validate(fieldSchema, fields);
    if (errors.length) {
      setError(errors.join("\n"));
      setBusy(false);
      return;
    }
    try {
      const doc = await api(
        "wiki/changesets",
        "POST",
        envelope("wiki-changesets", { summary, items: [candidate] }),
      );
      router.push(`/wiki/propuestas/${single(doc).id}`);
    } catch (e) {
      setError((e as Error).message);
      if (original) {
        try {
          const latest = await api(`wiki/pages/${original.id}`);
          setConflict(single(latest).attributes.snapshot);
        } catch {
          /* Preserve the submitted form if the latest version is unavailable. */
        }
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="editor-layout">
      <div className="notice">
        Tu aportación se guardará como propuesta. Su publicación seguirá las
        revisiones que indique la API.
      </div>
      <form onSubmit={save}>
        <section className="panel">
          <h2>{original ? "Mejorar esta historia" : "Una nueva historia"}</h2>
          {!original && (
            <label className="form-field">
              ¿Qué vas a añadir?
              <select
                className="field"
                value={kind}
                onChange={(e) => {
                  const k = e.target.value;
                  setKind(k);
                  setFields(
                    defaults(
                      (schemas as Record<string, Schema>)[
                        prefixes[k] + "FieldsDto"
                      ],
                    ),
                  );
                  setComponents({});
                }}
              >
                {Object.entries(names).map(([k, n]) => (
                  <option key={k} value={k}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          )}
          <SchemaField
            name="fields"
            schema={
              original && kind === "identity"
                ? {
                    ...fieldSchema,
                    properties: {
                      ...fieldSchema.properties,
                      type: {
                        ...fieldSchema.properties?.type,
                        enum: [String(initial?.fields.type)],
                      },
                    },
                  }
                : fieldSchema
            }
            value={fields}
            onChange={(v) => setFields(v || {})}
            graph={graph}
            required
          />
        </section>
        <section className="panel">
          <h2>Relaciones y créditos</h2>
          <p className="small-text">
            Añade artistas, pistas, redes, fuentes y créditos conservando las
            relaciones existentes.
          </p>
          <SchemaField
            name="components"
            schema={schema?.properties?.components || { type: "object" }}
            value={components}
            onChange={(v) => setComponents(v || {})}
            graph={graph}
            required
          />
        </section>
        <section className="panel">
          <h2>Sobre tu contribución</h2>
          <label className="form-field">
            Resumen de los cambios
            <textarea
              className="field"
              required
              maxLength={2000}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Qué has cambiado y en qué fuente te basas…"
            />
          </label>
          <button
            type="button"
            className="button secondary"
            onClick={() => setPreview(!preview)}
          >
            Vista previa de la propuesta
          </button>
          {preview && (
            <>
              <dl className="data-list">
                {Object.entries(fieldRecord).map(([k, v]) => (
                  <div key={k} style={{ display: "contents" }}>
                    <dt>{k}</dt>
                    <dd>
                      {typeof v === "object"
                        ? JSON.stringify(v)
                        : String(v ?? "Sin confirmar")}
                    </dd>
                  </div>
                ))}
              </dl>
              <details>
                <summary>Comparar con el contenido publicado</summary>
                <div className="grid two">
                  <pre className="json-preview">
                    {JSON.stringify(initial || {}, null, 2)}
                  </pre>
                  <pre className="json-preview">
                    {JSON.stringify(snapshot, null, 2)}
                  </pre>
                </div>
              </details>
            </>
          )}
          {error && <ErrorNotice message={error} />}{" "}
          {conflict !== undefined && (
            <details open>
              <summary>
                Contenido actual: tu formulario se ha conservado
              </summary>
              <pre className="json-preview">
                {JSON.stringify(conflict, null, 2)}
              </pre>
            </details>
          )}
          <div className="form-actions">
            <button className="button primary" disabled={busy}>
              {busy ? "Guardando…" : "Guardar propuesta"}
            </button>
            <Link className="button secondary" href="/wiki">
              Volver a la wiki
            </Link>
          </div>
        </section>
      </form>
      <section className="panel">
        <h2>Una historia con fuentes.</h2>
        <p className="small-text">
          Añade evidencia verificable. Las fuentes se crean como registros
          inmutables.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSourceState("");
            const form = e.currentTarget,
              data = new FormData(form);
            try {
              const doc = await api(
                "wiki/sources",
                "POST",
                envelope("wiki-sources", {
                  sourceType: "url",
                  title: data.get("title"),
                  url: data.get("url"),
                }),
              );
              setSources([
                ...sourceIds,
                {
                  sourceId: single(doc).id,
                  targetPath: String(data.get("targetPath")),
                },
              ]);
              setSourceState("Fuente añadida a esta propuesta.");
              form.reset();
            } catch (e) {
              setSourceState((e as Error).message);
            }
          }}
        >
          <label className="form-field">
            Título de la fuente
            <input className="field" name="title" required />
          </label>
          <label className="form-field">
            URL oficial
            <input className="field" name="url" type="url" required />
          </label>
          <label className="form-field">
            Campo que respalda
            <select className="field" name="targetPath">
              {Object.keys(fieldSchema.properties || {}).map((k) => (
                <option key={k} value={"fields/" + k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <button className="button secondary">Añadir fuente</button>
          {sourceState && (
            <div className="notice" role="status">
              {sourceState}
            </div>
          )}
          {sourceIds.length > 0 && (
            <p className="small-text">
              {sourceIds.length} fuentes vinculadas a tu propuesta.
            </p>
          )}
        </form>
      </section>
    </div>
  );
}
export function Proposal(props: Parameters<typeof ProposalContent>[0]) {
  return (
    <ClientBoundary>
      <ProposalContent {...props} />
    </ClientBoundary>
  );
}
function ProposalContent({ id, graph }: { id: string; graph: Resource[] }) {
  const [tab, setTab] = useState("detail");
  const doc = useQuery({
    queryKey: ["proposal", id],
    queryFn: () => api(`wiki/changesets/${id}`),
  });
  if (doc.isPending) return <p className="notice">Cargando propuesta…</p>;
  if (doc.error) return <ErrorNotice message={doc.error.message} />;
  const r = single(doc.data),
    attrs = r.attributes;
  const version = String(
    attrs.currentVersionId || attrs.submittedVersionId || attrs.versionId || "",
  );
  const actions = operations.filter(
    (o) => o.path.startsWith("/api/wiki/changesets/{id}") && o.method !== "GET",
  );
  const detail = operations.filter(
    (o) => o.path.startsWith("/api/wiki/versions/{id}") && o.method === "GET",
  );
  function initialBody(op: (typeof operations)[number]): Value | undefined {
    if (!op.body) return undefined;
    if (op.method === "PATCH")
      return {
        data: {
          type: "wiki-changesets",
          id,
          attributes: {
            expectedDraftVersion: Number(attrs.draftVersion || 1),
            summary: attrs.summary || "",
            items: attrs.items || [],
          },
        },
      };
    if (op.path.endsWith("/submit") || op.path.endsWith("/withdraw"))
      return { expectedDraftVersion: Number(attrs.draftVersion || 1) };
    if (op.path.endsWith("/reviews"))
      return {
        versionId: version,
        requirementId: "",
        decision: "approve",
        reason: "",
      };
    return { versionId: version };
  }
  return (
    <>
      <div className="panel">
        <ResultView result={doc.data} />
        <div className="tabs">
          <button
            className={tab === "detail" ? "selected" : ""}
            onClick={() => setTab("detail")}
          >
            Estado y contenido
          </button>
          {actions.map((o) => (
            <button
              className={tab === o.id ? "selected" : ""}
              key={o.id}
              onClick={() => setTab(o.id)}
            >
              {o.method === "PATCH"
                ? "Editar borrador"
                : o.path.endsWith("/submit")
                  ? "Enviar a revisión"
                  : o.path.endsWith("/publish")
                    ? "Publicar"
                    : o.path.endsWith("/withdraw")
                      ? "Retirar"
                      : "Revisar"}
            </button>
          ))}
          {detail.map((o) => (
            <button
              key={o.id}
              className={tab === o.id ? "selected" : ""}
              onClick={() => setTab(o.id)}
            >
              {o.path.endsWith("/requirements")
                ? "Requisitos"
                : o.path.endsWith("/reviews")
                  ? "Decisiones"
                  : "Versión enviada"}
            </button>
          ))}
        </div>
        {tab === "detail" ? (
          <pre className="json-preview">
            {JSON.stringify(attrs.items || attrs.snapshot || attrs, null, 2)}
          </pre>
        ) : (
          [...actions, ...detail]
            .filter((o) => o.id === tab)
            .map((op) => (
              <OperationForm
                key={op.id}
                operation={op}
                graph={graph}
                initialParams={{
                  id: op.path.includes("/versions/") ? version : id,
                }}
                initialBody={initialBody(op)}
                onResult={() => doc.refetch()}
              />
            ))
        )}
      </div>
      <Discussion changesetId={id} />
    </>
  );
}
