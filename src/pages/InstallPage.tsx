import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Check, Smartphone, Share } from "lucide-react";
import { motion } from "framer-motion";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIos(/iPad|iPhone|iPod/.test(ua));
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
  };

  if (isStandalone || installed) {
    return (
      <main className="flex-1 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4"
        >
          <div className="h-16 w-16 rounded-full bg-success/15 flex items-center justify-center mx-auto">
            <Check className="h-8 w-8 text-success" />
          </div>
          <h1 className="text-2xl font-bold font-display">Redan installerad!</h1>
          <p className="text-muted-foreground">Lindholmen Live finns på din hemskärm.</p>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-auto">
      <div className="container max-w-lg mx-auto px-4 py-8 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <img src="/icons/icon-192.png" alt="Lindholmen Live" className="h-20 w-20 rounded-2xl mx-auto shadow-lg" />
          <h1 className="text-2xl font-bold font-display">Installera Lindholmen Live</h1>
          <p className="text-muted-foreground">Få snabb tillgång direkt från hemskärmen</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-3"
        >
          {[
            { icon: Smartphone, title: "Känns som en riktig app", desc: "Fullskärm utan webbläsarfält" },
            { icon: Download, title: "Fungerar offline", desc: "Senaste data sparas automatiskt" },
          ].map((item, i) => (
            <Card key={i} className="glass-card">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm font-display">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {deferredPrompt ? (
            <Button onClick={handleInstall} className="w-full h-12 text-base font-display" size="lg">
              <Download className="h-5 w-5 mr-2" />
              Installera appen
            </Button>
          ) : isIos ? (
            <Card className="glass-card">
              <CardContent className="p-4 space-y-3 text-center">
                <p className="font-semibold text-sm font-display">Installera på iPhone/iPad</p>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Share className="h-4 w-4" />
                  <span>Tryck på <strong>Dela</strong> → <strong>Lägg till på hemskärmen</strong></span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="glass-card">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Öppna menyn i din webbläsare och välj <strong>"Installera app"</strong> eller <strong>"Lägg till på hemskärmen"</strong>.
                </p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </main>
  );
}
