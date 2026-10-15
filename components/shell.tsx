"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  House,
  UsersRound,
  Disc3,
  CalendarDays,
  Globe2,
  Music2,
  Heart,
  Bell,
  Search,
  ArrowUpRight,
  BookOpen,
  PanelLeftClose,
  Menu,
  ShieldCheck,
  Sparkles,
  MessageCircle,
  Layers3,
} from "lucide-react";
import { api } from "@/lib/api/browser";
import type { User } from "@/lib/api/types";
const navigation = [
  {
    title: "EXPLORA EL UNIVERSO",
    links: [
      ["/", "Inicio", House],
      ["/artistas", "Artistas", UsersRound],
      ["/discografia", "Discografía", Disc3],
      ["/canciones", "Canciones", Music2],
      ["/calendario", "Calendario", CalendarDays],
      ["/tours", "Tours", Globe2],
      ["/eventos", "Eventos", Sparkles],
      ["/equipo", "Equipo creativo", Layers3],
    ],
  },
  {
    title: "HECHO POR FANS",
    links: [
      ["/mi-espacio", "Mi espacio", Heart],
      ["/wiki", "Wiki colaborativa", BookOpen],
      ["/comunidad", "Comunidad", MessageCircle],
      ["/equipo-editorial", "Equipo editorial", UsersRound],
      ["/admin", "Administración", ShieldCheck],
    ],
  },
] as const;
export function Shell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const me = useQuery({
    queryKey: ["session"],
    queryFn: () => api<User>("auth/me"),
    retry: false,
  });
  return (
    <div className="app-shell">
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      {open && (
        <button
          aria-label="Cerrar navegación"
          className="nav-backdrop"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`sidebar ${open ? "is-open" : ""}`}>
        <Link className="brand" href="/" onClick={() => setOpen(false)}>
          <span className="kpop-symbol">✦</span>
          <span>
            KPOP<span className="brand-light">WIKI</span>
            <small>OUR UNIVERSE, TOGETHER.</small>
          </span>
        </Link>
        <button
          className="mobile-close icon-button"
          onClick={() => setOpen(false)}
          aria-label="Cerrar menú"
        >
          <PanelLeftClose size={19} />
        </button>
        <div className="sidebar-scroll">
          {navigation.map((group) => (
            <nav aria-label={group.title} key={group.title}>
              <p className="nav-caption">{group.title}</p>
              {group.links
                .filter(
                  ([url]) => url !== "/admin" || me.data?.role === "admin",
                )
                .map(([url, label, Icon]) => (
                  <Suspense
                    key={url}
                    fallback={
                      <Link className="nav-link" href={url}>
                        <Icon size={18} strokeWidth={1.7} />
                        {label}
                      </Link>
                    }
                  >
                    <NavigationLink
                      url={url}
                      title={label}
                      Icon={Icon}
                      close={() => setOpen(false)}
                    />
                  </Suspense>
                ))}
            </nav>
          ))}
          <Link className="army-guide" href="/guia">
            <span>✧</span>
            <b>Todos tus fandoms, un lugar.</b>
            <p>Descubre, comparte y construye nuestra historia.</p>
            <small>
              Conoce KPOPWIKI <ArrowUpRight size={14} />
            </small>
          </Link>
        </div>
        <Link className="sidebar-user" href={me.data ? "/cuenta" : "/login"}>
          <span className="avatar">
            {me.data ? me.data.displayName.slice(0, 1).toUpperCase() : "♡"}
          </span>
          <span>
            <b>{me.data?.displayName || "Hola, fan"}</b>
            <small>{me.data ? "Mi cuenta" : "Tu historia empieza aquí"}</small>
          </span>
          <ArrowUpRight size={16} />
        </Link>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <button
            className="icon-button menu-toggle"
            aria-label="Abrir menú"
            onClick={() => setOpen(true)}
          >
            <Menu size={22} />
          </button>
          <div className="breadcrumb">
            Tu universo K-pop <span>/</span>{" "}
            <Suspense fallback={<b>KPOPWIKI</b>}>
              <Breadcrumb />
            </Suspense>
          </div>
          <form className="global-search" action="/buscar">
            <Search size={17} />
            <input
              aria-label="Buscar en KPOPWIKI"
              name="q"
              placeholder="Busca en tu universo…"
            />
            <kbd>↵</kbd>
          </form>
          <Link
            className="notification-button icon-button"
            href="/mi-espacio?tab=notificaciones"
            aria-label="Notificaciones"
          >
            <Bell size={20} />
          </Link>
          <span className="top-divider" />
          <Link className="top-login" href={me.data ? "/cuenta" : "/login"}>
            {me.data ? me.data.displayName : "Iniciar sesión"}{" "}
            <ArrowUpRight size={14} />
          </Link>
        </header>
        <main id="contenido" className="main-content">
          {children}
        </main>
        <footer className="footer">
          <span>
            <span className="footer-heart">♡</span> Hecho por fans, para fans.
          </span>
          <span>
            KPOPWIKI · Una wiki independiente de fans{" "}
            <Link href="/guia">Acerca del proyecto ↗</Link>
          </span>
        </footer>
      </div>
    </div>
  );
}
function NavigationLink({
  url,
  title,
  Icon,
  close,
}: {
  url: string;
  title: string;
  Icon: LucideIcon;
  close: () => void;
}) {
  const pathname = usePathname();
  const active = url === "/" ? pathname === "/" : pathname.startsWith(url);
  return (
    <Link
      href={url}
      onClick={close}
      className={`nav-link ${active ? "active" : ""}`}
      aria-current={active ? "page" : undefined}
    >
      <Icon size={18} strokeWidth={1.7} />
      {title}
      {active && <span className="active-dot" />}
    </Link>
  );
}
function Breadcrumb() {
  const pathname = usePathname();
  return (
    <b>
      {pathname === "/"
        ? "Inicio"
        : pathname.split("/")[1].replaceAll("-", " ")}
    </b>
  );
}
