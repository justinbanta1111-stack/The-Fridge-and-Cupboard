import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Refrigerator, Loader2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Reset your password — The Fridge and Cupboard" },
      {
        name: "description",
        content:
          "Choose a new password for your The Fridge and Cupboard account and get back to your scans, recipes, and savings.",
      },
      { property: "og:title", content: "Reset your password — The Fridge and Cupboard" },
      {
        property: "og:description",
        content: "Set a new password and return to sign in.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Password updated. Please sign in.");
      setDone(true);
      await supabase.auth.signOut();
      setTimeout(() => {
        window.location.href = "/auth";
      }, 1200);
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
          <h1 className="font-display text-2xl tracking-tight">Choose a new password</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Enter a new password, then sign back in.
          </p>

          {done ? (
            <p className="mt-6 text-sm text-muted-foreground">
              Password updated — taking you back to sign in…
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-5 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={busy}
                  minLength={6}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  disabled={busy}
                  minLength={6}
                  required
                />
              </div>
              <Button type="submit" size="lg" disabled={busy} className="w-full gap-2">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Update password
              </Button>
            </form>
          )}

          <p className="mt-5 text-center text-sm text-muted-foreground">
            <Link to="/auth" className="font-medium text-primary hover:underline">
              Back to sign in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
