# Auditoria de performance — NV Hub

Data: 13 de agosto de 2026

## Resumo executivo

O maior gargalo de aplicação estava no caminho pós-login: o servidor validava a sessão, mas o cliente bloqueava a interface enquanto consultava novamente a sessão e disparava uma Server Action adicional para obter o contexto do tenant. Depois da hidratação, o dashboard ainda abria duas Server Actions independentes para clientes e tarefas.

O maior gargalo medido de infraestrutura é a conexão com o PostgreSQL no Railway. Cinco consultas read-only `SELECT 1`, executadas da máquina de desenvolvimento contra a conexão configurada, produziram:

```text
amostras: 2860,7 ms; 214,1 ms; 214,4 ms; 214,3 ms; 214,5 ms
mínimo:   214,1 ms
média:    743,6 ms
máximo:   2860,7 ms (primeira conexão/cold path)
```

Esses valores medem conectividade + execução mínima, não tempo de uma página. Eles mostram por que waterfalls de queries Vercel → Railway são especialmente caras.

## Caminho auditado

```text
Login
→ Better Auth
→ sessão
→ activeOrganizationId validado
→ membership/operador + organização + features
→ layout autenticado
→ dados da página
→ RSC/HTML
→ hidratação somente da UI interativa
```

## Gargalos encontrados

1. O layout validava a sessão no servidor e `DashboardClientLayout` repetia a consulta via `useSession()`, bloqueando tudo com spinner.
2. O `Sidebar` também consumia `useSession()` apesar de o nome e o papel já estarem disponíveis no contexto autenticado.
3. O contexto do tenant era carregado por Server Action em `useEffect`, adicionando um round trip após a hidratação.
4. O dashboard carregava clientes e tarefas em `useEffect`, portanto os dados só começavam a viajar depois de baixar e executar JavaScript.
5. Antes da mudança, o caminho lógico do dashboard executava aproximadamente 13 queries Prisma explícitas em vários requests, além das queries internas do Better Auth. O caminho atual executa aproximadamente 5 queries Prisma explícitas no render inicial, além do Better Auth. A contagem é derivada do código; Prisma query logging de produção não foi ativado.
6. `getTasks()` carregava objetos completos de cliente/usuário e todas as notas. O dashboard não usa notas.
7. Listagens de cliente e membro usavam resultados mais amplos que o DTO consumido.
8. O store Zustand de 120 KB persistia o estado sandbox completo em `localStorage` mesmo no modo database.
9. O efeito de parallax atualizava estado React em cada `mousemove`, rerenderizando o layout.
10. As páginas dinâmicas não tinham fallbacks dimensionais consistentes; navegações podiam manter a tela anterior sem feedback imediato.
11. A configuração local de `DATABASE_URL` aponta para Railway, mas não contém `pgbouncer=true`, não define `connection_limit` e não há `DIRECT_URL`.
12. O deployment respondeu com `X-Vercel-Id: gru1`, indicando execução em São Paulo nessa amostra. A região do Railway não está versionada no repositório e precisa ser conferida no painel.

## Alterações realizadas

| Arquivo | Problema | Solução | Impacto esperado |
|---|---|---|---|
| `lib/tenant-context-actions.ts` | Sessão, organização, membro, features e usuário eram resolvidos em fluxos separados | DTO autorizado e memoizado por render/request, com `select` explícito | Deduplicação segura dentro da request; tenant continua validado |
| `app/dashboard/layout.tsx` | Layout fazia sessão + query de usuário e o cliente repetia contexto | O servidor resolve sessão/contexto uma vez e passa apenas o DTO necessário | Remove round trips pós-hidratação e o bloqueio client-side |
| `hooks/useDatabaseTenantContext.tsx` | Contexto iniciava Server Action em `useEffect` | Provider recebe contexto server-first; fallback legado permanece para callers fora do layout | Contexto disponível na primeira renderização |
| `app/dashboard/page.tsx` + `DashboardPageClient.tsx` | Clientes/tarefas iniciavam após mount | Wrapper Server Component inicia as duas fontes em paralelo e entrega props | Dados começam no servidor, sem waterfall client-side |
| `app/clientes/actions.ts` | Query ampla e validações repetidas | Reutiliza contexto autorizado; `select` explícito; timings de query | Menos queries e payload menor |
| `app/tarefas/actions.ts` | Relações completas e notas desnecessárias no dashboard | `select` explícito e opção `includeNotes=false` no dashboard | Menos leitura, serialização e payload RSC |
| `app/publicacoes/page.tsx` e `actions.ts` | Faltava timing total/isolado e contexto ainda repetia validações | Timings estruturados e reutilização do contexto autorizado | Diagnóstico objetivo e uma cadeia menor de validação |
| `PublicacoesView.tsx` | Todas as thumbnails tinham a mesma prioridade | Primeiras imagens eager/high; demais lazy; decoding assíncrono | LCP visual prioritário sem disputar toda a banda |
| `lib/store.ts` | Estado sandbox completo persistido no modo database | Persistência database-mode limitada a `isSidebarCollapsed` em uma chave separada | Menos JSON parse, merge e hidratação de dados mock |
| `DashboardClientLayout.tsx` | `mousemove` causava rerender do layout | `requestAnimationFrame` + atualização direta do transform | Menos trabalho na main thread |
| `loading.tsx` + `page-loading-skeleton.tsx` | Feedback bloqueante/genérico | Skeletons dimensionais de dashboard e listagem | Navegação responsiva e menor CLS |
| `lib/performance.ts` | Sem visibilidade de tempos | Logs JSON estruturados, sem IDs, emails, tokens ou payloads | Timings comparáveis em dev/Preview |
| `scripts/measure-db-latency.mjs` | Sem baseline simples de conectividade | Cinco `SELECT 1` read-only via `npm run perf:db` | Diagnóstico repetível de cold/warm connection |

