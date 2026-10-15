import registry from "./operations.json";
import type { Operation, Schema } from "./types";
export const operations = registry as Operation[];
export function operationFor(
  method: string,
  path: string,
): Operation | undefined {
  if (
    path.includes("..") ||
    path.includes("\\") ||
    path.includes("%") ||
    !path.startsWith("/api/")
  )
    return;
  return operations.find(
    (o) =>
      o.method === method &&
      new RegExp(
        "^" +
          o.path
            .replace(/[.*+?^$()|[\]\\]/g, "\\$&")
            .replace(/\{[^}]+\}/g, "[^/]+") +
          "$",
      ).test(path),
  );
}
export function validate(schema: Schema, value: unknown, path = ""): string[] {
  if (value === null && schema.nullable) return [];
  if (schema.oneOf) {
    const alternatives = schema.oneOf.map((s) => validate(s, value, path));
    return alternatives.some((e) => !e.length)
      ? []
      : alternatives.sort((a, b) => a.length - b.length)[0];
  }
  const error = (s: string) => [`${path || "Formulario"}: ${s}`];
  if (schema.enum && !schema.enum.includes(value as string))
    return error("selecciona una opción válida");
  if (schema.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value))
      return error("debe ser un objeto");
    const record = value as Record<string, unknown>;
    return [
      ...(schema.required || []).flatMap((k) =>
        record[k] === undefined ? error(`falta ${k}`) : [],
      ),
      ...Object.entries(record).flatMap(([k, v]) => {
        const child =
          schema.properties?.[k] ||
          (typeof schema.additionalProperties === "object"
            ? schema.additionalProperties
            : undefined);
        return child
          ? validate(child, v, `${path}/${k}`)
          : schema.additionalProperties === false && !path.includes("/snapshot")
            ? error(`campo desconocido ${k}`)
            : [];
      }),
    ];
  }
  if (schema.type === "array")
    return Array.isArray(value)
      ? value.flatMap((v, i) => validate(schema.items || {}, v, `${path}/${i}`))
      : error("debe ser una lista");
  if (schema.type === "string") {
    if (typeof value !== "string") return error("debe ser texto");
    if (schema.minLength && value.length < schema.minLength)
      return error(`mínimo ${schema.minLength} caracteres`);
    if (schema.maxLength && value.length > schema.maxLength)
      return error(`máximo ${schema.maxLength} caracteres`);
  }
  if (schema.type === "integer" && !Number.isInteger(value))
    return error("debe ser un entero");
  if (
    schema.type === "number" &&
    (typeof value !== "number" || !Number.isFinite(value))
  )
    return error("debe ser un número");
  if (schema.type === "boolean" && typeof value !== "boolean")
    return error("debe ser verdadero o falso");
  return [];
}
