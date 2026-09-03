import { Star } from "lucide-react";

interface StarRatingProps {
  value: number;
  count?: number;
  size?: "sm" | "md";
  interactive?: boolean;
  onChange?: (value: number) => void;
}

/** Compact 5-star display; can double as an input when `interactive` is set. */
export function StarRating({ value, count, size = "sm", interactive = false, onChange }: StarRatingProps) {
  const dim = size === "sm" ? "size-3.5" : "size-5";
  return (
    <span className="flex items-center gap-0.5" role={interactive ? "radiogroup" : undefined} aria-label="Rating">
      {[1, 2, 3, 4, 5].map((i) =>
        interactive ? (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={Math.round(value) === i}
            aria-label={`${i} star${i > 1 ? "s" : ""}`}
            onClick={() => onChange?.(i)}
            className="transition hover:scale-110"
          >
            <Star className={`${dim} ${i <= value ? "fill-warning text-warning" : "text-muted-foreground"}`} aria-hidden="true" />
          </button>
        ) : (
          <Star
            key={i}
            className={`${dim} ${i <= Math.round(value) ? "fill-warning text-warning" : "text-muted-foreground/50"}`}
            aria-hidden="true"
          />
        ),
      )}
      {count !== undefined && (
        <span className="ml-1 text-xs text-muted-foreground">
          {value > 0 ? value.toFixed(1) : "—"} ({count})
        </span>
      )}
    </span>
  );
}
