import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Timer, SkipForward, RotateCcw, Minus, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const PRESETS = [30, 60, 90, 120] as const;

interface RestTimerProps {
  /** Called when the timer finishes or is skipped */
  onComplete?: () => void;
}

export function RestTimer({ onComplete }: RestTimerProps) {
  const [duration, setDuration] = useState(60);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

  const playBeep = useCallback(() => {
    try {
      const ctx = audioRef.current ?? new AudioContext();
      audioRef.current = ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      // Audio not available — skip
    }
  }, []);

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setRunning(false);
    setSecondsLeft(0);
  }, []);

  const start = useCallback(() => {
    stop();
    setSecondsLeft(duration);
    setRunning(true);
  }, [duration, stop]);

  const skip = useCallback(() => {
    stop();
    onComplete?.();
  }, [stop, onComplete]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          setRunning(false);
          playBeep();
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, playBeep, onComplete]);

  // Cleanup AudioContext on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.close();
    };
  }, []);

  const progress = running ? secondsLeft / duration : 0;
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  const adjustDuration = (delta: number) => {
    if (running) return;
    setDuration((d) => Math.max(10, Math.min(300, d + delta)));
  };

  return (
    <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Timer className="h-4 w-4 text-primary" />
        Descanso
      </div>

      <AnimatePresence mode="wait">
        {running ? (
          <motion.div
            key="running"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center gap-3"
          >
            {/* Circular progress */}
            <div className="relative h-24 w-24">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50" cy="50" r="42"
                  fill="none"
                  className="stroke-border"
                  strokeWidth="6"
                />
                <circle
                  cx="50" cy="50" r="42"
                  fill="none"
                  className="stroke-primary"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress)}`}
                  style={{ transition: "stroke-dashoffset 0.3s ease" }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold tabular-nums text-foreground">
                {mins}:{secs.toString().padStart(2, "0")}
              </span>
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={start} className="gap-1">
                <RotateCcw className="h-3.5 w-3.5" /> Reiniciar
              </Button>
              <Button size="sm" variant="outline" onClick={skip} className="gap-1">
                <SkipForward className="h-3.5 w-3.5" /> Pular
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-3"
          >
            {/* Duration selector */}
            <div className="flex items-center justify-center gap-3">
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                onClick={() => adjustDuration(-10)}
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xl font-bold tabular-nums text-foreground w-16 text-center">
                {duration}s
              </span>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                onClick={() => adjustDuration(10)}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Presets */}
            <div className="flex gap-1.5 justify-center">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setDuration(p)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    duration === p
                      ? "bg-primary/15 text-primary border-primary/30"
                      : "bg-card/40 text-muted-foreground border-border hover:bg-secondary"
                  }`}
                >
                  {p}s
                </button>
              ))}
            </div>

            <Button
              onClick={start}
              className="w-full h-9 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Timer className="h-3.5 w-3.5 mr-1.5" />
              Iniciar descanso
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
