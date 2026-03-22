"use client";

export const dynamic = "force-dynamic";

import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/shared/Logo";
import Image from "next/image";

export default function LoginPage() {
  const { signInWithGoogle, loading } = useAuth();

  return (
    <div className="min-h-screen bg-gray-light flex items-center justify-center p-4">
      <div className="bg-secondary border border-border rounded-lg p-8 w-full max-w-sm shadow-sm">
        <div className="flex flex-col items-center mb-8">
          <Logo size="lg" href="/" />
        </div>

        <h1 className="font-display text-xl text-center text-primary mb-2">
          Iniciar Sesión
        </h1>
        <p className="text-sm text-center text-gray-mid mb-8">
          Accede a tu cuenta de The Deposit
        </p>

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

        <p className="text-xs text-gray-mid text-center mt-6">
          Al continuar, aceptas nuestros términos de servicio.
        </p>
      </div>
    </div>
  );
}
