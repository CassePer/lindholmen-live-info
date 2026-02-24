import { useDepartures } from "@/hooks/use-departures";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, AlertCircle, Ship, Train, Bus } from "lucide-react";
import type { Departure, TransportType } from "@/api/types";
import { useQueryClient } from "@tanstack/react-query";

const TRANSPORT_ORDER: TransportType[] = ["Färja", "Spårvagn", "Buss"];

const TRANSPORT_ICON: Record<TransportType, React.ReactNode> = {
  Färja: <Ship className="h-5 w-5" />,
  Spårvagn: <Train className="h-5 w-5" />,
  Buss: <Bus className="h-5 w-5" />,
};

function DepartureSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
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

function DepartureRow({ dep }: { dep: Departure }) {
  const time = dep.estimatedTime ?? dep.scheduledTime;
  const hasDelay = dep.delayMinutes > 0;

  return (
    <div className="flex items-center gap-3 py-2 border-b border-border last:border-0">
      <span className="font-bold text-base min-w-[2.5rem] text-center bg-primary text-primary-foreground rounded px-1.5 py-0.5">
        {dep.line}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{dep.destination}</p>
      </div>
      <div className="flex items-center gap-2">
        {hasDelay && (
          <span className="text-xs text-destructive font-medium">+{dep.delayMinutes} min</span>
        )}
        {dep.isRealtime && (
          <Badge variant="secondary" className="text-xs px-1.5 py-0">
            Live
          </Badge>
        )}
        <span className="text-xl font-bold tabular-nums min-w-[3.5rem] text-right">
          {time}
        </span>
      </div>
    </div>
  );
}

function GroupedDepartures({ departures }: { departures: Departure[] }) {
  const grouped = TRANSPORT_ORDER.map((type) => ({
    type,
    items: departures.filter((d) => d.transportType === type),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      {grouped.map((group) => (
        <Card key={group.type}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              {TRANSPORT_ICON[group.type]}
              {group.type}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div role="list" aria-label={`Avgångar med ${group.type}`}>
              {group.items.map((dep) => (
                <DepartureRow key={dep.id} dep={dep} />
              ))}
            </div>
          </CardContent>
        </Card>
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
    ? new Date(dataUpdatedAt).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;

  return (
    <main className="flex-1 overflow-auto">
      <div className="container max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Avgångar</h1>
          <Button variant="outline" size="sm" onClick={handleRefresh} aria-label="Uppdatera avgångar">
            <RefreshCw className="h-4 w-4 mr-1" />
            Uppdatera
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">Lindholmspiren</p>

        {updatedAtStr && (
          <p className="text-xs text-muted-foreground">Senast uppdaterad: {updatedAtStr}</p>
        )}

        {isLoading && <DepartureSkeleton />}

        {error && (
          <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground" role="alert">
            <AlertCircle className="h-8 w-8" />
            <p>Kunde inte hämta avgångar. Försök igen.</p>
          </div>
        )}

        {data && <GroupedDepartures departures={data.departures} />}

        <p className="text-xs text-muted-foreground text-center pt-4 pb-8">
          Uppdateras automatiskt var 30:e sekund.
        </p>
      </div>
    </main>
  );
}
