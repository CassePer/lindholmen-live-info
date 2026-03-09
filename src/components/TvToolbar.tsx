import { ThemeToggle } from "@/components/ThemeToggle";
import { motion } from "framer-motion";

export function TvToolbar() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-4 left-4 z-50 flex items-center rounded-full border bg-background/80 backdrop-blur-lg px-1 py-1 shadow-lg"
    >
      <ThemeToggle />
    </motion.div>
  );
}
