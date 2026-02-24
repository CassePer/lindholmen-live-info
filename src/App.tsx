import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import BottomNav from "@/components/BottomNav";
import LunchPage from "@/pages/LunchPage";
import DeparturesPage from "@/pages/DeparturesPage";
import CamerasPage from "@/pages/CamerasPage";
import InstallPage from "@/pages/InstallPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="flex min-h-svh flex-col">
            <Routes>
              <Route path="/" element={<LunchPage />} />
              <Route path="/avgangar" element={<DeparturesPage />} />
              <Route path="/kameror" element={<CamerasPage />} />
              <Route path="/install" element={<InstallPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <BottomNav />
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
