"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/browser";
import { operations } from "@/lib/api/contract";
import { label, typeLabels } from "@/lib/labels";
import type {
  Document,
  Operation,
  Resource,
  User,
  Value,
} from "@/lib/api/types";
import { resourceName, href } from "@/lib/catalog";
import { SchemaField, defaults } from "./schema-form";
import { ErrorNotice, Empty } from "./ui";
import { ValueView } from "./resource-details";
import { ClientBoundary } from "./client-boundary";
function family(op: Operation) {
  return op.path
    .replace("/api/", "")
    .replace(/^wiki\//, "")
    .replace(/^me\//, "")
    .split("/")[0];
}
function actionLabel(op: Operation) {
  const end = op.path.split("/").at(-1) || "",
    f = family(op);
  const special: Record<string, string> = {
    submit: "Enviar propuesta",
    publish: "Publicar versión",
    withdraw: "Retirar propuesta",
    accept: "Aceptar invitación",
    process: "Procesar envíos pendientes",
    retry: "Reintentar envío",
    requirements: "Requisitos de revisión",
    reviews:
      op.method === "POST" ? "Añadir decisión" : "Decisiones de revisión",
    revisions: "Historial de revisiones",
    state: "Cambiar estado del debate",
    import: "Preparar importación",
    visibility: "Cambiar visibilidad",
    login: "Iniciar sesión",
    register: "Crear cuenta",
    refresh: "Renovar sesión",
    logout: "Cerrar sesión",
    "logout-all": "Cerrar todas las sesiones",
    "verification-request": "Enviar verificación",
    "verify-email": "Verificar correo",
    "password-reset-request": "Enviar recuperación",
    "password-reset": "Restablecer contraseña",
  };
  return (
    special[end] ||
    `${op.method === "GET" ? "Consultar" : op.method === "POST" ? "Crear" : op.method === "DELETE" ? "Eliminar / revocar" : "Actualizar"} ${typeLabels[f] || label(f)}${end === "{id}" ? " · detalle" : ""}`
  );
}
function flatten(doc: unknown): Resource[] {
  if (!doc || typeof doc !== "object") return [];
  const data = (doc as Document).data;
  return Array.isArray(data) ? data : data ? [data] : [];
}
export function ResultView({
  result,
  onSelect,
}: {
  result: unknown;
  onSelect?: (r: Resource) => void;
}) {
  const doc = result as Document,
    rows = flatten(result);
  if (!rows.length) {
    if (doc?.meta?.total === 0 || Array.isArray(doc?.data))
      return <Empty text="No hay registros visibles para tu cuenta." />;
    return (
      <dl className="data-list">
        {Object.entries((result as Record<string, Value>) || {})
          .filter(([k]) => !["accessToken", "refreshToken"].includes(k))
          .map(([k, v]) => (
            <div key={k} style={{ display: "contents" }}>
              <dt>{label(k)}</dt>
              <dd>
                <ValueView value={v} />
              </dd>
            </div>
          ))}
      </dl>
    );
  }
  return (
    <>
      {doc.meta && (
        <p className="small-text">
          {doc.meta.total} registros · Página {doc.meta.page} de{" "}
          {doc.meta.pages}
        </p>
      )}
      {rows.map((r) => (
        <article className="result-record" key={r.type + r.id}>
          <div className="section-heading">
            <h3>{resourceName(r, rows)}</h3>
            {onSelect && (
              <button className="button secondary" onClick={() => onSelect(r)}>
                Usar este registro
              </button>
            )}
          </div>
          <dl className="data-list">
            {Object.entries(r.attributes || {})
              .filter(([k]) => !["snapshot", "items"].includes(k))
              .map(([k, v]) => (
                <div key={k} style={{ display: "contents" }}>
                  <dt>{label(k)}</dt>
                  <dd>
                    <ValueView value={v} />
                  </dd>
                </div>
              ))}
          </dl>
          {r.attributes.snapshot && (
            <details>
              <summary>Contenido de la versión</summary>
              <pre className="json-preview">
                {JSON.stringify(r.attributes.snapshot, null, 2)}
              </pre>
            </details>
          )}
          {r.type === "wiki-changesets" && (
            <Link
              className="button secondary"
              href={`/wiki/propuestas/${r.id}`}
            >
              Abrir propuesta →
            </Link>
          )}
          {r.type === "wiki-pages" && (
            <Link className="button secondary" href={`/wiki/editar/${r.id}`}>
              Proponer una mejora →
            </Link>
          )}
          {Object.entries(r.relationships || {}).map(([k, v]) => (
            <div className="small-text" key={k}>
              {label(k)}:{" "}
              {(Array.isArray(v.data) ? v.data : v.data ? [v.data] : []).map(
                (ref) => (
                  <span key={ref.type + ref.id}>
                    {[
                      "artists",
                      "catalog-identities",
                      "recordings",
                      "releases",
                      "events",
                      "tours",
                      "works",
                      "users",
                    ].includes(ref.type) ? (
                      <Link href={href(ref)}>{ref.type} ↗ </Link>
                    ) : (
                      ref.id + " "
                    )}
                  </span>
                ),
              )}
            </div>
          ))}
        </article>
      ))}
    </>
  );
}
export function OperationForm(
  props: Parameters<typeof OperationFormContent>[0],
) {
  return (
    <ClientBoundary>
      <OperationFormContent {...props} />
    </ClientBoundary>
  );
}
function OperationFormContent({
  operation: op,
  graph = [],
  initialParams = {},
  initialBody,
  onResult,
}: {
  operation: Operation;
  graph?: Resource[];
  initialParams?: Record<string, string>;
  initialBody?: Value;
  onResult?: (r: unknown) => void;
}) {
  const [params, setParams] = useState<Record<string, string>>(initialParams),
    [body, setBody] = useState<Value | undefined>(
      initialBody ??
        (op.body && op.path !== "/api/auth/refresh"
          ? defaults(op.body)
          : undefined),
    ),
    [result, setResult] = useState<unknown>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [confirmed, setConfirmed] = useState(false),
    [key, setKey] = useState("");
  const client = useQueryClient();
  const fields = op.parameters.filter(
    (p, i, arr) =>
      p.in !== "header" &&
      arr.findIndex((item) => item.name === p.name && item.in === p.in) === i,
  );
  async function run(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      let path = op.path;
      const query = new URLSearchParams();
      for (const p of fields) {
        if (p.in === "path") {
          if (!params[p.name]) throw new Error(`Completa ${label(p.name)}`);
          path = path.replace(
            `{${p.name}}`,
            encodeURIComponent(params[p.name]),
          );
        } else if (params[p.name]) query.set(p.name, params[p.name]);
      }
      if (
        op.method === "GET" &&
        !fields.some((p) => p.in === "query" && p.name === "page[number]") &&
        !path.includes("/relationships/")
      ) {
        /* Preserve backend defaults. */
      }
      const requestKey = key || crypto.randomUUID();
      setKey(requestKey);
      const response = await api(
        path + (query.size ? "?" + query : ""),
        op.method,
        body,
        requestKey,
      );
      setResult(response);
      onResult?.(response);
      if (op.method !== "GET") {
        await client.invalidateQueries();
        setKey("");
        setConfirmed(false);
      }
      if (/\/auth\/logout|\/users\/me$/.test(path) && op.method === "DELETE") {
        await client.cancelQueries();
        client.clear();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="operation-form" onSubmit={run}>
      <h2>{actionLabel(op)}</h2>
      <div className="form-grid">
        {fields.map((p) => (
          <label className="form-field" key={p.name}>
            {label(p.name)}
            {p.required ? " *" : ""}
            <input
              className="field"
              value={params[p.name] || ""}
              onChange={(e) => {
                setParams({ ...params, [p.name]: e.target.value });
                setKey("");
              }}
              required={p.required}
              placeholder={
                p.in === "path"
                  ? "Selecciona un registro o indica su identificador"
                  : ""
              }
            />
          </label>
        ))}
      </div>
      {op.body && op.path !== "/api/auth/refresh" && (
        <SchemaField
          name="Formulario"
          schema={op.body}
          value={body}
          onChange={(v) => {
            setBody(v);
            setKey("");
          }}
          graph={graph}
          required
        />
      )}
      {op.method !== "GET" && (
        <label className="confirmation">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            required
          />{" "}
          Confirmo esta acción y los datos indicados.
        </label>
      )}
      {error && <ErrorNotice message={error} />}
      <div className="form-actions">
        <button
          className={`button ${op.method === "DELETE" ? "danger" : "primary"}`}
          disabled={busy || (op.method !== "GET" && !confirmed)}
        >
          {busy
            ? "Un momento…"
            : op.method === "GET"
              ? "Consultar"
              : actionLabel(op)}
        </button>
      </div>
      {result !== undefined && (
        <section className="panel" style={{ marginTop: 24 }}>
          <div className="notice success" role="status">
            {op.method === "GET"
              ? "Consulta completada."
              : "La API ha confirmado la operación."}
          </div>
          <ResultView
            result={result}
            onSelect={(r) => setParams({ ...params, id: r.id })}
          />
        </section>
      )}
    </form>
  );
}
export function Workbench(props: Parameters<typeof WorkbenchContent>[0]) {
  return (
    <ClientBoundary>
      <WorkbenchContent {...props} />
    </ClientBoundary>
  );
}
function WorkbenchContent({
  group,
  graph = [],
  onlyFamily,
}: {
  group: string;
  graph?: Resource[];
  onlyFamily?: string;
}) {
  const me = useQuery({
    queryKey: ["session"],
    queryFn: () => api<User>("auth/me"),
  });
  const available = useMemo(
    () =>
      operations.filter(
        (op) =>
          op.group === group && (!onlyFamily || family(op) === onlyFamily),
      ),
    [group, onlyFamily],
  );
  const families = [...new Set(available.map(family))];
  const [selectedFamily, setFamily] = useState(onlyFamily || families[0] || ""),
    [selected, setSelected] = useState<Operation>(),
    [filter, setFilter] = useState("");
  if (me.isPending)
    return (
      <p className="notice" role="status">
        Comprobando tu sesión…
      </p>
    );
  if (!me.data && group !== "catalogo")
    return (
      <Empty
        title="Tu aportación empieza aquí."
        text="Inicia sesión para acceder a tus herramientas. La API comprobará los permisos de cada acción."
      />
    );
  return (
    <>
      <div className="tabs">
        {families.map((f) => (
          <button
            key={f}
            className={selectedFamily === f ? "selected" : ""}
            onClick={() => {
              setFamily(f);
              setSelected(undefined);
            }}
          >
            {typeLabels[f] || label(f)}
          </button>
        ))}
      </div>
      <div className="toolbar">
        <input
          className="filter-input"
          aria-label="Buscar herramienta"
          placeholder="Buscar una herramienta…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      <div className="operation-list">
        {available
          .filter(
            (op) =>
              family(op) === selectedFamily &&
              actionLabel(op).toLowerCase().includes(filter.toLowerCase()),
          )
          .map((op) => (
            <button
              className={`operation-card ${selected?.id === op.id ? "selected" : ""}`}
              key={op.id}
              onClick={() => setSelected(op)}
            >
              <small>
                {op.method === "GET"
                  ? "CONSULTA"
                  : op.method === "DELETE"
                    ? "REVOCAR / ELIMINAR"
                    : "ACCIÓN"}
              </small>
              {actionLabel(op)}
            </button>
          ))}
      </div>
      {selected && (
        <section className="panel" style={{ marginTop: 24 }}>
          <OperationForm key={selected.id} operation={selected} graph={graph} />
        </section>
      )}
      <p className="small-text" style={{ marginTop: 20 }}>
        Las herramientas disponibles y el resultado de cada acción dependen de
        los permisos vigentes de tu cuenta.{" "}
        <Link href="/login">Cambiar de cuenta</Link>
      </p>
    </>
  );
}
