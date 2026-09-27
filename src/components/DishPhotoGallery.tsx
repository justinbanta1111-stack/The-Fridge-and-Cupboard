/**
 * A photo gallery on every dish page: the stock photo of the dish plus any
 * photos the cook has taken themselves. They can add their own, pick which one
 * shows at the top, and delete any they don't want.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Star, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Row = {
  id: string;
  storage_path: string;
  caption: string;
  is_primary: boolean;
};

type Shot = Row & { url: string };

const PRIMARY_KEY = (slug: string) => `tfc.dish-photo.primary.${slug}`;

export function DishPhotoGallery({
  slug,
  dishName,
  stockPhoto,
}: {
  slug: string;
  dishName: string;
  stockPhoto: string;
}) {
  const [signedIn, setSignedIn] = useState(false);
  const [shots, setShots] = useState<Shot[]>([]);
  const [busy, setBusy] = useState(false);
  const [hero, setHero] = useState<string>(stockPhoto);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const { data: session } = await supabase.auth.getSession();
    const isIn = Boolean(session.session);
    setSignedIn(isIn);
    if (!isIn) return;

    const { data } = await supabase
      .from("dish_photos")
      .select("id, storage_path, caption, is_primary")
      .eq("dish_slug", slug)
      .order("created_at", { ascending: false });

    const rows = (data ?? []) as Row[];
    const withUrls: Shot[] = [];
    for (const row of rows) {
      const { data: signed } = await supabase.storage
        .from("dish-photos")
        .createSignedUrl(row.storage_path, 60 * 60);
      if (signed?.signedUrl) withUrls.push({ ...row, url: signed.signedUrl });
    }
    setShots(withUrls);
    const primary = withUrls.find((s) => s.is_primary);
    setHero(primary ? primary.url : stockPhoto);
  }, [slug, stockPhoto]);

  useEffect(() => {
    void load();
  }, [load]);

  async function upload(file: File) {
    setBusy(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user.id;
      if (!userId) {
        toast.error("Sign in to add your own photos.");
        return;
      }
      const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
      const path = `${userId}/${slug}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("dish-photos")
        .upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });
      if (upErr) throw upErr;

      const { error } = await supabase
        .from("dish_photos")
        .insert({ user_id: userId, dish_slug: slug, storage_path: path } as never);
      if (error) throw error;

      toast.success("Photo added to this recipe.");
      await load();
    } catch {
      toast.error("That photo would not upload. Try a smaller one.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function makeMain(shot: Shot) {
    await supabase.from("dish_photos").update({ is_primary: false }).eq("dish_slug", slug);
    await supabase.from("dish_photos").update({ is_primary: true }).eq("id", shot.id);
    try {
      localStorage.setItem(PRIMARY_KEY(slug), shot.storage_path);
    } catch {
      /* private mode */
    }
    setHero(shot.url);
    await load();
    toast.success("That's the main photo now.");
  }

  async function remove(shot: Shot) {
    await supabase.storage.from("dish-photos").remove([shot.storage_path]);
    await supabase.from("dish_photos").delete().eq("id", shot.id);
    await load();
    toast.success("Photo removed.");
  }

  return (
    <section className="mb-6" aria-label={`Photos of ${dishName}`}>
      <img
        src={hero}
        alt={dishName}
        width={1024}
        height={768}
        loading="lazy"
        className="h-56 w-full rounded-2xl object-cover sm:h-72"
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="flex flex-1 gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setHero(stockPhoto)}
            className="shrink-0 rounded-xl border border-border p-0.5"
            aria-label="Show the stock photo"
          >
            <img src={stockPhoto} alt="" width={96} height={72} className="h-16 w-24 rounded-lg object-cover" />
          </button>
          {shots.map((shot) => (
            <div key={shot.id} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setHero(shot.url)}
                className="rounded-xl border border-border p-0.5"
                aria-label="Show this photo"
              >
                <img src={shot.url} alt="" width={96} height={72} className="h-16 w-24 rounded-lg object-cover" />
              </button>
              <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 rounded-b-lg bg-background/80 py-0.5">
                <button
                  type="button"
                  onClick={() => void makeMain(shot)}
                  aria-label="Make this the main photo"
                  className="p-0.5"
                >
                  <Star className={`h-3.5 w-3.5 ${shot.is_primary ? "fill-primary text-primary" : ""}`} />
                </button>
                <button type="button" onClick={() => void remove(shot)} aria-label="Delete this photo" className="p-0.5">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {signedIn ? (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file);
              }}
            />
            <Button variant="secondary" disabled={busy} onClick={() => fileRef.current?.click()}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
              {busy ? "Adding…" : "Add your photo"}
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Sign in to add your own photos of this dish.</p>
        )}
      </div>
    </section>
  );
}
