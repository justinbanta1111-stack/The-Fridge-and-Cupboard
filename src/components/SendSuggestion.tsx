import { useState } from "react";
import { Lightbulb, Send } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitSuggestion } from "@/lib/suggestions.functions";

export function SendSuggestion({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function send() {
    if (message.trim().length < 3) return;
    setSending(true);
    try {
      await submitSuggestion({ data: { message: message.trim() } });
      setSent(true);
      setMessage("");
    } catch {
      toast.error("Couldn't send that — please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setSent(false);
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className={
            className ??
            "press-lift inline-flex items-center gap-2 rounded-2xl border border-white/16 bg-ink-soft/75 px-4 py-2.5 text-sm font-semibold text-ivory backdrop-blur-md transition hover:bg-ink-soft/90"
          }
        >
          <Lightbulb className="h-4 w-4 text-gold" /> Send a Suggestion
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Have an idea? We want to hear it.</DialogTitle>
          <DialogDescription>
            Send us your suggestions, feature requests, or something you'd personally like The
            Fridge &amp; Cupboard to do. Your ideas can help shape what we build next.
          </DialogDescription>
        </DialogHeader>
        {sent ? (
          <div className="rounded-2xl border border-jade/40 bg-jade/10 p-4 text-center text-sm font-semibold text-foreground">
            Thank you — your idea is in. We read every single one.
          </div>
        ) : (
          <div className="space-y-3">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="I wish the app could…"
              rows={4}
              maxLength={2000}
              autoFocus
            />
            <Button
              onClick={send}
              disabled={sending || message.trim().length < 3}
              className="w-full gap-2"
            >
              <Send className="h-4 w-4" /> {sending ? "Sending…" : "Send my suggestion"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default SendSuggestion;
