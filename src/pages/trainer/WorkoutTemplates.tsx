import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";

export default function WorkoutTemplates() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Tables<"workout_templates">[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadTemplates();
  }, [user]);

  const loadTemplates = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("workout_templates")
      .select("*")
      .eq("trainer_id", user.id)
      .order("created_at", { ascending: false });
    setTemplates(data ?? []);
    setLoading(false);
  };

  const createTemplate = async () => {
    if (!user || !name.trim()) return;
    const { error } = await supabase.from("workout_templates").insert({
      trainer_id: user.id,
      name: name.trim(),
      description: description.trim() || null,
    });
    if (error) {
      toast.error("Erro ao criar treino.");
      return;
    }
    toast.success("Treino criado!");
    setName("");
    setDescription("");
    setOpen(false);
    loadTemplates();
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase.from("workout_templates").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir.");
      return;
    }
    toast.success("Treino excluído.");
    loadTemplates();
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Modelos de Treino</h2>
            <p className="text-sm text-muted-foreground">{templates.length} modelo(s)</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> Novo Treino
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Modelo de Treino</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Nome do treino" value={name} onChange={(e) => setName(e.target.value)} />
                <Textarea placeholder="Descrição (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} />
                <Button onClick={createTemplate} disabled={!name.trim()} className="w-full">
                  Criar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-sm text-muted-foreground">Nenhum modelo criado.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {templates.map((t) => (
              <Card key={t.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="py-3 flex items-center justify-between">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => navigate(`/trainer/template/${t.id}`)}
                  >
                    <p className="text-sm font-medium">{t.name}</p>
                    {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteTemplate(t.id)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
