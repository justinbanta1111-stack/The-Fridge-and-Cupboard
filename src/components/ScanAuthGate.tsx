import { Link } from "@tanstack/react-router";
import { Refrigerator, Sparkles, CreditCard, Crown, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function ScanAuthGate({ message }: { message?: string }) {
  return (
    <Card className="mt-8 border-primary/30 bg-primary/5 p-8 text-center">
      <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/30 bg-background/60 px-3 py-1 text-[11px] uppercase tracking-widest text-primary">
        <Sparkles className="h-3 w-3" /> Sign in required
      </div>
      <Refrigerator className="mx-auto mt-4 h-10 w-10 text-primary" />
      <h2 className="mt-3 font-display text-2xl">Sign in to scan your fridge</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {message ??
          "Create your free account or sign in to scan your fridge and cupboard, get AI inventory results, and unlock recipe suggestions."}
      </p>
      <p className="mx-auto mt-2 flex max-w-md items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <CreditCard className="h-3.5 w-3.5 text-primary" />
        Start a 3-day free trial · Cancel anytime · Full access during trial
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link to="/auth">
            <LogIn className="mr-1.5 h-4 w-4" /> Sign In / Log In
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/pro">
            <Crown className="mr-1.5 h-4 w-4" /> Start Free 3-Day Trial
          </Link>
        </Button>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        We'll only charge you on day 4 if you keep your plan. Cancel anytime from your account.
      </p>
    </Card>
  );
}
