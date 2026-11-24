// Small in-memory rate limiter for login and password reset. It slows down
// password guessing and email spam from one server instance. (On a multi-
// instance host each instance counts separately; good enough for this app.)

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/**
 * Counts one attempt for `key`. Returns how many seconds to wait when the
 * limit is reached, or 0 when the attempt is allowed.
 */
export function hitRateLimit(key: string, limit: number, windowSeconds: number) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return 0;
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return Math.ceil((bucket.resetAt - now) / 1000);
  }
  return 0;
}

export function clearRateLimit(key: string) {
  buckets.delete(key);
}

/** Best-effort client IP from proxy headers. */
export function clientIp(req: Request) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local"
  );
}

export function tooManyAttempts(waitSeconds: number) {
  const minutes = Math.max(1, Math.ceil(waitSeconds / 60));
  return Response.json(
    { error: `Too many attempts. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.` },
    { status: 429, headers: { "Retry-After": String(waitSeconds) } }
  );
}
