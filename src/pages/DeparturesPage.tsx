import { useDepartures } from "@/hooks/use-departures";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, AlertCircle, Ship, Train, Bus } from "lucide-react";
import { motion } from "framer-motion";
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
  const colorClass = TRANSPORT_COLORS[dep.transportType];

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

function GroupedDepartures({ departures }: { departures: Departure[] }) {
  const grouped = TRANSPORT_ORDER.map((type) => ({
    type,
    items: departures.filter((d) => d.transportType === type),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      {grouped.map((group, gi) => (
        <motion.div
          key={group.type}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: gi * 0.1, duration: 0.35 }}
        >
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 font-display">
                {TRANSPORT_ICON[group.type]}
                {group.type}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div role="list" aria-label={`Avgångar med ${group.type}`}>
                {group.items.map((dep, i) => (
                  <DepartureRow key={dep.id} dep={dep} index={i} />
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

export default function DeparturesPage() {
  const { data, isLoading, error, dataUpdatedAt } = useDepartures();
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["departures"] });
  };

  const updatedAtStr = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
    : null;

  return (
    <main className="flex-1 overflow-auto">
      <div className="container max-w-lg mx-auto px-4 py-6 space-y-4">
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

        <p className="text-sm text-muted-foreground font-medium">Lindholmspiren</p>

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
            <p>Kunde inte hämta avgångar. Försök igen.</p>
          </motion.div>
        )}

        {data && <GroupedDepartures departures={data.departures} />}

        <p className="text-xs text-muted-foreground text-center pt-4 pb-8">
          Uppdateras automatiskt var 30:e sekund.
        </p>
      </div>
    </main>
  );
}
