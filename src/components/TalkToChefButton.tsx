import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Mic, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isNativeApp } from "@/lib/native-runtime";
import { grantConsent, hasConsent, PERMISSION_HELP, PERMISSION_REASON } from "@/lib/permissions";
import { ensureMicPermission, queryMicPermission } from "@/lib/mic-permission";

/**
 * Native-only entry point for hands-free voice.
 *
 * Inside the iOS / Android app the microphone prompt must not appear until the
 * person chooses a voice feature, so the hands-free loop stays closed until
 * this button is used. If permission is declined, typing is offered instead.
 */
export function TalkToChefButton({ className }: { className?: string }) {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [open, setOpen] = useState(false);
  const [denied, setDenied] = useState(false);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    setShow(isNativeApp());
    let active = true;
    void (async () => {
      // Already granted before? Then never ask again — just go straight to listening.
      const state = await queryMicPermission();
      if (!active) return;
      if (state === "granted") {
        grantConsent("microphone");
        setListening(true);
      } else {
        if (state === "denied") setDenied(true);
        setListening(hasConsent("microphone") && state !== "denied");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!show) return null;

  async function allow() {
    // force = true: this is an explicit tap, so a retry is allowed after a no.
    const status = await ensureMicPermission(true);
    if (status === "granted") {
      grantConsent("microphone");
      setListening(true);
      setDenied(false);
      setOpen(false);
    } else {
      setDenied(true);
    }
  }


  return (
    <>
      <Button
        type="button"
        variant={listening ? "secondary" : "default"}
        className={className}
        onClick={() => setOpen(true)}
        aria-label={listening ? "Chef Super J is listening — voice settings" : "Talk to Chef Super J using your voice"}
      >
        <Mic className="mr-2 h-4 w-4" aria-hidden="true" />
        {listening ? "Chef is listening" : "Talk to Chef"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Talk to Chef Super J</DialogTitle>
            <DialogDescription>{PERMISSION_REASON.microphone}</DialogDescription>
          </DialogHeader>

          {denied && (
            <div role="alert" className="rounded-lg bg-secondary p-3 text-sm">
              <p className="font-semibold">No problem — you can still type your questions.</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
                {PERMISSION_HELP.microphone.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </div>
          )}

          <div className="space-y-2">
            {!listening && (
              <Button className="w-full" onClick={allow} aria-label="Allow microphone access">
                <Mic className="mr-2 h-4 w-4" aria-hidden="true" /> Allow microphone
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setOpen(false);
                navigate({ to: "/chef-companion" });
              }}
              aria-label="Type your question to Chef Super J instead"
            >
              <Keyboard className="mr-2 h-4 w-4" aria-hidden="true" /> Type instead
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default TalkToChefButton;
