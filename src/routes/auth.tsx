import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Refrigerator, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { closeInstallModal, safeLocalRedirect } from "@/lib/checkout-intent";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — The Fridge and Cupboard" },
      {
        name: "description",
        content:
          "Sign in to The Fridge and Cupboard to save scans, track savings, and get personalized meal ideas from what you already have.",
      },
      { property: "og:title", content: "Sign in — The Fridge and Cupboard" },
      {
        property: "og:description",
        content: "Sign in or create an account to save your fridge scans and savings streaks.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  function redirectTarget() {
    if (typeof window === "undefined") return "/";
    return safeLocalRedirect(new URLSearchParams(window.location.search).get("redirect"), "/");
  }

  // If already signed in, send them home
  useEffect(() => {
    closeInstallModal();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) window.location.replace(redirectTarget());
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) window.location.replace(redirectTarget());
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleGoogle() {
    closeInstallModal();
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/auth?redirect=${encodeURIComponent(redirectTarget())}`,
      });
      if (result.error) toast.error("Google sign-in failed. Please try again.");
    } catch {
      toast.error("Google sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleApple() {
    closeInstallModal();
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("apple", {
        redirect_uri: `${window.location.origin}/auth?redirect=${encodeURIComponent(redirectTarget())}`,
      });
      if (result.error) toast.error("Apple sign-in failed. Please try again.");
    } catch {
      toast.error("Apple sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    closeInstallModal();
    if (!email || !password) {
      toast.error("Email and password required.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth?redirect=${encodeURIComponent(redirectTarget())}` },
        });
        if (error) {
          toast.error(error.message);
        } else {
          toast.success("Check your email to confirm your account.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          toast.error(error.message);
        } else {
          toast.success("Welcome back!");
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-dvh bg-gradient-to-b from-[#FFF8E7] via-background to-background px-4 py-10">
      <div className="mx-auto flex w-full max-w-md flex-col items-center">
        <Link to="/" className="mb-6 flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground shadow-sm">
            <Refrigerator className="h-5 w-5" />
          </div>
          <div className="font-display text-lg tracking-tight">
            The Fridge <span className="text-muted-foreground">and</span> Cupboard
          </div>
        </Link>

        <Card className="w-full overflow-hidden border-border/70 bg-card/80 p-6 shadow-lg backdrop-blur sm:p-8">
          <div className="mb-6 text-center">
            {mode === "signup" && (
              <div className="mx-auto mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-widest text-primary">
                Free 3-day trial · No credit card
              </div>
            )}
            <h1 className="font-display text-2xl tracking-tight sm:text-3xl">
              {mode === "signin" ? "Welcome back" : "Start your free 3-day trial"}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {mode === "signin"
                ? "Save your scans, track savings, and use what you already have."
                : "Explore every scan, recipe, and savings feature free for 3 days. We only ask about a subscription after your trial ends."}
            </p>
          </div>

          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleGoogle}
              disabled={busy}
              className="w-full gap-2"
            >
              <GoogleIcon className="h-4 w-4" />
              Continue with Google
            </Button>
            <Button
              type="button"
              size="lg"
              onClick={handleApple}
              disabled={busy}
              className="w-full gap-2 bg-black text-white hover:bg-black/90"
            >
              <AppleIcon className="h-4 w-4" />
              Continue with Apple
            </Button>
          </div>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or use email
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
                minLength={6}
                required
              />
            </div>
            <Button type="submit" size="lg" disabled={busy} className="w-full gap-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "signin" ? (
              <>
                New here?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="font-medium text-primary hover:underline"
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="font-medium text-primary hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </Card>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          By continuing, you agree to our{" "}
          <Link to="/terms" className="underline hover:text-foreground">Terms</Link> and{" "}
          <Link to="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.5-1.74 4.4-5.5 4.4-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.6 14.7 2.7 12 2.7 6.9 2.7 2.8 6.8 2.8 12s4.1 9.3 9.2 9.3c5.3 0 8.8-3.7 8.8-9 0-.6-.1-1.1-.2-1.6H12z"
      />
    </svg>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M16.365 1.43c0 1.14-.42 2.21-1.14 3.02-.78.88-2.05 1.56-3.09 1.48-.13-1.1.43-2.25 1.13-3.02.78-.86 2.13-1.5 3.1-1.48zM20.5 17.06c-.55 1.27-.82 1.84-1.53 2.97-.99 1.57-2.39 3.53-4.12 3.55-1.54.02-1.93-1-4.02-.99-2.08.01-2.52 1.01-4.06.99-1.73-.02-3.06-1.79-4.05-3.36C-.01 16.27-.31 11.4 1.36 8.81c1.18-1.83 3.05-2.91 4.8-2.91 1.79 0 2.92 1 4.4 1 1.44 0 2.32-1 4.39-1 1.57 0 3.23.86 4.42 2.34-3.88 2.13-3.25 7.72.13 8.82z"/>
    </svg>
  );
}
