type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
};

function getTodayKey(now = new Date()): string {
  // UTC day key
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const ipCounters = new Map<string, { day: string; count: number }>();

export function getClientIp(req: any): string {
  // Trust proxy should be configured by the host; we also support basic x-forwarded-for.
  const xff = (req.headers?.["x-forwarded-for"] || req.headers?.["X-Forwarded-For"]) as string | undefined;
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    req.ip ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

export function checkAndIncrementAnonIpLimit(opts: {
  req: any;
  maxPerDay: number;
  bypass: boolean;
}): RateLimitResult {
  const { req, maxPerDay, bypass } = opts;

  const now = new Date();
  const day = getTodayKey(now);
  const resetAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));

  if (bypass) {
    return { allowed: true, remaining: maxPerDay, resetAt };
  }

  const ip = getClientIp(req);
  const key = `${ip}`;

  const entry = ipCounters.get(key);
  if (!entry || entry.day !== day) {
    ipCounters.set(key, { day, count: 1 });
    return { allowed: true, remaining: Math.max(0, maxPerDay - 1), resetAt };
  }

  if (entry.count >= maxPerDay) {
    return { allowed: false, remaining: 0, resetAt };
  }

  entry.count += 1;
  ipCounters.set(key, entry);
  return { allowed: true, remaining: Math.max(0, maxPerDay - entry.count), resetAt };
}

