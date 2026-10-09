import { useEffect, useState } from "react";
import { Smile } from "lucide-react";
import { markNameSkipped, resolveUserName, setPreferredName, wasNameSkipped } from "@/lib/user-name";

/**
 * Small, skippable "What would you like me to call you?" strip. Shows only
 * when the current account / guest session has no preferred name yet.
 * Chef asks the same question out loud; either answer saves the name.
 */
export function PreferredNamePrompt() {
  const [show, setShow] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    const check = () =>
      void resolveUserName().then((n) => {
        if (alive) setShow(!n && !wasNameSkipped());
      });
    check();
    const onName = (e: Event) => {
      if (String((e as CustomEvent).detail ?? "")) setShow(false);
      else check();
    };
    window.addEventListener("tfc:user-name", onName as EventListener);
    window.addEventListener("tfc:personal-reset", check);
    return () => {
      alive = false;
      window.removeEventListener("tfc:user-name", onName as EventListener);
      window.removeEventListener("tfc:personal-reset", check);
    };
  }, []);

  if (!show) return null;

  async function save() {
    if (saving || !value.trim()) return;
    setSaving(true);
    const saved = await setPreferredName(value);
    setSaving(false);
    if (saved) setShow(false);
  }

  function skip() {
    markNameSkipped();
    window.dispatchEvent(new CustomEvent("tfc:name-skipped"));
    setShow(false);
  }

  return (
    <section
      aria-label="What should Chef call you?"
      className="mx-auto mb-2 w-full max-w-2xl rounded-2xl border border-border bg-card/80 px-4 py-3"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Smile className="h-4 w-4 text-teal" /> Welcome to The Fridge &amp; Cupboard! What would you like me to call you?
      </div>
      <form
        className="mt-2 flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Your first name"
          aria-label="Your first name"
          autoComplete="given-name"
          maxLength={24}
          className="min-w-[9rem] flex-1 rounded-full border border-border bg-background px-3 py-2 text-sm text-foreground"
        />
        <button
          type="submit"
          disabled={saving || !value.trim()}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          Save
        </button>
        <button type="button" onClick={skip} className="rounded-full px-3 py-2 text-sm font-medium text-muted-foreground underline">
          Skip
        </button>
      </form>
    </section>
  );
}
