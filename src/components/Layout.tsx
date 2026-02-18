import { ReactNode } from "react";
import { PageTransition } from "@/components/PageTransition";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Dumbbell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Navigate } from "react-router-dom";

export function Layout({ children }: { children: ReactNode }) {
  const { user, profile, role, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!role) return <Navigate to="/select-role" replace />;

  const roleLabel = role === "trainer" ? "Treinador" : "Aluno";
  const rawName =
    profile?.full_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "";
  const firstName = rawName.split(" ")[0];
  const initials = rawName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border"
              style={{ background: 'var(--header-bg)', backdropFilter: 'blur(12px)' }}>
        <div className="container flex h-12 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg"
                 style={{ background: 'var(--gradient-primary)' }}>
              <Dumbbell className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-bold tracking-wider text-foreground uppercase">Strivex</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium leading-none text-foreground">Olá, {firstName}</p>
              <p className="text-[11px] text-muted-foreground">{roleLabel}</p>
            </div>
            <Avatar className="h-7 w-7 border border-border">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="text-xs bg-secondary text-muted-foreground">{initials}</AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="icon" onClick={signOut} className="h-8 w-8">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="container py-5 px-4"><PageTransition>{children}</PageTransition></main>
    </div>
  );
}
