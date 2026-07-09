import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  isSaved,
  makeSavedId,
  removeSaved,
  saveItem,
  subscribeSaved,
  type SavedCategory,
  type SavedItem,
} from "@/lib/saved-items";

type Props = {
  category: SavedCategory;
  title: string;
  subtitle?: string;
  ingredients?: string[];
  tags?: string[];
  href?: string;
  id?: string;
  className?: string;
  /** "icon" = compact icon-only, "pill" = labeled pill button. */
  variant?: "icon" | "pill";
  onSaved?: (item: SavedItem) => void;
  onRemoved?: (id: string) => void;
};

/**
 * Reusable Save button. Works on any recipe / leftover / tip / scan card.
 * - Tap once: saves + flashes "Saved!"
 * - Tap again: removes
 * - Prevents duplicates
 * - Reflects state across all instances via storage event
 */
export function SaveButton({
  category,
  title,
  subtitle,
  ingredients,
  tags,
  href,
  id,
  className,
  variant = "pill",
  onSaved,
  onRemoved,
}: Props) {
  const itemId = id ?? makeSavedId(category, title);
  const [saved, setSaved] = useState(false);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    setSaved(isSaved(itemId));
    return subscribeSaved(() => setSaved(isSaved(itemId)));
  }, [itemId]);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      (navigator as Navigator & { vibrate?: (p: number) => void }).vibrate?.(8);
    } catch {
      /* ignore */
    }
    if (saved) {
      removeSaved(itemId);
      onRemoved?.(itemId);
      return;
    }
    const item = saveItem({ id: itemId, category, title, subtitle, ingredients, tags, href });
    onSaved?.(item);
    setFlash(true);
    window.setTimeout(() => setFlash(false), 1400);
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={saved}
        aria-label={saved ? "Remove from saved" : "Save"}
        title={saved ? "Saved — tap to remove" : "Save"}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card/80 text-muted-foreground transition active:scale-90",
          saved && "border-primary/40 bg-primary/10 text-primary",
          className,
        )}
      >
        {flash ? <Check className="h-4 w-4 animate-scale-in text-primary" /> : saved ? (
          <BookmarkCheck className="h-4 w-4" />
        ) : (
          <Bookmark className="h-4 w-4" />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={saved}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition active:scale-95",
        saved
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border/60 bg-card text-foreground hover:bg-secondary",
        className,
      )}
    >
      {flash ? (
        <>
          <Check className="h-3.5 w-3.5 animate-scale-in" /> Saved!
        </>
      ) : saved ? (
        <>
          <BookmarkCheck className="h-3.5 w-3.5" /> Saved
        </>
      ) : (
        <>
          <Bookmark className="h-3.5 w-3.5" /> Save
        </>
      )}
    </button>
  );
}
