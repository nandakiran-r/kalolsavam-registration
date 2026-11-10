import "server-only";
import { query } from "./db";

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

/**
 * Database-backed fixed-window rate limiter. Database-backed because Vercel
 * serverless instances do not share memory.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  // Opportunistic cleanup; keeps the table from growing without a cron job.
  if (Math.random() < 0.03) {
    query("DELETE FROM rate_limits WHERE expires_at < NOW()").catch(() => {});
  }

  const { rows } = await query<{ count: number }>(
    `INSERT INTO rate_limits (key, count, window_start, expires_at)
     VALUES ($1, 1, NOW(), NOW() + make_interval(secs => $2))
     ON CONFLICT (key) DO UPDATE SET
       count = CASE
         WHEN rate_limits.window_start < NOW() - make_interval(secs => $2) THEN 1
         ELSE rate_limits.count + 1
       END,
       window_start = CASE
         WHEN rate_limits.window_start < NOW() - make_interval(secs => $2) THEN NOW()
         ELSE rate_limits.window_start
       END,
       expires_at = CASE
         WHEN rate_limits.window_start < NOW() - make_interval(secs => $2)
           THEN NOW() + make_interval(secs => $2)
         ELSE rate_limits.expires_at
       END
     RETURNING count`,
    [key, windowSeconds],
  );

  const count = rows[0]?.count ?? 1;
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds: windowSeconds,
  };
}

export async function enforceRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
) {
  const result = await rateLimit(key, limit, windowSeconds);
  if (!result.allowed) {
    const { AppError } = await import("./errors");
    throw new AppError(
      "Too many attempts. Please wait a while and try again.",
      429,
      { code: "RATE_LIMITED" },
    );
  }
  return result;
}
