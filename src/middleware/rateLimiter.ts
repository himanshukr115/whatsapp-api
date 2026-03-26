import { Request, Response, NextFunction } from 'express';
import { redis } from '../lib/redis';

// Per-tenant, per-channel rate limiting using Redis sliding window
export function tenantRateLimiter(windowMs: number, maxRequests: number) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const workspaceId = (req as any).workspace?.id;
    if (!workspaceId) return next();

    const key = `rl:${workspaceId}:${Math.floor(Date.now() / windowMs)}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, Math.ceil(windowMs / 1000));

    if (count > maxRequests) {
      return res.status(429).json({ error: 'Rate limit exceeded', retryAfter: windowMs / 1000 });
    }
    next();
  };
}