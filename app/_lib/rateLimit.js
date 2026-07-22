// Simple in-memory sliding-window rate limiter. Sufficient for a single server
// instance; for multi-instance/serverless deployments swap the Map for a shared
// store (e.g. Redis / Upstash). State resets on server restart.
const hits = new Map(); // key -> number[] (timestamps)

export function checkRateLimit(key, limit = 5, windowMs = 60000) {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}
