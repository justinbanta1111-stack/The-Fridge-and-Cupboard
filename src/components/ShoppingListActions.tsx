import { Mail, MessageSquare, Printer, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ShoppingListItem } from "@/lib/shopping-list";
import {
  emailShoppingList,
  printShoppingList,
  shareShoppingList,
  textShoppingList,
} from "@/lib/shopping-list-share";

/** Save / print / text / email / share row for the shopping list. */
export function ShoppingListActions({ items }: { items: ShoppingListItem[] }) {
  const open = items.filter((i) => !i.done);
  const disabled = open.length === 0;

  async function onShare() {
    const how = await shareShoppingList(items);
    if (how === "copied") toast.success("List copied — paste it anywhere.");
  }

  return (
    <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-12 font-bold"
        disabled={disabled}
        onClick={onShare}
      >
        <Share2 className="mr-1.5 h-4 w-4" aria-hidden /> Share
      </Button>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-12 font-bold"
        disabled={disabled}
        onClick={() => textShoppingList(items)}
      >
        <MessageSquare className="mr-1.5 h-4 w-4" aria-hidden /> Text
      </Button>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-12 font-bold"
        disabled={disabled}
        onClick={() => emailShoppingList(items)}
      >
        <Mail className="mr-1.5 h-4 w-4" aria-hidden /> Email
      </Button>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-12 font-bold"
        disabled={disabled}
        onClick={() => printShoppingList(items)}
      >
        <Printer className="mr-1.5 h-4 w-4" aria-hidden /> Print
      </Button>
    </div>
  );
}
