import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { getCatalog, getResource, apiBase } from "@/lib/api/server";
import { request } from "@/lib/api/client";
import { sections, resourceName } from "@/lib/catalog";
import { localToday } from "@/lib/dates";
import type { Document, Resource } from "@/lib/api/types";
import { Heading, Loading, Empty } from "@/components/ui";
import { CatalogList } from "@/components/catalog-list";
import { Tours } from "@/components/tours";
import { validDate } from "@/lib/kpop";
import { Calendar } from "@/components/calendar";
import { ResourceDetails } from "@/components/resource-details";
import { AuthForm } from "@/components/auth";
import { PersonalSpace } from "@/components/personal-space";
import { WikiEditor, Proposal } from "@/components/wiki-editor";
import { Workbench, OperationForm, ResultView } from "@/components/workbench";
import { operations } from "@/lib/api/contract";
import { RetryButton } from "@/components/retry";
type Props = {
  params: Promise<{ section: string; segments?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
const titles: Record<string, string> = {
  calendario: "Calendario",
  login: "Iniciar sesión",
  registro: "Crear cuenta",
  recuperar: "Recuperar acceso",
  "verificar-correo": "Verificar correo",
  "restablecer-contrasena": "Restablecer contraseña",
  "solicitar-verificacion": "Verificación",
  "mi-espacio": "Mi espacio K-pop",
  cuenta: "Mi cuenta",
  wiki: "Wiki colaborativa",
  comunidad: "Comunidad",
  "equipo-editorial": "Equipo editorial",
  admin: "Administración",
  buscar: "Buscar",
  guia: "Guía K-pop",
  explorar: "Archivo",
};
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { section } = await params;
  return { title: sections[section]?.eyebrow || titles[section] || "Archivo" };
}
export default function Page(props: Props) {
  return (
    <Suspense fallback={<Loading />}>
      <Content {...props} />
    </Suspense>
  );
}
async function Content({ params, searchParams }: Props) {
  await connection();
  const { section, segments = [] } = await params,
    query = await searchParams,
    id = segments[0];
  if (section === "integrantes") {
    const suffix = segments.map(encodeURIComponent).join("/");
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) =>
      (Array.isArray(v) ? v : v ? [v] : []).forEach((value) =>
        params.append(k, value),
      ),
    );
    permanentRedirect(
      `/artistas${suffix ? `/${suffix}` : ""}${params.size ? `?${params}` : ""}`,
    );
  }
  if (
    section === "calendario" &&
    (segments.length > 1 || (id && !validDate(id)))
  )
    notFound();
  if (
    [
      "login",
      "registro",
      "recuperar",
      "verificar-correo",
      "restablecer-contrasena",
      "solicitar-verificacion",
    ].includes(section)
  )
    return <AuthForm mode={section} />;
  if (section === "guia") return <Guide />;
  if (!(section in sections) && !(section in titles)) notFound();
  let graph: Resource[] = [];
  try {
    graph = await getCatalog();
  } catch {
    if (
      section in sections ||
      ["calendario", "buscar", "explorar"].includes(section)
    )
      return (
        <>
          <Heading
            eyebrow="KPOPWIKI"
            title="El archivo está tomando un respiro."
          />
          <Empty
            title="No pudimos cargar el contenido."
            text="Comprueba la conexión con la API y vuelve a cargar la página."
          />
          <RetryButton />
        </>
      );
  }
  if (section in sections) {
    const config = sections[section];
    if (id) {
      let resource = graph.find((r) => r.type === config.type && r.id === id);
      if (!resource) {
        try {
          const doc = await getResource(config.type, id);
          resource = Array.isArray(doc.data) ? doc.data[0] : doc.data;
          graph.push(...(doc.included || []), resource);
        } catch {
          notFound();
        }
      }
      return <ResourceDetails resource={resource} graph={graph} />;
    }
    return (
      <>
        <Heading {...config} />
        {section === "tours" ? (
          <Tours graph={graph} today={localToday()} />
        ) : (
          <CatalogList
            resources={graph.filter((r) => r.type === config.type)}
            graph={graph}
            today={localToday()}
          />
        )}
      </>
    );
  }
  if (section === "calendario")
    return (
      <>
        <Heading
          eyebrow={id ? "AGENDA DEL DÍA" : "TU PRÓXIMO MOMENTO FAVORITO"}
          title={
            id
              ? new Intl.DateTimeFormat("es", {
                  dateStyle: "full",
                  timeZone: "UTC",
                }).format(new Date(`${id}T12:00:00Z`))
              : "Calendario"
          }
          description="Conciertos, lanzamientos y cumpleaños de tus artistas, en un mismo lugar."
        />
        <Calendar graph={graph} today={localToday()} day={id} />
      </>
    );
  if (section === "buscar") {
    const q = typeof query.q === "string" ? query.q : "",
      page =
        typeof query.p === "string" ? Math.max(1, Number(query.p) || 1) : 1;
    let doc: Document | undefined;
    try {
      if (q.trim())
        doc = await request<Document>(
          apiBase(),
          `search?filter[q]=${encodeURIComponent(q)}&page[number]=${page}&page[size]=20`,
        );
    } catch {
      return (
        <Empty
          title="No pudimos completar la búsqueda."
          text="Inténtalo de nuevo en unos momentos."
        />
      );
    }
    const results = doc
      ? Array.isArray(doc.data)
        ? doc.data
        : [doc.data]
      : [];
    return (
      <>
        <Heading
          eyebrow="ENCUENTRA TU HISTORIA"
          title="Busca en nuestro universo."
          description={
            q
              ? `Resultados para «${q}»`
              : "Integrantes, canciones, álbumes y escenarios."
          }
        />
        <form action="/buscar" className="toolbar">
          <input
            className="filter-input"
            name="q"
            aria-label="Texto de búsqueda"
            defaultValue={q}
            placeholder="¿Qué historia buscas?"
            required
          />
          <button className="button primary">Buscar</button>
        </form>
        {results.length ? (
          <>
            <CatalogList
              resources={results}
              graph={[...graph, ...(doc?.included || []), ...results]}
              today={localToday()}
            />
            <div className="form-actions">
              {page > 1 && (
                <Link
                  className="button secondary"
                  href={`/buscar?q=${encodeURIComponent(q)}&p=${page - 1}`}
                >
                  ← Anterior
                </Link>
              )}
              {page < (doc?.meta?.pages || 1) && (
                <Link
                  className="button secondary"
                  href={`/buscar?q=${encodeURIComponent(q)}&p=${page + 1}`}
                >
                  Siguiente →
                </Link>
              )}
            </div>
          </>
        ) : (
          <Empty
            text={
              q
                ? "No hay resultados publicados para esta búsqueda."
                : "Escribe algo para empezar a explorar."
            }
          />
        )}
      </>
    );
  }
  if (section === "mi-espacio" || section === "cuenta")
    return (
      <>
        <Heading
          eyebrow="UN LUGAR PARA TI"
          title={
            section === "cuenta"
              ? "Mi cuenta. Mi historia."
              : "Tu pequeño universo K-pop."
          }
          description="Las historias que sigues, la música que guardas y todo lo que compartes."
        />
        <PersonalSpace
          key={String(query.tab || "default")}
          graph={graph}
          account={section === "cuenta"}
        />
      </>
    );
  if (section === "wiki") {
    if (id === "nueva" || id === "editar")
      return (
        <>
          <Heading
            eyebrow="WIKI COLABORATIVA"
            title={
              id === "editar"
                ? "Una historia siempre puede crecer."
                : "¿Qué historia quieres contar?"
            }
            description="Datos con fuentes. Cambios con contexto. Una wiki que cuidamos juntas."
          />
          <WikiEditor
            pageId={id === "editar" ? segments[1] : undefined}
            graph={graph}
          />
        </>
      );
    if (id === "propuestas" && segments[1])
      return (
        <>
          <Heading
            eyebrow="WIKI COLABORATIVA"
            title="Una propuesta para nuestra historia."
          />
          <Proposal id={segments[1]} graph={graph} />
        </>
      );
    if (id === "historial" && segments[1]) {
      const op = operations.find(
        (o) => o.path === "/api/wiki/pages/{id}/revisions",
      )!;
      return (
        <>
          <Heading
            eyebrow="HISTORIAL EDITORIAL"
            title="Cada contribución deja huella."
          />
          <OperationForm
            operation={op}
            initialParams={{ id: segments[1] }}
            graph={graph}
          />
        </>
      );
    }
    return (
      <>
        <Heading
          eyebrow="HECHO POR FANS"
          title="Nuestra historia se escribe juntas."
          description="Explora propuestas, aporta fuentes y ayuda a cuidar el universo K-pop."
        />
        <div className="form-actions" style={{ marginBottom: 25 }}>
          <Link href="/wiki/nueva" className="button primary">
            Añadir una nueva historia ↗
          </Link>
          <Link href="/guia" className="button secondary">
            Cómo contribuir
          </Link>
        </div>
        <Workbench group="wiki" graph={graph} />
      </>
    );
  }
  if (section === "admin")
    return (
      <>
        <Heading
          eyebrow="ADMINISTRACIÓN"
          title="Cuidar también es construir."
          description="Moderación, políticas, cuentas y herramientas del archivo."
        />
        <Workbench group="administracion" graph={graph} />
        <details>
          <summary>Cuentas y roles del sitio</summary>
          <Workbench group="cuenta" graph={graph} onlyFamily="users" />
        </details>
        <details>
          <summary>Catálogos auxiliares y relaciones</summary>
          <Workbench group="catalogo" graph={graph} />
        </details>
      </>
    );
  if (section === "comunidad" || section === "equipo-editorial")
    return (
      <>
        <Heading
          eyebrow="HECHO POR FANS"
          title={
            section === "comunidad"
              ? "La conversación también nos une."
              : "Las personas que cuidan la wiki."
          }
          description={
            section === "comunidad"
              ? "Debates, respuestas y fuentes para construir un archivo mejor."
              : "Consulta tu equipo, gestiona invitaciones y colabora según tus permisos."
          }
        />
        <Workbench group={section} graph={graph} />
      </>
    );
  if (section === "explorar") {
    const type = id,
      resourceId = segments[1];
    if (type && resourceId) {
      const op = operations.find(
        (o) =>
          o.method === "GET" && o.path === `/api/${type}/{id}` && !o.protected,
      );
      if (!op) notFound();
      let doc: Document;
      try {
        doc = await getResource(type, resourceId);
      } catch {
        notFound();
      }
      const r = Array.isArray(doc.data) ? doc.data[0] : doc.data;
      return (
        <>
          <Heading eyebrow="ARCHIVO KPOPWIKI" title={resourceName(r, graph)} />
          <ResultView result={doc} />
        </>
      );
    }
    return (
      <>
        <Heading eyebrow="ARCHIVO" title="Todas nuestras historias." />
        <Workbench group="catalogo" graph={graph} />
      </>
    );
  }
  notFound();
}
function Guide() {
  return (
    <>
      <Heading
        eyebrow="GUÍA K-POP · CONTENIDO EDITORIAL ESTÁTICO"
        title="Un lugar para descubrir. Una historia para cuidar."
        description="KPOPWIKI es una wiki independiente hecha por fans. No está afiliada a artistas, grupos ni agencias."
      />
      <section className="panel">
        <h2>Tu primera contribución.</h2>
        <p>
          Consulta una ficha y elige «Proponer una mejora». Añade lo que sabes,
          explica el cambio y enlaza una fuente verificable. Guarda el borrador
          y envíalo cuando esté listo. Las revisiones dependen del contenido y
          sus políticas.
        </p>
        <h3>Las fuentes van primero.</h3>
        <p>
          Prioriza anuncios oficiales, créditos de los álbumes y referencias
          bibliográficas. Si una fecha, red o crédito no está confirmado, deja
          el dato sin completar. Una fecha parcial es mejor que una precisión
          inventada.
        </p>
        <h3>Una canción puede tener varias historias.</h3>
        <p>
          La obra describe la composición; la grabación, una interpretación
          concreta. Un lanzamiento reúne pistas, y cada pista puede enlazar esa
          misma grabación sin duplicarla.
        </p>
        <h3>Seguir una página es cuidar su historia.</h3>
        <p>
          Las páginas que sigues aparecen en tu espacio. Las notificaciones
          dependen de los cambios editoriales y del servicio de entrega de la
          API.
        </p>
        <h3>Un espacio respetuoso.</h3>
        <p>
          Comenta con contexto y fuentes, protege la privacidad y utiliza los
          reportes privados cuando encuentres un problema.
        </p>
        <div className="form-actions">
          <Link href="/wiki/nueva" className="button primary">
            Mi primera aportación ↗
          </Link>
          <Link href="/artistas" className="button secondary">
            Explorar artistas
          </Link>
        </div>
      </section>
      <section className="panel">
        <h2>Créditos visuales.</h2>
        <p>
          Las fotografías de BTS conservadas en el archivo proceden del{" "}
          <a
            href="https://bts.ibighit.com/eng/profile/"
            target="_blank"
            rel="noopener noreferrer"
          >
            perfil oficial de BTS en BIGHIT MUSIC
          </a>
          . Se conservan sus derechos originales. Las composiciones de respaldo
          de KPOPWIKI son ilustraciones de interfaz y no portadas oficiales.
        </p>
      </section>
    </>
  );
}
