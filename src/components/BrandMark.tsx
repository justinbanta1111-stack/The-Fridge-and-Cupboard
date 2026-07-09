import emblem from "@/assets/fridge-cape-emblem.png.asset.json";

/**
 * BrandMark — Chef Super J emblem: stainless fridge with open door full of fresh
 * produce, red hero cape, bold blue "J" superhero shield on the door.
 * Brand colors: blue #0047AB, red #D62828, gold #FFC72C, green #2E7D32.
 */
export function BrandMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <img
      src={emblem.url}
      alt="The Fridge and Cupboard — Chef Super J emblem"
      width={256}
      height={256}
      loading="lazy"
      decoding="async"
      className={`object-contain ${className}`}
      draggable={false}
    />
  );
}

export default BrandMark;
