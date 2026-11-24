import { Star } from "lucide-react";

/** Read-only star display, e.g. 4.3 -> four filled stars. */
export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          width={size}
          height={size}
          className={n <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-gray-300"}
        />
      ))}
    </span>
  );
}

/** "4.3 (12 reviews)" or "No reviews yet". */
export function RatingSummary({ rating, count }: { rating: number | null; count: number }) {
  if (!rating || count === 0) {
    return <span className="text-sm text-gray-400">No reviews yet</span>;
  }
  return (
    <span className="inline-flex items-center gap-2 text-sm text-gray-600">
      <Stars value={rating} />
      <span>
        {rating.toFixed(1)} ({count} {count === 1 ? "review" : "reviews"})
      </span>
    </span>
  );
}

/** Clickable 1-5 star picker. */
export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <span className="inline-flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          className="p-0.5"
        >
          <Star
            width={28}
            height={28}
            className={n <= value ? "fill-amber-400 text-amber-400" : "text-gray-300 hover:text-amber-300"}
          />
        </button>
      ))}
    </span>
  );
}
