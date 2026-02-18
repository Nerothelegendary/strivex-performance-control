import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Common exercises for autocomplete suggestions
const COMMON_EXERCISES = [
  "Supino Reto", "Supino Inclinado", "Supino Declinado",
  "Agachamento Livre", "Agachamento Frontal", "Leg Press 45°",
  "Cadeira Extensora", "Mesa Flexora", "Stiff",
  "Puxada Frontal", "Puxada Atrás", "Remada Curvada",
  "Remada Unilateral", "Remada Cavalinho", "Barra Fixa",
  "Desenvolvimento com Halteres", "Elevação Lateral", "Elevação Frontal",
  "Rosca Direta", "Rosca Alternada", "Rosca Scott",
  "Tríceps Corda", "Tríceps Francês", "Tríceps Testa",
  "Panturrilha em Pé", "Panturrilha Sentado",
  "Abdominais", "Prancha", "Crucifixo", "Pullover",
  "Terra", "Levantamento Terra", "Hip Thrust",
  "Cadeira Adutora", "Cadeira Abdutora",
];

interface ExerciseComboboxProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (name: string) => void;
  placeholder?: string;
  className?: string;
}

export function ExerciseCombobox({ value, onChange, onSelect, placeholder = "Nome do exercício", className }: ExerciseComboboxProps) {
  const { user } = useAuth();
  const [trainerExercises, setTrainerExercises] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) loadTrainerExercises();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadTrainerExercises = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("exercise_library")
      .select("name")
      .eq("trainer_id", user.id)
      .order("name");
    setTrainerExercises(data?.map((e) => e.name) ?? []);
  };

  const allSuggestions = [...new Set([...trainerExercises, ...COMMON_EXERCISES])].sort();

  const filtered = value.trim().length > 0
    ? allSuggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase()))
    : [];

  const handleSelect = (name: string) => {
    onSelect(name);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (filtered.length === 1) {
        handleSelect(filtered[0]);
      } else {
        onSelect(value);
      }
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => value.trim().length > 0 && setOpen(true)}
        onKeyDown={handleKeyDown}
        className={cn("h-10", className)}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
          {filtered.slice(0, 10).map((name) => (
            <button
              key={name}
              type="button"
              className="w-full text-left px-3 py-2 text-sm text-popover-foreground hover:bg-accent/20 transition-colors"
              onClick={() => handleSelect(name)}
            >
              {trainerExercises.includes(name) && (
                <span className="text-accent mr-1.5 text-[10px] font-medium">★</span>
              )}
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
