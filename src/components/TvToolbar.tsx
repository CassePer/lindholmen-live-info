import { ThemeToggle } from "@/components/ThemeToggle";
import { motion } from "framer-motion";
import { UtensilsCrossed, Clock, Camera } from "lucide-react";
import { TV_PANELS, toggleTvPanel, type TvPanel } from "@/lib/tv-panels";
import { cn } from "@/lib/utils";

const ICONS: Record<TvPanel, typeof Clock> = { lunch: UtensilsCrossed, departures: Clock, cameras: Camera };

interface TvToolbarProps {
  panels: TvPanel[];
  onChange: (panels: TvPanel[]) => void;
}

export function TvToolbar({ panels, onChange }: TvToolbarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-4 left-4 z-50 flex items-center gap-1 rounded-full border bg-background/80 backdrop-blur-lg px-1 py-1 shadow-lg"
      role="toolbar"
      aria-label="Välj vad som visas (1 eller 2)"
    >
      {TV_PANELS.map((p) => {
        const Icon = ICONS[p.id];
        const active = panels.includes(p.id);
        const next = toggleTvPanel(panels, p.id);
        return (
          <button
            key={p.id}
            type="button"
            aria-pressed={active}
            disabled={!next}
            title={!next ? (active ? "Minst en måste visas" : "Högst två kan visas – avmarkera en först") : p.label}
            onClick={(e) => { if (next) onChange(next); e.currentTarget.blur(); }}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {p.label}
          </button>
        );
      })}
      <ThemeToggle />
    </motion.div>
  );
}
