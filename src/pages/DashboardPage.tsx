import { motion } from "framer-motion";
import LunchPage from "@/pages/LunchPage";
import DeparturesPage from "@/pages/DeparturesPage";
import CamerasPage from "@/pages/CamerasPage";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function DashboardPage() {
  return (
    <main className="flex-1 overflow-auto">
      <div className="w-full max-w-[1800px] mx-auto px-6 py-6">
        <motion.div
          className="flex items-center justify-between mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl font-bold font-display">Lindholmen Live</h1>
          <div className="flex items-center gap-1">
            <ThemeToggle />
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            className="lg:col-span-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <LunchPage embedded />
          </motion.div>

          <motion.div
            className="lg:col-span-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <DeparturesPage embedded />
          </motion.div>

          <motion.div
            className="lg:col-span-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <CamerasPage embedded />
          </motion.div>
        </div>
      </div>
    </main>
  );
}
