import { useEffect, useState } from "react";
import { Check, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isRecipeChosen, toggleRecipeInCart } from "@/lib/recipe-cart";
import { toast } from "sonner";

type Props = {
  title: string;
  ingredients: string[];
  note?: string;
  size?: "sm" | "default" | "lg";
  className?: string;
};

/**
 * One-tap "add this recipe to my shopping plan" toggle. Ingredients from every
 * chosen recipe get consolidated on /shopping-plan.
 */
export function AddRecipeToPlanButton({ title, ingredients, note, size = "default", className }: Props) {
  const [chosen, setChosen] = useState(false);

  useEffect(() => {
    setChosen(isRecipeChosen(title));
  }, [title]);

  const onClick = () => {
    toggleRecipeInCart(title, ingredients, note);
    const now = isRecipeChosen(title);
    setChosen(now);
    toast.success(now ? `Added "${title}" to your shopping plan.` : `Removed "${title}".`);
  };

  return (
    <Button
      type="button"
      size={size}
      variant={chosen ? "secondary" : "outline"}
      onClick={onClick}
      className={className}
    >
      {chosen ? (
        <>
          <Check className="mr-2 h-4 w-4" /> In shopping plan
        </>
      ) : (
        <>
          <ShoppingCart className="mr-2 h-4 w-4" /> Add to shopping plan
        </>
      )}
    </Button>
  );
}
