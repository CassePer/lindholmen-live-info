import { useState, useEffect, useCallback } from "react";
import { useCameras } from "@/hooks/use-cameras";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, X } from "lucide-react";
import type { Camera } from "@/api/types";

function CameraSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}><CardContent className="p-2"><Skeleton className="aspect-[4/3] w-full rounded" /></CardContent></Card>
      ))}
    </div>
  );
}

function CameraModal({ camera, onClose }: { camera: Camera; onClose: () => void }) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    // Focus trap: prevent background scroll
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Kamerabild: ${camera.name}`}
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl w-full bg-card rounded-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 rounded-full bg-background/80 p-2 hover:bg-background transition-colors"
          aria-label="Stäng"
          autoFocus
        >
          <X className="h-5 w-5" />
        </button>
        <img
          src={camera.fullImageUrl}
          alt={`Trafikamera: ${camera.name}`}
          className="w-full"
          loading="lazy"
        />
        <div className="p-4">
          <h2 className="font-semibold">{camera.name}</h2>
          <p className="text-sm text-muted-foreground">{camera.location}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Uppdaterad: {new Date(camera.updatedAt).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CamerasPage() {
  const { data, isLoading, error } = useCameras();
  const [selected, setSelected] = useState<Camera | null>(null);

  return (
    <main className="flex-1 overflow-auto">
      <div className="container max-w-lg mx-auto px-4 py-6 space-y-4">
        <h1 className="text-2xl font-bold">Kameror</h1>
        <p className="text-sm text-muted-foreground">Trafikkameror i Göteborg</p>

        {isLoading && <CameraSkeleton />}

        {error && (
          <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground" role="alert">
            <AlertCircle className="h-8 w-8" />
            <p>Kunde inte hämta kamerabilder. Försök igen.</p>
          </div>
        )}

        {data && (
          <div className="grid grid-cols-2 gap-3">
            {data.map((camera) => (
              <button
                key={camera.id}
                onClick={() => setSelected(camera)}
                className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
                aria-label={`Visa ${camera.name}`}
              >
                <Card className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-0">
                    <img
                      src={camera.thumbnailUrl}
                      alt={`Trafikamera: ${camera.name}`}
                      className="aspect-[4/3] w-full object-cover"
                      loading="lazy"
                    />
                    <div className="p-2">
                      <p className="text-sm font-medium truncate">{camera.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(camera.updatedAt).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        )}

        {selected && <CameraModal camera={selected} onClose={() => setSelected(null)} />}

        <p className="text-xs text-muted-foreground text-center pt-4 pb-8">
          Uppdateras var 3:e minut.
        </p>
      </div>
    </main>
  );
}
