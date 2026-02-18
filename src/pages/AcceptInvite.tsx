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
      const { data: invite, error: findErr } = await supabase.from("invitations").select("*").eq("token", token).is("used_by", null).maybeSingle();
      if (findErr || !invite) { toast.error("Convite inválido ou já utilizado."); setStatus("error"); return; }
      if (new Date(invite.expires_at) < new Date()) { toast.error("Este convite expirou."); setStatus("error"); return; }
      if (!role) { await supabase.from("user_roles").insert({ user_id: user.id, role: "student" }); }
      const { error: linkErr } = await supabase.from("trainer_students").insert({ trainer_id: invite.trainer_id, student_id: user.id });
      if (linkErr && !linkErr.message.includes("duplicate")) { toast.error("Erro ao aceitar convite."); setStatus("error"); return; }
      await supabase.from("invitations").update({ used_by: user.id, used_at: new Date().toISOString() }).eq("id", invite.id);
      toast.success("Convite aceito com sucesso!");
      setStatus("success");
      setTimeout(() => { window.location.href = "/"; }, 1500);
    };
    accept();
  }, [user, token, role, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center"
         style={{ background: 'radial-gradient(ellipse at center 40%, hsl(224 76% 12%) 0%, hsl(222 47% 8%) 60%, hsl(222 50% 5%) 100%)' }}>
      <div className="text-center space-y-3">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
             style={{ background: 'radial-gradient(circle at 40% 40%, hsl(217 91% 60%), hsl(224 76% 33%))' }}>
          <Dumbbell className="h-8 w-8 text-white" />
        </div>
        {status === "loading" && (
          <>
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-white/40" />
            <p className="text-sm text-white/50">Processando convite...</p>
          </>
        )}
        {status === "success" && <p className="text-sm text-emerald-400">Vinculado com sucesso! Redirecionando...</p>}
        {status === "error" && <p className="text-sm text-red-400">Convite inválido ou expirado.</p>}
      </div>
    </div>
  );
}
