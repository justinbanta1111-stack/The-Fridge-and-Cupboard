import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Settings2, Sparkles } from "lucide-react";
import {
  getProfile, type UserProfile, priorityFeatureForGoal, GOALS,
} from "@/lib/user-profile";
import { OnboardingFlow } from "./OnboardingFlow";

type Stats = { itemsUseSoon?: number; weekSavings?: number; leftovers?: number };

function readStats(): Stats {
  if (typeof window === "undefined") return {};
  const s: Stats = {};
  try {
    const waste = JSON.parse(localStorage.getItem("fnc.savings-hub.v1") || "{}");
    if (waste?.weekSavingsCents) s.weekSavings = waste.weekSavingsCents / 100;
    if (Array.isArray(waste?.leftovers)) s.leftovers = waste.leftovers.length;
  } catch {}
  try {
    const inv = JSON.parse(localStorage.getItem("fnc.recent-inventory") || "[]");
    if (Array.isArray(inv)) s.itemsUseSoon = inv.filter((i: any) => i?.freshness === "use-soon").length;
  } catch {}
  return s;
}

function priorityCta(feature: string) {
  switch (feature) {
    case "kid-saver": return { to: "/fun-mode", label: "Open Kid Saver Mode" };
    case "health": return { to: "/community", label: "Open Health Companion" };
    case "savings": return { to: "/savings-hub", label: "Open Savings Dashboard" };
    case "leftovers": return { to: "/kitchen-magic", label: "Open Leftovers Rescue" };
    case "quick": return { to: "/kitchen-magic", label: "I Need Dinner Fast" };
    case "prep": return { to: "/grocery-plus", label: "Plan My Week" };
    case "family": return { to: "/grocery-plus", label: "Plan Family Meals" };
    case "fasting": return { to: "/kitchen-magic", label: "Lent / Fasting Meals" };
    case "elderly": return { to: "/community", label: "Soft, Gentle Meals" };
    default: return { to: "/kitchen-magic", label: "Explore Kitchen Magic" };
  }
}

export function PersonalizedWelcome() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<Stats>({});
  const [editOpen, setEditOpen] = useState(false);
  const [firstRun, setFirstRun] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setProfile(getProfile());
      setStats(readStats());
    };
    refresh();
    const onUpd = () => refresh();
    window.addEventListener("fnc:profile-updated", onUpd);
    return () => {
      window.removeEventListener("fnc:profile-updated", onUpd);
    };
    // Onboarding popup is no longer auto-opened — it would cover the homepage
    // after the fridge intro. Users can open it via "Adjust goals".
  }, []);


  if (!profile) return null;

  const goalLabel = GOALS.find((g) => g.id === profile.goal)?.label;
  const cta = priorityCta(priorityFeatureForGoal(profile.goal));

  const lines: string[] = [];
  if (stats.itemsUseSoon && stats.itemsUseSoon > 0) lines.push(`You have ${stats.itemsUseSoon} ingredient${stats.itemsUseSoon === 1 ? "" : "s"} to use soon.`);
  if (stats.weekSavings && stats.weekSavings > 0) lines.push(`You saved $${stats.weekSavings.toFixed(0)} this week.`);
  if (stats.leftovers && stats.leftovers > 0) lines.push(`You have ${stats.leftovers} leftover${stats.leftovers === 1 ? "" : "s"} ready.`);
  if (lines.length === 0) lines.push("Snap a photo and we'll build dinner from what you already have.");

  return (
    <>
      <OnboardingFlow
        open={firstRun || editOpen}
        onClose={() => { setFirstRun(false); setEditOpen(false); setProfile(getProfile()); }}
      />
      {profile.completed && (
        <Card className="ring-paper mt-4 border-border/60 bg-gradient-to-br from-primary/10 via-card to-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-primary">
                <Sparkles className="h-3 w-3" /> Welcome back
              </div>
              <h2 className="mt-1 font-display text-xl leading-tight">
                {goalLabel ? `Built for your goal: ${goalLabel}` : "Your personalized kitchen"}
              </h2>
              <ul className="mt-2 space-y-0.5 text-sm text-muted-foreground">
                {lines.map((l, i) => <li key={i}>• {l}</li>)}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link to={cta.to as any}>{cta.label}</Link>
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditOpen(true)}>
                  <Settings2 className="mr-1 h-3.5 w-3.5" /> Adjust goals
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
