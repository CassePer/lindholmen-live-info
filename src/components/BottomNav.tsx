import { NavLink, useLocation } from "react-router-dom";
import { UtensilsCrossed, Clock, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Lunch", icon: UtensilsCrossed },
  { to: "/avgangar", label: "Avgångar", icon: Clock },
  { to: "/kameror", label: "Kameror", icon: Camera },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav
      className="sticky bottom-0 z-40 border-t bg-background"
      role="navigation"
      aria-label="Huvudnavigation"
    >
      <div className="container max-w-lg mx-auto flex">
        {links.map((link) => {
          const isActive = location.pathname === link.to;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <link.icon className="h-5 w-5" />
              {link.label}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
