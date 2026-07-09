import { useState } from "react";
import { MessageCircle, Mail, Facebook, Copy, Check, Share2, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type ShareMenuProps = {
  /** Label on the trigger button */
  label?: string;
  /** Title shown in dialog */
  title?: string;
  /** The message body to share */
  text: string;
  /** Optional URL appended/used for link sharing. Defaults to site root. */
  url?: string;
  /** Email subject when sharing via mailto */
  subject?: string;
  /** Visual style of the trigger */
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  /** Replace the default trigger button with an inline icon-only one */
  iconOnly?: boolean;
};

const SITE = "https://thefridgeandcupboard.com";

export function ShareMenu({
  label = "Share",
  title = "Share",
  text,
  url = SITE,
  subject = "From The Fridge & Cupboard",
  variant = "outline",
  size = "sm",
  className,
  iconOnly = false,
}: ShareMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const fullText = url && !text.includes(url) ? `${text}\n\n${url}` : text;

  async function nativeShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text: fullText, url });
        setOpen(false);
        return true;
      } catch (e: any) {
        if (e?.name === "AbortError") return true;
      }
    }
    return false;
  }

  async function handleOpen() {
    // On mobile, jump straight to the native share sheet if available.
    const isMobile =
      typeof navigator !== "undefined" && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    if (isMobile && (await nativeShare())) return;
    setOpen(true);
  }

  function shareSMS() {
    const href = `sms:?&body=${encodeURIComponent(fullText)}`;
    window.location.href = href;
    setOpen(false);
  }
  function shareEmail() {
    const href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(fullText)}`;
    window.location.href = href;
    setOpen(false);
  }
  function shareFacebook() {
    const href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`;
    window.open(href, "_blank", "noopener,noreferrer,width=600,height=600");
    setOpen(false);
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      toast.success("Copied — paste it anywhere.");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy. Long-press to copy manually.");
    }
  }

  return (
    <>
      {iconOnly ? (
        <button
          type="button"
          onClick={handleOpen}
          aria-label={label}
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background text-foreground/70 transition hover:bg-secondary hover:text-foreground",
            className,
          )}
        >
          <Share2 className="h-4 w-4" />
        </button>
      ) : (
        <Button variant={variant} size={size} onClick={handleOpen} className={cn("gap-1.5", className)}>
          <Share2 className="h-4 w-4" /> {label}
        </Button>
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-card p-5 shadow-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg">{title}</h3>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-secondary"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded-lg border border-border/60 bg-background/60 p-3 text-xs text-muted-foreground">
              {fullText}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <ChannelButton icon={<MessageCircle className="h-5 w-5" />} label="Text" onClick={shareSMS} />
              <ChannelButton icon={<Mail className="h-5 w-5" />} label="Email" onClick={shareEmail} />
              <ChannelButton icon={<Facebook className="h-5 w-5" />} label="Facebook" onClick={shareFacebook} />
              <ChannelButton
                icon={copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                label={copied ? "Copied" : "Copy"}
                onClick={copyLink}
              />
            </div>

            {typeof navigator !== "undefined" && "share" in navigator && (
              <Button variant="secondary" className="mt-3 w-full gap-2" onClick={nativeShare}>
                <Send className="h-4 w-4" /> More sharing options
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function ChannelButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1 rounded-xl border border-border/60 bg-background p-3 text-xs font-medium transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
