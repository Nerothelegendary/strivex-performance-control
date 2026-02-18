import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dumbbell, GraduationCap, UserCog, Loader2 } from "lucide-react";
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
      // If duplicate key, role already exists — just reload
      if (error.code === "23505") {
        window.location.reload();
        return;
      }
      toast.error("Erro ao definir perfil. Tente novamente.");
      console.error("Insert role error:", error);
      setLoading(false);
      return;
    }
    // Reload to pick up role
    window.location.reload();
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6"
         style={{ background: 'radial-gradient(ellipse at center 40%, hsl(224 76% 12%) 0%, hsl(222 47% 8%) 60%, hsl(222 50% 5%) 100%)' }}>
      {/* Radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[55%] h-[500px] w-[500px] rounded-full opacity-35 blur-[100px]"
           style={{ background: 'radial-gradient(circle, hsl(224 76% 33%), transparent 65%)' }} />
      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none"
           style={{ background: 'radial-gradient(ellipse at center, transparent 50%, hsl(222 50% 4% / 0.7) 100%)' }} />

      <div className="relative z-10 w-full max-w-sm space-y-9">
        {/* Brand */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full"
               style={{ background: 'radial-gradient(circle at 40% 40%, hsl(217 91% 60%), hsl(224 76% 33%))' }}>
            <div className="absolute -inset-2 rounded-full blur-xl opacity-40"
                 style={{ background: 'radial-gradient(circle, hsl(217 91% 60%), transparent 70%)' }} />
            <Dumbbell className="relative h-9 w-9 text-white drop-shadow-lg" />
          </div>
          <div className="space-y-1.5 text-center">
            <h1 className="text-2xl font-extrabold tracking-[0.15em] text-white uppercase">
              STRIVEX
            </h1>
            <p className="text-[13px] font-medium" style={{ color: 'hsl(215 20% 55%)' }}>
              Escolha seu perfil para continuar
            </p>
          </div>
        </div>

        {/* Role cards */}
        <div className="space-y-3">
          <button
            className="w-full flex items-center gap-4 p-5 rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-sm hover:bg-white/[0.1] hover:border-white/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-left"
            onClick={() => !loading && selectRole("trainer")}
            disabled={loading}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                 style={{ background: 'linear-gradient(135deg, hsl(224 76% 33%), hsl(217 91% 60%))' }}>
              <UserCog className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-semibold text-base text-white">Treinador</p>
              <p className="text-sm" style={{ color: 'hsl(215 20% 55%)' }}>Gerencie alunos e treinos</p>
            </div>
          </button>

          <button
            className="w-full flex items-center gap-4 p-5 rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-sm hover:bg-white/[0.1] hover:border-white/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-left"
            onClick={() => !loading && selectRole("student")}
            disabled={loading}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                 style={{ background: 'linear-gradient(135deg, hsl(224 76% 33%), hsl(217 91% 60%))' }}>
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-semibold text-base text-white">Aluno</p>
              <p className="text-sm" style={{ color: 'hsl(215 20% 55%)' }}>Execute e registre treinos</p>
            </div>
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-white/50" />
            <p className="text-sm text-white/50">Configurando...</p>
          </div>
        )}
      </div>
    </div>
  );
}
