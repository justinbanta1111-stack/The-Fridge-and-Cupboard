import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Gift, Copy, Check, Share2, Loader2, Sparkles, Users, LogIn } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { claimReferralReward, getMyReferralStats } from "@/lib/referrals.functions";

export const Route = createFileRoute("/referrals")({
  head: () => ({
    meta: [
      { title: "Invite Friends — Earn a Free Month — The Fridge and Cupboard" },
      {
        name: "description",
        content:
          "Invite 3 friends to The Fridge and Cupboard and get one month of Pro free, applied automatically to your subscription.",
      },
      { property: "og:title", content: "Invite Friends — Earn a Free Month" },
      {
        property: "og:description",
        content:
          "Refer 3 friends. Get one month of Pro free — applied automatically. Help more families save money and waste less food.",
      },
    ],
  }),
  component: ReferralsPage,
});

function ReferralsPage() {
  const [signedIn, setSignedIn] = useState(false);
  const [anon, setAnon] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setSignedIn(!!data?.user);
      setAnon(!!data?.user?.is_anonymous);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => {
      setSignedIn(!!s?.user);
      setAnon(!!s?.user?.is_anonymous);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6">
        <section className="py-8 md:py-12">
          <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 uppercase tracking-widest text-[10px]">
            Invite friends
          </Badge>
          <h1 className="mt-4 font-display text-4xl leading-tight tracking-tight md:text-5xl">
            Invite 3 friends. Get 1 month free.
          </h1>
          <p className="mt-3 max-w-xl text-base text-muted-foreground md:text-lg">
            Share your personal link. When 3 friends sign up, we'll auto-apply a 100% coupon to your next subscription
            invoice — no codes to enter.
          </p>
        </section>

        {!signedIn || anon ? <SignInPrompt /> : <ReferralBody />}

        <Card className="mt-6 ring-paper border-primary/20 bg-card p-5">
          <h2 className="font-display text-lg">How it works</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Copy your invite link and send it to friends.</li>
            <li>They sign up with email, Google, or Apple.</li>
            <li>Once 3 friends are signed up, tap <span className="font-semibold">Apply free month</span>.</li>
            <li>Your next invoice on an active Pro plan goes to $0 automatically.</li>
          </ol>
          <p className="mt-3 text-xs text-muted-foreground">
            Reward applies to active subscriptions. If you don't have one yet, start a Pro plan first, then come back
            and claim.
          </p>
        </Card>
      </main>
    </div>
  );
}

function SignInPrompt() {
  return (
    <Card className="ring-paper border-primary/20 bg-gradient-to-br from-primary/8 via-card to-amber-500/5 p-6 text-center">
      <LogIn className="mx-auto h-8 w-8 text-primary" />
      <h2 className="mt-2 font-display text-xl">Sign in to get your invite link</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Your code is tied to your account so the free month can apply automatically.
      </p>
      <div className="mt-4">
        <Link
          to="/auth"
          className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Sign in or create an account
        </Link>
      </div>
    </Card>
  );
}

function ReferralBody() {
  const getStats = useServerFn(getMyReferralStats);
  const claim = useServerFn(claimReferralReward);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["referral-stats"],
    queryFn: () => getStats(),
    staleTime: 30_000,
    retry: false,
  });

  const m = useMutation({
    mutationFn: () => claim(),
    onSuccess: (r) => {
      if (r.ok) {
        toast.success(r.message);
        qc.invalidateQueries({ queryKey: ["referral-stats"] });
      } else {
        toast.error(r.error);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [copied, setCopied] = useState(false);

  if (q.isLoading) {
    return (
      <Card className="ring-paper p-6">
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
      </Card>
    );
  }
  if (q.isError || !q.data) {
    return (
      <Card className="ring-paper p-6 text-sm text-muted-foreground">
        Couldn't load your referral info. Try refreshing.
      </Card>
    );
  }

  const stats = q.data;
  const pct = Math.min(100, Math.round((stats.count / stats.goal) * 100));
  const eligible = stats.count >= stats.goal && !stats.rewardApplied;

  async function handleCopy() {
    await navigator.clipboard.writeText(stats.inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success("Invite link copied!");
  }

  async function handleShare() {
    const text = `Try The Fridge and Cupboard — scan your fridge & cupboard to use what you already have. Sign up with my link and we both win: ${stats.inviteUrl}`;
    const nav = navigator as Navigator;
    if (nav.share) {
      try {
        await nav.share({ text, title: "Try The Fridge and Cupboard" });
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("Invite text copied!");
    }
  }

  return (
    <Card className="ring-paper border-emerald-500/30 bg-gradient-to-br from-emerald-500/8 via-card to-primary/5 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-emerald-700">
          <Gift className="h-3.5 w-3.5" /> Your invite link
        </div>
        <Badge variant="outline" className="border-emerald-500/40 text-emerald-700">
          <Users className="mr-1 h-3 w-3" /> {stats.count}/{stats.goal} friends
        </Badge>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input readOnly value={stats.inviteUrl} className="font-mono text-xs" />
        <div className="flex gap-2">
          <Button onClick={handleCopy} variant="outline" className="gap-1">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button onClick={handleShare} className="gap-1">
            <Share2 className="h-4 w-4" /> Share
          </Button>
        </div>
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground">
        Your code: <span className="font-mono font-semibold">{stats.code}</span>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Progress to free month</span>
          <span>
            {stats.count}/{stats.goal}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted/50">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
        <div className="text-sm">
          {stats.rewardApplied ? (
            <span className="font-semibold text-emerald-700">
              <Sparkles className="-mt-0.5 mr-1 inline h-3.5 w-3.5" />
              Free month applied! 🎉
            </span>
          ) : eligible ? (
            <span className="font-semibold">You unlocked your free month. Tap claim →</span>
          ) : (
            <span className="text-muted-foreground">
              {stats.goal - stats.count} more friend{stats.goal - stats.count === 1 ? "" : "s"} to unlock 1 month free.
            </span>
          )}
        </div>
        <Button
          disabled={!eligible || m.isPending}
          onClick={() => m.mutate()}
          className="gap-1 bg-emerald-600 hover:bg-emerald-700"
        >
          {m.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
          {stats.rewardApplied ? "Applied" : "Apply free month"}
        </Button>
      </div>

      {stats.invites.length > 0 && (
        <div className="mt-4 text-[11px] text-muted-foreground">
          Last invite: {new Date(stats.invites[0].createdAt).toLocaleDateString()}
        </div>
      )}
    </Card>
  );
}
