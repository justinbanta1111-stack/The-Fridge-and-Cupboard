import { Mail, MessageSquare, Printer, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SaveButton } from "@/components/SaveButton";
import {
  emailRecipe,
  printRecipe,
  shareRecipe,
  textRecipe,
  type ShareableRecipe,
} from "@/lib/recipe-share";

/** Save / share / text / email / print row for a recipe card. */
export function RecipeActions({ recipe }: { recipe: ShareableRecipe }) {
  async function onShare() {
    const how = await shareRecipe(recipe);
    if (how === "copied") toast.success("Recipe copied — paste it anywhere.");
  }

  return (
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
      <SaveButton
        category="recipes"
        title={recipe.title}
        subtitle={recipe.description}
        ingredients={recipe.usesFromFridge}
        className="h-11 justify-center rounded-md text-sm"
      />
      <Button type="button" variant="outline" className="h-11 font-semibold" onClick={onShare}>
        <Share2 className="mr-1.5 h-4 w-4" aria-hidden /> Share
      </Button>
      <Button type="button" variant="outline" className="h-11 font-semibold" onClick={() => textRecipe(recipe)}>
        <MessageSquare className="mr-1.5 h-4 w-4" aria-hidden /> Text
      </Button>
      <Button type="button" variant="outline" className="h-11 font-semibold" onClick={() => emailRecipe(recipe)}>
        <Mail className="mr-1.5 h-4 w-4" aria-hidden /> Email
      </Button>
      <Button type="button" variant="outline" className="h-11 font-semibold" onClick={() => printRecipe(recipe)}>
        <Printer className="mr-1.5 h-4 w-4" aria-hidden /> Print
      </Button>
    </div>
  );
}
