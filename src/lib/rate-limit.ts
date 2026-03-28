import type { NextApiHandler, NextApiRequest, NextApiResponse } from "next";

const store = new Map<string, number[]>();

function isAllowed(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const timestamps = store.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < windowMs);
  if (recent.length >= limit) return false;
  recent.push(now);
  store.set(ip, recent);
  return true;
}

function getIp(req: NextApiRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return (req.socket as { remoteAddress?: string })?.remoteAddress ?? "unknown";
}

export function withRateLimit(
  handler: NextApiHandler,
  { limit = 20, windowMs = 60_000 }: { limit?: number; windowMs?: number } = {},
): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "POST") {
      const ip = getIp(req);
      if (!isAllowed(ip, limit, windowMs)) {
        return res.status(429).json({ error: "Too many requests" });
      }
    }
    return handler(req, res);
  };
}
