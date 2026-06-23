import { BadgeCheck } from "lucide-react";

export function VerifiedBadge({ className = "", size = 16 }: { className?: string; size?: number }) {
  return (
    <span
      title="Verificado Peacely PLUS"
      className={`plus-badge inline-flex shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <BadgeCheck
        className="plus-badge-icon h-full w-full text-white"
        strokeWidth={2.5}
      />
    </span>
  );
}
