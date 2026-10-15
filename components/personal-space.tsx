"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, envelope } from "@/lib/api/browser";
import type { Document, Resource, User } from "@/lib/api/types";
import { href, resourceName } from "@/lib/catalog";
import { Empty, ErrorNotice } from "./ui";
import { Workbench, ResultView } from "./workbench";
import { ClientBoundary } from "./client-boundary";
const rows = (doc?: Document) =>
  doc ? (Array.isArray(doc.data) ? doc.data : [doc.data]) : [];
export function PersonalSpace(
  props: Parameters<typeof PersonalSpaceContent>[0],
) {
  return (
    <ClientBoundary>
      <PersonalSpaceContent {...props} />
    </ClientBoundary>
  );
}
function PersonalSpaceContent({
  graph,
  account = false,
}: {
  graph: Resource[];
  account?: boolean;
}) {
  const me = useQuery({
      queryKey: ["session"],
      queryFn: () => api<User>("auth/me"),
    }),
    client = useQueryClient(),
    router = useRouter(),
    params = useSearchParams();
  const tabs = account
    ? ["perfil", "seguridad", "herramientas"]
    : [
        "favoritos",
        "siguiendo",
        "notificaciones",
        "propuestas",
        "invitaciones",
      ];
  const [tab, setTab] = useState(params.get("tab") || tabs[0]),
    [page, setPage] = useState(1),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const paths: Record<string, string> = {
    favoritos: "me/recording-likes",
    siguiendo: "me/wiki-watchlists",
    notificaciones: "me/wiki-notifications?page[size]=100",
    propuestas: "wiki/changesets?page[size]=100",
    invitaciones: "artist-team-members",
  };
  const listing = useQuery({
    queryKey: ["personal", me.data?.id, tab, page],
    queryFn: () =>
      api(
        paths[tab] +
          (["notificaciones", "propuestas"].includes(tab)
            ? "&page[number]=" + page
            : ""),
      ),
    enabled: !!me.data && !!paths[tab],
  });
  if (me.isPending)
    return (
      <p className="notice" role="status">
        Preparando tu espacio…
      </p>
    );
  if (!me.data)
    return (
      <>
        <Empty
          title="Un universo aún más tuyo."
          text="Guarda tus canciones, sigue tus páginas y contribuye a nuestra historia."
        />
        <div className="form-actions">
          <Link className="button primary" href="/login">
            Iniciar sesión
          </Link>
          <Link className="button secondary" href="/registro">
            Crear una cuenta
          </Link>
        </div>
      </>
    );
  const user = me.data;
  async function mutate(path: string, method: string, body?: unknown) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api(path, method, body);
      await client.invalidateQueries();
      setMessage("Cambios guardados.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="tabs">
        {tabs.map((t) => (
          <button
            key={t}
            className={tab === t ? "selected" : ""}
            onClick={() => {
              setTab(t);
              setPage(1);
              setMessage("");
              setError("");
            }}
          >
            {
              (
                {
                  perfil: "Mi perfil",
                  seguridad: "Acceso y sesiones",
                  herramientas: "Opciones de cuenta",
                  favoritos: "Mis canciones",
                  siguiendo: "Páginas que sigo",
                  notificaciones: "Notificaciones",
                  propuestas: "Mis propuestas",
                  invitaciones: "Equipo e invitaciones",
                } as Record<string, string>
              )[t]
            }
          </button>
        ))}
      </div>
      {!user.emailVerified && (
        <div className="notice">
          Te falta verificar tu correo para contribuir.{" "}
          <Link href="/solicitar-verificacion">Enviar enlace →</Link>
        </div>
      )}
      {error && <ErrorNotice message={error} />}{" "}
      {message && (
        <div className="notice success" role="status">
          {message}
        </div>
      )}
      {tab === "perfil" ? (
        <form
          className="panel"
          key={user.id}
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            mutate(
              "users/me",
              "PATCH",
              envelope(
                "users",
                {
                  displayName: data.get("displayName"),
                  avatarUrl: data.get("avatarUrl") || "",
                  bio: data.get("bio") || "",
                },
                undefined,
                user.id,
              ),
            );
          }}
        >
          <h2>Hola, {user.displayName}.</h2>
          <label className="form-field">
            Nombre público
            <input
              name="displayName"
              className="field"
              defaultValue={user.displayName}
              required
            />
          </label>
          <label className="form-field">
            Avatar (URL)
            <input
              name="avatarUrl"
              type="url"
              className="field"
              defaultValue={user.avatarUrl || ""}
            />
          </label>
          <label className="form-field">
            Sobre ti
            <textarea
              name="bio"
              className="field"
              defaultValue={user.bio || ""}
            />
          </label>
          <button className="button primary" disabled={busy}>
            Guardar mi perfil
          </button>
          <p className="small-text" style={{ marginTop: 20 }}>
            Usuario: {user.username} · Correo: {user.email}
          </p>
          <Link
            className="button secondary"
            href={`/usuarios/${user.id}`}
            style={{ marginTop: 15 }}
          >
            Ver perfil público ↗
          </Link>
        </form>
      ) : tab === "seguridad" ? (
        <>
          <section className="panel">
            <h2>Tu acceso, bajo tu control.</h2>
            <div className="form-actions">
              <button
                className="button secondary"
                disabled={busy}
                onClick={async () => {
                  try {
                    await api("auth/logout", "POST");
                  } catch (error) {
                    setError((error as Error).message);
                    return;
                  }
                  {
                    await client.cancelQueries();
                    client.clear();
                    router.push("/login");
                    router.refresh();
                  }
                }}
              >
                Cerrar sesión
              </button>
              <button
                className="button secondary"
                disabled={busy}
                onClick={async () => {
                  try {
                    await api("auth/logout-all", "POST");
                  } catch (error) {
                    setError((error as Error).message);
                    return;
                  }
                  await client.cancelQueries();
                  client.clear();
                  router.push("/login");
                  router.refresh();
                }}
              >
                Cerrar todas las sesiones
              </button>
              <Link className="button secondary" href="/recuperar">
                Cambiar contraseña
              </Link>
            </div>
          </section>
          <Workbench group="cuenta" graph={graph} onlyFamily="auth-sessions" />
          <Workbench
            group="cuenta"
            graph={graph}
            onlyFamily="user-identities"
          />
        </>
      ) : tab === "herramientas" ? (
        <Workbench group="cuenta" graph={graph} />
      ) : (
        <>
          {listing.isPending ? (
            <p className="notice">Cargando…</p>
          ) : listing.error ? (
            <ErrorNotice message={listing.error.message} />
          ) : !rows(listing.data).length ? (
            <Empty text="Este espacio está esperando tus primeras historias." />
          ) : (
            <section className="panel">
              {rows(listing.data).map((r) => {
                const relationship =
                    tab === "favoritos"
                      ? "recording"
                      : tab === "siguiendo"
                        ? "page"
                        : undefined,
                  ref = relationship
                    ? r.relationships?.[relationship]?.data
                    : undefined;
                const target =
                  ref && !Array.isArray(ref)
                    ? graph.find(
                        (item) => item.type === ref.type && item.id === ref.id,
                      ) ||
                      graph.find((item) => {
                        const p = item.relationships?.page?.data;
                        return p && !Array.isArray(p) && p.id === ref.id;
                      })
                    : undefined;
                return (
                  <article key={r.id} className="result-record">
                    {target ? (
                      <Link className="resource-row" href={href(target)}>
                        <b>{resourceName(target, graph)}</b>
                        <span>↗</span>
                      </Link>
                    ) : (
                      <ResultView result={{ data: r }} />
                    )}
                    <div className="form-actions">
                      {["favoritos", "siguiendo"].includes(tab) && (
                        <button
                          disabled={busy}
                          className="button secondary"
                          onClick={() =>
                            mutate(paths[tab] + "/" + r.id, "DELETE")
                          }
                        >
                          Quitar de mi espacio
                        </button>
                      )}
                      {tab === "notificaciones" && (
                        <button
                          className="button secondary"
                          disabled={busy}
                          onClick={() =>
                            mutate(
                              "me/wiki-notifications/" + r.id,
                              "PATCH",
                              envelope(
                                "wiki-notifications",
                                { read: !r.attributes.readAt },
                                undefined,
                                r.id,
                              ),
                            )
                          }
                        >
                          {r.attributes.readAt
                            ? "Marcar como no leída"
                            : "Marcar como leída"}
                        </button>
                      )}
                      {tab === "invitaciones" && !r.attributes.acceptedAt && (
                        <button
                          className="button primary"
                          disabled={busy}
                          onClick={() =>
                            mutate(`artist-team-members/${r.id}/accept`, "POST")
                          }
                        >
                          Aceptar invitación
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </section>
          )}
          {(listing.data?.meta?.pages || 0) > 1 && (
            <div className="form-actions">
              <button
                className="button secondary"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                ← Anterior
              </button>
              <span className="small-text">
                Página {page} de {listing.data?.meta?.pages}
              </span>
              <button
                className="button secondary"
                disabled={page >= (listing.data?.meta?.pages || 1)}
                onClick={() => setPage(page + 1)}
              >
                Siguiente →
              </button>
            </div>
          )}
          {tab !== "propuestas" && (
            <details>
              <summary>Más opciones</summary>
              <Workbench
                group={
                  tab === "invitaciones" ? "equipo-editorial" : "mi-espacio"
                }
                graph={graph}
              />
            </details>
          )}
        </>
      )}
    </>
  );
}
