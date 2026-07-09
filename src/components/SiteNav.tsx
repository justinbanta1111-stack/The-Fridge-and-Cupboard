import { Link, useNavigate } from "@tanstack/react-router";
import { Refrigerator, BookOpen, Baby, CalendarDays, Sparkles, LogIn, LogOut, Menu, X, Leaf, LayoutGrid, Recycle, Archive, PiggyBank, ShoppingCart, User as UserIcon, GlassWater, Snowflake, ChefHat, HeartHandshake, GraduationCap, Share2, Gift, Users, Heart, Globe2, Wrench, Bell, Brain, Bookmark, AlarmClock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { InstallAppButton } from "@/components/InstallAppButton";
import { BrandMark } from "@/components/BrandMark";

type NavLink = { to: string; label: string; icon: typeof Refrigerator; highlight?: boolean };

// Primary links shown directly in the desktop top bar. Keep this list short
// so the bar fits on one row at typical desktop widths (no sideways scroll).
const primaryLinks: NavLink[] = [
  { to: "/scan", label: "Scan Fridge", icon: Refrigerator },
  { to: "/cupboard", label: "Scan Cupboard", icon: Archive },
  { to: "/rescue", label: "Leftovers", icon: Recycle, highlight: true },
  { to: "/pro", label: "Plans", icon: Sparkles, highlight: true },
];


// Full list — surfaced in the "More" / mobile menu.
const links: NavLink[] = [
  ...primaryLinks,
  { to: "/saved", label: "Saved", icon: Bookmark, highlight: true },
  { to: "/meal-plan", label: "Meal Plan", icon: CalendarDays },

  { to: "/drinks", label: "Drinks", icon: GlassWater, highlight: true },
  { to: "/preserve", label: "Preserve It", icon: Snowflake, highlight: true },
  { to: "/before-you-shop", label: "Before You Shop", icon: ShoppingCart, highlight: true },
  { to: "/use-it-soon", label: "Use It Soon", icon: AlarmClock, highlight: true },
  { to: "/savings", label: "Savings", icon: PiggyBank, highlight: true },
  { to: "/health", label: "Health Modes", icon: Heart, highlight: true },
  { to: "/around-the-world", label: "Around the World", icon: Globe2, highlight: true },
  { to: "/kitchen-tools", label: "Kitchen Tools", icon: Wrench, highlight: true },
  { to: "/smart-kitchen", label: "Smart Kitchen", icon: Brain, highlight: true },
  { to: "/reminders", label: "Reminders", icon: Bell },
  { to: "/features", label: "Features", icon: LayoutGrid },
  { to: "/learn", label: "Learn", icon: BookOpen },
  { to: "/kitchen-basics", label: "Kitchen Basics", icon: ChefHat, highlight: true },
  { to: "/academy", label: "Academy", icon: GraduationCap, highlight: true },
  { to: "/growth", label: "Share & Grow", icon: Share2, highlight: true },
  { to: "/community", label: "Community", icon: Users, highlight: true },
  { to: "/referrals", label: "Invite · Free month", icon: Gift, highlight: true },
  { to: "/about-chef", label: "Meet Chef Super J", icon: HeartHandshake, highlight: true },
  { to: "/fasting", label: "Fasting", icon: Leaf },
  { to: "/kids", label: "Kids", icon: Baby },
];

export function SiteNav() {
  const [user, setUser] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => listener.subscription.unsubscribe();
  }, []);

  function handleLogin() {
    navigate({ to: "/auth" });
  }
  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success("Logged out");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 px-2 py-2 sm:flex sm:flex-wrap sm:gap-3 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-1.5 max-[360px]:flex-col max-[360px]:items-start sm:gap-3" aria-label="The Fridge and Cupboard — Home">
          <BrandMark className="block h-8 w-auto shrink-0 max-[360px]:h-7 sm:h-32 md:h-40" />
          <span className="min-w-0 max-w-full truncate font-display text-[0.82rem] font-bold leading-tight tracking-tight text-foreground max-[360px]:text-[0.72rem] sm:text-[1.96rem]">
            <span className="sm:hidden">Fridge &amp; Cupboard</span>
            <span className="hidden sm:inline">The Fridge <span className="text-muted-foreground">and</span> Cupboard</span>
          </span>
        </Link>


        {/* Centered Add App on mobile, normal flow on desktop */}
        <div className="flex shrink-0 justify-center sm:ml-auto sm:justify-end">
          <nav className="hidden items-center gap-0.5 xl:flex">
            {primaryLinks.map((l) => {
              const Icon = l.icon;
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                    "[&.active]:bg-secondary [&.active]:text-foreground",
                    l.highlight && "text-primary hover:text-primary [&.active]:text-primary",
                  )}
                  activeOptions={{ exact: true }}
                >
                  <Icon className="h-4 w-4" /> {l.label}
                </Link>
              );
            })}
          </nav>
          <InstallAppButton
            className="inline-flex h-8 px-2 text-[11px] sm:h-9 sm:px-3 sm:text-xs"
            label="Add App"
          />
        </div>

        <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-2">
          {user ? (
            <Button asChild variant="ghost" size="sm" className="hidden text-muted-foreground hover:text-foreground sm:inline-flex">
              <Link to="/account"><UserIcon className="mr-1.5 h-4 w-4" /> Account</Link>
            </Button>
          ) : (
            <Button size="sm" onClick={handleLogin} className="hidden bg-primary text-primary-foreground hover:bg-primary/90 sm:inline-flex">
              <LogIn className="mr-1.5 h-4 w-4" /> Sign in
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => setOpen((o) => !o)} aria-label="Menu" className="h-9 w-9 sm:h-10 sm:w-10">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

      </div>

      {open && (
        <nav className="border-t border-border/60 bg-card/80 px-4 py-2">
          {links.map((l) => {
            const Icon = l.icon;
            return (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground",
                  "[&.active]:bg-secondary [&.active]:text-foreground",
                  l.highlight && "text-primary [&.active]:text-primary",
                )}
                activeOptions={{ exact: true }}
              >
                <Icon className="h-4 w-4" /> {l.label}
              </Link>
            );
          })}
          {user ? (
            <>
              <Link
                to="/account"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground [&.active]:bg-secondary [&.active]:text-foreground"
              >
                <UserIcon className="h-4 w-4" /> Account
              </Link>
              <button
                onClick={() => { setOpen(false); handleLogout(); }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <LogOut className="h-4 w-4" /> Log out
              </button>
            </>
          ) : (
            <button
              onClick={() => { setOpen(false); handleLogin(); }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <LogIn className="h-4 w-4" /> Sign in
            </button>
          )}
          <div className="mt-2 flex flex-wrap gap-3 border-t border-border/60 px-3 pt-3 text-xs text-muted-foreground">
            <Link to="/privacy" onClick={() => setOpen(false)} className="hover:text-foreground">Privacy</Link>
            <Link to="/terms" onClick={() => setOpen(false)} className="hover:text-foreground">Terms</Link>
            <Link to="/subscription-terms" onClick={() => setOpen(false)} className="hover:text-foreground">Subscription Terms</Link>
            <Link to="/support" onClick={() => setOpen(false)} className="hover:text-foreground">Support</Link>
            <Link to="/delete-account" onClick={() => setOpen(false)} className="hover:text-foreground">Delete Account</Link>
          </div>

        </nav>
      )}
    </header>
  );
}
