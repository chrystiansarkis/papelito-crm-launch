import { cn } from "@/lib/utils";

export type AvatarSize = 28 | 36 | 48;

const SIZE_CLASSES: Record<AvatarSize, string> = {
  28: "w-7 h-7 text-[10px]",
  36: "w-9 h-9 text-xs",
  48: "w-12 h-12 text-sm",
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
  }
  return (name.substring(0, 2) || "?").toUpperCase();
}

export function Avatar({
  name,
  size = 36,
  src,
  className,
}: {
  name: string;
  size?: AvatarSize;
  src?: string;
  className?: string;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn(SIZE_CLASSES[size], "rounded-full object-cover", className)}
      />
    );
  }
  return (
    <div
      className={cn(
        SIZE_CLASSES[size],
        "rounded-full bg-ink text-white flex items-center justify-center font-semibold shrink-0",
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}
