import { ReactNode } from "react";
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

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!role) {
    return <Navigate to="/select-role" replace />;
  }

  const roleLabel = role === "trainer" ? "Treinador" : "Aluno";

  // Get display name from profile or user metadata
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
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container flex h-12 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold tracking-tight text-foreground">Strivex</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium leading-none text-foreground">Olá, {firstName}</p>
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
            </div>
            <Avatar className="h-7 w-7">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="icon" onClick={signOut} className="h-8 w-8">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="container py-4 px-4">{children}</main>
    </div>
  );
}
