"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="empty-state" role="alert">
      <span>✧</span>
      <h1>Hagamos una pequeña pausa.</h1>
      <p>No pudimos cargar esta historia. Puedes volver a intentarlo.</p>
      <button className="button primary" onClick={reset}>
        Volver a intentar
      </button>
    </div>
  );
}
