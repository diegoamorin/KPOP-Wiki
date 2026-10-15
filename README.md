# KPOPWIKI

Dashboard y wiki colaborativa en español para fans del K-pop. Next.js 16.4, React 19, TypeScript, Tailwind, TanStack Query e iron-session.

## Ejecutar localmente

Requisitos: Node.js 22 o posterior, pnpm 10 y la API de K-pop disponible en `http://localhost:8080/api`.

```sh
pnpm install
# Copia .env.example a .env.local y configura SESSION_PASSWORD (32 caracteres aleatorios o más).
pnpm dev
```

Abre [KPOPWIKI](http://localhost:3000). En desarrollo, si falta el secreto, se genera uno efímero en memoria; reiniciar el proceso invalida esas sesiones. Producción requiere el secreto configurado.

```sh
pnpm build
pnpm start
```

El build usa `.next-build` y desarrollo usa `.next`, para preservar las cachés del servidor activo. Ambos mantienen Cache Components, Partial Prefetching y Turbopack.

## Qué incluye

- Inicio editorial multigrupo, artistas, discografía, grabaciones, obras, conciertos, tours, calendario mensual/agenda, búsqueda y equipo profesional.
- Fichas con relaciones, pistas, créditos, enlaces oficiales, fuentes publicadas e historial. Fechas parciales y estados históricos se conservan sin inventar precisión ni tours activos.
- Registro, login, verificación, recuperación, perfil, sesiones, proveedores vinculados, cierre y eliminación de cuenta.
- Favoritos de grabaciones, seguimiento, notificaciones, invitaciones y propuestas propias.
- Editor por tipo de contenido que conserva snapshots, revisiones base, claves de componentes y fuentes. Propuestas, revisiones, decisiones, publicación, reversión, retirada y restauración respetan las reglas del backend.
- Debates, respuestas y reportes privados; herramientas de equipos, moderación, políticas, restricciones, auditoría, cuentas, importaciones, catálogos auxiliares y entrega de notificaciones.
- Las funciones avanzadas se presentan mediante formularios de contrato. La [matriz de API](docs/api-coverage.md) recoge las 238 operaciones documentadas y su área de interfaz. Esto acredita cobertura de interfaz/contrato; no significa que cada operación haya sido ejecutada en vivo con cada rol.

Las cuentas existentes `bts_admin` y `bts_editor` se usan a través del login normal; sus contraseñas no están en el código ni en los valores por defecto. La API decide los permisos. El ID interno 1 no se utiliza como identificador público.

## Pruebas

```sh
pnpm test:run
pnpm test:coverage
pnpm typecheck
pnpm lint
pnpm exec playwright install chromium
pnpm test:e2e
```

Los tests E2E públicos arrancan una API de fixtures en el puerto 8081 y un servidor Next.js aislado en el puerto 3001 (`.next-e2e`). No requieren el catálogo real ni escriben en él. Para usar Chrome instalado en PowerShell:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'chrome'
pnpm test:e2e
```

Vitest y MSW prueban contratos, paginación, sesión, errores, fechas, filtros, creación de borradores, conservación de fuentes/componentes y reintentos idempotentes. Playwright comprueba escritorio y móvil, incluyendo errores de ejecución e hidratación.

Para las comprobaciones de cuentas contra los servidores reales en 3000/8080, usa `KPOP_E2E_LIVE=1`. La prueba de cuentas se habilita con `BTS_TEST_ADMIN_USERNAME`, `BTS_TEST_ADMIN_PASSWORD`, `BTS_TEST_EDITOR_USERNAME` y `BTS_TEST_EDITOR_PASSWORD`. Sólo autentica, consulta y cierra sesiones; tiene las trazas desactivadas. Sin esas variables se omite expresamente. `scripts/verify-accounts.mjs` permite pasarlas por stdin sin escribirlas en archivos.

Las escrituras editoriales de pruebas usan MSW. No se crean canciones ni se cambian fichas como parte de pruebas contra el backend local de contenido. Las futuras pruebas con escrituras reales deben ejecutarse en una instancia de pruebas dedicada.

## Contrato y contenido

```sh
pnpm api:generate
```

Regenera tipos, esquemas, registro y matriz desde `openapi.json`. Actualiza primero esa copia desde la API si cambia el contrato. Consulta [la arquitectura](docs/architecture.md) para sesiones, límites de caché y publicación.

La curación inicial añadió mediante propuestas editoriales las fotografías de los siete integrantes, 20 portadas y seis canales oficiales del grupo. Las fuentes son los perfiles y el catálogo de BIGHIT MUSIC, registrados en la API. `Black Swan` mantiene respaldo visual porque no se encontró una portada individual en ese catálogo. Las redes personales no verificadas permanecen sin datos; los canales compartidos se identifican claramente como canales de BTS.

`scripts/curate-content.mjs` realiza curación intencional contra el backend y recibe credenciales por stdin. `--catalog` incluye portadas y canales oficiales. No forma parte de los tests. Conserva datos y fuentes existentes y pasa por el flujo de propuestas; nunca salta requisitos de revisión.

Las fotografías y portadas se muestran directamente desde las URLs del catálogo, sin copias locales, y conservan sus derechos originales. Si un recurso no tiene URL de imagen, se muestra una ilustración de respaldo de interfaz; no se publica como portada real.

La Guía K-pop es contenido estático claramente identificado, preparado para una futura fuente dinámica. La aplicación es independiente y no está afiliada a artistas ni agencias.

## Dependencias externas

El envío de correo, sus URLs de verificación/recuperación y la entrega de notificaciones dependen de la configuración del backend. Las pantallas frontend son `/verificar-correo?token=...` y `/restablecer-contrasena?token=...`. El frontend no configura el servicio de correo del backend.

No se simula OAuth ni se añaden noticias, recordatorios externos o tipos de eventos que la API todavía no admite. El alcance de ejecución es local y de una instancia Next.js; la rotación de sesiones necesita coordinación compartida antes de escalar a varias instancias.

## Calendario y visualizaciones KPOPWIKI

`/artistas` es la ruta del catálogo; `/integrantes` y sus fichas redirigen conservando IDs. Los cumpleaños se derivan de la fecha de nacimiento y abren al artista. Un día con varias coincidencias abre `/calendario/AAAA-MM-DD`, conservando `month`, `view`, `category` y `artist`; «Ver todo el día» elimina los filtros. El 29 de febrero aparece solo en años bisiestos. «Hoy» usa America/Lima y las fechas de conciertos conservan el día y zona publicados.

Tours ofrece tarjetas y una línea de tiempo. Los extremos incompletos se listan aparte; los estados editoriales no se infieren a partir del paso del tiempo. Los gráficos de portada muestran lanzamientos por año y conciertos por país del catálogo registrado, incluyendo todos sus estados y señalando datos desconocidos. No son estadísticas de toda la industria.

Las pruebas públicas usan `tests/fixtures/catalog.mjs` y una API paginada de solo lectura. Vitest cubre fechas, relaciones, filtros, navegación y agregaciones; Playwright recorre escritorio y móvil con esas mismas fixtures.
