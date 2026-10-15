import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpRight,
  ArrowRight,
  Disc3,
  CalendarDays,
  Globe2,
  Music2,
} from "lucide-react";
import type { Resource } from "@/lib/api/types";
import { href, related, resourceName, statusLabels } from "@/lib/catalog";
import { dateLabel } from "@/lib/dates";
export function Heading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="page-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
  );
}
export function SectionTitle({
  title,
  subtitle,
  link,
  label = "Ver todo",
}: {
  title: string;
  subtitle?: string;
  link?: string;
  label?: string;
}) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {link && (
        <Link href={link}>
          {label} <ArrowRight size={15} />
        </Link>
      )}
    </div>
  );
}
export function Empty({
  title = "Todavía hay historias por contar.",
  text = "Aún no hay contenido publicado en esta sección.",
  action = false,
}: {
  title?: string;
  text?: string;
  action?: boolean;
}) {
  return (
    <div className="empty-state">
      <span>✧</span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action && (
        <Link className="button secondary" href="/wiki/nueva">
          Contribuir a la wiki <ArrowRight size={15} />
        </Link>
      )}
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading-state" role="status">
      <div className="skeleton skeleton-heading" />
      <div className="skeleton skeleton-hero" />
      <div className="grid three">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton skeleton-card" />
        ))}
      </div>
      <span className="sr-only">Cargando KPOPWIKI…</span>
    </div>
  );
}
export function imageFor(r: Resource, graph: Resource[] = []) {
  const identity =
    r.type === "artists" ? related(r, "catalogIdentity", graph)[0] : r;
  const source =
    r.attributes.coverArtUrl ||
    r.attributes.imageUrl ||
    identity?.attributes.imgProfile;
  return typeof source === "string" ? source : "";
}
export function Artwork({
  resource,
  graph = [],
  className = "",
}: {
  resource: Resource;
  graph?: Resource[];
  className?: string;
}) {
  const src = imageFor(resource, graph),
    name = resourceName(resource, graph);
  const Icon =
    resource.type === "events"
      ? CalendarDays
      : resource.type === "tours"
        ? Globe2
        : resource.type === "recordings"
          ? Music2
          : Disc3;
  return (
    <div
      className={`artwork ${className} ${!src ? `generated-art art-${[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 6}` : ""}`}
    >
      {src ? (
        <Image
          src={src}
          alt={name}
          fill
          sizes="(max-width: 700px) 45vw, (max-width: 1200px) 25vw, 280px"
          unoptimized={!src.startsWith("/")}
        />
      ) : (
        <>
          <span className="art-orbit" />
          <Icon size={34} strokeWidth={1} />
          <span className="art-title">{name}</span>
          <span className="art-caption">KPOPWIKI / ARCHIVE</span>
        </>
      )}
    </div>
  );
}
export function ResourceCard({
  resource: r,
  graph = [],
}: {
  resource: Resource;
  graph?: Resource[];
}) {
  const name = resourceName(r, graph);
  const category =
    r.type === "artists"
      ? related(r, "catalogIdentity", graph)[0]?.attributes.identityType ===
        "organization"
        ? "GRUPO"
        : "ARTISTA"
      : r.type === "recordings"
        ? "GRABACIÓN"
        : statusLabels[
            String(r.attributes.releaseType || r.attributes.status)
          ] || r.type.toUpperCase();
  return (
    <Link
      className={`resource-card ${r.type === "artists" ? "member-card" : ""}`}
      href={href(r)}
    >
      <Artwork resource={r} graph={graph} />
      <div className="card-info">
        <div>
          <small>{category}</small>
          <h3>{name}</h3>
          <p>
            {r.type === "artists"
              ? "Conoce su historia"
              : dateLabel(
                  r.attributes,
                  r.type === "releases"
                    ? "release"
                    : r.type === "recordings"
                      ? "recording"
                      : "start",
                )}
          </p>
        </div>
        <ArrowUpRight size={18} />
      </div>
    </Link>
  );
}
export function ErrorNotice({ message }: { message: string }) {
  return (
    <div className="notice error" role="alert">
      {message}
    </div>
  );
}
