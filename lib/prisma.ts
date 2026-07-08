import { PrismaClient } from '@prisma/client';

// Singleton do PrismaClient (evita múltiplas instâncias em dev / hot-reload).
//
// CONNECTION POOLING (Vercel serverless + Railway Postgres):
// Cada invocação serverless pode abrir uma conexão nova — sem pooling isso
// esgota o limite de conexões do Postgres sob carga. A mitigação NÃO é feita
// aqui no código, e sim na string de conexão: use o endpoint POOLED do Railway
// (PgBouncer) na DATABASE_URL com `?pgbouncer=true&connection_limit=1`
// (e uma DIRECT_URL sem pooler para rodar migrations). Ver .env.example.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
