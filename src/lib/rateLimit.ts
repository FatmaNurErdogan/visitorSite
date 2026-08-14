// Basit, bellek-içi sabit pencereli rate limiter. Redis yok, tek process
// varsayımıyla yazıldı — birden fazla instance'ta paylaşılmaz, ama bu
// uygulamanın ölçeği için (küçük şirket içi VMS) yeterli bir koruma.
// Amaç: kimlik doğrulaması olmayan, token'la korunan chat endpoint'lerinin
// spam/DoS için kötüye kullanılmasını zorlaştırmak.
const buckets = new Map<string, { count: number; resetAt: number }>();

// Map'in süresiz büyümesini önlemek için ara sıra süresi geçmiş girişleri temizle.
let lastSweep = Date.now();
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
