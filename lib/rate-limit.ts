import { headers } from 'next/headers';

/**
 * Rate limiter simples em memória (fixed-window), sem dependências externas.
 *
 * Observação sobre serverless (Vercel): o estado é por instância/processo, então
 * não é um limite global perfeito — mas é uma defesa best-effort adequada contra
 * abuso/brute-force das rotas públicas de aprovação, sem exigir Redis/Upstash.
 * Se no futuro for necessário um limite forte e distribuído, trocar o backend
 * deste módulo por Upstash Ratelimit mantendo a mesma assinatura.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Limpeza oportunista para evitar crescimento ilimitado do Map.
function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSec: number;
}

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

/**
 * Resolve um identificador de origem para o request atual (IP do cliente).
 * Usa cabeçalhos de proxy da Vercel; cai para 'unknown' se ausente.
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return h.get('x-real-ip')?.trim() || 'unknown';
}
