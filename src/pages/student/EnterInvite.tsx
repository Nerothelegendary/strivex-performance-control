import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dumbbell, Loader2, TicketCheck, LogOut } from "lucide-react";
import { toast } from "sonner";

export default function EnterInvite() {
  const { user, signOut } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user || !code.trim()) return;
    setLoading(true);

    const { data: invite, error: findErr } = await supabase
      .from("invitations")
      .select("*")
      .eq("token", code.trim())
      .is("used_by", null)
      .maybeSingle();

    if (findErr || !invite) {
      toast.error("Código inválido ou já utilizado.");
      setLoading(false);
      return;
    }

    if (new Date(invite.expires_at) < new Date()) {
      toast.error("Este convite expirou.");
      setLoading(false);
      return;
    }

    // Create trainer-student link
    const { error: linkErr } = await supabase.from("trainer_students").insert({
      trainer_id: invite.trainer_id,
      student_id: user.id,
    });

    if (linkErr && !linkErr.message.includes("duplicate")) {
      toast.error("Erro ao aceitar convite.");
      setLoading(false);
      return;
    }

    // Mark invitation used
    await supabase
      .from("invitations")
      .update({ used_by: user.id, used_at: new Date().toISOString() })
      .eq("id", invite.id);

    toast.success("Convite aceito! Redirecionando...");
    setTimeout(() => {
      window.location.href = "/student";
    }, 1200);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-4">
        <Card className="shadow-sm">
          <CardHeader className="items-center pb-2">
            <TicketCheck className="h-10 w-10 text-primary mb-2" />
            <h1 className="text-lg font-semibold">Código de Convite</h1>
            <p className="text-sm text-muted-foreground text-center">
              Você precisa de um convite do seu treinador para usar o Strivex.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <Input
              placeholder="Cole o código do convite aqui"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={loading}
            />
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={loading || !code.trim()}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Validar Convite
            </Button>
          </CardContent>
        </Card>
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 mr-1" /> Sair
        </Button>
      </div>
    </div>
  );
}
