import { Link, useNavigate } from "@tanstack/react-router";
import { Refrigerator, BookOpen, Baby, CalendarDays, Sparkles, LogIn, LogOut, Menu, X, Leaf, LayoutGrid, Recycle, Archive, PiggyBank, ShoppingCart, User as UserIcon, GlassWater, Snowflake, ChefHat, HeartHandshake, GraduationCap, Share2, Gift, Users, Heart, Globe2, Wrench, Bell, Brain, Bookmark, AlarmClock, ScanLine, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { InstallAppButton } from "@/components/InstallAppButton";
import { usePricingVisibility } from "@/hooks/use-pricing-visibility";
import { BrandMark } from "@/components/BrandMark";
import { LanguagePicker } from "@/components/LanguagePicker";
import { useT } from "@/lib/i18n/context";

type NavLink = { to: string; label: string; icon: typeof Refrigerator; highlight?: boolean };

// Primary links shown directly in the desktop top bar. Keep this list short
// so the bar fits on one row at typical desktop widths (no sideways scroll).
const allPrimaryLinks: NavLink[] = [
  { to: "/scan", label: "Scan Fridge", icon: Refrigerator },
  { to: "/cupboard", label: "Scan Cupboard", icon: Archive },
  { to: "/rescue", label: "Leftovers", icon: Recycle, highlight: true },
  { to: "/pro", label: "Plans", icon: Sparkles, highlight: true },
];


// Full list — surfaced in the "More" / mobile menu.
const allLinks: NavLink[] = [
  ...allPrimaryLinks,
  { to: "/saved", label: "Saved", icon: Bookmark, highlight: true },
  { to: "/meal-plan", label: "Meal Plan", icon: CalendarDays },

  { to: "/drinks", label: "Drinks", icon: GlassWater, highlight: true },
  { to: "/preserve", label: "Preserve It", icon: Snowflake, highlight: true },
  { to: "/before-you-shop", label: "Before You Shop", icon: ShoppingCart, highlight: true },
  { to: "/shopping-list", label: "Shopping List", icon: ShoppingCart },
  { to: "/store-scan", label: "Scan Something at the Store", icon: ScanLine, highlight: true },
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
  const { showSignupBlocks, showUpgradeChip } = usePricingVisibility();
  // Paid members: no plans link at all. Signed-in free members: one small
  // "Upgrade" entry in the menu only. Visitors: plans visible.
  const primaryLinks = showSignupBlocks
    ? allPrimaryLinks
    : allPrimaryLinks.filter((l) => l.to !== "/pro");
  const links = showSignupBlocks
    ? allLinks
    : showUpgradeChip
      ? allLinks.map((l) => (l.to === "/pro" ? { ...l, label: "Upgrade" } : l))
      : allLinks.filter((l) => l.to !== "/pro");

  const [user, setUser] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const t = useT();

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
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_3rem] items-center gap-x-3 gap-y-2 px-3 pb-3 pt-[max(env(safe-area-inset-top),0.75rem)] sm:px-6 sm:pb-4 lg:flex lg:flex-nowrap lg:gap-4 lg:py-4">
        {/* Logo + brand title/tagline */}
        <Link to="/" className="flex min-w-0 items-center gap-2.5 lg:flex-1 lg:gap-3" aria-label="The Fridge and Cupboard — Home">
          <BrandMark className="block h-11 w-11 shrink-0 sm:h-12 sm:w-12 lg:h-14 lg:w-14" />
          <span className="min-w-0">
            <span className="block truncate font-display text-lg font-black leading-tight text-foreground sm:text-xl lg:text-2xl">
              The Fridge <span className="text-muted-foreground">&amp;</span> Cupboard
            </span>
            <span className="mt-0.5 block truncate text-[10px] font-semibold leading-snug text-muted-foreground sm:text-xs lg:text-sm">
              Saving Food. Saving Money. Saving Families.
            </span>
          </span>
        </Link>

        <span className="h-11 w-12 lg:hidden" aria-hidden="true" />

        {/* Navigation and account controls share a dedicated row on phones and tablets. */}
        <div className="col-span-2 grid min-w-0 grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] items-center gap-1.5 sm:flex sm:justify-end sm:gap-2 lg:col-auto lg:ml-auto">
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
                  <Icon className="h-4 w-4" /> {t(l.label)}
                </Link>
              );
            })}
          </nav>
          <LanguagePicker className="h-9 shrink-0 justify-self-start px-2" />
          <InstallAppButton
            className="h-9 shrink-0 rounded-md px-2.5 text-xs sm:px-3.5"
            label="Add App"
          />
          {user ? (
            <Button asChild variant="ghost" size="sm" className="h-9 shrink-0 px-2 text-muted-foreground hover:text-foreground sm:px-3">
              <Link to="/account"><UserIcon className="h-4 w-4 sm:mr-1.5" /> <span className="hidden sm:inline">{t("Account")}</span></Link>
            </Button>
          ) : (
            <Button size="sm" onClick={handleLogin} className="h-9 shrink-0 bg-primary px-2 text-primary-foreground hover:bg-primary/90 sm:px-3">
              <LogIn className="hidden h-4 w-4 sm:mr-1.5 sm:block" /> <span>{t("Sign in")}</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="h-9 w-9 shrink-0"
          >
            {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
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
                <Icon className="h-4 w-4" /> {t(l.label)}
              </Link>
            );
          })}
          <Link
            to="/settings"
            onClick={() => setOpen(false)}
            aria-label="Settings and help"
            className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary [&.active]:bg-secondary"
          >
            <Settings className="h-4 w-4" aria-hidden="true" /> {t("Settings & Help")}
          </Link>
          <Link
            to="/voice-profiles"
            onClick={() => setOpen(false)}
            aria-label="Voice profiles for everyone in the kitchen"
            className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground [&.active]:bg-secondary [&.active]:text-foreground"
          >
            <UserIcon className="h-4 w-4" aria-hidden="true" /> {t("Voice Profiles")}
          </Link>

          {user ? (

            <>
              <Link
                to="/account"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground [&.active]:bg-secondary [&.active]:text-foreground"
              >
                <UserIcon className="h-4 w-4" /> {t("Account")}
              </Link>
              <button
                onClick={() => { setOpen(false); handleLogout(); }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <LogOut className="h-4 w-4" /> {t("Log out")}
              </button>
            </>
          ) : (
            <button
              onClick={() => { setOpen(false); handleLogin(); }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <LogIn className="h-4 w-4" /> {t("Sign in")}
            </button>
          )}
          <div className="mt-2 flex flex-wrap gap-3 border-t border-border/60 px-3 pt-3 text-xs text-muted-foreground">
            <Link to="/privacy" onClick={() => setOpen(false)} className="hover:text-foreground">{t("Privacy")}</Link>
            <Link to="/terms" onClick={() => setOpen(false)} className="hover:text-foreground">{t("Terms")}</Link>
            <Link to="/subscription-terms" onClick={() => setOpen(false)} className="hover:text-foreground">{t("Subscription Terms")}</Link>
            <Link to="/support" onClick={() => setOpen(false)} className="hover:text-foreground">{t("Support")}</Link>
            <Link to="/delete-account" onClick={() => setOpen(false)} className="hover:text-foreground">{t("Delete Account")}</Link>
          </div>

        </nav>
      )}
    </header>
  );
}
