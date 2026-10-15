import type { Resource, Value } from "./api/types";
type Fields = Record<string, Value>;
export function exactDate(fields: Fields, prefix = "start"): string | null {
  const y = Number(fields[`${prefix}Year`]),
    m = Number(fields[`${prefix}Month`]),
    d = Number(fields[`${prefix}Day`]);
  if (!y || !m || !d || y < 1 || y > 9999 || m < 1 || m > 12 || d < 1)
    return null;
  const dt = new Date(Date.UTC(2000, m - 1, d));
  dt.setUTCFullYear(y);
  if (dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
export function dateLabel(f: Fields, prefix = "start"): string {
  const y = f[`${prefix}Year`],
    m = f[`${prefix}Month`];
  const full = exactDate(f, prefix);
  if (full)
    return new Intl.DateTimeFormat("es", {
      dateStyle: "long",
      timeZone: "UTC",
    }).format(new Date(`${full}T12:00:00Z`));
  if (y && m)
    return `${new Intl.DateTimeFormat("es", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2000, Number(m) - 1, 1)))} de ${y}`;
  return y ? String(y) : "Fecha por confirmar";
}
export function localToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function isUpcoming(r: Resource, today: string): boolean {
  if (
    ["cancelled", "postponed", "performed", "completed"].includes(
      String(r.attributes.status),
    )
  )
    return false;
  const start = exactDate(
    r.attributes,
    r.type === "releases" ? "release" : "start",
  );
  const end = exactDate(r.attributes, "end");
  if (r.type === "tours" && r.attributes.status === "in_progress" && !end)
    return true;
  return Boolean((end || start) && (end || start)! >= today);
}
export function calendarItems(resources: Resource[]) {
  return resources
    .flatMap((r) => {
      const date = exactDate(
        r.attributes,
        r.type === "releases" ? "release" : "start",
      );
      return date ? [{ resource: r, date }] : [];
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}
export function eventTime(f: Fields, zone?: string) {
  if (!f.startTime) return "Hora por confirmar";
  // A wall-clock time without an offset cannot safely be converted by Date.
  return `${f.startTime} · ${f.timezone || "zona horaria sin confirmar"}${zone && zone !== f.timezone ? " (hora del evento)" : ""}`;
}
