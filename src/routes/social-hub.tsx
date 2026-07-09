import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft, Users, Trophy, Flame, HeartHandshake, Share2,
  MapPin, Plus, Heart, Sparkles, BookOpen, Calendar, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getChallenges, updateChallenge,
  getSwapRecipes, addSwapRecipe, heartSwap, type SwapRecipe,
  getGroups, addGroup, removeGroup,
  getGroupMeals, addGroupMeal, removeGroupMeal,
  getWins, addWin,
  getPrivacy, setPrivacy,
  getSponsorships, addSponsorship,
  POPULAR_MEALS, LEFTOVER_WINS, TOP_SAVERS, LOCAL_FEED,
  formatMoney,
} from "@/lib/social-hub";

export const Route = createFileRoute("/social-hub")({
  head: () => ({
    meta: [
      { title: "Community & Social — The Fridge and Cupboard" },
      { name: "description", content: "Community recipe wall, leftover wins, weekly challenges, recipe swap, church & group meal planning, top savers, share your wins, and sponsor a family." },
      { property: "og:title", content: "Community & Social Hub" },
      { property: "og:description", content: "Share, support, and save together." },
    ],
  }),
  component: SocialHubPage,
});

function SocialHubPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
          <div className="text-sm font-semibold">Community & Social</div>
          <Link to="/community" className="text-xs text-muted-foreground hover:text-foreground">Recipe Vault →</Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        <div className="rounded-2xl border bg-gradient-to-br from-fuchsia-500/10 via-sky-400/10 to-emerald-500/10 p-4">
          <div className="text-lg font-bold">Share. Support. Save together.</div>
          <div className="text-sm text-muted-foreground">All social features are optional. Your data stays on your device unless you choose to share.</div>
        </div>

        <PrivacyCard />
        <RecipeWall />
        <LeftoverWinsCard />
        <ChallengesCard />
        <RecipeSwapCard />
        <GroupPlanningCard />
        <TopSaversCard />
        <LocalFeedCard />
        <ShareWinCard />
        <SponsorCard />
      </main>
    </div>
  );
}

// ===== Privacy =====
function PrivacyCard() {
  const [p, setP] = useState(() => getPrivacy());
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3"><Sparkles className="h-5 w-5 text-fuchsia-600" /><h2 className="font-semibold">Your Privacy</h2></div>
      <div className="grid md:grid-cols-3 gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={p.shareToBoard} onChange={(e) => { const n = setPrivacy({ shareToBoard: e.target.checked }); setP(n); }} />
          Show me on Top Savers Board
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={p.shareLocation} onChange={(e) => { const n = setPrivacy({ shareLocation: e.target.checked }); setP(n); }} />
          Show me in Local Feed
        </label>
        <Input placeholder="Display name" value={p.displayName} onChange={(e) => { const n = setPrivacy({ displayName: e.target.value }); setP(n); }} />
      </div>
    </Card>
  );
}

