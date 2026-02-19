import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  ChevronRight,
  KeyRound,
  Mail,
  LogOut,
  Users,
  Trophy,
  Dumbbell,
  FileText,
  Loader2,
  Check,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Profile() {
  const { user, profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [uploading, setUploading] = useState(false);
  const [savingName, setSavingName] = useState(false);

  // Role-specific stats
  const [stats, setStats] = useState<{ label1: string; value1: number; label2: string; value2: number }>({
    label1: "", value1: 0, label2: "", value2: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  const fullName = profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || "";
  const initials = fullName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?";
  const email = user?.email || "";
  const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) : "";

  useEffect(() => {
    setNameValue(fullName);
  }, [fullName]);

  useEffect(() => {
    if (!user || !role) return;
    loadStats();
  }, [user, role]);

  const loadStats = async () => {
    if (!user) return;
    setStatsLoading(true);
    try {
      if (role === "trainer") {
        const [studentsRes, templatesRes] = await Promise.all([
          supabase.from("trainer_students").select("id", { count: "exact", head: true }).eq("trainer_id", user.id),
          supabase.from("workout_templates").select("id", { count: "exact", head: true }).eq("trainer_id", user.id),
        ]);
        setStats({
          label1: "Alunos Ativos", value1: studentsRes.count ?? 0,
          label2: "Templates Criados", value2: templatesRes.count ?? 0,
        });
      } else {
        const [sessionsRes, pbsRes] = await Promise.all([
          supabase.from("workout_sessions").select("id", { count: "exact", head: true }).eq("student_id", user.id),
          supabase.from("session_sets").select("exercise_name, weight").eq("session_id", "").limit(0), // placeholder
        ]);
        // Count unique exercise PBs from session_sets
        const { data: allSets } = await supabase
          .from("workout_sessions")
          .select("id")
          .eq("student_id", user.id);
        
        let pbCount = 0;
        if (allSets && allSets.length > 0) {
          const sessionIds = allSets.map(s => s.id);
          const { data: sets } = await supabase
            .from("session_sets")
            .select("exercise_name")
            .in("session_id", sessionIds);
          const uniqueExercises = new Set(sets?.map(s => s.exercise_name));
          pbCount = uniqueExercises.size;
        }

        setStats({
          label1: "Treinos Concluídos", value1: sessionsRes.count ?? 0,
          label2: "Recordes Pessoais", value2: pbCount,
        });
      }
    } finally {
      setStatsLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem válida.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB.");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${ext}`;

      // Remove old avatar if exists
      await supabase.storage.from("avatars").remove([filePath]);

      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("user_id", user.id);
      if (updateError) throw updateError;

      toast.success("Foto atualizada!");
      // Force refresh
      window.location.reload();
    } catch {
      toast.error("Erro ao enviar foto.");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveName = async () => {
    if (!user || !nameValue.trim()) return;
    setSavingName(true);
    try {
      const { error } = await supabase.from("profiles").update({ full_name: nameValue.trim() }).eq("user_id", user.id);
      if (error) throw error;
      toast.success("Nome atualizado!");
      setEditingName(false);
      window.location.reload();
    } catch {
      toast.error("Erro ao atualizar nome.");
    } finally {
      setSavingName(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const roleBadge = role === "trainer"
    ? { label: "Coach", className: "bg-primary/20 text-primary border-primary/30" }
    : { label: "Atleta", className: "bg-accent/20 text-accent border-accent/30" };

  return (
    <Layout>
      <div className="space-y-6 max-w-lg mx-auto pb-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Meu Perfil</h1>
        </div>

        {/* Avatar + Name + Badge */}
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="relative">
            <Avatar className="h-24 w-24 border-2 border-border shadow-lg">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="text-2xl bg-secondary text-muted-foreground">{initials}</AvatarFallback>
            </Avatar>
            <button
              className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary flex items-center justify-center shadow-md border-2 border-background active:scale-95 transition-transform"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 text-primary-foreground animate-spin" /> : <Camera className="h-3.5 w-3.5 text-primary-foreground" />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>

          {/* Name */}
          {editingName ? (
            <div className="flex items-center gap-2 w-full max-w-xs">
              <Input
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                className="text-center text-base h-10"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setEditingName(false); }}
              />
              <Button size="icon" variant="ghost" className="h-10 w-10 shrink-0" onClick={handleSaveName} disabled={savingName}>
                {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-emerald-400" />}
              </Button>
              <Button size="icon" variant="ghost" className="h-10 w-10 shrink-0" onClick={() => { setEditingName(false); setNameValue(fullName); }}>
                <X className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ) : (
            <button
              className="text-lg font-bold text-foreground hover:text-primary transition-colors"
              onClick={() => setEditingName(true)}
            >
              {fullName || "Adicionar nome"}
            </button>
          )}

          <Badge variant="outline" className={`text-xs font-semibold px-3 py-1 ${roleBadge.className}`}>
            {roleBadge.label}
          </Badge>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: role === "trainer" ? Users : Dumbbell, label: stats.label1, value: stats.value1 },
            { icon: role === "trainer" ? FileText : Trophy, label: stats.label2, value: stats.value2 },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-card/40 backdrop-blur-sm p-4 text-center space-y-1">
              <stat.icon className="h-5 w-5 mx-auto text-muted-foreground" />
              {statsLoading ? (
                <div className="h-7 w-8 mx-auto rounded bg-muted animate-pulse" />
              ) : (
                <p className="text-2xl font-bold tabular-nums text-foreground">{stat.value}</p>
              )}
              <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Account Group */}
        <div className="rounded-xl border border-border bg-card/40 backdrop-blur-sm overflow-hidden">
          <p className="text-xs font-semibold text-muted-foreground px-4 pt-4 pb-2 uppercase tracking-wider">Conta</p>

          {/* Email (read-only) */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-t border-border/50">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm text-foreground truncate">{email}</p>
            </div>
          </div>

          {/* Change Password */}
          <button
            className="flex items-center gap-3 px-4 py-3.5 border-t border-border/50 w-full text-left hover:bg-secondary/50 transition-colors active:bg-secondary"
            onClick={async () => {
              const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/profile`,
              });
              if (error) toast.error("Erro ao enviar email.");
              else toast.success("Email de redefinição enviado!");
            }}
          >
            <KeyRound className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-foreground flex-1">Alterar Senha</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* Role-specific link */}
          {role === "trainer" ? (
            <button
              className="flex items-center gap-3 px-4 py-3.5 border-t border-border/50 w-full text-left hover:bg-secondary/50 transition-colors active:bg-secondary"
              onClick={() => navigate("/trainer")}
            >
              <Users className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-foreground flex-1">Gerenciar Alunos</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ) : (
            <button
              className="flex items-center gap-3 px-4 py-3.5 border-t border-border/50 w-full text-left hover:bg-secondary/50 transition-colors active:bg-secondary"
              onClick={() => navigate("/student")}
            >
              <Trophy className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-foreground flex-1">Ver Conquistas</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Danger Zone */}
        <div className="pt-2">
          <Button
            variant="ghost"
            className="w-full h-12 text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Sair da Conta
          </Button>
        </div>

        {/* Member Since */}
        {memberSince && (
          <p className="text-center text-[11px] text-muted-foreground/60">
            Membro desde {memberSince}
          </p>
        )}
      </div>
    </Layout>
  );
}
