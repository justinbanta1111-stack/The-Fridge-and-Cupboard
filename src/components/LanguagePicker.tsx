import { useMemo, useState } from "react";
import { Globe } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { LANGUAGES, findLanguage } from "@/lib/i18n/languages";
import { useLanguage } from "@/lib/i18n/context";

/**
 * Globe menu: pick an interface + recipe language and the measurement system.
 * Everything wrapped in <T> / t() re-renders in the chosen language.
 */
export function LanguagePicker({ className }: { className?: string }) {
  const { language, setLanguage, system, setSystem } = useLanguage();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const current = findLanguage(language);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LANGUAGES;
    return LANGUAGES.filter(
      (l) =>
        l.english.toLowerCase().includes(q) ||
        l.native.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("gap-1.5 px-2", className)}
          aria-label="Change language"
        >
          <Globe className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase">{current?.code ?? "EN"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <div className="border-b border-border p-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search languages…"
            className="h-9"
            autoFocus
          />
        </div>
        <div className="max-h-72 overflow-y-auto py-1">
          {results.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => {
                setLanguage(l.code);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                l.code === language && "bg-muted font-semibold",
              )}
            >
              <span className="truncate">{l.native}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{l.english}</span>
            </button>
          ))}
          {results.length === 0 && (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">No match</p>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border p-2">
          <span className="text-xs text-muted-foreground">Measurements</span>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={system === "metric" ? "default" : "outline"}
              className="h-7 px-2 text-xs"
              onClick={() => setSystem("metric")}
            >
              Metric · °C
            </Button>
            <Button
              size="sm"
              variant={system === "imperial" ? "default" : "outline"}
              className="h-7 px-2 text-xs"
              onClick={() => setSystem("imperial")}
            >
              US · °F
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default LanguagePicker;