// ===== Recipe Wall =====
function RecipeWall() {
  const [tab, setTab] = useState<"popular" | "trending" | "saved" | "cheap">("popular");
  const filtered = useMemo(() => {
    if (tab === "trending") return POPULAR_MEALS.filter((m) => m.badge.includes("Rescue") || m.badge.includes("Trending"));
    if (tab === "saved") return POPULAR_MEALS.slice().sort((a, b) => b.cooks - a.cooks);
    if (tab === "cheap") return POPULAR_MEALS.filter((m) => m.badge.includes("Cheap"));
    return POPULAR_MEALS;
  }, [tab]);
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3"><Users className="h-5 w-5 text-sky-600" /><h2 className="font-semibold">What People Are Making</h2></div>
      <div className="flex flex-wrap gap-1 mb-3">
        {(["popular", "trending", "saved", "cheap"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn("rounded-full px-3 py-1 text-xs border", tab === t ? "bg-foreground text-background" : "bg-background")}>{t}</button>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
        {filtered.map((m) => (
          <div key={m.title} className="rounded-lg border p-3">
            <div className="text-sm font-medium">{m.title}</div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>{m.cooks.toLocaleString()} cooks today</span>
              <Badge variant="outline" className="text-[10px]">{m.badge}</Badge>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ===== Leftover Wins =====
function LeftoverWinsCard() {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3"><Sparkles className="h-5 w-5 text-amber-600" /><h2 className="font-semibold">Best Leftover Saves</h2></div>
      <div className="space-y-2">
        {LEFTOVER_WINS.map((w, i) => (
          <div key={i} className="rounded-lg border bg-amber-500/5 p-3 flex items-center justify-between gap-3">
            <div className="text-sm"><span className="font-semibold">{w.who}</span> {w.text}</div>
            <Badge className="bg-emerald-600 hover:bg-emerald-600">Saved {formatMoney(w.saved)}</Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ===== Challenges =====
function ChallengesCard() {
  const [list, setList] = useState(() => getChallenges());
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3"><Flame className="h-5 w-5 text-orange-500" /><h2 className="font-semibold">Weekly Challenges</h2></div>
      <div className="grid md:grid-cols-2 gap-2">
        {list.map((c) => (
          <div key={c.id} className="rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="font-medium text-sm">{c.title}</div>
                <div className="text-xs text-muted-foreground">{c.goal}</div>
              </div>
              <Button size="sm" variant={c.joined ? "secondary" : "default"} onClick={() => setList(updateChallenge(c.id, { joined: !c.joined, joinedAt: Date.now() }))}>
                {c.joined ? "Joined" : "Join"}
              </Button>
            </div>
            {c.joined && (
              <div className="mt-2">
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-orange-500" style={{ width: `${Math.min(100, (c.progress / c.target) * 100)}%` }} />
                </div>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{c.progress}/{c.target}</span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => setList(updateChallenge(c.id, { progress: Math.max(0, c.progress - 1) }))}>-</Button>
                    <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => { const next = Math.min(c.target, c.progress + 1); setList(updateChallenge(c.id, { progress: next })); if (next >= c.target) toast.success(`Challenge complete: ${c.title}!`); }}>+</Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

// ===== Recipe Swap =====
function RecipeSwapCard() {
  const [list, setList] = useState<SwapRecipe[]>(() => getSwapRecipes());
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", author: "", category: "family" as SwapRecipe["category"], body: "" });
  const [filter, setFilter] = useState<SwapRecipe["category"] | "all">("all");
  const filtered = filter === "all" ? list : list.filter((r) => r.category === filter);

  function submit() {
    if (!form.title.trim() || !form.body.trim()) { toast.error("Add a title and recipe."); return; }
    setList(addSwapRecipe({ title: form.title.trim(), author: form.author.trim() || "Anonymous", category: form.category, body: form.body.trim() }));
    setForm({ title: "", author: "", category: "family", body: "" });
    setOpen(false);
    toast.success("Recipe shared!");
  }

  const cats: { id: SwapRecipe["category"] | "all"; label: string }[] = [
    { id: "all", label: "All" }, { id: "family", label: "Family" }, { id: "leftover", label: "Leftover" },
    { id: "kid", label: "Kid" }, { id: "church", label: "Church" }, { id: "health", label: "Health" },
  ];

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-violet-600" /><h2 className="font-semibold">Recipe Swap</h2></div>
        <Button size="sm" onClick={() => setOpen((o) => !o)}><Plus className="h-4 w-4 mr-1" />Share a recipe</Button>
      </div>
      <div className="flex flex-wrap gap-1 mb-3">
        {cats.map((c) => (
          <button key={c.id} onClick={() => setFilter(c.id)} className={cn("rounded-full px-3 py-1 text-xs border", filter === c.id ? "bg-foreground text-background" : "bg-background")}>{c.label}</button>
        ))}
      </div>
      {open && (
        <div className="rounded-lg border p-3 mb-3 space-y-2 bg-muted/30">
          <div className="grid md:grid-cols-2 gap-2">
            <Input placeholder="Recipe title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Input placeholder="Your name (optional)" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
          </div>
          <select className="w-full rounded-md border bg-background px-2 py-2 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as SwapRecipe["category"] })}>
            <option value="family">Family recipe</option>
            <option value="leftover">Leftover idea</option>
            <option value="kid">Kid meal</option>
            <option value="church">Church / potluck</option>
            <option value="health">Health support</option>
          </select>
          <Textarea rows={3} placeholder="Ingredients + steps" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          <div className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button><Button size="sm" onClick={submit}>Post</Button></div>
        </div>
      )}
      <div className="space-y-2">
        {filtered.map((r) => (
          <div key={r.id} className="rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold">{r.title}</div>
                <div className="text-xs text-muted-foreground">by {r.author} · <Badge variant="outline" className="text-[10px]">{r.category}</Badge></div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setList(heartSwap(r.id))}>
                <Heart className="h-4 w-4 mr-1 fill-rose-500 text-rose-500" /> {r.hearts}
              </Button>
            </div>
            <div className="mt-2 text-sm whitespace-pre-wrap">{r.body}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ===== Group Planning =====
function GroupPlanningCard() {
  const [groups, setGroups] = useState(() => getGroups());
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", kind: "meal-train" as "meal-train" | "church" | "family" | "support", notes: "" });

  function createGroup() {
    if (!form.name.trim()) return;
    setGroups(addGroup(form));
    setForm({ name: "", kind: "meal-train", notes: "" });
    toast.success("Group created.");
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3"><HeartHandshake className="h-5 w-5 text-rose-600" /><h2 className="font-semibold">Church & Group Meal Planning</h2></div>
      <div className="rounded-lg border p-3 mb-3 space-y-2 bg-muted/30">
        <div className="grid md:grid-cols-3 gap-2">
          <Input placeholder="Group name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className="rounded-md border bg-background px-2 text-sm" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as any })}>
            <option value="meal-train">Meal train</option>
            <option value="church">Church dinner</option>
            <option value="family">Family event</option>
            <option value="support">Support group</option>
          </select>
          <Button onClick={createGroup}><Plus className="h-4 w-4 mr-1" />Create group</Button>
        </div>
        <Input placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
      {groups.length === 0 && <div className="text-sm text-muted-foreground">No groups yet. Create one to coordinate meals.</div>}
      <div className="space-y-2">
        {groups.map((g) => (
          <div key={g.id} className="rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <div className="text-sm font-semibold">{g.name} <Badge variant="outline" className="text-[10px] ml-1">{g.kind}</Badge></div>
                {g.notes && <div className="text-xs text-muted-foreground">{g.notes}</div>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setOpenId(openId === g.id ? null : g.id)}><Calendar className="h-4 w-4 mr-1" />Meals</Button>
                <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Delete group "${g.name}"?`)) { removeGroup(g.id); setGroups(getGroups()); } }}><X className="h-4 w-4" /></Button>
              </div>
            </div>
            {openId === g.id && <GroupMealsEditor groupId={g.id} />}
          </div>
        ))}
      </div>
    </Card>
  );
}

function GroupMealsEditor({ groupId }: { groupId: string }) {
  const [meals, setMeals] = useState(() => getGroupMeals(groupId));
  const [m, setM] = useState({ date: new Date().toISOString().slice(0, 10), dish: "", cook: "" });
  function add() {
    if (!m.dish.trim() || !m.cook.trim()) return;
    addGroupMeal({ groupId, ...m });
    setMeals(getGroupMeals(groupId));
    setM({ ...m, dish: "", cook: "" });
  }
  return (
    <div className="mt-3 space-y-2">
      <div className="grid md:grid-cols-4 gap-2">
        <Input type="date" value={m.date} onChange={(e) => setM({ ...m, date: e.target.value })} />
        <Input placeholder="Dish" value={m.dish} onChange={(e) => setM({ ...m, dish: e.target.value })} />
        <Input placeholder="Cook" value={m.cook} onChange={(e) => setM({ ...m, cook: e.target.value })} />
        <Button onClick={add}>Add</Button>
      </div>
      {meals.length === 0 && <div className="text-xs text-muted-foreground">No meals scheduled.</div>}
      <div className="space-y-1">
        {meals.sort((a, b) => a.date.localeCompare(b.date)).map((meal) => (
          <div key={meal.id} className="flex items-center justify-between text-sm border-b border-border/40 py-1">
            <span><strong>{meal.date}</strong> · {meal.dish} <span className="text-muted-foreground">— {meal.cook}</span></span>
            <button className="text-xs text-muted-foreground hover:text-destructive" onClick={() => { removeGroupMeal(meal.id); setMeals(getGroupMeals(groupId)); }}>remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== Top Savers Board =====
function TopSaversCard() {
  const p = getPrivacy();
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3"><Trophy className="h-5 w-5 text-amber-500" /><h2 className="font-semibold">Top Savers Board</h2></div>
      {!p.shareToBoard && <div className="text-xs text-muted-foreground mb-2">You're hidden. Enable "Show me on Top Savers Board" in privacy settings to appear.</div>}
      <div className="space-y-1">
        {TOP_SAVERS.map((s, i) => (
          <div key={s.name} className={cn("flex items-center justify-between rounded-lg border p-2 text-sm", s.name === "You" && "bg-amber-500/5")}>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs w-5 text-muted-foreground">#{i + 1}</span>
              <span className="font-medium">{s.name === "You" ? p.displayName : s.name}</span>
            </div>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span>💰 {formatMoney(s.saved)}</span>
              <span>♻️ {s.rescued}</span>
              <span>🔥 {s.streak}d</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ===== Local Feed =====
function LocalFeedCard() {
  const p = getPrivacy();
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3"><MapPin className="h-5 w-5 text-sky-600" /><h2 className="font-semibold">Local Community Feed</h2></div>
      {!p.shareLocation && <div className="text-xs text-muted-foreground mb-2">Optional. Enable "Show me in Local Feed" to share your area.</div>}
      <div className="space-y-2">
        {LOCAL_FEED.map((f, i) => (
          <div key={i} className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">{f.area}</div>
            <div className="text-sm">{f.line}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ===== Share My Win =====
function ShareWinCard() {
  const [wins, setWins] = useState(() => getWins());
  const [text, setText] = useState("");
  const [kind, setKind] = useState<"savings" | "meal" | "leftover" | "streak">("savings");

  function share() {
    if (!text.trim()) return;
    setWins(addWin({ kind, text: text.trim() }));
    setText("");
    toast.success("Win shared!");
  }
  async function nativeShare(w: { kind: string; text: string }) {
    const msg = `My ${w.kind} win: ${w.text} — via The Fridge and Cupboard`;
    try {
      if (navigator.share) await navigator.share({ text: msg });
      else { await navigator.clipboard.writeText(msg); toast.success("Copied to clipboard."); }
    } catch {}
  }

  const buttons: { id: typeof kind; label: string }[] = [
    { id: "savings", label: "Share my savings" },
    { id: "meal", label: "Share my meal" },
    { id: "leftover", label: "Share leftover transformation" },
    { id: "streak", label: "Share my streak" },
  ];

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3"><Share2 className="h-5 w-5 text-emerald-600" /><h2 className="font-semibold">Share My Win</h2></div>
      <div className="flex flex-wrap gap-1 mb-2">
        {buttons.map((b) => (
          <button key={b.id} onClick={() => setKind(b.id)} className={cn("rounded-full px-3 py-1 text-xs border", kind === b.id ? "bg-foreground text-background" : "bg-background")}>{b.label}</button>
        ))}
      </div>
      <div className="flex gap-2">
        <Input placeholder={`Describe your ${kind}…`} value={text} onChange={(e) => setText(e.target.value)} />
        <Button onClick={share}><Share2 className="h-4 w-4 mr-1" />Post</Button>
      </div>
      <div className="mt-3 space-y-1">
        {wins.length === 0 && <div className="text-sm text-muted-foreground">No wins shared yet.</div>}
        {wins.slice(0, 5).map((w) => (
          <div key={w.id} className="flex items-center justify-between text-sm border-b border-border/40 py-1">
            <span><Badge variant="outline" className="text-[10px] mr-1">{w.kind}</Badge>{w.text}</span>
            <Button size="sm" variant="ghost" onClick={() => nativeShare(w)}><Share2 className="h-3.5 w-3.5" /></Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ===== Sponsor a Family =====
function SponsorCard() {
  const [list, setList] = useState(() => getSponsorships());
  const [form, setForm] = useState({ for: "cancer" as "cancer" | "elderly" | "struggling", months: 1, donor: "" });
  function sponsor() {
    setList(addSponsorship(form));
    toast.success("Thank you! Sponsorship pledged.");
    setForm({ ...form, donor: "" });
  }
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3"><HeartHandshake className="h-5 w-5 text-rose-600" /><h2 className="font-semibold">Support a Family</h2></div>
      <div className="text-sm text-muted-foreground mb-3">Optional. Pledge premium access for someone who needs it.</div>
      <div className="grid md:grid-cols-4 gap-2 mb-2">
        <select className="rounded-md border bg-background px-2 py-2 text-sm" value={form.for} onChange={(e) => setForm({ ...form, for: e.target.value as any })}>
          <option value="cancer">Cancer family</option>
          <option value="elderly">Elderly</option>
          <option value="struggling">Struggling family</option>
        </select>
        <Input type="number" min={1} max={24} value={form.months} onChange={(e) => setForm({ ...form, months: Math.max(1, parseInt(e.target.value) || 1) })} />
        <Input placeholder="Your name (optional)" value={form.donor} onChange={(e) => setForm({ ...form, donor: e.target.value })} />
        <Button onClick={sponsor}><HeartHandshake className="h-4 w-4 mr-1" />Pledge</Button>
      </div>
      <div className="text-xs text-muted-foreground">Sponsoring {form.months} month{form.months === 1 ? "" : "s"} for a {form.for} family.</div>
      {list.length > 0 && (
        <div className="mt-3 space-y-1">
          <div className="text-xs font-semibold">Recent pledges</div>
          {list.slice(0, 5).map((s) => (
            <div key={s.id} className="text-sm border-b border-border/40 py-1">
              <span className="font-medium">{s.donor || "Anonymous"}</span> · {s.months}mo for {s.for} family
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