## Instrumentação

Em desenvolvimento, os logs estão ativos. Em Preview/produção, habilite temporariamente:

```text
PERF_LOGGING=1
```

Os eventos emitidos incluem:

```text
auth/session
organization/active-validation
organization/membership-resolution
tenant/context-query
app/layout-auth-context
clients/query
members/query
tasks/query
dashboard/data-total
publications/query
publications/data-total
```

Exemplo de log:

```json
{"event":"nvhub.performance","name":"clients/query","durationMs":214.3,"status":"ok","includeArchived":false}
```

Nenhum log contém `organizationId`, `userId`, email, token, filtros livres ou dados de negócio.

## Antes e depois

Não há números honestos de página antes/depois nesta máquina: o ambiente local está explicitamente em sandbox e o navegador disponível não tinha sessão no deployment database-mode. Por isso não foram atribuídos tempos fictícios a dashboard ou publicações.

Comparação estrutural verificável do dashboard:

```text
ANTES
- render server-side de auth
- nova consulta de sessão no cliente
- Server Action de tenant após hidratação
- Server Action de clientes após hidratação
- Server Action de tarefas após hidratação
- ~13 queries Prisma explícitas em múltiplos requests + Better Auth

DEPOIS
- auth + contexto no render server-side
- clientes e tarefas iniciados em paralelo no servidor
- nenhuma consulta de sessão/contexto no mount do layout/sidebar
- ~5 queries Prisma explícitas no render inicial + Better Auth
```

## Prisma e índices

Não foi criada migration. Os índices atuais já cobrem os filtros frequentes comprovados:

- cliente: organização e organização + status;
- tarefa: organização + status, dueDate, clientId e assignedUserId;
- publicação: organização, organização + status e token único;
- membership: organização + usuário único.

Candidatos como `(organizationId, createdAt)` só devem ser adicionados depois de coletar `EXPLAIN (ANALYZE, BUFFERS)` com volume representativo. A latência mínima medida (~214 ms) é de rede/conexão e não seria eliminada por um índice.

## Client Components e Zustand

Foram encontrados 39 arquivos client-side. Classificação prioritária:

- **Necessários:** controles de formulário/modal, filtros, calendário, dropdown, tema, sidebar móvel e a view interativa de publicações.
- **Provavelmente necessários hoje:** páginas operacionais ainda acopladas ao sandbox (`leads`, `propostas`, `contratos`, `financeiro`, `tarefas`, `clientes`).
- **Podem ganhar wrapper Server Component:** `clientes`, `tarefas`, `empresas` e detalhes de cliente, seguindo o padrão aplicado a dashboard/publicações.

Remover `use client` desses módulos sem separar a view interativa do carregamento server-side causaria uma refatoração grande. A mudança desta rodada foi deliberadamente incremental.

## Infraestrutura — ações manuais

### Vercel

1. Confirmar que a Function Region permanece `gru1`/São Paulo para as rotas dinâmicas.
2. Habilitar `PERF_LOGGING=1` apenas em Preview durante a coleta e filtrar por `nvhub.performance`.
3. Executar login → dashboard → clientes → publicações e registrar p50/p95 de cada evento; depois desabilitar a flag.

### Railway

1. Conferir a região do serviço PostgreSQL e colocá-la o mais perto possível de `gru1`.
2. Usar o endpoint pooled/PgBouncer na `DATABASE_URL` das Functions.
3. Configurar limite de conexão apropriado ao serverless. O repositório sugere `pgbouncer=true&connection_limit=1`, mas valide o formato exato do endpoint no painel Railway atual.
4. Manter uma URL direta separada para migrations.

### Prisma/PostgreSQL

1. Após criar a variável `DIRECT_URL`, adicionar `directUrl = env("DIRECT_URL")` ao datasource em uma mudança separada e validar `prisma migrate status`.
2. Não aplicar migration de índice sem `EXPLAIN ANALYZE` em um dataset representativo.
3. Monitorar conexões ativas e cold starts depois de habilitar pooling.

## Validação executada

- `npx tsc --noEmit`: passou.
- `npm run lint`: passou.
- `npm run build`: passou com Next.js 16.2.9 e Prisma 6.19.3.
- Navegação local `/login → /dashboard → /publicacoes`: validada visual e semanticamente no modo sandbox.
- `npm run perf:db`: passou; somente cinco `SELECT 1`, sem leitura ou alteração de dados de negócio.
