import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Trash2, User as UserIcon, LogOut, Shield, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteNav } from "@/components/SiteNav";
import { VoiceAssistantSettings } from "@/components/VoiceAssistantSettings";
import { supabase } from "@/integrations/supabase/client";
import { deleteMyAccount } from "@/lib/account.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Account Settings — The Fridge and Cupboard" },
      { name: "description", content: "Manage your account, sign out, or permanently delete your account and data." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const navigate = useNavigate();
  const deleteFn = useServerFn(deleteMyAccount);
  const [user, setUser] = useState<{ id: string; email?: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        navigate({ to: "/auth", replace: true });
        return;
      }
      setUser({ id: data.user.id, email: data.user.email });
      setLoading(false);
    });
  }, [navigate]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await deleteFn({});
      // Server has removed the auth user; clear local session.
      await supabase.auth.signOut();
      toast.success("Your account has been deleted.");
      navigate({ to: "/", replace: true });
    } catch (err: any) {
      toast.error(err?.message ?? "Could not delete account. Please try again or email support.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-background">
        <SiteNav />
        <div className="grid place-items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <SiteNav />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="font-display text-3xl tracking-tight sm:text-4xl">Account Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">Manage your account and data.</p>

        <Card className="mt-6 p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-foreground">
              <UserIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-medium">Signed in as</div>
              <div className="text-sm text-muted-foreground">{user?.email ?? user?.id}</div>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleSignOut} className="gap-2">
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </Card>

        <Card className="mt-4 p-5">
          <div className="text-sm font-medium">Legal</div>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <Link to="/privacy" className="inline-flex items-center gap-1.5 text-primary underline">
              <Shield className="h-4 w-4" /> Privacy Policy
            </Link>
            <Link to="/terms" className="inline-flex items-center gap-1.5 text-primary underline">
              <FileText className="h-4 w-4" /> Terms of Service
            </Link>
          </div>
        </Card>

        <VoiceAssistantSettings />



        <Card className="mt-4 border-destructive/40 p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-destructive/10 text-destructive">
              <Trash2 className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-destructive">Delete account</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Permanently delete your account, scans, photos, savings history, and
                subscription record. This cannot be undone.
              </p>
            </div>
          </div>
          <div className="mt-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
                  <Trash2 className="h-4 w-4" /> Delete my account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes your account, all fridge and cupboard scans,
                    uploaded photos, savings history, and subscription record. This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Type <span className="font-mono font-semibold">DELETE</span> to confirm</Label>
                  <Input
                    id="confirm"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="DELETE"
                    autoComplete="off"
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setConfirmText("")}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={confirmText !== "DELETE" || busy}
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Permanently delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Card>
        <p className="mt-10 text-center text-xs text-muted-foreground">
          &copy; 2026 The Fridge and Cupboard. All rights reserved.
        </p>
      </main>
    </div>
  );
}
