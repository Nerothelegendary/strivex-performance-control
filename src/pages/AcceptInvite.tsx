import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dumbbell, Loader2 } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { toast } from "sonner";

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const { user, role } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const token = searchParams.get("token");

  useEffect(() => {
    if (!user || !token) return;

    const accept = async () => {
      // Ensure the user has the student role before calling the RPC.
      // This handles users arriving via magic-link before role assignment.
      if (!role) {
        const { error: roleErr } = await supabase
          .from("user_roles")
          .insert({ user_id: user.id, role: "student" });
        // Ignore duplicate-role errors (user may have refreshed)
        if (roleErr && !roleErr.message.includes("duplicate")) {
          toast.error("Erro ao configurar perfil.");
          setStatus("error");
          return;
        }
      }

      // All validation + insertion happens atomically inside the RPC.
      // No direct INSERT into trainer_students is possible from the client.
      const { data, error } = await supabase.rpc("accept_invitation_token", {
        p_token: token,
      });

      if (error) {
        const msg = error.message ?? "";
        if (msg.includes("INVALID_TOKEN")) {
          toast.error("Convite inválido ou já utilizado.");
        } else if (msg.includes("EXPIRED_TOKEN")) {
          toast.error("Este convite expirou.");
        } else if (msg.includes("NOT_STUDENT")) {
          // Role may not have propagated yet — retry once after brief delay
          setTimeout(async () => {
            const { data: retryData, error: retryErr } = await supabase.rpc(
              "accept_invitation_token",
              { p_token: token }
            );
            const retryResult = retryData as { success: boolean } | null;
            if (retryErr || !retryResult?.success) {
              toast.error("Erro ao aceitar convite.");
              setStatus("error");
            } else {
              toast.success("Convite aceito com sucesso!");
              setStatus("success");
              setTimeout(() => { window.location.href = "/student"; }, 1500);
            }
          }, 800);
          return;
        } else {
          toast.error("Erro ao aceitar convite.");
        }
        setStatus("error");
        return;
      }

      const result = data as { success: boolean } | null;
      if (!result?.success) {
        toast.error("Erro inesperado ao aceitar convite.");
        setStatus("error");
        return;
      }

      toast.success("Convite aceito com sucesso!");
      setStatus("success");
      setTimeout(() => { window.location.href = "/student"; }, 1500);
    };

    accept();
  }, [user, token, role]);

  return (
    <PageTransition>
      <div className="flex min-h-screen items-center justify-center"
           style={{ background: 'var(--glow-bg)' }}>
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
               style={{ background: 'var(--icon-orb)' }}>
            <Dumbbell className="h-8 w-8 text-primary-foreground" />
          </div>
          {status === "loading" && (
            <>
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Processando convite...</p>
            </>
          )}
          {status === "success" && (
            <p className="text-sm text-emerald-400">Vinculado com sucesso! Redirecionando...</p>
          )}
          {status === "error" && (
            <p className="text-sm text-destructive">Convite inválido ou expirado.</p>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
