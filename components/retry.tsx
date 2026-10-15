"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
export function RetryButton() {
  const router = useRouter(),
    [pending, start] = useTransition();
  return (
    <button
      className="button primary"
      disabled={pending}
      onClick={() => start(() => router.refresh())}
    >
      {pending ? "Conectando…" : "Volver a intentar"}
    </button>
  );
}
