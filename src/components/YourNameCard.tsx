import { useEffect, useState } from "react";
import { Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { resolveUserName, setSavedUserName } from "@/lib/user-name";

/** Lets someone tell Chef Super J what to call them. Optional, stays on the device. */
export function YourNameCard({ className }: { className?: string }) {
  const [name, setName] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void resolveUserName().then((n) => {
      setName(n);
      setReady(true);
    });
  }, []);

  function save() {
    const saved = setSavedUserName(name);
    setName(saved);
    toast.success(saved ? `Chef will call you ${saved}.` : "Name cleared.");
  }

  return (
    <Card className={className ? `p-5 ${className}` : "p-5"}>
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-foreground">
          <Smile className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold">What should Chef call you?</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Optional. Chef will use your first name now and then while you cook.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <div className="min-w-[10rem] flex-1 space-y-1.5">
              <Label htmlFor="chef-name">First name</Label>
              <Input
                id="chef-name"
                value={name}
                placeholder="Tammy"
                autoComplete="given-name"
                disabled={!ready}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <Button type="button" onClick={save} disabled={!ready}>
              Save
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default YourNameCard;
