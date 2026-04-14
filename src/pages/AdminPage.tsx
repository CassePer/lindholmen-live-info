import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, ArrowLeft, ExternalLink, RefreshCw, Pencil, Check, X, Settings, Lock, LogOut, MapPin, Eye } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const ADMIN_SESSION_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getAdminSession(): boolean {
  const raw = sessionStorage.getItem("admin_authenticated_at");
  if (!raw) return false;
  if (Date.now() - Number(raw) > ADMIN_SESSION_TTL_MS) {
    sessionStorage.removeItem("admin_authenticated_at");
    return false;
  }
  return true;
}

function setAdminSession() {
  sessionStorage.setItem("admin_authenticated_at", String(Date.now()));
}

function clearAdminSession() {
  sessionStorage.removeItem("admin_authenticated_at");
}

// ── Password Gate ──

function AdminPasswordGate({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    setError(false);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("admin-auth", {
        method: "POST",
        body: { password },
      });
      if (fnError || !data?.valid) {
        setError(true);
      } else {
        setAdminSession();
        onAuthenticated();
      }
    } catch {
      setError(true);
    } finally {
      setChecking(false);
    }
  };

  return (
    <main className="flex-1 overflow-auto">
      <div className="container max-w-sm mx-auto px-4 py-20 space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold font-display">Admin</h1>
        </div>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Lock className="h-4 w-4" /> Ange lösenord
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                type="password"
                placeholder="Lösenord"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(false); }}
                autoFocus
              />
              {error && <p className="text-sm text-destructive">Fel lösenord.</p>}
              <Button type="submit" className="w-full" disabled={!password.trim() || checking}>
                {checking ? "Kontrollerar..." : "Logga in"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

// ── Types & hooks ──

interface Restaurant {
  id: string;
  name: string;
  website_url: string;
  menu_url: string;
  active: boolean;
  created_at: string;
}

function useRestaurants() {
  return useQuery<Restaurant[]>({
    queryKey: ["admin-restaurants"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-restaurants", { method: "GET" });
      if (error) throw error;
      return data;
    },
  });
}

function useSettings() {
  return useQuery<Record<string, string>>({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-settings", { method: "GET" });
      if (error) throw error;
      return data;
    },
  });
}

// ── Editable row ──

