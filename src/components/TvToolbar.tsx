import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { PanelRightOpen, PanelRightClose, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

interface TvToolbarProps {
  iframeVisible: boolean;
  onToggleIframe: () => void;
}

export function TvToolbar({ iframeVisible, onToggleIframe }: TvToolbarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-4 left-4 z-50 flex items-center gap-1 rounded-full border bg-background/80 backdrop-blur-lg px-2 py-1 shadow-lg"
    >
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onToggleIframe}
        aria-label={iframeVisible ? "Dölj extern sida" : "Visa extern sida"}
      >
        {iframeVisible ? (
          <PanelRightClose className="h-4 w-4" />
        ) : (
          <PanelRightOpen className="h-4 w-4" />
        )}
      </Button>
      <ThemeToggle />
      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
        <Link to="/admin">
          <Settings className="h-4 w-4" />
        </Link>
      </Button>
    </motion.div>
  );
}
