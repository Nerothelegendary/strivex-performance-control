import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageTransition } from "@/components/PageTransition";
import { Loader2, TicketCheck, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, Navigate } from "react-router-dom";

function extractToken(input: string): string {
  const trimmed = input.trim();
  try {
    const url = new URL(trimmed);
    const token = url.searchParams.get("token");
    if (token) return token;
  } catch { /* Not a URL */ }
  return trimmed;
}

export default function EnterInvite() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  const handleSubmit = async () => {
    if (!user || !code.trim() || loading) return;
    setLoading(true);
    const token = extractToken(code);

    const { data: invite, error: findErr } = await supabase.from("invitations").select("*").eq("token", token).is("used_by", null).maybeSingle();
    if (findErr || !invite) { toast.error("Código inválido ou já utilizado."); setLoading(false); return; }
    if (new Date(invite.expires_at) < new Date()) { toast.error("Este convite expirou."); setLoading(false); return; }

    const { error: linkErr } = await supabase.from("trainer_students").insert({ trainer_id: invite.trainer_id, student_id: user.id });
    if (linkErr && !linkErr.message.includes("duplicate")) { toast.error("Erro ao aceitar convite."); setLoading(false); return; }

    await supabase.from("invitations").update({ used_by: user.id, used_at: new Date().toISOString() }).eq("id", invite.id);
    toast.success("Convite aceito com sucesso!");
    setTimeout(() => { window.location.href = "/student"; }, 1200);
  };

  return (
    <PageTransition>
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6"
           style={{ background: 'var(--glow-bg)' }}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[55%] h-[400px] w-[400px] rounded-full opacity-25 blur-[100px]"
             style={{ background: 'var(--glow-orb)' }} />

        <div className="relative z-10 w-full max-w-sm space-y-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full"
                 style={{ background: 'var(--icon-orb)' }}>
              <TicketCheck className="relative h-8 w-8 text-primary-foreground" />
            </div>
            <div className="space-y-1.5 text-center">
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Código de Convite</h1>
              <p className="text-sm text-muted-foreground">Você precisa de um convite do seu treinador para usar o Strivex.</p>
            </div>
          </div>

          <div className="space-y-3">
            <Input placeholder="Cole o código do convite aqui" value={code} onChange={(e) => setCode(e.target.value)}
              disabled={loading} onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="h-12 rounded-xl" />
            <Button className="w-full h-12 text-base font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleSubmit} disabled={loading || !code.trim()}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {loading ? "Validando..." : "Validar Convite"}
            </Button>
          </div>

          <Button variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-foreground" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-1" /> Sair
          </Button>
        </div>
      </div>
    </PageTransition>
  );
}
