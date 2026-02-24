import { useState } from "react";
import { useLunchMenus, useWeeklyMenus } from "@/hooks/use-lunch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Search, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { LunchMenu, WeeklyLunchMenu, DietTag } from "@/api/types";

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
  return new Date(iso).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: "easeOut" as const },
  }),
};

function TodayView({ search }: { search: string }) {
  const { data, isLoading, error } = useLunchMenus();

  if (isLoading) return <MenuSkeleton />;
  if (error) return <ErrorState message="Kunde inte hämta dagens menyer. Försök igen senare." />;
  if (!data?.length) return <ErrorState message="Inga menyer hittades för idag." />;

  const filtered = data.filter((m) =>
    m.restaurantName.toLowerCase().includes(search.toLowerCase()) ||
    m.dishes.some((d) => d.name.toLowerCase().includes(search.toLowerCase()))
  );

  if (!filtered.length) return <ErrorState message={`Inga resultat för "${search}".`} />;

  return (
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
            <RestaurantCard menu={menu} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function RestaurantCard({ menu }: { menu: LunchMenu }) {
  return (
    <Card className="glass-card hover-scale">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg font-display">{menu.restaurantName}</CardTitle>
          <a
            href={menu.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 text-muted-foreground hover:text-primary transition-colors"
            aria-label={`Besök ${menu.restaurantName}s webbplats`}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <ul className="space-y-1.5" aria-label="Dagens rätter">
          {menu.dishes.map((dish, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
              <span className="flex-1">{dish.name}</span>
              {dish.tags?.map((tag) => <DishTag key={tag} tag={tag} />)}
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground pt-2">
          Uppdaterad: {formatTime(menu.updatedAt)}
        </p>
      </CardContent>
    </Card>
  );
}

function WeekView({ search }: { search: string }) {
  const { data, isLoading, error } = useWeeklyMenus();

  if (isLoading) return <MenuSkeleton />;
  if (error) return <ErrorState message="Kunde inte hämta veckomenyer. Försök igen senare." />;
  if (!data?.length) return <ErrorState message="Inga veckomenyer hittades." />;

  const filtered = data.filter((m) =>
    m.restaurantName.toLowerCase().includes(search.toLowerCase())
  );

  if (!filtered.length) return <ErrorState message={`Inga resultat för "${search}".`} />;

  return (
    <div className="space-y-6">
      {filtered.map((menu, i) => (
        <motion.div
          key={menu.restaurantId}
          custom={i}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          <WeeklyRestaurantCard menu={menu} />
        </motion.div>
      ))}
    </div>
  );
}

function WeeklyRestaurantCard({ menu }: { menu: WeeklyLunchMenu }) {
  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg font-display">{menu.restaurantName}</CardTitle>
          <a
            href={menu.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 text-muted-foreground hover:text-primary transition-colors"
            aria-label={`Besök ${menu.restaurantName}s webbplats`}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {menu.days.map((day) => (
          <div key={day.date}>
            <h4 className="font-semibold text-sm mb-1 font-display">{day.dayName}</h4>
            <ul className="space-y-1" aria-label={`Rätter ${day.dayName}`}>
              {day.dishes.map((dish, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                  <span>{dish.name}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <p className="text-xs text-muted-foreground pt-1">
          Uppdaterad: {formatTime(menu.updatedAt)}
        </p>
      </CardContent>
    </Card>
  );
}

export default function LunchPage() {
  const [search, setSearch] = useState("");

  return (
    <main className="flex-1 overflow-auto">
      <div className="container max-w-lg mx-auto px-4 py-6 space-y-4">
        <motion.h1
          className="text-2xl font-bold font-display"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          Lunch
        </motion.h1>

        <motion.div
          className="relative"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Sök restaurang eller rätt..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            aria-label="Sök bland restauranger"
          />
        </motion.div>

        <Tabs defaultValue="idag">
          <TabsList className="w-full">
            <TabsTrigger value="idag" className="flex-1">Idag</TabsTrigger>
            <TabsTrigger value="veckan" className="flex-1">Veckan</TabsTrigger>
          </TabsList>
          <TabsContent value="idag">
            <TodayView search={search} />
          </TabsContent>
          <TabsContent value="veckan">
            <WeekView search={search} />
          </TabsContent>
        </Tabs>

        <footer className="text-xs text-muted-foreground text-center pt-4 pb-8 space-y-1">
          <p>Menyer kan ändras – kontrollera restaurangens sida.</p>
          <p>Källa: Restaurangernas webbplatser</p>
        </footer>
      </div>
    </main>
  );
}
