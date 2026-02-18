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
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center space-y-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Dumbbell className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Bem-vindo ao Strivex</h1>
          <p className="text-sm text-muted-foreground text-center">Escolha seu perfil para continuar</p>
        </div>

        <div className="space-y-3">
          <Card
            className="cursor-pointer hover:border-primary active:scale-[0.98] transition-all border-2 rounded-xl"
            onClick={() => !loading && selectRole("trainer")}
          >
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <UserCog className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-base">Treinador</p>
                <p className="text-sm text-muted-foreground">Gerencie alunos e treinos</p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:border-primary active:scale-[0.98] transition-all border-2 rounded-xl"
            onClick={() => !loading && selectRole("student")}
          >
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-base">Aluno</p>
                <p className="text-sm text-muted-foreground">Execute e registre treinos</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Configurando...</p>
          </div>
        )}
      </div>
    </div>
  );
}
