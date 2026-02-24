import { useState } from "react";
import { useLunchMenus, useWeeklyMenus } from "@/hooks/use-lunch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Search, AlertCircle } from "lucide-react";
import type { LunchMenu, WeeklyLunchMenu, DietTag } from "@/api/types";

const TAG_LABELS: Record<DietTag, string> = {
  vegetarisk: "Vegetarisk",
  vegansk: "Vegansk",
  fisk: "Fisk",
  kött: "Kött",
};

const TAG_COLORS: Record<DietTag, string> = {
  vegetarisk: "bg-green-600/15 text-green-700 border-green-600/20",
  vegansk: "bg-emerald-600/15 text-emerald-700 border-emerald-600/20",
  fisk: "bg-blue-600/15 text-blue-700 border-blue-600/20",
  kött: "bg-orange-600/15 text-orange-700 border-orange-600/20",
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
        <Card key={i}>
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
    <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground" role="alert">
      <AlertCircle className="h-8 w-8" />
      <p className="text-center">{message}</p>
    </div>
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
}

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
      {filtered.map((menu) => (
        <RestaurantCard key={menu.restaurantId} menu={menu} />
      ))}
    </div>
  );
}

function RestaurantCard({ menu }: { menu: LunchMenu }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{menu.restaurantName}</CardTitle>
          <a
            href={menu.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
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
      {filtered.map((menu) => (
        <WeeklyRestaurantCard key={menu.restaurantId} menu={menu} />
      ))}
    </div>
  );
}

function WeeklyRestaurantCard({ menu }: { menu: WeeklyLunchMenu }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{menu.restaurantName}</CardTitle>
          <a
            href={menu.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={`Besök ${menu.restaurantName}s webbplats`}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {menu.days.map((day) => (
          <div key={day.date}>
            <h4 className="font-semibold text-sm mb-1">{day.dayName}</h4>
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
        <h1 className="text-2xl font-bold">Lunch</h1>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Sök restaurang eller rätt..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            aria-label="Sök bland restauranger"
          />
        </div>

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
