"use client";
import { useId, useState } from "react";
import type { Resource, Schema, Value } from "@/lib/api/types";
import { enumLabels, label } from "@/lib/labels";
import { resourceName } from "@/lib/catalog";
export function defaults(schema: Schema): Value {
  if (schema.oneOf) return defaults(schema.oneOf[0]);
  if (schema.enum?.length === 1) return schema.enum[0];
  if (schema.type === "object")
    return Object.fromEntries(
      (schema.required || []).flatMap((k) =>
        schema.properties?.[k] ? [[k, defaults(schema.properties[k])]] : [],
      ),
    );
  if (schema.type === "array") return [];
  if (schema.type === "boolean") return false;
  if (schema.type === "integer" || schema.type === "number")
    return schema.nullable ? null : 0;
  return schema.nullable ? null : "";
}
export function SchemaField({
  name,
  schema,
  value,
  onChange,
  graph = [],
  required = false,
  depth = 0,
}: {
  name: string;
  schema: Schema;
  value: Value | undefined;
  onChange: (v: Value | undefined) => void;
  graph?: Resource[];
  required?: boolean;
  depth?: number;
}) {
  const id = useId(),
    [enabled, setEnabled] = useState(value !== undefined && value !== null);
  const title = label(name);
  if (schema.oneOf) {
    const current =
      schema.oneOf.find((s) =>
        s.properties?.kind?.enum?.includes(
          (value as Record<string, Value>)?.kind as string,
        ),
      ) || schema.oneOf[0];
    return (
      <fieldset className="contract-group">
        <legend>{title}</legend>
        <label className="form-field">
          Tipo de contenido
          <select
            className="field"
            value={String(current.properties?.kind?.enum?.[0] || 0)}
            onChange={(e) => {
              const s = schema.oneOf!.find(
                (s) => String(s.properties?.kind?.enum?.[0]) === e.target.value,
              );
              if (s) onChange(defaults(s));
            }}
          >
            {schema.oneOf.map((s, i) => (
              <option
                key={i}
                value={String(s.properties?.kind?.enum?.[0] || i)}
              >
                {enumLabels[String(s.properties?.kind?.enum?.[0])] ||
                  `Variante ${i + 1}`}
              </option>
            ))}
          </select>
        </label>
        <SchemaField
          name={name}
          schema={current}
          value={value}
          onChange={onChange}
          graph={graph}
          required
          depth={depth + 1}
        />
      </fieldset>
    );
  }
  if (schema.type === "object") {
    const record = (
      value && typeof value === "object" && !Array.isArray(value) ? value : {}
    ) as Record<string, Value>;
    const update = (key: string, v: Value | undefined) => {
      const next = { ...record };
      if (v === undefined) delete next[key];
      else next[key] = v;
      onChange(next);
    };
    const linkageType = String(
      record.type || schema.properties?.type?.enum?.[0] || "",
    );
    if (
      schema.properties?.id &&
      linkageType &&
      graph.some((r) => r.type === linkageType)
    )
      return (
        <label className="form-field" htmlFor={id}>
          {title}
          {required ? " *" : ""}
          <select
            id={id}
            className="field"
            value={String(record.id || "")}
            onChange={(e) =>
              onChange({ type: linkageType, id: e.target.value })
            }
            required={required}
          >
            <option value="">Selecciona…</option>
            {graph
              .filter((r) => r.type === linkageType)
              .map((r) => (
                <option value={r.id} key={r.id}>
                  {resourceName(r, graph)}
                </option>
              ))}
          </select>
        </label>
      );
    const keys = Object.keys(schema.properties || {});
    const extra = Object.keys(record).filter((k) => !keys.includes(k));
    const content = (
      <>
        {keys.map((key) => (
          <SchemaField
            key={key}
            name={key}
            schema={schema.properties![key]}
            value={record[key]}
            onChange={(v) => update(key, v)}
            graph={graph}
            required={schema.required?.includes(key)}
            depth={depth + 1}
          />
        ))}
        {typeof schema.additionalProperties === "object" && (
          <>
            {extra.map((key) => (
              <fieldset key={key} className="contract-group">
                <legend>Registro {extra.indexOf(key) + 1}</legend>
                <SchemaField
                  name={name}
                  schema={schema.additionalProperties as Schema}
                  value={record[key]}
                  onChange={(v) => update(key, v)}
                  graph={graph}
                  required
                  depth={depth + 1}
                />
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => update(key, undefined)}
                >
                  Quitar registro
                </button>
              </fieldset>
            ))}
            <button
              type="button"
              className="button secondary"
              onClick={() =>
                update(
                  crypto.randomUUID(),
                  defaults(schema.additionalProperties as Schema),
                )
              }
            >
              Añadir {title.toLowerCase()}
            </button>
          </>
        )}
        {!keys.length &&
          typeof schema.additionalProperties !== "object" &&
          Object.keys(record).length > 0 && (
            <pre className="json-preview">
              {JSON.stringify(record, null, 2)}
            </pre>
          )}
      </>
    );
    if (depth < 2 || ["fields", "attributes", "data"].includes(name))
      return <div>{content}</div>;
    return (
      <details
        className="contract-group"
        open={required || Object.keys(record).length > 0}
      >
        <summary>{title}</summary>
        {content}
      </details>
    );
  }
  if (schema.type === "array") {
    const items = Array.isArray(value) ? value : [];
    return (
      <fieldset className="contract-group">
        <legend>{title}</legend>
        {items.map((v, i) => (
          <div key={i}>
            <SchemaField
              name={`${title} ${i + 1}`}
              schema={schema.items || {}}
              value={v}
              onChange={(next) =>
                onChange(
                  items.map((item, index) =>
                    index === i ? (next ?? null) : item,
                  ),
                )
              }
              graph={graph}
              required
              depth={depth + 1}
            />
            <button
              type="button"
              className="button secondary"
              onClick={() => onChange(items.filter((_, index) => i !== index))}
            >
              Quitar
            </button>
          </div>
        ))}
        <button
          type="button"
          className="button secondary"
          onClick={() => onChange([...items, defaults(schema.items || {})])}
        >
          Añadir registro
        </button>
      </fieldset>
    );
  }
  if (schema.enum?.length === 1) return null;
  const foreignType: Record<string, string> = {
    countryId: "countries",
    platformId: "platforms",
    genreId: "genres",
    contributionRoleId: "contribution-roles",
    organizationTypeId: "organization-types",
  };
  const references =
    name.endsWith("PageId") || name === "pageId"
      ? graph.filter((r) =>
          name === "artistPageId"
            ? r.type === "artists"
            : name === "recordingPageId"
              ? r.type === "recordings"
              : name === "tourPageId"
                ? r.type === "tours"
                : name === "workPageId"
                  ? r.type === "works"
                  : r.type === "catalog-identities",
        )
      : foreignType[name]
        ? graph.filter((r) => r.type === foreignType[name])
        : [];
  return (
    <div className="form-field">
      <span className="field-label-row">
        <label htmlFor={id}>
          {title}
          {required ? " *" : ""}
        </label>
        {schema.nullable && (
          <button
            type="button"
            className="null-button"
            onClick={() => {
              setEnabled(!enabled);
              onChange(
                enabled ? null : defaults({ ...schema, nullable: false }),
              );
            }}
          >
            {value === null ? "Completar" : "Sin dato"}
          </button>
        )}
      </span>
      {schema.nullable && value === null ? (
        <span className="field-help">Sin información confirmada</span>
      ) : references.length ? (
        <select
          id={id}
          className="field"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        >
          <option value="">Selecciona…</option>
          {references.map((r) => {
            const ref = r.relationships?.page?.data;
            const page = ref && !Array.isArray(ref) ? ref.id : r.id;
            return (
              <option
                key={r.id}
                value={
                  name.endsWith("PageId") || name === "pageId" ? page : r.id
                }
              >
                {resourceName(r, graph)}
              </option>
            );
          })}
        </select>
      ) : schema.enum ? (
        <select
          id={id}
          className="field"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        >
          <option value="">Selecciona…</option>
          {schema.enum.map((v) => (
            <option key={String(v)} value={String(v)}>
              {enumLabels[String(v)] || String(v)}
            </option>
          ))}
        </select>
      ) : schema.type === "boolean" ? (
        <input
          id={id}
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />
      ) : /bio|description|desc|summary|body|reason|resolution|citation|sourceText/.test(
          name,
        ) ? (
        <textarea
          id={id}
          className="field"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          maxLength={schema.maxLength}
        />
      ) : (
        <input
          id={id}
          className="field"
          type={
            schema.type === "number" || schema.type === "integer"
              ? "number"
              : schema.format === "date"
                ? "date"
                : schema.format === "date-time"
                  ? "datetime-local"
                  : name === "password"
                    ? "password"
                    : name === "email"
                      ? "email"
                      : "text"
          }
          value={String(value ?? "")}
          minLength={schema.minLength}
          maxLength={schema.maxLength}
          min={schema.minimum}
          max={schema.maximum}
          onChange={(e) =>
            onChange(
              schema.type === "number" || schema.type === "integer"
                ? e.target.value === ""
                  ? undefined
                  : Number(e.target.value)
                : e.target.value || (required ? "" : undefined),
            )
          }
          required={required}
        />
      )}
    </div>
  );
}
