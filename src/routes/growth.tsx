import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, Share2, Award, Heart, Trophy, Users, Gift, BookOpen } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SharePlateCard } from "@/components/SharePlateModal";
import { SavingsBragMode } from "@/components/SavingsBragMode";
import { FamilyFavorites } from "@/components/FamilyFavorites";
import { WeeklyChallenges } from "@/components/WeeklyChallenges";

export const Route = createFileRoute("/growth")({
  head: () => ({
    meta: [
      { title: "Share & Grow — The Fridge and Cupboard" },
      {
        name: "description",
        content:
          "Share your meals, brag about savings, save family favorites, and beat weekly challenges with The Fridge and Cupboard.",
      },
      { property: "og:title", content: "Share & Grow — The Fridge and Cupboard" },
      {
        property: "og:description",
        content:
          "Turn your wins into shareable badges. Save kid-approved and spouse favorites. Take on weekly cooking challenges.",
      },
    ],
  }),
  component: GrowthPage,
});

function GrowthPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6">
        <section className="py-8 md:py-12">
          <Badge variant="outline" className="border-rose-500/40 text-rose-700 uppercase tracking-widest text-[10px]">
            Share &amp; grow
          </Badge>
          <h1 className="mt-4 font-display text-4xl leading-tight tracking-tight md:text-5xl">
            Your kitchen wins, shared.
          </h1>
          <p className="mt-3 max-w-2xl text-base text-muted-foreground md:text-lg">
            Brag about savings. Show off the plate. Lock in family favorites. Beat a weekly challenge. Everything lives
            on your phone — share when you want.
          </p>
        </section>

        <div className="grid gap-4">
          <SharePlateCard />
          <SavingsBragMode />
          <WeeklyChallenges />
          <FamilyFavorites />
        </div>

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          <Link to="/referrals" className="block">
            <Card className="ring-paper h-full border-primary/30 bg-gradient-to-br from-primary/8 via-card to-amber-500/5 p-5 transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-primary">
                  <Gift className="h-3.5 w-3.5" /> Invite friends
                </div>
                <Badge className="bg-primary/15 text-primary border border-primary/30">Live</Badge>
              </div>
              <h3 className="mt-1 font-display text-xl">Invite 3, get 1 month free.</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Personal invite link. Auto-applied Stripe coupon at the 3rd signup.
              </p>
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                <li>• Conversion tracking baked in</li>
                <li>• Free month applied automatically</li>
                <li>• No promo codes to enter</li>
              </ul>
            </Card>
          </Link>

          <Link to="/community" className="block">
            <Card className="ring-paper h-full border-emerald-500/30 bg-gradient-to-br from-emerald-500/8 via-card to-primary/5 p-5 transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-emerald-700">
                  <BookOpen className="h-3.5 w-3.5" /> Community Recipe Vault
                </div>
                <Badge className="bg-emerald-500/15 text-emerald-700 border border-emerald-500/30">Live</Badge>
              </div>
              <h3 className="mt-1 font-display text-xl">Real recipes. Real fridges.</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Submit your best fridge-rescue meals. Upvote others. Standouts earn the{" "}
                <span className="font-semibold">Chef Super J Approved</span> badge.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-700">
                  <Trophy className="mr-1 h-3 w-3" /> Chef Super J Approved
                </Badge>
                <Badge variant="outline" className="border-primary/40 text-primary">
                  <Users className="mr-1 h-3 w-3" /> Community submissions
                </Badge>
              </div>
            </Card>
          </Link>
        </section>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <Link to="/savings" className="inline-flex items-center gap-1 text-primary hover:underline">
            <Award className="h-3.5 w-3.5" /> See your full savings dashboard
          </Link>
          <span className="mx-2">·</span>
          <Link to="/" className="inline-flex items-center gap-1 text-primary hover:underline">
            <Sparkles className="h-3.5 w-3.5" /> Back to scanner
          </Link>
        </div>
      </main>
    </div>
  );
}
