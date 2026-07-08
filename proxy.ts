import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';
import { isDatabaseDataMode } from './lib/data-mode';

/**
 * Backstop de autenticação (defesa em profundidade) — convenção `proxy` do
 * Next 16 (sucessora de `middleware`).
 *
 * NÃO substitui a checagem server-side dos layouts/actions — apenas adiciona uma
 * camada extra para que qualquer rota interna nova, mesmo que esqueça o layout
 * autenticado, não fique acessível sem sessão. A validação REAL da sessão
 * continua nos Server Components (via Better Auth + Prisma); aqui só verificamos,
 * de forma leve, a PRESENÇA do cookie de sessão.
 */

// Rotas públicas por prefixo (aprovação pública por token, proposta pública,
// login e endpoints do Better Auth).
const PUBLIC_PREFIXES = ['/login', '/a/', '/publicacao/', '/proposta/', '/api/auth'];
// Rotas públicas exatas (landing e as bases das rotas públicas acima).
const PUBLIC_EXACT = new Set(['/', '/a', '/publicacao', '/proposta']);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

export function proxy(request: NextRequest) {
  // No modo demo/sandbox não há sessão real do Better Auth (sessão é mockada
  // server-side); o backstop de cookie não se aplica.
  if (!isDatabaseDataMode) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Roda em todas as rotas exceto assets estáticos do Next e arquivos com extensão.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
