import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface BulkAssignDialogProps {
  templateId: string;
  templateName: string;
  students: { student_id: string; full_name: string | null }[];
  onDone: () => void;
}

export function BulkAssignDialog({ templateId, templateName, students, onDone }: BulkAssignDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [alreadyAssigned, setAlreadyAssigned] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const loadAssigned = async () => {
    const { data } = await supabase
      .from("student_templates")
      .select("student_id")
      .eq("template_id", templateId);
    const ids = new Set(data?.map((d) => d.student_id) ?? []);
    setAlreadyAssigned(ids);
    setSelected(ids);
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) loadAssigned();
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    const toAdd = [...selected].filter((id) => !alreadyAssigned.has(id));
    const toRemove = [...alreadyAssigned].filter((id) => !selected.has(id));

    if (toRemove.length > 0) {
      await supabase.from("student_templates").delete()
        .eq("template_id", templateId)
        .in("student_id", toRemove);
    }

    if (toAdd.length > 0) {
      await supabase.from("student_templates").insert(
        toAdd.map((student_id) => ({ student_id, template_id: templateId }))
      );
    }

    toast.success(`Treino atribuído a ${selected.size} aluno(s).`);
    setSaving(false);
    setOpen(false);
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
          <Users className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="border-border bg-popover text-popover-foreground">
        <DialogHeader>
          <DialogTitle className="text-sm">Atribuir "{templateName}"</DialogTitle>
        </DialogHeader>
        {students.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Nenhum aluno vinculado.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {students.map((s) => (
              <label key={s.student_id} className="flex items-center gap-3 py-1.5 cursor-pointer">
                <Checkbox
                  checked={selected.has(s.student_id)}
                  onCheckedChange={() => toggle(s.student_id)}
                  className="border-border data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                />
                <span className="text-sm text-foreground">{s.full_name || "Sem nome"}</span>
              </label>
            ))}
          </div>
        )}
        <Button onClick={save} disabled={saving} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Users className="h-4 w-4 mr-1" />}
          Atribuir a {selected.size} aluno(s)
        </Button>
      </DialogContent>
    </Dialog>
  );
}
