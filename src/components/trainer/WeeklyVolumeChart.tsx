import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp } from "lucide-react";

interface WeeklyVolumeChartProps {
  studentId: string;
}

interface WeekPoint {
  week_start: string;
  total_volume: number;
  session_count: number;
  label: string;
}

export function WeeklyVolumeChart({ studentId }: WeeklyVolumeChartProps) {
  const [data, setData] = useState<WeekPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [studentId]);

  const loadData = async () => {
    setLoading(true);
    const { data: result, error } = await supabase.rpc("get_weekly_volume", {
      p_student_id: studentId,
    });

    if (error) {
      console.warn("WeeklyVolumeChart RPC error:", error.message);
      setLoading(false);
      return;
    }

    setData(
      (result ?? []).map((row) => ({
        week_start: row.week_start,
        total_volume: Number(row.total_volume),
        session_count: Number(row.session_count),
        label: format(new Date(row.week_start), "dd/MM", { locale: ptBR }),
      }))
    );
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="h-[200px] flex items-center justify-center">
        <span className="text-xs text-muted-foreground">Carregando...</span>
      </div>
    );
  }

  if (data.length < 2) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/20 py-8 text-center">
        <TrendingUp className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">Dados insuficientes para o gráfico semanal.</p>
        <p className="text-[11px] text-muted-foreground/60 mt-1">
          Necessário ao menos 2 semanas de treinos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
        <h4 className="text-sm font-medium text-foreground">Volume Semanal</h4>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <defs>
            <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(217 91% 60%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 20% 18%)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "hsl(215 16% 47%)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "hsl(215 16% 47%)" }}
            tickFormatter={(v: number) =>
              v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
            }
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(222 47% 11%)",
              border: "1px solid hsl(215 20% 18%)",
              borderRadius: "8px",
              fontSize: "12px",
              color: "hsl(210 20% 95%)",
            }}
            formatter={(value: number, name: string) => {
              if (name === "total_volume") return [`${value.toLocaleString()} kg`, "Volume"];
              return [value, name];
            }}
            labelFormatter={(label) => `Semana de ${label}`}
          />
          <Area
            type="monotone"
            dataKey="total_volume"
            stroke="hsl(217 91% 60%)"
            strokeWidth={2}
            fill="url(#volumeGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
