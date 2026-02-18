import { Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function Login() {
  const { user, role, loading } = useAuth();

  const handleGoogleLogin = async () => {
    await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (user && role) {
    return <Navigate to={role === "trainer" ? "/trainer" : "/student"} replace />;
  }

  if (user && !role) {
    return <Navigate to="/select-role" replace />;
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6"
         style={{ background: 'radial-gradient(ellipse at center 40%, hsl(224 76% 12%) 0%, hsl(222 47% 8%) 60%, hsl(222 50% 5%) 100%)' }}>
      {/* Radial glow – stronger */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[55%] h-[550px] w-[550px] rounded-full opacity-40 blur-[100px]"
           style={{ background: 'radial-gradient(circle, hsl(224 76% 33%), transparent 65%)' }} />
      {/* Vignette edges */}
      <div className="absolute inset-0 pointer-events-none"
           style={{ background: 'radial-gradient(ellipse at center, transparent 50%, hsl(222 50% 4% / 0.7) 100%)' }} />

      <div className="relative z-10 w-full max-w-sm space-y-9">
        {/* Brand */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative flex h-28 w-28 items-center justify-center rounded-full"
               style={{ background: 'radial-gradient(circle at 40% 40%, hsl(217 91% 60%), hsl(224 76% 33%))' }}>
            <div className="absolute -inset-3 rounded-full blur-2xl opacity-50"
                 style={{ background: 'radial-gradient(circle, hsl(217 91% 60%), transparent 70%)' }} />
            <Dumbbell className="relative h-12 w-12 text-white drop-shadow-lg" />
          </div>
          <div className="space-y-1.5 text-center">
            <h1 className="text-[2.75rem] font-extrabold tracking-[0.2em] text-white uppercase leading-none">
              STRIVEX
            </h1>
            <p className="text-[13px] font-medium tracking-wide" style={{ color: 'hsl(215 20% 55%)' }}>
              Plataforma de Performance para Treinadores
            </p>
          </div>
        </div>

        {/* Google button */}
        <Button
          onClick={handleGoogleLogin}
          variant="outline"
          className="w-full h-[56px] text-base font-semibold gap-3 rounded-2xl border-0 bg-white text-foreground shadow-xl shadow-black/30 hover:shadow-2xl hover:brightness-105 hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 ease-out"
        >
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Entrar com Google
        </Button>

        {/* Microcopy */}
        <p className="text-[11px] text-center" style={{ color: 'hsl(215 16% 40% / 0.5)' }}>
          Ao continuar, você concorda com nossos termos de uso.
        </p>
      </div>
    </div>
  );
}
