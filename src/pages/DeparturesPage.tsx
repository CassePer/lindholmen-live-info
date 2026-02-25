import { useState } from "react";
import { useDepartures } from "@/hooks/use-departures";
import { useAppSettings } from "@/hooks/use-app-settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, AlertCircle, Ship, Train, Bus, ChevronDown, ChevronUp, Flag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Departure, TransportType } from "@/api/types";
import { useQueryClient } from "@tanstack/react-query";

const TRANSPORT_ORDER: TransportType[] = ["Färja", "Spårvagn", "Buss"];

const TRANSPORT_ICON: Record<TransportType, React.ReactNode> = {
  Färja: <Ship className="h-5 w-5" />,
  Spårvagn: <Train className="h-5 w-5" />,
  Buss: <Bus className="h-5 w-5" />,
};

const TRANSPORT_COLORS: Record<TransportType, string> = {
  Färja: "bg-ferry text-primary-foreground",
  Spårvagn: "bg-tram text-primary-foreground",
  Buss: "bg-bus text-primary-foreground",
};

const INITIAL_VISIBLE = 5;

function DepartureSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="glass-card">
          <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DepartureRow({ dep, index }: { dep: Departure; index: number }) {
  const time = dep.estimatedTime ?? dep.scheduledTime;
  const hasDelay = dep.delayMinutes > 0;
  const colorClass = TRANSPORT_COLORS[dep.transportType] ?? "bg-muted text-muted-foreground";

  return (
    <motion.div
      className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
    >
      <span className={`font-bold text-sm min-w-[2.5rem] text-center rounded-md px-1.5 py-1 ${colorClass}`}>
        {dep.line}
      </span>
      {dep.line === "286" && (
        <Flag className="h-4 w-4 text-success shrink-0" fill="currentColor" aria-label="Gratisfärja" />
      )}
      {dep.line === "285" && (
        <Flag className="h-4 w-4 text-ferry shrink-0" fill="currentColor" aria-label="Betalfärja" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{dep.destination}</p>
      </div>
      <div className="flex items-center gap-2">
        {hasDelay && (
          <span className="text-xs text-destructive font-semibold">+{dep.delayMinutes}</span>
        )}
        {dep.isRealtime && (
          <Badge variant="secondary" className="text-xs px-1.5 py-0 bg-success/15 text-success border-success/20">
            Live
          </Badge>
        )}
        <span className="text-2xl font-bold tabular-nums min-w-[3.5rem] text-right font-display">
          {time}
        </span>
      </div>
    </motion.div>
  );
}

function splitDepartures(items: Departure[]): { past: Departure[]; upcoming: Departure[] } {
  const now = new Date();
  const nowHHmm = now.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit", hour12: false });

  const past: Departure[] = [];
  const upcoming: Departure[] = [];

  for (const d of items) {
    const depTime = d.estimatedTime ?? d.scheduledTime;
    if (depTime < nowHHmm) {
      past.push(d);
    } else {
      upcoming.push(d);
    }
  }
  return { past, upcoming };
}

function GroupedDepartures({ departures }: { departures: Departure[] }) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Always show all three transport types, even if empty
  const grouped = TRANSPORT_ORDER.map((type) => ({
    type,
    items: departures.filter((d) => d.transportType === type),
  }));

  // Also include transport types not in TRANSPORT_ORDER (e.g. "Tåg")
  const knownTypes = new Set(TRANSPORT_ORDER);
  const extraGroups = [...new Set(departures.map(d => d.transportType))]
    .filter(t => !knownTypes.has(t))
    .map(type => ({
      type,
      items: departures.filter(d => d.transportType === type),
    }))
    .filter(g => g.items.length > 0);

  const allGroups = [...grouped, ...extraGroups];

  const toggleGroup = (type: string) => {
    setExpandedGroups((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  return (
    <div className="space-y-4">
      {allGroups.map((group, gi) => {
        const { past, upcoming } = splitDepartures(group.items);
        const lastDeparture = past.length > 0 ? past[past.length - 1] : null;
        const isExpanded = expandedGroups[group.type] ?? false;
        const defaultVisible = upcoming.slice(0, INITIAL_VISIBLE);
        const visibleUpcoming = isExpanded ? upcoming : defaultVisible;
        const hasMore = upcoming.length > INITIAL_VISIBLE;

        return (
          <motion.div
            key={group.type}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: gi * 0.1, duration: 0.35 }}
          >
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 font-display">
                  {TRANSPORT_ICON[group.type] ?? <Bus className="h-5 w-5" />}
                  {group.type}
                  <span className="text-xs text-muted-foreground font-normal ml-auto">
                    {upcoming.length > 0
                      ? `${upcoming.length} kommande`
                      : "Inga avgångar just nu"}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {group.items.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Inga avgångar att visa just nu.
                  </p>
                )}
                <div role="list" aria-label={`Avgångar med ${group.type}`}>
                  <AnimatePresence initial={false}>
                    {lastDeparture && (
                      <div className="opacity-50">
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-xs text-muted-foreground font-medium">Senaste avgång</span>
                        </div>
                        <DepartureRow dep={lastDeparture} index={0} />
                        <div className="border-b-2 border-border my-2" />
                      </div>
                    )}
                    {visibleUpcoming.map((dep, i) => (
                      <DepartureRow key={dep.id} dep={dep} index={i} />
                    ))}
                  </AnimatePresence>
                </div>
                {hasMore && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2 text-muted-foreground"
                    onClick={() => toggleGroup(group.type)}
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-1" />
                        Visa färre
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-1" />
                        Visa alla {upcoming.length} avgångar
                      </>
                    )}
                  </Button>
                )}
                {group.type === "Färja" && (
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3 pt-2 border-t border-border/50">
                    <span className="flex items-center gap-1">
                      <Flag className="h-3 w-3 text-success" fill="currentColor" /> Gratis
                    </span>
                    <span className="flex items-center gap-1">
                      <Flag className="h-3 w-3 text-ferry" fill="currentColor" /> Kräver biljett
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

export default function DeparturesPage({ embedded }: { embedded?: boolean }) {
  const { data, isLoading, error, dataUpdatedAt } = useDepartures();
  const { data: settings } = useAppSettings();
  const intervalSec = settings?.departure_refresh_interval ?? "60";
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["departures"] });
  };

  const updatedAtStr = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
    : null;

  const stopName = data?.stopName || "Lindholmspiren";

  const content = (
    <div className={embedded ? "space-y-4" : "container max-w-lg mx-auto px-4 py-6 space-y-4"}>
        <div className="flex items-center justify-between">
          <motion.h1
            className="text-2xl font-bold font-display"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            Avgångar
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Button variant="outline" size="sm" onClick={handleRefresh} aria-label="Uppdatera avgångar" className="hover-scale">
              <RefreshCw className="h-4 w-4 mr-1" />
              Uppdatera
            </Button>
          </motion.div>
        </div>

        <p className="text-sm text-muted-foreground font-medium">{stopName}</p>

        {updatedAtStr && (
          <p className="text-xs text-muted-foreground">Senast uppdaterad: {updatedAtStr}</p>
        )}

        {isLoading && <DepartureSkeleton />}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-3 py-12 text-muted-foreground"
            role="alert"
          >
            <AlertCircle className="h-8 w-8" />
            <p className="text-center">Kunde inte hämta avgångar. Försök igen.</p>
            <p className="text-xs text-center max-w-xs">{error instanceof Error ? error.message : ""}</p>
          </motion.div>
        )}

        {data && data.departures.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>Inga avgångar hittades just nu.</p>
          </div>
        )}

        {data && data.departures.length > 0 && <GroupedDepartures departures={data.departures} />}


        <p className="text-xs text-muted-foreground text-center pt-2 pb-8">
          Uppdateras automatiskt var {intervalSec}:e sekund · Data från Trafiklab.se
        </p>
      </div>
  );

  if (embedded) return content;
  return <main className="flex-1 overflow-auto">{content}</main>;
}
