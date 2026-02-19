import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

interface VolumeChartProps {
  studentId: string;
}

interface ChartPoint {
  exercise_name: string;
  total_volume: number;
}

export function VolumeChart({ studentId }: VolumeChartProps) {
  const [data, setData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [studentId]);

  const loadData = async () => {
    setLoading(true);
    const { data: result, error } = await supabase.rpc("get_volume_by_exercise", {
      p_student_id: studentId,
    });

    if (error) {
      console.warn("VolumeChart RPC error:", error.message);
      setLoading(false);
      return;
    }

    setData(
      (result ?? [])
        .slice(0, 8)
        .map((row) => ({
          exercise_name: row.exercise_name,
          total_volume: Number(row.total_volume),
        }))
    );
    setLoading(false);
  };

  if (!loading && data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">Dados insuficientes para gráfico.</p>;
  }

  if (loading) {
    return (
      <div className="h-[220px] flex items-center justify-center">
        <span className="text-xs text-muted-foreground">Carregando...</span>
      </div>
    );
  }

  const formatName = (name: string) =>
    name.length > 14 ? name.slice(0, 13) + "…" : name;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-foreground">Volume por Exercício</h4>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ top: 2, right: 8, left: 0, bottom: 2 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 20% 18%)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: "hsl(215 16% 47%)" }}
            tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
          />
          <YAxis
            type="category"
            dataKey="exercise_name"
            width={90}
            tick={{ fontSize: 10, fill: "hsl(215 16% 47%)" }}
            tickFormatter={formatName}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(222 47% 11%)",
              border: "1px solid hsl(215 20% 18%)",
              borderRadius: "8px",
              fontSize: "12px",
              color: "hsl(210 20% 95%)",
            }}
            formatter={(value: number) => [`${value.toLocaleString()} kg`, "Volume Total"]}
          />
          <Bar dataKey="total_volume" radius={[0, 4, 4, 0]}>
            {data.map((_, index) => (
              <Cell
                key={index}
                fill={`hsl(217 91% ${Math.max(40, 60 - index * 3)}%)`}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
