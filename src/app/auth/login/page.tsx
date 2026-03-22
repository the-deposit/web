"use client";

export const dynamic = "force-dynamic";

import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Logo } from "@/components/shared/Logo";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

type Mode = "login" | "registro" | "reset";

function LoginForm() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword, user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/tienda";

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      router.replace(redirectTo);
    }
  }, [user, loading, router, redirectTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setFormLoading(true);

    try {
      if (mode === "login") {
        await signInWithEmail(email, password);
        router.replace(redirectTo);
      } else if (mode === "registro") {
        await signUpWithEmail(email, password, fullName);
        setSuccess("Revisa tu correo para confirmar tu cuenta.");
      } else if (mode === "reset") {
        await resetPassword(email);
        setSuccess("Te enviamos un enlace para restablecer tu contraseña.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ocurrió un error";
      if (msg.includes("Invalid login credentials")) {
        setError("Correo o contraseña incorrectos.");
      } else if (msg.includes("Email not confirmed")) {
        setError("Confirma tu correo antes de iniciar sesión.");
      } else if (msg.includes("User already registered")) {
        setError("Este correo ya está registrado. Inicia sesión.");
      } else {
        setError(msg);
      }
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) return null;
  if (user) return null;

  return (
    <>
    <div className="min-h-screen bg-gray-light flex items-center justify-center p-4">
      <div className="bg-secondary border border-border rounded-lg p-8 w-full max-w-sm shadow-sm">
        <div className="flex flex-col items-center mb-8">
          <Logo size="lg" href="/" />
        </div>

        <h1 className="font-display text-xl text-center text-primary mb-1">
          {mode === "login" ? "Iniciar Sesión" : mode === "registro" ? "Crear Cuenta" : "Recuperar Contraseña"}
        </h1>
        <p className="text-sm text-center text-gray-mid mb-6">
          {mode === "login" ? "Accede a tu cuenta de The Deposit" :
           mode === "registro" ? "Crea tu cuenta para hacer pedidos" :
           "Te enviaremos un enlace a tu correo"}
        </p>

        {/* Google OAuth */}
        {mode !== "reset" && (
          <>
            <Button
              variant="secondary"
              size="lg"
              className="w-full gap-3"
              onClick={signInWithGoogle}
              loading={loading}
            >
              <Image src="/google.svg" alt="Google" width={20} height={20} />
              Continuar con Google
            </Button>

            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-gray-mid">o</span>
              <div className="flex-1 h-px bg-border" />
            </div>
          </>
        )}

        {/* Email form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "registro" && (
            <Input
              label="Nombre completo"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoComplete="name"
            />
          )}

          <Input
            label="Correo electrónico"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          {mode !== "reset" && (
            <Input
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={6}
            />
          )}

          {error && (
            <p className="text-sm text-error bg-error/5 border border-error/20 rounded px-3 py-2">
              {error}
            </p>
          )}

          {success && (
            <p className="text-sm text-success bg-success/5 border border-success/20 rounded px-3 py-2">
              {success}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full mt-1" loading={formLoading}>
            {mode === "login" ? "Iniciar Sesión" :
             mode === "registro" ? "Crear Cuenta" :
             "Enviar enlace"}
          </Button>
        </form>

        {/* Mode switchers */}
        <div className="mt-5 space-y-2 text-center">
          {mode === "login" && (
            <>
              <button
                onClick={() => { setMode("reset"); setError(null); setSuccess(null); }}
                className="block w-full text-xs text-gray-mid hover:text-primary transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </button>
              <button
                onClick={() => { setMode("registro"); setError(null); setSuccess(null); }}
                className="block w-full text-xs text-gray-mid hover:text-primary transition-colors"
              >
                ¿No tienes cuenta? <span className="font-medium text-primary">Regístrate</span>
              </button>
            </>
          )}

          {(mode === "registro" || mode === "reset") && (
            <button
              onClick={() => { setMode("login"); setError(null); setSuccess(null); }}
              className="text-xs text-gray-mid hover:text-primary transition-colors"
            >
              ← Volver a iniciar sesión
            </button>
          )}
        </div>

        <p className="text-xs text-gray-mid text-center mt-6">
          Al continuar, aceptas nuestros términos de servicio.
        </p>
      </div>
    </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
