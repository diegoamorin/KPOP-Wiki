"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Heart, ArrowRight } from "lucide-react";
import { api } from "@/lib/api/browser";
import { ErrorNotice } from "./ui";
const modes: Record<
  string,
  {
    title: string;
    description: string;
    endpoint: string;
    fields: [string, string, string][];
    submit: string;
  }
> = {
  login: {
    title: "Tu lugar en este universo.",
    description:
      "Entra a KPOPWIKI y continúa escribiendo esta historia con nosotras.",
    endpoint: "auth/login",
    fields: [
      ["identifier", "Usuario o correo", "text"],
      ["password", "Contraseña", "password"],
    ],
    submit: "Iniciar sesión",
  },
  registro: {
    title: "Siempre hay lugar para ti.",
    description:
      "Únete a una comunidad que descubre, cuida y comparte la historia del K-pop.",
    endpoint: "auth/register",
    fields: [
      ["displayName", "¿Cómo quieres que te llamemos?", "text"],
      ["username", "Nombre de usuario", "text"],
      ["email", "Correo electrónico", "email"],
      ["password", "Contraseña (mínimo 12 caracteres)", "password"],
    ],
    submit: "Crear mi cuenta",
  },
  recuperar: {
    title: "Volvamos a encontrarnos.",
    description: "Te enviaremos un enlace para recuperar tu acceso.",
    endpoint: "auth/password-reset-request",
    fields: [["email", "Correo electrónico", "email"]],
    submit: "Enviar enlace",
  },
  "restablecer-contrasena": {
    title: "Un nuevo comienzo.",
    description:
      "Usa el token de tu correo para establecer una contraseña nueva.",
    endpoint: "auth/password-reset",
    fields: [
      ["token", "Token de recuperación", "text"],
      ["password", "Nueva contraseña (mínimo 12 caracteres)", "password"],
    ],
    submit: "Cambiar contraseña",
  },
  "verificar-correo": {
    title: "Un paso más.",
    description: "Confirma tu correo para participar en la wiki.",
    endpoint: "auth/verify-email",
    fields: [["token", "Token de verificación", "text"]],
    submit: "Verificar correo",
  },
  "solicitar-verificacion": {
    title: "Confirma tu correo.",
    description: "Solicita un nuevo enlace de verificación.",
    endpoint: "auth/verification-request",
    fields: [["email", "Correo electrónico", "email"]],
    submit: "Enviar verificación",
  },
};
export function AuthForm({ mode }: { mode: string }) {
  const config = modes[mode] || modes.login,
    params = useSearchParams(),
    router = useRouter(),
    client = useQueryClient();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  return (
    <section className="auth-panel">
      <span className="avatar">
        <Heart size={18} />
      </span>
      <h1>{config.title}</h1>
      <p>{config.description}</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const fields = Object.fromEntries(new FormData(e.currentTarget));
          try {
            await api(config.endpoint, "POST", fields);
            if (mode === "login") {
              await client.cancelQueries();
              client.clear();
              router.push("/mi-espacio");
              router.refresh();
            } else
              setSuccess(
                mode === "registro"
                  ? "Tu cuenta está creada. Revisa tu correo para verificarla antes de contribuir."
                  : mode === "recuperar" || mode === "solicitar-verificacion"
                    ? "Si la cuenta corresponde, recibirás un enlace por correo."
                    : "Listo. Ya puedes continuar con tu cuenta.",
              );
          } catch (error) {
            setError((error as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {config.fields.map(([name, title, type]) => (
          <label className="form-field" key={name}>
            {title}
            <input
              className="field"
              name={name}
              type={type}
              defaultValue={name === "token" ? params.get("token") || "" : ""}
              required
              minLength={
                name === "password" && mode !== "login"
                  ? 12
                  : name === "username"
                    ? 3
                    : undefined
              }
              maxLength={
                name === "password" ? 128 : name === "username" ? 32 : undefined
              }
              autoComplete={
                name === "password"
                  ? mode === "login"
                    ? "current-password"
                    : "new-password"
                  : name === "identifier" || name === "username"
                    ? "username"
                    : name === "email"
                      ? "email"
                      : "off"
              }
            />
          </label>
        ))}
        {error && <ErrorNotice message={error} />}{" "}
        {success && (
          <div className="notice success" role="status">
            {success}
          </div>
        )}
        <button className="button primary" type="submit" disabled={busy}>
          {busy ? "Un momento…" : config.submit}
          <ArrowRight size={15} />
        </button>
      </form>
      <div className="auth-links">
        <Link href={mode === "login" ? "/registro" : "/login"}>
          {mode === "login" ? "Crear una cuenta" : "Ya tengo una cuenta"}
        </Link>
        <Link href="/recuperar">Olvidé mi contraseña</Link>
      </div>
      <Link className="small-text" href="/solicitar-verificacion">
        Volver a enviar verificación →
      </Link>
    </section>
  );
}
