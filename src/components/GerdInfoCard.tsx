import { Link } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BookOpen, HeartPulse } from "lucide-react";
import {
  GERD_BETTER_TOLERATED,
  GERD_DISCLAIMER,
  GERD_INTRO,
  GERD_TRIGGERS,
} from "@/lib/gerd";

export function GerdInfoCard({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-2xl">
            <HeartPulse className="h-5 w-5 text-primary" /> Understanding GERD
          </DialogTitle>
          <DialogDescription className="text-left text-sm leading-relaxed text-muted-foreground">
            {GERD_INTRO}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div>
            <div className="font-semibold">
              Common foods and drinks that may trigger GERD symptoms:
            </div>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-muted-foreground">
              {GERD_TRIGGERS.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>

          <div>
            <div className="font-semibold">Foods that are often better tolerated:</div>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-muted-foreground">
              {GERD_BETTER_TOLERATED.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        </div>

        <DialogFooter className="mt-2 flex-col gap-2 sm:flex-row sm:justify-between">
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link to="/gerd" onClick={onClose}>
              <BookOpen className="mr-2 h-4 w-4" /> Learn More About GERD
            </Link>
          </Button>
          <Button onClick={onClose} className="w-full sm:w-auto">
            Continue to recipes
          </Button>
        </DialogFooter>

        <p className="mt-1 border-t border-border/60 pt-3 text-[11px] leading-relaxed text-muted-foreground">
          {GERD_DISCLAIMER}
        </p>
      </DialogContent>
    </Dialog>
  );
}
