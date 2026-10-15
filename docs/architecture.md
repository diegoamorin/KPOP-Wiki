# Arquitectura BTSWIKI

- Las páginas públicas son Server Components. Una capa `server-only` consulta JSON:API sin caché compartida, resuelve `included` y recorre la paginación. `connection()` y límites de Suspense mantienen el contenido actualizado con Cache Components activado.
- El navegador utiliza exclusivamente `/api/gateway/*`. El intermediario sólo permite los métodos y rutas de OpenAPI. Valida formularios y origen de las mutaciones, añade la autorización del servidor y conserva los errores de dominio.
- La sesión se cifra con iron-session en cookies HttpOnly. Los tokens nunca se entregan al JavaScript del navegador. La renovación se coordina dentro de una instancia Node; se comparte temporalmente el resultado para solicitudes con la cookie anterior.
- Cada solicitud protegida vuelve a pasar por los controles del backend. Ser editor de equipo no equivale a administrador del sitio ni a moderador. Los permisos efectivos no se deducen de un nombre de usuario.
- TanStack Query contiene sólo estado del navegador. Se limpia al entrar/salir de una cuenta. Los paneles privados esperan a la hidratación para no sustituir el HTML inicial con datos de una caché previa.
- Un borrador conserva el snapshot completo, los UUID estables de componentes, la revisión base y las fuentes anteriores. La API decide cuándo una propuesta pasa a revisión o publicación. Los reintentos de comandos editoriales conservan la clave de idempotencia mientras no cambie el formulario.
- El registro generado cubre 238 operaciones. Las vistas principales tienen interfaces específicas; las herramientas avanzadas usan formularios estructurados generados desde los mismos esquemas. `docs/api-coverage.md` distingue la cobertura de contrato de una prueba real de permisos.
- `openapi.json` es una copia del contrato. Ejecutar `pnpm api:generate` después de actualizarlo. Los campos desconocidos dentro de snapshots se conservan y se delega su validación final al backend para tolerar versiones posteriores del contenido.
- `content/official-covers.json` documenta las referencias visuales utilizadas por el script de curación. La interfaz muestra directamente las URLs de imágenes del catálogo, sin copias locales. Si no hay URL, usa un respaldo visual de interfaz que nunca se publica como imagen oficial.

## Límites operativos

La coordinación de refresh presupone una instancia Next.js, según el alcance local. Un despliegue con múltiples instancias necesita coordinación compartida para la rotación. El correo, los enlaces de verificación y recuperación, los límites de uso y la entrega de notificaciones dependen del backend. No se añade una segunda base de datos ni OAuth simulado.

Los horarios se muestran con la zona del evento cuando existe. No se infiere una zona desde el país ni se convierte una hora local ambigua. La agenda separa las fechas parciales; el archivo conserva los estados históricos aunque requieran corrección editorial.
