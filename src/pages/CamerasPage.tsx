import { useState, useEffect, useCallback } from "react";
import { useCameras } from "@/hooks/use-cameras";
import { Card, CardContent } from "@/components/ui/card";
import { SearchInput } from "@/components/SearchInput";
import { HighlightText } from "@/components/HighlightText";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ExternalLink, X, Search as SearchIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Camera } from "@/api/types";

function CameraSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="glass-card"><CardContent className="p-2"><Skeleton className="aspect-[4/3] w-full rounded" /></CardContent></Card>
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
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Kamerabild: ${camera.name}`}
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="relative max-w-3xl w-full bg-card rounded-xl overflow-hidden shadow-xl border border-border"
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 rounded-full bg-background/80 backdrop-blur-sm p-2 hover:bg-background transition-colors"
          aria-label="Stäng"
          autoFocus
        >
          <X className="h-5 w-5" />
        </button>
        <a
          href={camera.fullImageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <img
            src={camera.fullImageUrl}
            alt={`Trafikamera: ${camera.name}`}
            className="w-full cursor-pointer"
            loading="lazy"
          />
        </a>
        <div className="p-4">
          <h2 className="font-semibold font-display">{camera.name}</h2>
          <p className="text-sm text-muted-foreground">{camera.location}</p>
          {camera.description && (
            <p className="text-sm text-muted-foreground mt-1">{camera.description}</p>
          )}
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground">
              Uppdaterad: {new Date(camera.updatedAt).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit", hour12: false })}
            </p>
            <a
              href={camera.fullImageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Öppna live-bild <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function CamerasPage({ embedded }: { embedded?: boolean }) {
  const { data, isLoading, error } = useCameras();
  const [selected, setSelected] = useState<Camera | null>(null);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const activeSearch = showSearch ? search : "";

  const content = (
    <div className={embedded ? "space-y-4" : "container max-w-lg mx-auto px-4 py-6 space-y-4"}>
        <div className="flex items-center justify-between">
          <motion.h1
            className="text-2xl font-bold font-display"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            Kameror
            <span className="text-sm font-normal text-muted-foreground ml-2">Göteborg</span>
          </motion.h1>
          <Button variant="ghost" size="icon" onClick={() => { setShowSearch((v) => !v); if (showSearch) setSearch(""); }} aria-label="Sök kameror">
            <SearchIcon className="h-4 w-4" />
          </Button>
        </div>

        <AnimatePresence>
          {showSearch && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
              <SearchInput placeholder="Sök kamera..." value={search} onChange={setSearch} />
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading && <CameraSkeleton />}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-3 py-12 text-muted-foreground"
            role="alert"
          >
            <AlertCircle className="h-8 w-8" />
            <p>Kunde inte hämta kamerabilder. Försök igen.</p>
          </motion.div>
        )}

        {data && (() => {
          const filtered = activeSearch.trim()
            ? data.filter((c) => {
                const q = activeSearch.toLowerCase();
                return c.name.toLowerCase().includes(q) || c.location.toLowerCase().includes(q) || (c.description?.toLowerCase().includes(q) ?? false);
              })
            : data;
          return (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((camera, i) => (
              <motion.button
                key={camera.id}
                onClick={() => setSelected(camera)}
                className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
                aria-label={`Visa ${camera.name}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.3 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Card className="overflow-hidden glass-card">
                  <CardContent className="p-0">
                    <img
                      src={camera.thumbnailUrl}
                      alt={`Trafikamera: ${camera.name}`}
                      className="aspect-[4/3] w-full object-cover"
                      loading="lazy"
                    />
                    <div className="p-2.5">
                      <HighlightText text={camera.name} query={activeSearch} className="text-sm font-medium truncate block font-display" />
                      <p className="text-xs text-muted-foreground">
                        {new Date(camera.updatedAt).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit", hour12: false })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.button>
            ))}
          </div>
          );
        })()}

        <AnimatePresence>
          {selected && <CameraModal camera={selected} onClose={() => setSelected(null)} />}
        </AnimatePresence>

        <p className="text-xs text-muted-foreground text-center pt-4 pb-8">
          Uppdateras var 3:e minut.
        </p>
      </div>
  );

  if (embedded) return content;
  return <main className="flex-1 overflow-auto">{content}</main>;
}
