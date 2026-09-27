import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { UserRound } from "lucide-react";
import { getSavedUserPhoto, USER_PHOTO_EVENT } from "@/lib/user-photo";
import { getSavedUserName, resolveUserName } from "@/lib/user-name";

function timeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * Small hello strip at the top of home: the person's own photo next to the
 * name Chef uses out loud. Hidden entirely until they've added one of them.
 */
export function ChefGreetingBadge() {
  const [photo, setPhoto] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    setPhoto(getSavedUserPhoto());
    setName(getSavedUserName());
    void resolveUserName().then(setName);
    const onPhoto = (e: Event) => setPhoto(String((e as CustomEvent).detail ?? ""));
    const onName = (e: Event) => setName(String((e as CustomEvent).detail ?? ""));
    window.addEventListener(USER_PHOTO_EVENT, onPhoto as EventListener);
    window.addEventListener("tfc:user-name", onName as EventListener);
    return () => {
      window.removeEventListener(USER_PHOTO_EVENT, onPhoto as EventListener);
      window.removeEventListener("tfc:user-name", onName as EventListener);
    };
  }, []);

  if (!photo && !name) return null;

  return (
    <div className="mx-auto mb-2 flex w-full max-w-2xl items-center gap-3 px-4">
      <Link
        to="/account"
        aria-label="Your profile"
        className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary ring-1 ring-border"
      >
        {photo ? (
          <img src={photo} alt="Your profile photo" className="h-full w-full object-cover" />
        ) : (
          <UserRound className="h-5 w-5 text-foreground" />
        )}
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
