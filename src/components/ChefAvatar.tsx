import chefAsset from "@/assets/chef-super-j-bald.png.asset.json";

/**
 * Official Chef Super J mascot — bald, beard, chef hat with "J", blue super-suit
 * with yellow "J" shield, red cape, spatula. Used wherever a chef avatar,
 * mascot, recommendation bubble, or profile circle is needed.
 */
export const CHEF_SUPER_J_IMG = chefAsset.url;

export function ChefAvatar({
  className = "h-10 w-10",
  ring = true,
  alt = "Chef Super J",
}: {
  className?: string;
  ring?: boolean;
  alt?: string;
}) {
  return (
    <img
      src={CHEF_SUPER_J_IMG}
      alt={alt}
      width={256}
      height={256}
      loading="lazy"
      decoding="async"
      className={`overflow-hidden rounded-full object-cover object-top shadow-md ${
        ring ? "ring-2 ring-[#0047AB]/40" : ""
      } ${className}`}
    />
  );
}
