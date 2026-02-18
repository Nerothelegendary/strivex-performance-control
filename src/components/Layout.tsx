import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Layout({ children }: { children: ReactNode }) {
  const { profile, role, signOut } = useAuth();

  const roleLabel = role === "trainer" ? "Treinador" : "Aluno";
  const initials = profile?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "?";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold tracking-tight text-foreground">Strivex</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{roleLabel}</span>
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
      <main className="container py-6">{children}</main>
    </div>
  );
}
