import { useEffect, useRef, useState } from "react";
import { UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  clearSavedUserPhoto,
  getSavedUserPhoto,
  saveUserPhotoFromFile,
  USER_PHOTO_EVENT,
} from "@/lib/user-photo";

/** Optional profile photo, kept on this device, shown in Chef's greeting. */
export function ProfilePhotoCard({ className }: { className?: string }) {
  const [photo, setPhoto] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPhoto(getSavedUserPhoto());
    const onChange = (e: Event) => setPhoto(String((e as CustomEvent).detail ?? ""));
    window.addEventListener(USER_PHOTO_EVENT, onChange as EventListener);
    return () => window.removeEventListener(USER_PHOTO_EVENT, onChange as EventListener);
  }, []);

  async function handleFile(file: File) {
    setBusy(true);
    try {
      await saveUserPhotoFromFile(file);
      toast.success("Photo saved. Chef will show it when he says hello.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "We couldn't save that photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className={className ? `p-5 ${className}` : "p-5"}>
      <div className="flex items-start gap-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary text-foreground">
          {photo ? (
            <img src={photo} alt="Your profile photo" className="h-full w-full object-cover" />
          ) : (
            <UserRound className="h-6 w-6" />
          )}
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold">Your photo</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Optional. Chef shows your face beside your name when he greets you. It stays on this
            device.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              if (fileRef.current) fileRef.current.value = "";
            }}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" disabled={busy} onClick={() => fileRef.current?.click()}>
              {photo ? "Change photo" : "Add photo"}
            </Button>
            {photo && (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  clearSavedUserPhoto();
                  toast.success("Photo removed.");
                }}
              >
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default ProfilePhotoCard;
