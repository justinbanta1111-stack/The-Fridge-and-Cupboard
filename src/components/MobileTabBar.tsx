import { Link } from "@tanstack/react-router";
import { Refrigerator, Recycle, Archive, ShoppingCart, PiggyBank, ScanLine } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = { to: string; label: string; icon: typeof Refrigerator; exact?: boolean };
const tabs: Tab[] = [
  { to: "/scan", label: "Fridge", icon: Refrigerator, exact: true },
  { to: "/cupboard", label: "Cupboard", icon: Archive },
  { to: "/rescue", label: "Leftovers", icon: Recycle },
  { to: "/shopping-assistant", label: "Shopping", icon: ScanLine },
  { to: "/before-you-shop", label: "Shop", icon: ShoppingCart },
  { to: "/savings", label: "Savings", icon: PiggyBank },
];

export function MobileTabBar() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      <ul className="mx-auto grid max-w-md grid-cols-6">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <li key={t.to}>
              <Link
                to={t.to}
                activeOptions={{ exact: t.exact }}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-1 py-2 text-[11px] font-medium text-muted-foreground",
                  "[&.active]:text-primary",
                )}
              >
                <Icon className="h-5 w-5" />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
