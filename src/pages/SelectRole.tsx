import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dumbbell, GraduationCap, UserCog } from "lucide-react";
import { toast } from "sonner";

export default function SelectRole() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const selectRole = async (role: "trainer" | "student") => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("user_roles").insert({ user_id: user.id, role });
    if (error) {
      toast.error("Erro ao definir perfil. Tente novamente.");
      setLoading(false);
      return;
    }
    // Reload to pick up role
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center mb-6">
          <Dumbbell className="h-8 w-8 text-primary mx-auto mb-2" />
          <h1 className="text-lg font-semibold">Bem-vindo ao Strivex</h1>
          <p className="text-sm text-muted-foreground">Escolha seu perfil para continuar</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => !loading && selectRole("trainer")}
          >
            <CardHeader className="items-center pb-2">
              <UserCog className="h-8 w-8 text-primary" />
            </CardHeader>
            <CardContent className="text-center">
              <p className="font-medium text-sm">Treinador</p>
              <p className="text-xs text-muted-foreground mt-1">Gerencie alunos e treinos</p>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => !loading && selectRole("student")}
          >
            <CardHeader className="items-center pb-2">
              <GraduationCap className="h-8 w-8 text-primary" />
            </CardHeader>
            <CardContent className="text-center">
              <p className="font-medium text-sm">Aluno</p>
              <p className="text-xs text-muted-foreground mt-1">Execute e registre treinos</p>
            </CardContent>
          </Card>
        </div>
        {loading && <p className="text-center text-sm text-muted-foreground">Configurando...</p>}
      </div>
    </div>
  );
}
