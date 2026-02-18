import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, Trophy, Dumbbell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FeedEntry {
  id: string;
  event_type: string;
  message: string;
  is_read: boolean;
  created_at: string;
  student_id: string;
}

export function ActivityFeed() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadFeed();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("activity-feed")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "activity_feed",
        filter: `trainer_id=eq.${user.id}`,
      }, (payload) => {
        setEntries((prev) => [payload.new as FeedEntry, ...prev].slice(0, 20));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const loadFeed = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("activity_feed")
      .select("*")
      .eq("trainer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setEntries(data ?? []);
    setLoading(false);
  };

  const markAllRead = async () => {
    if (!user) return;
    const unreadIds = entries.filter((e) => !e.is_read).map((e) => e.id);
    if (unreadIds.length === 0) return;
    await supabase.from("activity_feed").update({ is_read: true }).in("id", unreadIds);
    setEntries((prev) => prev.map((e) => ({ ...e, is_read: true })));
  };

  const unreadCount = entries.filter((e) => !e.is_read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case "personal_best": return <Trophy className="h-3.5 w-3.5 text-yellow-400" />;
      default: return <Dumbbell className="h-3.5 w-3.5 text-accent" />;
    }
  };

  if (loading || entries.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Atividade Recente</h3>
          {unreadCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground font-medium">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
            Marcar como lido
          </button>
        )}
      </div>
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {entries.map((e) => (
          <div key={e.id} className={`flex items-start gap-2.5 px-3 py-2 rounded-lg transition-colors ${e.is_read ? "bg-transparent" : "bg-accent/5"}`}>
            <div className="mt-0.5">{getIcon(e.event_type)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground/80">{e.message}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {formatDistanceToNow(new Date(e.created_at), { addSuffix: true, locale: ptBR })}
              </p>
            </div>
            {!e.is_read && <span className="w-2 h-2 rounded-full bg-accent mt-1 shrink-0" />}
          </div>
        ))}
      </div>
    </div>
  );
}
