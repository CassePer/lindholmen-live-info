import { useState } from "react";
import { toast } from "sonner";
import { useLunchMenus } from "@/hooks/use-lunch";
import { SearchInput } from "@/components/SearchInput";
import { HighlightText } from "@/components/HighlightText";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Search as SearchIcon, AlertCircle, MapPin, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getLunchMenus } from "@/services/lunch";
import { useQueryClient } from "@tanstack/react-query";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { LunchMenu, DietTag } from "@/api/types";

const TAG_LABELS: Record<DietTag, string> = {
  vegetarisk: "Vegetarisk",
  vegansk: "Vegansk",
  fisk: "Fisk",
  kött: "Kött",
};

const TAG_COLORS: Record<DietTag, string> = {
  vegetarisk: "bg-success/15 text-success border-success/20",
  vegansk: "bg-success/10 text-success border-success/15",
  fisk: "bg-ferry/15 text-ferry border-ferry/20",
  kött: "bg-accent/15 text-accent border-accent/20",
};

function DishTag({ tag }: { tag: DietTag }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${TAG_COLORS[tag]}`}>
      {TAG_LABELS[tag]}
    </span>
  );
}

function MenuSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="glass-card">
          <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-3 py-12 text-muted-foreground"
      role="alert"
    >
      <AlertCircle className="h-8 w-8" />
      <p className="text-center">{message}</p>
    </motion.div>
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("sv-SE", { year: "numeric", month: "2-digit", day: "2-digit" });
}

const SE_WEEKDAYS = ["mån", "tis", "ons", "tors", "fre"];

function stockholmParts(d: Date) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  return { weekday, hour, minute };
}

function fmtStockholmHHMM(d: Date) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function getRefreshState(
  updatedAt: string | undefined,
  now: Date = new Date()
): { allowed: boolean; reason?: string; nextLabel?: string } {
  const { weekday, hour } = stockholmParts(now);
  const isWeekday = SE_WEEKDAYS.includes(weekday);
  const inWindow = isWeekday && hour >= 8 && hour < 14;

  if (!inWindow) {
    let nextLabel: string;
    if (!isWeekday) {
      nextLabel = "Öppnar måndag kl 08:00";
    } else if (hour < 8) {
      nextLabel = "Öppnar idag kl 08:00";
    } else {
      nextLabel = weekday === "fre" ? "Öppnar måndag kl 08:00" : "Öppnar imorgon kl 08:00";
    }
    return {
      allowed: false,
      reason: "Hämtning är endast tillåten vardagar kl 08–14.",
      nextLabel,
    };
  }

  const cooldownEnd = updatedAt ? new Date(new Date(updatedAt).getTime() + 60 * 60 * 1000) : null;
  if (cooldownEnd && cooldownEnd > now) {
    const cd = stockholmParts(cooldownEnd);
    const cdInWindow = SE_WEEKDAYS.includes(cd.weekday) && cd.hour >= 8 && cd.hour < 14;
    const nextLabel = cdInWindow
      ? `Nästa uppdatering kl ${fmtStockholmHHMM(cooldownEnd)}`
      : weekday === "fre"
      ? "Nästa uppdatering måndag kl 08:00"
      : "Nästa uppdatering imorgon kl 08:00";
    return {
      allowed: false,
      reason: "Menyn uppdaterades inom senaste timmen.",
      nextLabel,
    };
  }

  return { allowed: true };
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: "easeOut" as const },
  }),
};

function RestaurantCard({ menu, search, onRefresh, isRefreshing }: { menu: LunchMenu; search: string; onRefresh: (id: string) => void; isRefreshing: boolean }) {
  const mapsUrl = menu.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(menu.address)}`
    : undefined;
  const refreshState = getRefreshState(menu.updatedAt);
  const refreshDisabled = !refreshState.allowed || isRefreshing;

  return (
    <Card className="glass-card hover-scale">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-lg font-display">
              <HighlightText text={menu.restaurantName} query={search} />
            </CardTitle>
            {menu.address && mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <MapPin className="h-3 w-3" />
                {menu.address}
              </a>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => refreshState.allowed && onRefresh(menu.restaurantId)}
                  disabled={refreshDisabled}
                  className="text-muted-foreground hover:text-primary transition-colors p-1 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-muted-foreground"
                  aria-label={`Uppdatera ${menu.restaurantName}s meny`}
                  aria-disabled={refreshDisabled}
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[220px] text-xs">
                {refreshState.allowed
                  ? "Uppdatera meny"
                  : (
                      <span className="flex flex-col gap-0.5">
                        <span>{refreshState.reason}</span>
                        {refreshState.nextLabel && (
                          <span className="text-muted-foreground">{refreshState.nextLabel}</span>
                        )}
                      </span>
                    )}
              </TooltipContent>
            </Tooltip>
            <a
              href={menu.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors p-1"
              aria-label={`Besök ${menu.restaurantName}s webbplats`}
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {menu.dishes.length > 0 ? (
          <ul className="space-y-1.5" aria-label="Dagens rätter">
            {menu.dishes.map((dish, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                <HighlightText text={dish.name} query={search} className="flex-1" />
                {dish.tags?.map((tag) => <DishTag key={tag} tag={tag} />)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground italic">Ingen meny hittades</p>
        )}
        <p className="text-xs text-muted-foreground pt-2">
          Uppdaterad: {formatDate(menu.updatedAt)} kl {formatTime(menu.updatedAt)}
        </p>
        {menu.stale && (
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
            Ej dagens meny – visar senast hämtade ({formatDate(menu.updatedAt)})
          </p>
        )}
        {!refreshState.allowed && refreshState.nextLabel && (
          <p className="text-xs text-muted-foreground/80 italic">{refreshState.nextLabel}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function LunchPage({ embedded }: { embedded?: boolean }) {
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const { data, isLoading, error } = useLunchMenus();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const activeSearch = showSearch ? search : "";

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const freshData = await getLunchMenus(true);
      queryClient.setQueryData(["lunch"], freshData);
      if (freshData.cooldown) {
        toast.info(freshData.reason ?? `Menyerna uppdaterades nyligen. Försök igen om ${freshData.minutesLeft} min.`);
      } else if (freshData.aiCreditsExhausted) {
        toast.error("Uppdatering misslyckades — AI-krediter saknas.");
      } else {
        toast.success("Menyerna har uppdaterats!");
      }
    } catch (err) {
      console.error("Force refresh failed:", err);
      queryClient.invalidateQueries({ queryKey: ["lunch"] });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRefreshSingle = async (restaurantId: string) => {
    setRefreshingId(restaurantId);
    try {
      const freshData = await getLunchMenus(true, restaurantId);
      queryClient.setQueryData(["lunch"], freshData);
      if (freshData.cooldown) {
        toast.info(freshData.reason ?? `Menyn uppdaterades nyligen. Försök igen om ${freshData.minutesLeft} min.`);
      } else if (freshData.aiCreditsExhausted) {
        toast.error("Uppdatering misslyckades — AI-krediter saknas.");
      } else {
        toast.success("Menyn har uppdaterats!");
      }
    } catch (err) {
      console.error("Single refresh failed:", err);
      toast.error("Kunde inte uppdatera menyn.");
    } finally {
      setRefreshingId(null);
    }
  };

  const menus = data?.menus ?? [];
  const aiCreditsExhausted = data?.aiCreditsExhausted ?? false;
  const filtered = menus.filter((m) =>
    m.restaurantName.toLowerCase().includes(activeSearch.toLowerCase()) ||
    m.dishes.some((d) => d.name.toLowerCase().includes(activeSearch.toLowerCase()))
  );

  const content = (
    <div className={embedded ? "space-y-4" : "container max-w-lg mx-auto px-4 py-6 space-y-4"}>
      <div className="flex items-center justify-between">
        <motion.h1
          className="text-2xl font-bold font-display"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          Dagens lunch
        </motion.h1>
        <motion.div
          className="flex items-center gap-1"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Button variant="ghost" size="icon" onClick={() => { setShowSearch((v) => !v); if (showSearch) setSearch(""); }} aria-label="Sök lunchmenyer">
            <SearchIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isRefreshing} aria-label="Uppdatera lunchmenyer">
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </motion.div>
      </div>

      <AnimatePresence>
        {showSearch && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
            <SearchInput placeholder="Sök restaurang eller rätt..." value={search} onChange={setSearch} />
          </motion.div>
        )}
      </AnimatePresence>

      {aiCreditsExhausted && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>
            Menyer kunde inte uppdateras — AI-krediter saknas. Visar senaste tillgängliga data.
          </p>
        </div>
      )}

      {isLoading ? (
        <MenuSkeleton />
      ) : error ? (
        <ErrorState message="Kunde inte hämta dagens menyer. Försök igen senare." />
      ) : !filtered?.length ? (
        <ErrorState message={activeSearch ? `Inga resultat för "${activeSearch}".` : "Inga menyer hittades för idag."} />
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((menu, i) => (
              <motion.div
                key={menu.restaurantId}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, scale: 0.95 }}
                layout
              >
                <RestaurantCard menu={menu} search={activeSearch} onRefresh={handleRefreshSingle} isRefreshing={refreshingId === menu.restaurantId} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <footer className="text-xs text-muted-foreground text-center pt-4 pb-8 space-y-1">
        <p>Menyer kan ändras – kontrollera restaurangens sida.</p>
        <p>Källa: Restaurangernas webbplatser</p>
      </footer>
    </div>
  );

  if (embedded) return content;
  return <main className="flex-1 overflow-auto">{content}</main>;
}
