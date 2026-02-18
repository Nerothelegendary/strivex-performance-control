import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dumbbell, GraduationCap, UserCog, Loader2 } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";

export default function SelectRole() {
  const { user, role, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (role) return <Navigate to={role === "trainer" ? "/trainer" : "/student"} replace />;

  const selectRole = async (role: "trainer" | "student") => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("user_roles").insert({ user_id: user.id, role });
    if (error) {
      if (error.code === "23505") {
        window.location.reload();
        return;
      }
      toast.error("Erro ao definir perfil. Tente novamente.");
      console.error("Insert role error:", error);
      setLoading(false);
      return;
    }
    window.location.reload();
  };

  return (
    <PageTransition>
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6"
         style={{ background: 'var(--glow-bg)' }}>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[55%] h-[500px] w-[500px] rounded-full opacity-35 blur-[100px]"
           style={{ background: 'var(--glow-orb)' }} />
      <div className="absolute inset-0 pointer-events-none"
           style={{ background: 'radial-gradient(ellipse at center, transparent 50%, hsl(var(--background) / 0.7) 100%)' }} />

      <div className="relative z-10 w-full max-w-sm space-y-9">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full"
               style={{ background: 'var(--icon-orb)' }}>
            <div className="absolute -inset-2 rounded-full blur-xl opacity-40"
                 style={{ background: 'var(--glow-orb)' }} />
            <Dumbbell className="relative h-9 w-9 text-primary-foreground drop-shadow-lg" />
          </div>
          <div className="space-y-1.5 text-center">
            <h1 className="text-2xl font-extrabold tracking-[0.15em] text-foreground uppercase">
              STRIVEX
            </h1>
            <p className="text-[13px] font-medium text-muted-foreground">
              Escolha seu perfil para continuar
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            className="w-full flex items-center gap-4 p-5 rounded-2xl border border-border bg-card/40 backdrop-blur-sm hover:bg-card/70 hover:border-border hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-left"
            onClick={() => !loading && selectRole("trainer")}
            disabled={loading}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                 style={{ background: 'var(--gradient-primary)' }}>
              <UserCog className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold text-base text-foreground">Treinador</p>
              <p className="text-sm text-muted-foreground">Gerencie alunos e treinos</p>
            </div>
          </button>

          <button
            className="w-full flex items-center gap-4 p-5 rounded-2xl border border-border bg-card/40 backdrop-blur-sm hover:bg-card/70 hover:border-border hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-left"
            onClick={() => !loading && selectRole("student")}
            disabled={loading}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                 style={{ background: 'var(--gradient-primary)' }}>
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold text-base text-foreground">Aluno</p>
              <p className="text-sm text-muted-foreground">Execute e registre treinos</p>
            </div>
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Configurando...</p>
          </div>
        )}
      </div>
    </div>
    </PageTransition>
  );
}
