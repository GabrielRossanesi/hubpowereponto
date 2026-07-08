# Sprint de correções — NV Hub

Sprint focada em segurança, performance e consistência, derivada da auditoria.

Legenda: ✅ concluído · ⬜ pendente

## Prioridade 1 — Segurança crítica
- ✅ **1. Vazamento de campos na rota pública de aprovação**
  - `getPublicationByApprovalToken` agora usa `select` explícito (`PUBLIC_APPROVAL_SELECT`)
    e um DTO dedicado (`PublicApprovalPublication`), sem reusar `mapDbPubToPub`.
  - Removido o campo `responsibleUser` da UI pública (`app/publicacao/[id]/aprovacao/page.tsx`).
  - Não são mais expostos: organizationId, clientId, clientName, responsibleUser,
    imageFileName/imageMimeType/imageSize, archivedBy, imageSource.
- ✅ **2. Fallback inseguro de sandbox** — `lib/data-mode.ts` reescrito como fail-closed:
  default `database`; sandbox só com `NEXT_PUBLIC_DATA_MODE=sandbox` E fora de produção.

## Prioridade 2 — Performance
- ✅ **3. Memoização por request** — `lib/tenant.ts`: `getSession`, `getActiveOrganizationId`,
  `getOrResolveActiveOrganizationId`, `validateTenantAccess`, `isOperator` envoltos em `cache()`.
- ✅ **4/5. Server Component + client child, sem Zustand em modo database**
  - `app/publicacoes/page.tsx` virou Server Component: busca clients/members/publications
    em paralelo no servidor e passa como props (fim do waterfall client-side e do flash de vazio).
  - `PublicacoesView.tsx` (apresentacional, sem store) + `PublicacoesPageClient.tsx` (DB, sem
    import de Zustand) + `PublicacoesSandboxClient.tsx` (demo, com store).
  - Em produção o bundle nem carrega o store (code-splitting do Server Component).

## Prioridade 3 — Defesa em profundidade
- ✅ **6. Rate limiting** — `lib/rate-limit.ts` (fixed-window em memória, best-effort na Vercel);
  aplicado em `getPublicationByApprovalToken` (60/min/IP) e nas mutações públicas (10/min/IP).
- ✅ **7. Separação de operador** — `validatePlatformOperatorAccess()` novo helper; flag
  `viaOperatorBypass` na membership; audit logs de publicação marcam `[SIMULACAO_OPERADOR]`.
- ✅ **8. Backstop de auth** — `proxy.ts` (convenção Next 16, sucessora de `middleware`):
  verifica presença do cookie de sessão nas rotas internas; rotas públicas preservadas;
  no-op em modo sandbox.

## Prioridade 4 — Infra e dívida técnica
- ✅ **9. Connection pooling** — documentado em `.env.example` (DATABASE_URL pooled com
  `pgbouncer=true&connection_limit=1` + DIRECT_URL para migrations) e comentado em `lib/prisma.ts`.
  Schema NÃO alterado de propósito (evita forçar DIRECT_URL e quebrar `prisma migrate` local).
- ✅ **10. Propostas ainda mock** — comentário de dívida técnica no topo de `app/proposta/[id]/page.tsx`.
- ✅ **11. Audit log de aprovações externas** — ações públicas marcadas
  `[CLIENTE_EXTERNO/LINK_PUBLICO]`; ancoradas no responsável real da publicação (fallback:
  primeiro membro) em vez de membro arbitrário.
- ✅ **12. `.env.example`** — adicionadas `ALLOW_DESTRUCTIVE_SEED`, `SEED_OPERATOR_PASSWORD`,
  `SEED_CLIENT_PASSWORD` com aviso de nunca usar destrutivo em produção.

## Decisões / observações
- **Verificação**: `npx tsc --noEmit`, `npx eslint` e `npm run build` passando.
- **`responsibleUser` na tela pública**: removido conforme pedido; o bloco "Responsável"
  saiu da UI de aprovação (era o único uso do campo lá).
- **Sandbox preservado**: fluxo demo continua via Zustand no `PublicacoesSandboxClient`.
- **Rate limit** é em memória (por instância serverless). Suficiente como defesa best-effort;
  se precisar de limite forte e global, trocar o backend de `lib/rate-limit.ts` por Upstash
  mantendo a assinatura.
- **Audit log externo**: solução ideal (userId nullable + usuário "system") exige migration;
  ficou como follow-up para não rodar migration nesta sprint.
- **Follow-up sugerido**: aplicar o marcador `[SIMULACAO_OPERADOR]` também nos audit logs de
  `clientes`/`tarefas` (mesmo padrão já usado em publicações).

## Não feito de propósito (fora de escopo / risco)
- Não rodei migrations nem alterei o `schema.prisma`.
- Não migrei propostas/financeiro para o banco (apenas registrado como dívida).
