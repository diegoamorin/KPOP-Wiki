import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty-state">
      <span>✧</span>
      <h1>Esta historia aún no está aquí.</h1>
      <p>El enlace puede haber cambiado o el contenido ya no está publicado.</p>
      <Link href="/" className="button primary">
        Volver a nuestro universo
      </Link>
    </div>
  );
}
