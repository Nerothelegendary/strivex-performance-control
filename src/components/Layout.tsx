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
      <div className="flex min-h-screen items-center justify-center"
           style={{ background: 'hsl(222 47% 8%)' }}>
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
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
    <div className="min-h-screen" style={{ background: 'hsl(222 47% 8%)' }}>
      <header className="sticky top-0 z-50 border-b border-white/10"
              style={{ background: 'hsl(222 47% 6% / 0.95)', backdropFilter: 'blur(12px)' }}>
        <div className="container flex h-12 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg"
                 style={{ background: 'linear-gradient(135deg, hsl(224 76% 33%), hsl(217 91% 60%))' }}>
              <Dumbbell className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-bold tracking-wider text-white uppercase">Strivex</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium leading-none text-white/90">Olá, {firstName}</p>
              <p className="text-[11px] text-white/40">{roleLabel}</p>
            </div>
            <Avatar className="h-7 w-7 border border-white/20">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="text-xs bg-white/10 text-white/70">{initials}</AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="icon" onClick={signOut} className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/10">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="container py-5 px-4"><PageTransition>{children}</PageTransition></main>
    </div>
  );
}
