import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import chefGreeting from "@/assets/chef-super-j-greeting.png.asset.json";

import { getSavedUserName, resolveUserName } from "@/lib/user-name";

function timeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * Small hello strip at the top of home: Chef Super J's greeting portrait next
 * to the name Chef uses out loud. Hidden until a name is available.
 */
export function ChefGreetingBadge() {
  const [name, setName] = useState("");

  useEffect(() => {
    setName(getSavedUserName());
    void resolveUserName().then(setName);
    const onName = (e: Event) => setName(String((e as CustomEvent).detail ?? ""));
    window.addEventListener("tfc:user-name", onName as EventListener);
    return () => {
      window.removeEventListener("tfc:user-name", onName as EventListener);
    };
  }, []);

  if (!name) return null;

  return (
    <div className="mx-auto mb-2 flex w-full max-w-2xl items-center gap-3 px-4">
      <Link
        to="/account"
        aria-label="Your profile"
        className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary ring-1 ring-border"
      >
        <img
          src={chefGreeting.url}
          alt="Chef Super J"
          width={1024}
          height={1024}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-contain"
        />
      </Link>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-foreground">
          {name ? `${timeOfDay()}, ${name}` : timeOfDay()}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          Chef Super J is ready when you are.
        </div>
      </div>
    </div>
  );
}

export default ChefGreetingBadge;
