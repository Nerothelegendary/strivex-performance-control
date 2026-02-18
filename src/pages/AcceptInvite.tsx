import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dumbbell, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const token = searchParams.get("token");

  useEffect(() => {
    if (!user || !token) return;

    const accept = async () => {
      // Find invitation
      const { data: invite, error: findErr } = await supabase
        .from("invitations")
        .select("*")
        .eq("token", token)
        .is("used_by", null)
        .maybeSingle();

      if (findErr || !invite) {
        toast.error("Convite inválido ou já utilizado.");
        setStatus("error");
        return;
      }

      if (new Date(invite.expires_at) < new Date()) {
        toast.error("Este convite expirou.");
        setStatus("error");
        return;
      }

      // If user has no role, assign student
      if (!role) {
        await supabase.from("user_roles").insert({ user_id: user.id, role: "student" });
      }

      // Create relationship
      const { error: linkErr } = await supabase.from("trainer_students").insert({
        trainer_id: invite.trainer_id,
        student_id: user.id,
      });

      if (linkErr && !linkErr.message.includes("duplicate")) {
        toast.error("Erro ao aceitar convite.");
        setStatus("error");
        return;
      }

      // Mark invitation used
      await supabase
        .from("invitations")
        .update({ used_by: user.id, used_at: new Date().toISOString() })
        .eq("id", invite.id);

      toast.success("Convite aceito com sucesso!");
      setStatus("success");
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    };

    accept();
  }, [user, token, role, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <Dumbbell className="h-8 w-8 text-primary mx-auto" />
        {status === "loading" && (
          <>
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Processando convite...</p>
          </>
        )}
        {status === "success" && <p className="text-sm text-foreground">Vinculado com sucesso! Redirecionando...</p>}
        {status === "error" && <p className="text-sm text-destructive">Convite inválido ou expirado.</p>}
      </div>
    </div>
  );
}
