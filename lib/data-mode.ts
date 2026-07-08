export type DataMode = 'sandbox' | 'database';

/**
 * Resolução do modo de dados — FAIL-CLOSED.
 *
 * Regras:
 * 1. O padrão é SEMPRE `database`. Qualquer configuração ausente ou inválida
 *    resulta em `database` (nunca cai silenciosamente para a sessão mock).
 * 2. `sandbox` (demo com Zustand/localStorage) só é ativado quando pedido
 *    EXPLICITAMENTE via `NEXT_PUBLIC_DATA_MODE=sandbox`.
 * 3. Em produção/Vercel o sandbox é bloqueado independentemente da flag —
 *    nunca há fallback para auth/tenant mockados em produção.
 *
 * Isso evita o bug de bypass de autenticação/isolamento caso o deploy não
 * exponha NODE_ENV/VERCEL como esperado: sem opt-in explícito, roda em banco.
 */

// Ambiente de produção: Vercel, NODE_ENV=production, ou qualquer host que não
// seja localhost quando avaliado no cliente.
const isProd =
  process.env.NODE_ENV === 'production' ||
  process.env.VERCEL === '1' ||
  (typeof window !== 'undefined' && !window.location.hostname.includes('localhost'));

// Sandbox exige opt-in explícito (string exata 'sandbox').
const sandboxExplicitlyRequested = process.env.NEXT_PUBLIC_DATA_MODE === 'sandbox';

export const dataMode: DataMode =
  sandboxExplicitlyRequested && !isProd ? 'sandbox' : 'database';

export const isDatabaseDataMode = dataMode === 'database';
export const isSandboxDataMode = !isDatabaseDataMode;
