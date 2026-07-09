import { Heart, Users, HandHeart, Share2 } from "lucide-react";
import { ShareMenu } from "@/components/ShareMenu";
import { INVITE_MESSAGE, CHURCH_MESSAGE } from "@/lib/share-messages";

export function InviteAndShareStrip() {
  return (
    <section className="mt-8">
      <div className="rounded-3xl border border-rose-500/20 bg-gradient-to-br from-rose-500/5 via-card to-amber-500/5 p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-rose-500/15 text-rose-600">
            <Share2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-600 sm:text-xs">
              Pass it on
            </p>
            <h2 className="mt-1 font-display text-2xl tracking-tight sm:text-3xl">
              Share with someone who needs it
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              No login required. Send by text, email, Facebook, or just copy the link.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Tile
            icon={<Heart className="h-4 w-4" />}
            title="Send to a friend"
            sub="Someone juggling groceries, leftovers, or a tight week."
            share={
              <ShareMenu
                label="Send this to someone who needs it"
                title="Invite a friend"
                subject="Thought you'd like this"
                text={INVITE_MESSAGE}
                variant="default"
                className="w-full"
              />
            }
          />
          <Tile
            icon={<HandHeart className="h-4 w-4" />}
            title="For a caregiver"
            sub="Supportive meals when someone isn't feeling well."
            share={
              <ShareMenu
                label="Send to a caregiver"
                title="Share with a caregiver"
                subject="A small tool that's been helping"
                text={`${INVITE_MESSAGE}\n\nThere's a Health Companion built in — pick how the person is feeling and it suggests gentle, easy-to-eat meals.`}
                variant="default"
                className="w-full"
              />
            }
          />
          <Tile
            icon={<Users className="h-4 w-4" />}
            title="Church or group"
            sub="Great for meal trains, families, and community kitchens."
            share={
              <ShareMenu
                label="Share with my church or group"
                title="Share with a community"
                subject="A tool for our meal train / group"
                text={CHURCH_MESSAGE}
                variant="default"
                className="w-full"
              />
            }
          />
        </div>
      </div>
    </section>
  );
}

function Tile({
  icon,
  title,
  sub,
  share,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  share: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-border/60 bg-background/70 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground/80">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-secondary text-foreground/80">
          {icon}
        </span>
        {title}
      </div>
      <p className="mt-2 flex-1 text-sm text-muted-foreground">{sub}</p>
      <div className="mt-3">{share}</div>
    </div>
  );
}
