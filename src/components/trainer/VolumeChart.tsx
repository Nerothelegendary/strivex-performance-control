import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface VolumeChartProps {
  studentId: string;
}

interface ChartPoint {
  date: string;
  volume: number;
}

export function VolumeChart({ studentId }: VolumeChartProps) {
  const [data, setData] = useState<ChartPoint[]>([]);
  const [exerciseNames, setExerciseNames] = useState<string[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>("__all__");

  useEffect(() => {
    loadData();
  }, [studentId]);

  const loadData = async () => {
    const { data: sessions } = await supabase
      .from("workout_sessions")
      .select("id, executed_at, total_volume")
      .eq("student_id", studentId)
      .order("executed_at");

    if (!sessions || sessions.length === 0) return;

    // Get unique exercise names from session sets
    const { data: sets } = await supabase
      .from("session_sets")
      .select("exercise_name, session_id, reps, weight")
      .in("session_id", sessions.map((s) => s.id));

    const names = [...new Set(sets?.map((s) => s.exercise_name) ?? [])].sort();
    setExerciseNames(names);

    // Build chart data
    if (selectedExercise === "__all__") {
      setData(sessions.map((s) => ({
        date: new Date(s.executed_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
        volume: Number(s.total_volume),
      })));
    } else {
      // Per-exercise volume
      const sessionMap = new Map(sessions.map((s) => [s.id, s.executed_at]));
      const points: ChartPoint[] = [];
      const grouped = new Map<string, number>();

      sets?.forEach((s) => {
        if (s.exercise_name !== selectedExercise) return;
        const date = sessionMap.get(s.session_id);
        if (!date) return;
        const key = new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
        grouped.set(key, (grouped.get(key) ?? 0) + s.reps * Number(s.weight));
      });

      grouped.forEach((volume, date) => points.push({ date, volume }));
      setData(points);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedExercise]);

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">Dados insuficientes para gráfico.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">Volume ao Longo do Tempo</h4>
        <Select value={selectedExercise} onValueChange={setSelectedExercise}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="Exercício" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos (Volume Total)</SelectItem>
            {exerciseNames.map((name) => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 20% 18%)" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(215 16% 47%)" }} />
          <YAxis tick={{ fontSize: 10, fill: "hsl(215 16% 47%)" }} />
          <Tooltip
            contentStyle={{
              background: "hsl(222 47% 11%)",
              border: "1px solid hsl(215 20% 18%)",
              borderRadius: "8px",
              fontSize: "12px",
              color: "hsl(210 20% 95%)",
            }}
            formatter={(value: number) => [`${value.toLocaleString()} kg`, "Volume"]}
          />
          <Line type="monotone" dataKey="volume" stroke="hsl(217 91% 60%)" strokeWidth={2} dot={{ r: 3, fill: "hsl(217 91% 60%)" }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
