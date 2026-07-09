import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Heart, Baby, Users, Plus, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  FAMILY_FAVORITES_EVENT,
  type FamilyFavorite,
  type FavoriteTag,
  addFavorite,
  markCookedAgain,
  readFavorites,
  removeFavorite,
  toggleTag,
} from "@/lib/family-favorites";

const TAG_META: Record<FavoriteTag, { label: string; icon: typeof Heart; className: string }> = {
  kid: { label: "Kid approved", icon: Baby, className: "bg-amber-500/15 text-amber-700 border-amber-500/30" },
  spouse: { label: "Spouse fav", icon: Heart, className: "bg-rose-500/15 text-rose-700 border-rose-500/30" },
  me: { label: "Mine", icon: Users, className: "bg-primary/15 text-primary border-primary/30" },
};

export function FamilyFavorites({ compact = false }: { compact?: boolean }) {
  const [list, setList] = useState<FamilyFavorite[]>([]);
  const [title, setTitle] = useState("");
  const [pendingTags, setPendingTags] = useState<FavoriteTag[]>(["me"]);

  useEffect(() => {
    const refresh = () => setList(readFavorites());
    refresh();
    window.addEventListener(FAMILY_FAVORITES_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(FAMILY_FAVORITES_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  function handleAdd() {
    const t = title.trim();
    if (!t) return;
    addFavorite(t, pendingTags);
    setTitle("");
    setPendingTags(["me"]);
    toast.success(`Saved "${t}" to Family Favorites`);
  }

  function togglePending(tag: FavoriteTag) {
    setPendingTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  const shown = compact ? list.slice(0, 4) : list;

  return (
    <Card className="ring-paper border-rose-500/20 bg-gradient-to-br from-rose-500/5 via-card to-amber-500/5 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-rose-600">
          <Heart className="h-3.5 w-3.5" /> Family Favorites
        </div>
        <span className="text-[11px] text-muted-foreground">{list.length} saved</span>
      </div>
      <h3 className="mt-1 font-display text-xl">The meals your family asks for again.</h3>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={`e.g. "Mom's baked ziti"`}
          className="flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
        />
        <div className="flex items-center gap-1.5">
          {(Object.keys(TAG_META) as FavoriteTag[]).map((tag) => {
            const meta = TAG_META[tag];
            const Icon = meta.icon;
            const active = pendingTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => togglePending(tag)}
                className={`flex h-9 items-center gap-1 rounded-md border px-2 text-[11px] uppercase tracking-widest transition ${
                  active ? meta.className : "border-border/60 bg-background/70 text-muted-foreground"
                }`}
              >
                <Icon className="h-3 w-3" />
                {meta.label}
              </button>
            );
          })}
          <Button size="sm" onClick={handleAdd} className="h-9 gap-1">
            <Plus className="h-4 w-4" /> Save
          </Button>
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Add a meal the family loves and tag it Kid, Spouse, or Mine. One-tap "Make again" remembers it for you.
        </p>
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {shown.map((f) => (
            <div key={f.title} className="rounded-lg border border-border/60 bg-background/70 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-display text-base leading-tight">{f.title}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(Object.keys(TAG_META) as FavoriteTag[]).map((tag) => {
                      const meta = TAG_META[tag];
                      const Icon = meta.icon;
                      const on = f.tags.includes(tag);
                      return (
                        <button
                          key={tag}
                          onClick={() => toggleTag(f.title, tag)}
                          className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] uppercase tracking-widest transition ${
                            on ? meta.className : "border-border/60 bg-transparent text-muted-foreground hover:bg-muted/40"
                          }`}
                        >
                          <Icon className="h-2.5 w-2.5" />
                          {meta.label}
                        </button>
                      );
                    })}
                  </div>
                  {f.cookCount > 0 && (
                    <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                      Made again {f.cookCount}×
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 px-2 text-[11px]"
                    onClick={() => {
                      markCookedAgain(f.title);
                      toast.success(`Marked "${f.title}" cooked again!`);
                    }}
                  >
                    <RotateCcw className="h-3 w-3" /> Make again
                  </Button>
                  <button
                    onClick={() => removeFavorite(f.title)}
                    aria-label="Remove"
                    className="rounded p-1 text-muted-foreground hover:bg-muted/50 hover:text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="border-amber-500/40 text-amber-700">
          <Baby className="mr-1 h-3 w-3" /> Kid approved
        </Badge>
        <Badge variant="outline" className="border-rose-500/40 text-rose-700">
          <Heart className="mr-1 h-3 w-3" /> Spouse favorites
        </Badge>
        <Badge variant="outline" className="border-primary/40 text-primary">
          <RotateCcw className="mr-1 h-3 w-3" /> One-tap make again
        </Badge>
      </div>
    </Card>
  );
}