function EditableRestaurantRow({
  restaurant, onUpdate, onDelete, isDeleting,
}: {
  restaurant: Restaurant;
  onUpdate: (id: string, updates: Partial<Restaurant>) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(restaurant.name);
  const [menuUrl, setMenuUrl] = useState(restaurant.menu_url);
  const [websiteUrl, setWebsiteUrl] = useState(restaurant.website_url);

  const handleSave = () => {
    onUpdate(restaurant.id, { name, menu_url: menuUrl, website_url: websiteUrl });
    setEditing(false);
  };
  const handleCancel = () => {
    setName(restaurant.name);
    setMenuUrl(restaurant.menu_url);
    setWebsiteUrl(restaurant.website_url);
    setEditing(false);
  };

  if (editing) {
    return (
      <Card className="glass-card">
        <CardContent className="py-3 px-4 space-y-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Namn" />
          <Input value={menuUrl} onChange={(e) => setMenuUrl(e.target.value)} placeholder="Meny-URL" type="url" />
          <Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="Webbplats-URL" type="url" />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={handleCancel}><X className="h-4 w-4 mr-1" /> Avbryt</Button>
            <Button size="sm" onClick={handleSave} disabled={!name.trim() || !menuUrl.trim()}><Check className="h-4 w-4 mr-1" /> Spara</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardContent className="flex items-center justify-between py-3 px-4">
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate">{restaurant.name}</p>
          <a href={restaurant.menu_url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 truncate">
            <ExternalLink className="h-3 w-3 flex-shrink-0" />{restaurant.menu_url}
          </a>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button variant="ghost" size="icon" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => onDelete(restaurant.id)} disabled={isDeleting}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main admin page ──

function AdminContent({ onLogout }: { onLogout: () => void }) {
  const queryClient = useQueryClient();
  const { data: restaurants, isLoading } = useRestaurants();
  const { data: settings } = useSettings();
  const [name, setName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [menuUrl, setMenuUrl] = useState("");
  const [refreshInterval, setRefreshInterval] = useState<string | null>(null);
  const [lunchHour, setLunchHour] = useState<string | null>(null);
  const [tvIpRange, setTvIpRange] = useState<string | null>(null);
  const [tvIframeUrl, setTvIframeUrl] = useState<string | null>(null);
  const [stopBus, setStopBus] = useState<string | null>(null);
  const [stopTram, setStopTram] = useState<string | null>(null);
  const [stopFerry, setStopFerry] = useState<string | null>(null);

  const currentIntervalSec = parseInt(refreshInterval ?? settings?.departure_refresh_interval ?? "60", 10);
  const currentIntervalMin = String(Math.round(currentIntervalSec / 60) || 1);
  const currentLunchHour = lunchHour ?? settings?.lunch_auto_refresh_hour ?? "10";
  const currentStopBus = stopBus ?? settings?.departure_stop_bus ?? "740059410";
  const currentStopTram = stopTram ?? settings?.departure_stop_tram ?? "740059410";
  const currentStopFerry = stopFerry ?? settings?.departure_stop_ferry ?? "740059412";
  const showBus = settings?.departure_show_bus !== "false";
  const showTram = settings?.departure_show_tram !== "false";
  const showFerry = settings?.departure_show_ferry !== "false";
  const lunchWeekends = settings?.lunch_update_weekends !== "false";
  const departureWeekends = settings?.departure_update_weekends !== "false";

  const addMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-restaurants", {
        method: "POST", body: { name, website_url: websiteUrl, menu_url: menuUrl },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-restaurants"] }); setName(""); setWebsiteUrl(""); setMenuUrl(""); toast.success("Restaurang tillagd"); },
    onError: () => toast.error("Kunde inte lägga till restaurang"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Restaurant> }) => {
      const { data, error } = await supabase.functions.invoke("admin-restaurants", { method: "PUT", body: { id, ...updates } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-restaurants"] }); toast.success("Restaurang uppdaterad"); },
    onError: () => toast.error("Kunde inte uppdatera restaurang"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke("admin-restaurants", { method: "POST", body: { action: "delete", id } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-restaurants"] }); toast.success("Restaurang borttagen"); },
    onError: () => toast.error("Kunde inte ta bort restaurang"),
  });

  const clearCacheMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-restaurants", { method: "POST", body: { action: "clear_cache" } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["lunch"] }); toast.success("Cache rensad – menyerna hämtas om vid nästa laddning"); },
    onError: () => toast.error("Kunde inte rensa cachen"),
  });

  const saveSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { data, error } = await supabase.functions.invoke("admin-settings", { method: "POST", body: { key, value } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-settings"] }); queryClient.invalidateQueries({ queryKey: ["app-settings"] }); toast.success("Inställning sparad"); },
    onError: () => toast.error("Kunde inte spara inställning"),
  });

  const canAdd = name.trim() && menuUrl.trim();

  return (
    <main className="flex-1 overflow-auto">
      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <h1 className="text-2xl font-bold font-display flex-1">Admin</h1>
          <Button variant="outline" size="sm" onClick={onLogout}>
            <LogOut className="h-4 w-4 mr-1" /> Logga ut
          </Button>
        </div>
        {/* Settings */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base font-display flex items-center gap-2"><Settings className="h-4 w-4" /> Inställningar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Avgångar – uppdateringsintervall (minuter)</label>
              <div className="flex gap-2">
                <Input type="number" min="1" max="10" value={currentIntervalMin} onChange={(e) => setRefreshInterval(String(parseInt(e.target.value, 10) * 60 || 60))} className="w-32" />
                <Button size="sm" onClick={() => saveSettingMutation.mutate({ key: "departure_refresh_interval", value: String(currentIntervalSec) })} disabled={saveSettingMutation.isPending}>
                  {saveSettingMutation.isPending ? "Sparar..." : "Spara"}
                </Button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Lunch – automatisk uppdatering (timme, 0–23)</label>
              <div className="flex gap-2">
                <Input type="number" min="0" max="23" value={currentLunchHour} onChange={(e) => setLunchHour(e.target.value)} className="w-32" />
                <Button size="sm" onClick={() => saveSettingMutation.mutate({ key: "lunch_auto_refresh_hour", value: currentLunchHour })} disabled={saveSettingMutation.isPending}>
                  {saveSettingMutation.isPending ? "Sparar..." : "Spara"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Lunchmenyer hämtas om automatiskt vid denna tidpunkt varje dag.</p>
            </div>
            <div className="border-t pt-3 mt-3">
              <label className="text-sm font-medium mb-1 block">TV-läge – IP-range (CIDR, kommaseparerat)</label>
              <div className="flex gap-2">
                <Input placeholder="t.ex. 192.168.1.0/24, 10.0.0.5" value={tvIpRange ?? settings?.tv_ip_range ?? ""} onChange={(e) => setTvIpRange(e.target.value)} />
                <Button size="sm" onClick={() => saveSettingMutation.mutate({ key: "tv_ip_range", value: tvIpRange ?? "" })} disabled={saveSettingMutation.isPending}>
                  {saveSettingMutation.isPending ? "Sparar..." : "Spara"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Klienter inom detta IP-range får TV-layouten automatiskt. Stöder även ?mode=tv i URL:en.</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">TV-läge – extern URL (iframe, höger halva)</label>
              <div className="flex gap-2">
                <Input placeholder="https://example.com" type="url" value={tvIframeUrl ?? settings?.tv_iframe_url ?? ""} onChange={(e) => setTvIframeUrl(e.target.value)} />
                <Button size="sm" onClick={() => saveSettingMutation.mutate({ key: "tv_iframe_url", value: tvIframeUrl ?? "" })} disabled={saveSettingMutation.isPending}>
                  {saveSettingMutation.isPending ? "Sparar..." : "Spara"}
                </Button>
              </div>
            </div>
            <div className="border-t pt-3 mt-3">
              <p className="text-sm font-medium mb-2">Helguppdateringar</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox id="lunch-weekends" checked={lunchWeekends} onCheckedChange={(v) => saveSettingMutation.mutate({ key: "lunch_update_weekends", value: String(v) })} />
                  <Label htmlFor="lunch-weekends">Uppdatera lunchmenyer på helger</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="departure-weekends" checked={departureWeekends} onCheckedChange={(v) => saveSettingMutation.mutate({ key: "departure_update_weekends", value: String(v) })} />
                  <Label htmlFor="departure-weekends">Uppdatera avgångar på helger</Label>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Om avaktiverat pausas automatiska uppdateringar på lördagar och söndagar.</p>
            </div>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base font-display flex items-center gap-2"><MapPin className="h-4 w-4" /> Avgångar – hållplatser & synlighet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Buss – hållplats-ID</label>
              <div className="flex gap-2">
                <Input value={currentStopBus} onChange={(e) => setStopBus(e.target.value)} className="w-48" placeholder="740059410" />
                <Button size="sm" onClick={() => saveSettingMutation.mutate({ key: "departure_stop_bus", value: currentStopBus })} disabled={saveSettingMutation.isPending}>Spara</Button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Spårvagn – hållplats-ID</label>
              <div className="flex gap-2">
                <Input value={currentStopTram} onChange={(e) => setStopTram(e.target.value)} className="w-48" placeholder="740059410" />
                <Button size="sm" onClick={() => saveSettingMutation.mutate({ key: "departure_stop_tram", value: currentStopTram })} disabled={saveSettingMutation.isPending}>Spara</Button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Färja – hållplats-ID</label>
              <div className="flex gap-2">
                <Input value={currentStopFerry} onChange={(e) => setStopFerry(e.target.value)} className="w-48" placeholder="740059412" />
                <Button size="sm" onClick={() => saveSettingMutation.mutate({ key: "departure_stop_ferry", value: currentStopFerry })} disabled={saveSettingMutation.isPending}>Spara</Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Hållplats-IDs från Trafiklab (t.ex. 740059410 = Lindholmen).</p>

            <div className="border-t pt-3 mt-2">
              <p className="text-sm font-medium mb-2 flex items-center gap-2"><Eye className="h-4 w-4" /> Visa transportslag</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox id="show-bus" checked={showBus} onCheckedChange={(v) => saveSettingMutation.mutate({ key: "departure_show_bus", value: String(v) })} />
                  <Label htmlFor="show-bus">Buss</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="show-tram" checked={showTram} onCheckedChange={(v) => saveSettingMutation.mutate({ key: "departure_show_tram", value: String(v) })} />
                  <Label htmlFor="show-tram">Spårvagn</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="show-ferry" checked={showFerry} onCheckedChange={(v) => saveSettingMutation.mutate({ key: "departure_show_ferry", value: String(v) })} />
                  <Label htmlFor="show-ferry">Färja</Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Restaurants header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold font-display">Restauranger ({restaurants?.length ?? 0})</h2>
          <Button variant="outline" size="sm" onClick={() => clearCacheMutation.mutate()} disabled={clearCacheMutation.isPending}>
            <RefreshCw className={`h-4 w-4 mr-2 ${clearCacheMutation.isPending ? "animate-spin" : ""}`} />
            {clearCacheMutation.isPending ? "Rensar..." : "Rensa cache"}
          </Button>
        </div>

        {/* Add form */}
        <Card className="glass-card">
          <CardHeader><CardTitle className="text-base font-display">Lägg till restaurang</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Namn *" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Webbplats-URL" type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
            <Input placeholder="Meny-URL *" type="url" value={menuUrl} onChange={(e) => setMenuUrl(e.target.value)} />
            <Button onClick={() => addMutation.mutate()} disabled={!canAdd || addMutation.isPending} className="w-full">
              <Plus className="h-4 w-4 mr-2" />{addMutation.isPending ? "Lägger till..." : "Lägg till"}
            </Button>
          </CardContent>
        </Card>

        {/* Restaurant list */}
        <div className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Laddar...</p>
          ) : (
            <AnimatePresence mode="popLayout">
              {restaurants?.map((r) => (
                <motion.div key={r.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
                  <EditableRestaurantRow
                    restaurant={r}
                    onUpdate={(id, updates) => updateMutation.mutate({ id, updates })}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    isDeleting={deleteMutation.isPending}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </main>
  );
}

// ── Export with gate ──

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(getAdminSession);

  const handleLogout = () => {
    clearAdminSession();
    setAuthenticated(false);
  };

  if (!authenticated) {
    return <AdminPasswordGate onAuthenticated={() => setAuthenticated(true)} />;
  }

  return <AdminContent onLogout={handleLogout} />;
}
