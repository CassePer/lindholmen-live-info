import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, ArrowLeft, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

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
      const { data, error } = await supabase.functions.invoke("admin-restaurants", {
        method: "GET",
      });
      if (error) throw error;
      return data;
    },
  });
}

export default function AdminPage() {
  const queryClient = useQueryClient();
  const { data: restaurants, isLoading } = useRestaurants();
  const [name, setName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [menuUrl, setMenuUrl] = useState("");

  const addMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-restaurants", {
        method: "POST",
        body: { name, website_url: websiteUrl, menu_url: menuUrl },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-restaurants"] });
      setName("");
      setWebsiteUrl("");
      setMenuUrl("");
      toast.success("Restaurang tillagd");
    },
    onError: () => toast.error("Kunde inte lägga till restaurang"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke(
        `admin-restaurants?id=${id}`,
        { method: "DELETE" }
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-restaurants"] });
      toast.success("Restaurang borttagen");
    },
    onError: () => toast.error("Kunde inte ta bort restaurang"),
  });

  const clearCacheMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "admin-restaurants?clear_cache=true",
        { method: "DELETE" }
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lunch"] });
      toast.success("Cache rensad – menyerna hämtas om vid nästa laddning");
    },
    onError: () => toast.error("Kunde inte rensa cachen"),
  });

  const canAdd = name.trim() && menuUrl.trim();

  return (
    <main className="flex-1 overflow-auto">
      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold font-display flex-1">Hantera restauranger</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => clearCacheMutation.mutate()}
            disabled={clearCacheMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${clearCacheMutation.isPending ? "animate-spin" : ""}`} />
            {clearCacheMutation.isPending ? "Rensar..." : "Rensa cache"}
          </Button>
        </div>

        {/* Add form */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base font-display">Lägg till restaurang</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Namn *"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              placeholder="Webbplats-URL"
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
            />
            <Input
              placeholder="Meny-URL *"
              type="url"
              value={menuUrl}
              onChange={(e) => setMenuUrl(e.target.value)}
            />
            <Button
              onClick={() => addMutation.mutate()}
              disabled={!canAdd || addMutation.isPending}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              {addMutation.isPending ? "Lägger till..." : "Lägg till"}
            </Button>
          </CardContent>
        </Card>

        {/* Restaurant list */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold font-display">
            Restauranger ({restaurants?.length ?? 0})
          </h2>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Laddar...</p>
          ) : (
            <AnimatePresence mode="popLayout">
              {restaurants?.map((r) => (
                <motion.div
                  key={r.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Card className="glass-card">
                    <CardContent className="flex items-center justify-between py-3 px-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{r.name}</p>
                        <a
                          href={r.menu_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 truncate"
                        >
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          {r.menu_url}
                        </a>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive flex-shrink-0"
                        onClick={() => deleteMutation.mutate(r.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </main>
  );
}
