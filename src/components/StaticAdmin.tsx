import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppSettings } from "@/hooks/use-app-settings";

export function StaticAdmin() {
  const { data: settings, error } = useAppSettings();
  return <main className="flex-1 overflow-auto"><div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
    <div className="flex items-center gap-3"><Button asChild variant="ghost" size="icon"><Link to="/" aria-label="Tillbaka"><ArrowLeft className="h-5 w-5" /></Link></Button><h1 className="text-2xl font-bold font-display">Admin</h1></div>
    <p className="text-sm text-muted-foreground">Skrivskyddad drift. Inställningar ändras i GitHub av behöriga administratörer. Menyhämtning startas via GitHub Actions.</p>
    {error ? <p role="alert" className="text-destructive">Kunde inte hämta inställningarna.</p> : <dl className="divide-y divide-border">{Object.entries(settings ?? {}).map(([key, value]) => <div key={key} className="py-3 flex flex-wrap justify-between gap-2"><dt className="text-sm text-muted-foreground break-all">{key}</dt><dd className="text-sm break-all">{value}</dd></div>)}</dl>}
    <section className="space-y-2"><h2 className="font-display font-semibold">Aktiva hållplatser</h2><p className="text-sm">740059410 – Lindholmen (buss och spårvagn)</p><p className="text-sm">740059412 – Lindholmspiren (färja)</p></section>
  </div></main>;
}