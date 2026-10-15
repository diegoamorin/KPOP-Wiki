"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Bell, Flag, MessageCircle } from "lucide-react";
import { api, envelope } from "@/lib/api/browser";
import type { Document, Resource, User } from "@/lib/api/types";
import { ErrorNotice } from "./ui";
import { ClientBoundary } from "./client-boundary";
const list = (doc?: Document) =>
  doc ? (Array.isArray(doc.data) ? doc.data : [doc.data]) : [];
function references(r: Resource, key: string, id: string) {
  const ref = r.relationships?.[key]?.data;
  return ref && !Array.isArray(ref) && ref.id === id;
}
export function PageActions(props: Parameters<typeof PageActionsContent>[0]) {
  return (
    <ClientBoundary>
      <PageActionsContent {...props} />
    </ClientBoundary>
  );
}
function PageActionsContent({
  pageId,
  recordingId,
}: {
  pageId: string;
  recordingId?: string;
}) {
  const me = useQuery({
      queryKey: ["session"],
      queryFn: () => api<User>("auth/me"),
    }),
    client = useQueryClient();
  const watch = useQuery({
    queryKey: ["watchlists", me.data?.id],
    queryFn: () => api("me/wiki-watchlists"),
    enabled: !!me.data,
  });
  const likes = useQuery({
    queryKey: ["likes", me.data?.id],
    queryFn: () => api("me/recording-likes"),
    enabled: !!me.data && !!recordingId,
  });
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [report, setReport] = useState(false),
    [sent, setSent] = useState(false);
  const watched = list(watch.data).find((r) => references(r, "page", pageId)),
    liked = list(likes.data).find((r) =>
      references(r, "recording", recordingId || ""),
    );
  async function toggle(kind: "watch" | "like") {
    setBusy(true);
    setError("");
    const existing = kind === "watch" ? watched : liked,
      path = kind === "watch" ? "me/wiki-watchlists" : "me/recording-likes",
      type = kind === "watch" ? "wiki-watchlists" : "recording-likes";
    try {
      await api(
        existing ? `${path}/${existing.id}` : path,
        existing ? "DELETE" : "POST",
        existing
          ? undefined
          : envelope(
              type,
              {},
              kind === "watch"
                ? { page: { data: { type: "wiki-pages", id: pageId } } }
                : {
                    recording: {
                      data: { type: "recordings", id: recordingId },
                    },
                  },
            ),
      );
      await client.invalidateQueries({
        queryKey: [kind === "watch" ? "watchlists" : "likes"],
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!me.data)
    return (
      <p className="small-text" style={{ marginTop: 18 }}>
        <Link href="/login">Inicia sesión</Link> para guardar favoritos, seguir
        páginas o reportar un dato.
      </p>
    );
  return (
    <>
      <div className="form-actions">
        {recordingId && (
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => toggle("like")}
            aria-pressed={!!liked}
          >
            <Heart size={14} fill={liked ? "currentColor" : "none"} />
            {liked ? "En favoritos" : "Me gusta"}
          </button>
        )}
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => toggle("watch")}
          aria-pressed={!!watched}
        >
          <Bell size={14} />
          {watched ? "Siguiendo" : "Seguir cambios"}
        </button>
        <button className="button secondary" onClick={() => setReport(!report)}>
          <Flag size={14} /> Reportar
        </button>
      </div>
      {error && <ErrorNotice message={error} />}{" "}
      {report && (
        <form
          className="panel"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            setBusy(true);
            try {
              await api(
                "wiki/reports",
                "POST",
                envelope(
                  "wiki-reports",
                  {
                    category: form.get("category"),
                    reason: form.get("reason"),
                  },
                  { page: { data: { type: "wiki-pages", id: pageId } } },
                ),
              );
              setSent(true);
              setReport(false);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="form-field">
            Categoría
            <select className="field" name="category">
              <option value="incorrect_data">Datos incorrectos</option>
              <option value="vandalism">Vandalismo</option>
              <option value="harassment">Acoso</option>
              <option value="privacy">Privacidad</option>
              <option value="spam">Spam</option>
              <option value="other">Otro</option>
            </select>
          </label>
          <label className="form-field">
            Explica el problema
            <textarea className="field" name="reason" required />
          </label>
          <button className="button primary" disabled={busy}>
            Enviar reporte privado
          </button>
        </form>
      )}
      {sent && (
        <div className="notice success">Tu reporte privado fue enviado.</div>
      )}
    </>
  );
}
export function Discussion(props: Parameters<typeof DiscussionContent>[0]) {
  return (
    <ClientBoundary>
      <DiscussionContent {...props} />
    </ClientBoundary>
  );
}
function DiscussionContent({
  pageId,
  changesetId,
}: {
  pageId?: string;
  changesetId?: string;
}) {
  const client = useQueryClient(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [reply, setReply] = useState<string | undefined>();
  const threads = useQuery({
    queryKey: ["threads"],
    queryFn: () => api("wiki/threads?page[size]=100"),
  });
  const thread = list(threads.data).find((r) =>
    references(r, pageId ? "page" : "changeset", pageId || changesetId || ""),
  );
  const comments = useQuery({
    queryKey: ["comments", thread?.id],
    queryFn: () => api(`wiki/threads/${thread!.id}/comments?page[size]=100`),
    enabled: !!thread,
  });
  const me = useQuery({
    queryKey: ["session"],
    queryFn: () => api<User>("auth/me"),
  });
  return (
    <section className="panel">
      <h2>Hablemos de esta historia.</h2>
      <p className="small-text">
        Comparte fuentes y ayuda a mejorar el contenido con respeto.
      </p>
      {list(comments.data).map((comment) => (
        <article className="comment" key={comment.id}>
          <span className="small-text">
            {String(comment.attributes.createdAt || "")}{" "}
            {references(comment, "parent", comment.id) ? "Respuesta" : ""}
          </span>
          <p className="rich-text">
            {String(comment.attributes.body || "Contenido no disponible")}
          </p>
          {me.data && (
            <button
              className="link-button"
              onClick={() => setReply(comment.id)}
            >
              Responder
            </button>
          )}
        </article>
      ))}
      {me.data ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget,
              body = String(new FormData(form).get("body"));
            setBusy(true);
            setError("");
            try {
              let id = thread?.id;
              if (!id) {
                const doc = await api(
                  "wiki/threads",
                  "POST",
                  envelope(
                    "wiki-threads",
                    {},
                    pageId
                      ? { page: { data: { type: "wiki-pages", id: pageId } } }
                      : {
                          changeset: {
                            data: { type: "wiki-changesets", id: changesetId },
                          },
                        },
                  ),
                );
                id = (Array.isArray(doc.data) ? doc.data[0] : doc.data).id;
              }
              await api(
                "wiki/comments",
                "POST",
                envelope(
                  "wiki-comments",
                  { body },
                  {
                    thread: { data: { type: "wiki-threads", id } },
                    ...(reply
                      ? {
                          parent: {
                            data: { type: "wiki-comments", id: reply },
                          },
                        }
                      : {}),
                  },
                ),
              );
              form.reset();
              setReply(undefined);
              await client.invalidateQueries({ queryKey: ["threads"] });
              await client.invalidateQueries({ queryKey: ["comments"] });
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="form-field" style={{ marginTop: 20 }}>
            {reply ? "Tu respuesta" : "Tu aportación"}
            <textarea
              className="field"
              name="body"
              required
              placeholder="Una fuente, una pregunta, una idea…"
            />
          </label>
          {reply && (
            <button
              type="button"
              className="link-button"
              onClick={() => setReply(undefined)}
            >
              Cancelar respuesta
            </button>
          )}
          <button disabled={busy} className="button primary">
            <MessageCircle size={14} />
            {busy ? "Publicando…" : "Publicar comentario"}
          </button>
        </form>
      ) : (
        <p style={{ marginTop: 20 }} className="small-text">
          <Link href="/login">Inicia sesión</Link> para participar.
        </p>
      )}
      {error && <ErrorNotice message={error} />}
    </section>
  );
}
