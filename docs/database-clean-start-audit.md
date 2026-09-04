# Relatório de Auditoria da Camada de Banco de Dados & Plano de Migração Clean Start (Railway → Supabase)

**Projeto:** NV Hub  
**Origem:** PostgreSQL na Railway  
**Destino:** PostgreSQL no Supabase (Região South America / São Paulo `sa-east-1`)  
**Data da Auditoria:** 31 de Agosto de 2026  
**Status da Execução:** AUDITORIA 100% READ-ONLY (Nenhum arquivo, banco ou variável foi modificado)  
**Recomendação Global:** **GO COM AJUSTES**

---

## 1. Resumo Executivo

O NV Hub é uma aplicação Next.js (App Router, versão 16.2.9) com banco de dados PostgreSQL acessado via Prisma ORM (versão 6.19.3) e autenticação/tenancy gerenciados pelo Better Auth (versão 1.6.23).

A infraestrutura atual está hospedada na Vercel (runtime serverless) conectando-se a um PostgreSQL na Railway. O banco possui pouquíssimos registros de produção (1 operador ativo e poucos posts de teste/aprovação).

A decisão de realizar uma migração **Clean Start** para o Supabase (usando o Supabase **estritamente como PostgreSQL**, sem Supabase Auth, sem Supabase Storage, sem Data API e sem RLS) é **tecnicamente viável, segura e altamente vantajosa**. Ela elimina remendos históricos de migrations do período de prototipagem e permite corrigir lacunas críticas de índices e configuração de pooler antes de colocar o sistema sob carga.

---

## 2. Arquitetura Atual

```mermaid
flowchart TD
    subgraph Vercel ["Vercel (Serverless Edge & Node.js)"]
        UI["Next.js 16 UI / Pages"]
        Proxy["proxy.ts (Auth Backstop)"]
        Actions["Server Actions (clientes, publicações, etc.)"]
        BA["Better Auth API (/api/auth/*)"]
        PrismaCl["Prisma Client 6.19 Singleton (lib/prisma.ts)"]
    end

    subgraph CurrentDB ["Atual: Railway"]
        RailwayPG[("PostgreSQL Railway")]
    end

    subgraph TargetDB ["Destino: Supabase (São Paulo - sa-east-1)"]
        Supavisor["Transaction Pooler (Porta 6543)"]
        DirectConn["Direct / Session Connection (Porta 5432)"]
        SupabasePG[("PostgreSQL 15+ Engine")]
    end

    UI --> Proxy
    Proxy --> Actions
    Actions --> BA
    Actions --> PrismaCl
    BA --> PrismaCl
    PrismaCl -.->|Atual: Conexão Direta/Proxy TCP| RailwayPG
    PrismaCl ===>|Proposto: DATABASE_URL pooled| Supavisor
    Supavisor ===> SupabasePG
    DirectConn -.->|Apenas Migrations: DIRECT_URL| SupabasePG
```

---

## 3. Inventário da Camada de Banco

### 3.1 Stack de Banco e Drivers
- **ORM:** Prisma CLI e `@prisma/client` na versão `^6.19.3`.
- **Banco:** PostgreSQL.
- **Auth Adapter:** `@better-auth/prisma-adapter` integrado via `lib/auth.ts`.
- **Wrapper / Singleton:** `lib/prisma.ts` implementa o padrão Singleton global para evitar conexões excessivas no hot-reload de desenvolvimento.
- **Client Latency Script:** `scripts/measure-db-latency.mjs` (comando `npm run perf:db`).

### 3.2 Inventário de Arquivos Relacionados
- **Schema:** `prisma/schema.prisma` (295 linhas, 13 models).
- **Config:** Não existe `prisma.config.ts`.
- **Migrations:** Pasta `prisma/migrations` com 7 migrations e `migration_lock.toml`.
- **Seed:** `prisma/seed.ts`.
- **Auth & Tenant Helpers:**
  - `lib/prisma.ts`
  - `lib/auth.ts`
  - `lib/tenant.ts`
  - `lib/tenant-context-actions.ts`
  - `lib/data-mode.ts`
  - `lib/rate-limit.ts`
  - `proxy.ts`
- **Server Actions com Queries de Banco:**
  - `app/clientes/actions.ts`
  - `app/empresas/actions.ts`
  - `app/publicacoes/actions.ts`
  - `app/tarefas/actions.ts`
  - `app/primeiro-acesso/actions.ts`
- **Route Handlers:**
  - `app/api/auth/[...better-auth]/route.ts`
- **Crons / Background Jobs:** Nenhum cron registrado no código.

### 3.3 Variáveis de Ambiente Utilizadas (Sem Exibir Secrets)
| Variável | Onde é Utilizada | Finalidade |
| :--- | :--- | :--- |
| `DATABASE_URL` | `schema.prisma`, `lib/auth.ts`, `prisma/seed.ts`, `scripts/measure-db-latency.mjs` | String de conexão principal com o PostgreSQL (para runtime/queries). |
| `DIRECT_URL` | Documentada em `.env.example` (ausente no `schema.prisma` atual) | Conexão direta sem pooler, essencial para o Prisma CLI aplicar migrations. |
| `BETTER_AUTH_SECRET` | `lib/auth.ts` | Chave simétrica para assinatura de cookies e tokens de sessão. |
| `BETTER_AUTH_URL` | `lib/auth.ts` | URL base do backend de autenticação. |
| `NEXT_PUBLIC_APP_URL` | `lib/auth.ts` | Origem confiável para CORS / redirects do Better Auth. |
| `NEXT_PUBLIC_DATA_MODE` | `lib/data-mode.ts` | Força modo `sandbox` (demo em memória) exclusivamente fora de produção. |
| `PERF_LOGGING` | `lib/performance.ts` | Habilita logs detalhados de Server-Timing em preview/dev. |
| `ALLOW_DESTRUCTIVE_SEED` | `prisma/seed.ts` | Flag de segurança do seed para autorizar limpeza prévia de tabelas. |
| `SEED_OPERATOR_PASSWORD` | `prisma/seed.ts` | Senha inicial customizada do operador para execução de seed. |
| `SEED_CLIENT_PASSWORD` | `prisma/seed.ts` | Senha inicial customizada do cliente para execução de seed. |

---

## 4. Auditoria Completa do Schema.prisma

### 4.1 Model por Model

#### 1. `User` (Tabela `"user"`)
- **Finalidade:** Entidade central de usuário (Better Auth + papéis de plataforma NV Hub).
- **PK:** `id String @id @default(uuid())`
- **Relações:** `sessions Session[]`, `accounts Account[]`, `memberships Member[]`, `auditLogs AuditLog[]`, `assignedTasks Task[]`, `taskNotes TaskNote[]`.
- **FKs:** Nenhuma.
- **Constraints / Unique:** `email @unique`.
- **Índices:** PK (`id`) e `email`.
- **Defaults:** `emailVerified: false`, `mustChangePassword: false`, `createdAt: now()`.
- **Timestamps:** `createdAt`, `updatedAt`, `passwordChangedAt DateTime?`.
- **Nullable:** `image`, `platformRole`, `passwordChangedAt`.
- **Cascades:** Referenciado com `Cascade` por `Session`, `Account`, `Member`, `AuditLog`. Referenciado com `SetNull` por `Task` e `TaskNote`.

#### 2. `Session` (Tabela `"session"`)
- **Finalidade:** Sessões ativas de login do Better Auth.
- **PK:** `id String @id @default(uuid())`
- **Relações:** `user User` (`userId -> user.id`, `onDelete: Cascade`).
- **FKs:** `userId`.
- **Constraints / Unique:** `token @unique`.
- **Índices:** PK (`id`) e `token`. **[ALTO] Falta índice em `userId` e em `expiresAt`**.
- **Defaults:** `createdAt: now()`.
- **Timestamps:** `createdAt`, `updatedAt`, `expiresAt`.
- **Nullable:** `ipAddress`, `userAgent`, `activeOrganizationId`.
- **Cascades:** `onDelete: Cascade, onUpdate: Cascade`.

#### 3. `Account` (Tabela `"account"`)
- **Finalidade:** Contas de credenciais/senhas ou provedores OAuth vinculados ao usuário.
- **PK:** `id String @id @default(uuid())`
- **Relações:** `user User` (`userId -> user.id`, `onDelete: Cascade`).
- **FKs:** `userId`.
- **Constraints / Unique:** Nenhuma constraint única além da PK. **[CRÍTICO] Falta `@@unique([providerId, accountId])` ou índice composto**.
- **Índices:** Apenas PK. **[ALTO] Falta índice em `userId`**.
- **Defaults:** `createdAt: now()`.
- **Timestamps:** `createdAt`, `updatedAt`, `accessTokenExpiresAt`, `refreshTokenExpiresAt`.
- **Nullable:** `accessToken`, `refreshToken`, `idToken`, `accessTokenExpiresAt`, `refreshTokenExpiresAt`, `scope`, `password`.
- **Cascades:** `onDelete: Cascade`.

#### 4. `Verification` (Tabela `"verification"`)
- **Finalidade:** Tokens de verificação de e-mail e redefinição de senha do Better Auth.
- **PK:** `id String @id @default(uuid())`
- **Relações / FKs:** Nenhuma.
- **Constraints / Unique:** Nenhuma constraint única no schema.
- **Índices:** Apenas PK. **[MÉDIO] Falta índice em `identifier`**.
- **Defaults:** `createdAt: now()`.
- **Timestamps:** `createdAt`, `updatedAt`, `expiresAt`.
- **Nullable:** Nenhum.

#### 5. `Organization` (Tabela `"organization"`)
- **Finalidade:** Entidade de Workspace / Tenant do SaaS.
- **PK:** `id String @id @default(uuid())`
- **Relações:** `members`, `invitations`, `features`, `auditLogs`, `clients`, `tasks`, `taskNotes`, `publications`.
- **FKs:** Nenhuma.
- **Constraints / Unique:** `slug @unique`.
- **Índices:** PK (`id`) e `slug`.
- **Defaults:** `planId: "starter"`, `isActive: true`, `createdAt: now()`.
- **Timestamps:** `createdAt`, `updatedAt`, `archivedAt`.
- **Nullable:** `logo`, `archivedAt`, `archivedBy`.
- **Cascades:** Deleta em cascata todos os dados vinculados ao tenant.

#### 6. `Member` (Tabela `"member"`)
- **Finalidade:** Tabela associativa N:N Usuário ↔ Organização com papel (`role`).
- **PK:** `id String @id @default(uuid())`
- **Relações:** `organization Organization`, `user User`.
- **FKs:** `organizationId -> Organization.id`, `userId -> User.id`.
- **Constraints / Unique:** `@@unique([organizationId, userId])`.
- **Índices:** Composite unique `[organizationId, userId]`. **[ALTO] Falta índice isolado em `userId`** (necessário para listar organizações de um usuário sem varredura completa da tabela).
- **Defaults:** `createdAt: now()`.
- **Timestamps:** `createdAt`, `updatedAt`.
- **Nullable:** Nenhum.
- **Cascades:** `onDelete: Cascade` para ambas as FKs.

#### 7. `Invitation` (Tabela `"invitation"`)
- **Finalidade:** Convites de novos membros para organizações.
- **PK:** `id String @id @default(uuid())`
- **Relações:** `organization Organization`.
- **FKs:** `organizationId -> Organization.id`.
- **Constraints / Unique:** Nenhuma.
- **Índices:** Apenas PK. **[MÉDIO] Falta índice em `organizationId` e `email`**.
- **Defaults:** `createdAt: now()`.
- **Timestamps:** `createdAt`, `updatedAt`, `expiresAt`.
- **Nullable:** Nenhum.
- **Cascades:** `onDelete: Cascade`.

#### 8. `OrganizationFeature` (Tabela `"organization_feature"`)
- **Finalidade:** Feature toggles por organização (1:1 com Organization).
- **PK:** `id String @id @default(uuid())`
- **Relações:** `organization Organization`.
- **FKs:** `organizationId -> Organization.id`.
- **Constraints / Unique:** `organizationId @unique`.
- **Índices:** PK e `organizationId`.
- **Defaults:** Módulos padrão como `true`, `financial: false`.
- **Timestamps:** Nenhum timestamp (`createdAt`/`updatedAt` ausentes).
- **Nullable:** Nenhum.
- **Cascades:** `onDelete: Cascade`.

#### 9. `AuditLog` (Tabela `"audit_log"`)
- **Finalidade:** Trilha de auditoria e segurança por tenant e usuário.
- **PK:** `id String @id @default(uuid())`
- **Relações:** `organization Organization`, `user User`.
- **FKs:** `organizationId -> Organization.id`, `userId -> User.id`.
- **Constraints / Unique:** Nenhuma.
- **Índices:** Apenas PK. **[CRÍTICO] Ausência total de índices em `organizationId`, `userId`, `target` e `createdAt`**.
- **Defaults:** `createdAt: now()`.
- **Timestamps:** `createdAt`.
- **Nullable:** `target`, `ipAddress`, `userAgent`.
- **Cascades:** `onDelete: Cascade`.

#### 10. `Client` (Tabela `"client"`)
- **Finalidade:** Cadastro de empresas/clientes atendidos no CRM do tenant.
- **PK:** `id String @id @default(uuid())`
- **Relações:** `organization Organization`, `tasks Task[]`, `publications Publication[]`.
- **FKs:** `organizationId -> Organization.id`.
- **Constraints / Unique:** Nenhuma.
- **Índices:** `@@index([organizationId])`, `@@index([organizationId, status])`.
- **Defaults:** `status: "active"`, `createdAt: now()`.
- **Timestamps:** `createdAt`, `updatedAt`, `archivedAt`.
- **Nullable:** `document`, `documentType`, `contactName`, `email`, `phone`, `notes`, `responsibleUser`, `archivedAt`.
- **Cascades:** `onDelete: Cascade` (da Organization).

#### 11. `Task` (Tabela `"task"`)
- **Finalidade:** Tarefas operacionais da equipe vinculadas ao tenant e opcionalmente a clientes/usuários.
- **PK:** `id String @id @default(uuid())`
- **Relações:** `organization Organization`, `client Client?`, `assignedUser User?`, `notes TaskNote[]`.
- **FKs:** `organizationId`, `clientId`, `assignedUserId`.
- **Constraints / Unique:** Nenhuma.
- **Índices:** Bem modelados: `[organizationId]`, `[organizationId, status]`, `[organizationId, dueDate]`, `[organizationId, clientId]`, `[organizationId, assignedUserId]`.
- **Defaults:** `status: "pending"`, `priority: "medium"`, `createdAt: now()`.
- **Timestamps:** `createdAt`, `updatedAt`, `dueDate`, `completedAt`, `archivedAt`.
- **Nullable:** `clientId`, `assignedUserId`, `description`, `dueDate`, `completedAt`, `archivedAt`.
- **Cascades:** Org: `Cascade`, Client: `SetNull`, User: `SetNull`.

#### 12. `TaskNote` (Tabela `"task_note"`)
- **Finalidade:** Observações e histórico de comentários em tarefas.
- **PK:** `id String @id @default(uuid())`
- **Relações:** `organization Organization`, `task Task`, `authorUser User?`.
- **FKs:** `organizationId`, `taskId`, `authorUserId`.
- **Constraints / Unique:** Nenhuma.
- **Índices:** `[organizationId]`, `[taskId]`, `[authorUserId]`.
- **Defaults:** `createdAt: now()`.
- **Timestamps:** `createdAt`.
- **Nullable:** `authorUserId`.
- **Cascades:** Org: `Cascade`, Task: `Cascade`, User: `SetNull`.

#### 13. `Publication` (Tabela `"publication"`)
- **Finalidade:** Conteúdos e posts de mídia para aprovação externa por link público.
- **PK:** `id String @id @default(uuid())`
- **Relações:** `organization Organization`, `client Client?`.
- **FKs:** `organizationId`, `clientId`.
- **Constraints / Unique:** `approvalToken @unique`.
- **Índices:** `[organizationId]`, `[organizationId, status]`, `[approvalToken]`.
- **Defaults:** `postType: "single_image"`, `status: "pending_approval"`, `approvalToken: uuid()`, `createdAt: now()`.
- **Timestamps:** `createdAt`, `updatedAt`, `archivedAt`.
- **Nullable:** `clientId`, `clientName`, `companyName`, `imageUrl`, `images` (Json), `clientComments`, `imageSource`, `imageFileName`, `imageSize`, `imageMimeType`, `archivedAt`, `archivedBy`, `channels` (Json).
- **Cascades:** Org: `Cascade`, Client: `SetNull`.

---

## 5. Auditoria de Tenancy

### 5.1 Mecânica de Isolamento
1. **Tenant Root:** O tenant é modelado pela tabela `Organization` (`organization`).
2. **Associação de Usuários:** Usuários conectam-se às organizações através da tabela `Member` com papel atribuído (`owner`, `admin`, `member`, `viewer`).
3. **Resolução de Contexto:** 
   - `lib/tenant.ts` busca a sessão do Better Auth.
   - `getOrResolveActiveOrganizationId` lê `session.activeOrganizationId`. Se nulo, busca a primeira membership ativa do usuário e persiste na sessão.
   - Chamadas subsequentes no mesmo ciclo de renderização são aceleradas pelo React `cache()`.
4. **Verificação de Autorização:** A função `validateTenantAccess(organizationId)` verifica se o usuário logado possui registro em `Member` para a organização correspondente antes de executar mutações ou queries.
5. **Operador da Plataforma (Simulação):** Operadores com `platformRole: "operator"` ou `"platform_admin"` recebem bypass controlado para suporte/administração, marcando a membership com `viaOperatorBypass: true` e gerando logs com prefixo `[SIMULACAO_OPERADOR]`.

### 5.2 Avaliação de Risco de Vazamento (Cross-Tenant Leakage)
- **Queries Internas:** Todas as server actions inspecionadas (`clientes/actions.ts`, `tarefas/actions.ts`, `publicacoes/actions.ts`) aplicam o filtro `organizationId: activeOrgId`. Não foi identificado bypass acidental em chamadas internas autenticadas.
- **Índices Tenant-Scoped:** `Client`, `Task`, `TaskNote` e `Publication` possuem índices compostos começando por `organizationId`.
- **Lacuna Identificada em AuditLog:** A tabela `AuditLog` é consultada em `getClientProfileDbData` com `where: { target: clientId, organizationId: activeOrgId }`. Como `AuditLog` não possui índice em `organizationId` nem em `target`, essa query realiza varredura sequencial na tabela inteira.

---

## 6. Auditoria de Autenticação

### 6.1 Sistema Atual
- O projeto utiliza **Better Auth** (`better-auth` v1.6.23) conectado via Prisma Adapter (`@better-auth/prisma-adapter`).
- Provedor configurado: `emailAndPassword` com senhas hashadas via `better-auth/crypto` (`hashPassword` com Scrypt/Argon2 nativo do Better Auth).
- Sessões: Gerenciadas via cookies (`better-auth.session_token`) mapeados na tabela `Session`.
- **Compatibilidade com Supabase:** O Better Auth utiliza o PostgreSQL puramente como repositório relacional padrão. **Não há dependência do Supabase Auth nem de triggers do Postgres**.
- **Requisitos para o Banco Novo:** O schema do Better Auth precisa apenas ser recriado fielmente (tabelas `user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`).

---

## 7. Auditoria dos Links Públicos de Aprovação

### 7.1 Arquitetura da Aprovação Pública
- **Entidade:** `Publication` (`publication`).
- **Geração do Token:** Gerado via `generateShortToken()` usando `crypto.randomBytes(12)` + timestamp em base36 (exemplo: `approval_m2k9f1a_aB3dE8...`).
- **Segurança contra Adivinhação / Força Bruta:**
  - Espaço de busca: 12 caracteres alfanuméricos aleatórios = $62^{12} \approx 3.2 \times 10^{21}$ possibilidades.
  - Impossível de ser enumerado.
- **Proteção contra Varredura (Rate Limiting):**
  - Implementado em `lib/rate-limit.ts` (fixed-window em memória por IP).
  - Leitura pública (`getPublicationByApprovalToken`): 60 req/min por IP.
  - Mutação pública (`approvePublicationByTokenAction` / `requestPublicationChangesByTokenAction`): 10 req/min por IP.
- **Proteção contra Data Leakage:**
  - O DTO público utiliza `PUBLIC_APPROVAL_SELECT`, expondo estritamente: `id`, `companyName`, `caption`, `scheduledDate`, `status`, `approvalToken`, `clientComments`, `platform`, `postType`, `images`, `imageUrl`, `channels`, `archivedAt`, `createdAt`.
  - Campos sensíveis como `organizationId`, `clientId`, `responsibleUser`, `imageFileName`, `imageSize`, `imageMimeType` e `archivedBy` **não são expostos**.
- **Expiração:** Validade de 24h calculada em tempo real com base no timestamp do token ou `createdAt`. Links expirados bloqueiam aprovação e exibem tela amigável.
- **Regeneração:** Ação `regeneratePublicationApprovalLinkAction` permite ao operador gerar novo token invalidando o anterior.

---

## 8. Auditoria do Histórico de Migrations

### 8.1 Linha do Tempo das Migrations Existentes

| Migration | Objeto / Ação | Análise Técnica |
| :--- | :--- | :--- |
| `20260702205839_init_saas` | Criação de tabelas base: `user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`, `organization_feature`, `audit_log`. | Estrutura inicial do Better Auth e SaaS core. |
| `20260703012310_add_client_model` | Criação da tabela `client`. | Model de clientes. |
| `20260703012408_add_responsible_user_to_client` | `ALTER TABLE client ADD COLUMN responsibleUser` | **Remendo imediato (58s depois)** da migration anterior. |
| `20260703013336_add_task_models` | Criação das tabelas `task` e `task_note`. | Models de tarefas e comentários. |
| `20260703165426_add_admin_user_security` | `ALTER TABLE organization ADD archivedAt, archivedBy`; `ALTER TABLE user ADD mustChangePassword, passwordChangedAt`. | Campos de segurança e arquivamento adicionados posteriormente. |
| `20260703205531_add_publications` | Criação da tabela `publication`. | Model de publicações e aprovação. |
| `20260703214813_add_publication_management_fields` | `ALTER TABLE publication ADD archivedAt, archivedBy, channels` | **Remendo imediato (53 min depois)** da migration de publicações. |

### 8.2 Diagnóstico do Histórico
O histórico atual contém 7 migrations geradas em ambiente de prototipagem, incluindo adições pontuais de colunas minutos após a criação das tabelas.

> **Conclusão:** Para um banco Supabase virgem, **NÃO faz sentido reproduzir essas 7 migrations incrementais**. Uma **baseline consolidada limpa** (`0_init_clean`) simplifica o histórico do Git, agiliza a execução do `prisma migrate deploy` e garante integridade DDL imediata.

---

## 9. Problemas Encontrados no Schema Atual

| Classificação | Item | Descrição Técnica | Impacto |
| :--- | :--- | :--- | :--- |
| **CRÍTICO** | Índices Ausentes em `AuditLog` | `AuditLog` não possui índices em `organizationId`, `userId`, `target` nem `createdAt`. | Sequential Scan em toda a tabela de auditoria ao carregar histórico de clientes (`app/clientes/actions.ts:475`). |
| **ALTO** | Falta de índice em `Member(userId)` | `Member` possui apenas `@@unique([organizationId, userId])`. | Consultas que filtram por `userId` (como resolução de tenant do usuário logado) não utilizam o índice adequadamente. |
| **ALTO** | Falta de índice em `Session(userId)` | `Session` possui índice apenas em `token`. | Buscas por sessões de um usuário específico e limpezas realizam scan na tabela `session`. |
| **ALTO** | Falta de Unique/Índice em `Account(providerId, accountId)` e `Account(userId)` | `Account` não possui índice em `userId` nem constraint em `[providerId, accountId]`. | Atualizações de credenciais (`updateMany`) e lookups do Better Auth realizam scan sequencial. |
| **MÉDIO** | `DIRECT_URL` ausente no `schema.prisma` | `schema.prisma` possui apenas `url = env("DATABASE_URL")`. | Ao apontar `DATABASE_URL` para o Transaction Pooler do Supabase (porta 6543), o comando `prisma migrate` falhará por falta de conexão direta (`directUrl`). |
| **MÉDIO** | Falta de índice em `Verification(identifier)` | Tabela `verification` sem índices além da PK. | Lookups de verificação de token/email no Better Auth sem otimização. |
| **BAIXO** | Índice redundante em `Publication(approvalToken)` | `approvalToken` possui `@unique` (que já cria índice único B-tree no Postgres) e simultaneamente `@@index([approvalToken])`. | Duplicação desnecessária de índice no PostgreSQL (overhead mínimo de gravação). |
| **INFORMATIVO** | Módulos Mock (Store Zustand) | `Lead`, `Proposal`, `Contract`, `Charge`, `Onboarding`, `FinancialEntry` estão apenas nos types/store, sem tabelas no Prisma. | Comportamento esperado nesta fase (fora do escopo da migração atual de banco). |

---

## 10. Melhorias Recomendadas no Schema.prisma

Para aplicar na baseline limpa do Supabase:

1. **Adicionar `directUrl` ao `datasource db`:**
   ```prisma
   datasource db {
     provider  = "postgresql"
     url       = env("DATABASE_URL")
     directUrl = env("DIRECT_URL")
   }
   ```
2. **Adicionar índices de performance em `Member` e `Session`:**
   - Em `Member`: `@@index([userId])`
   - Em `Session`: `@@index([userId])`
3. **Adicionar índice e constraint em `Account`:**
   - Em `Account`: `@@index([userId])` e `@@unique([providerId, accountId])`
4. **Adicionar índices em `AuditLog`:**
   - Em `AuditLog`: `@@index([organizationId])`, `@@index([organizationId, target])`, `@@index([organizationId, createdAt])`
5. **Remover índice redundante em `Publication`:**
   - Remover `@@index([approvalToken])` mantendo `approvalToken String @unique @default(uuid())`.

---

## 11. Comparação entre as 3 Estratégias de Migração

| Critério | Estratégia A: Deploy das 7 Migrations Antigas | Estratégia B: Baseline Limpa do Schema Atual | Estratégia C: Ajustes de Índices + Baseline Limpa *(Recomendada)* |
| :--- | :--- | :--- | :--- |
| **Descrição** | Rodar `prisma migrate deploy` com as 7 pastas históricas no Supabase vazio. | Apagar pasta migrations, gerar 1 migration limpa do schema atual. | Ajustar `directUrl` e índices no `schema.prisma`, depois gerar 1 migration baseline limpa. |
| **Benefícios** | Não mexe em arquivos de migration. | Limpa o histórico de rascunhos. | Banco novo nasce no Supabase 100% otimizado, sem dívida técnica e compatível com o pooler. |
| **Riscos** | Carrega remendos; falhará sem `DIRECT_URL` se o pooler estiver ativo. | Mantém a falta de índices críticos em `audit_log`, `session`, etc. | Mínimo (testado localmente antes do deploy). |
| **Complexidade** | Baixa | Baixa | Baixa |
| **Manutenção Futura** | Ruim (histórico sujo) | Boa | **Excelente** |
| **Risco de Divergência** | Médio | Baixo | **Nulo** |

> **Recomendação Técnica:** **Estratégia C**. Como o banco Supabase está vazio e não faremos dump de dados legados, iniciar com o schema corrigido e uma migration baseline única é a melhor prática recomendada para estabilidade e performance.

---

## 12. Configuração Recomendada: Supabase + Prisma 6.19 + Vercel

### 12.1 Arquitetura de Conexões e Pooler

O Supabase fornece dois modos de conexão através do Supavisor:
1. **Transaction Pooler (Porta 6543):** Para o runtime serverless na Vercel.
2. **Direct Connection / Session Pooler (Porta 5432):** Para CLI/migrations do Prisma.

```mermaid
flowchart LR
    subgraph VercelRuntime ["Vercel Serverless (Runtime)"]
        ClientApp["Prisma Client"]
    end

    subgraph PrismaCLI ["Prisma CLI / CI-CD / Dev Local"]
        MigrateCmd["prisma migrate deploy"]
    end

    subgraph SupabaseInfra ["Supabase PostgreSQL (São Paulo)"]
        Pooler["Supavisor Transaction Pooler (:6543)"]
        Direct["Direct Connection (:5432)"]
        PGCore[("PostgreSQL 15+ Core")]
    end

    ClientApp -->|"DATABASE_URL (?pgbouncer=true&connection_limit=1)"| Pooler
    Pooler --> PGCore
    MigrateCmd -->|"DIRECT_URL"| Direct
    Direct --> PGCore
```

### 12.2 Configuração das Variáveis de Conexão

1. **`DATABASE_URL` (Runtime / Vercel Serverless):**
   - Aponta para o **Transaction Pooler** do Supabase na porta `6543`.
   - **Obrigatório incluir:** `?pgbouncer=true&connection_limit=1`
   - Formato:
     `postgresql://postgres.[PROJECT_REF]:[DB_PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1`
   - *Por que `pgbouncer=true`?* Desativa o cache de Prepared Statements no Prisma Client, evitando conflitos quando o Supavisor/PgBouncer alterna sessões entre requisições serverless.
   - *Por que `connection_limit=1`?* Cada função serverless na Vercel abre no máximo 1 conexão com o pooler, impedindo saturação em picos de tráfego.

2. **`DIRECT_URL` (Prisma CLI / Migrations):**
   - Aponta para a **Direct Connection** na porta `5432` (ou Session Pooler na porta `5432` caso a rede local não disponha de suporte nativo a IPv6).
   - Formato Direct:
     `postgresql://postgres:[DB_PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres`
   - Formato Session Pooler (IPv4 compatível):
     `postgresql://postgres.[PROJECT_REF]:[DB_PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres`

---

## 13. Estratégia de Dados Mínimos e Proposta de Seed Idempotente

### 13.1 Classificação dos Dados
- **DADOS DE SISTEMA (Mandatórios):**
  - Organização raiz da plataforma: `slug: "nv-hub-admin"`, `planId: "enterprise"`.
  - Registro de `OrganizationFeature` associado.
  - Usuário Operador / Platform Admin: `operator@nvhub.com.br`, `platformRole: "operator"`.
  - Conta de credenciais (`Account`) com hash seguro.
  - Vínculo `Member` (`role: "owner"`) entre Operador e Organização Admin.
- **DADOS DE NEGÓCIO (Produção):**
  - Organização do cliente / agência real: `slug: "power-ponto"`, `planId: "pro"`.
  - Registro de `OrganizationFeature` associado.
  - Usuário Administrador da agência: `admin@demo.nvhub.com.br` (ou email real do usuário).
  - Vínculo `Member` (`role: "owner"`).
- **DADOS OPCIONAIS (Demonstração / Testes):**
  - Clientes de teste, Tarefas de exemplo, Publicações de exemplo.

### 13.2 Proposta de Seed Idempotente (`prisma/seed.ts`)
O novo seed proposto:
- **Não utiliza `deleteMany`** em tabelas (elimina o risco de perda acidental de dados).
- Utiliza `prisma.organization.upsert`, `prisma.user.upsert` e `prisma.account.upsert`.
- Permite rodar `npx prisma db seed` múltiplas vezes com total segurança.
- Gera senhas temporárias seguras impressas no terminal apenas quando variáveis de ambiente não forem informadas.

---

## 14. Plano Completo de Cutover (Railway → Supabase)

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Engenheiro / Operador
    participant Local as Ambiente Local
    participant Supabase as Supabase (São Paulo)
    participant Vercel as Vercel (Preview / Prod)
    participant Railway as Railway (Legado)

    Note over Dev,Railway: FASE DE PREPARAÇÃO & HOMOLOGAÇÃO
    Dev->>Local: 1. Ajustar schema.prisma (directUrl + índices)
    Dev->>Local: 2. Criar baseline única (prisma migrate dev --name init_clean)
    Dev->>Local: 3. Configurar .env local com credenciais Supabase
    Local->>Supabase: 4. Aplicar baseline limpa (prisma migrate deploy)
    Local->>Supabase: 5. Rodar seed idempotente (npx prisma db seed)
    Dev->>Local: 6. Testes locais (login, clientes, publicações, aprovação)

    Note over Dev,Vercel: FASE DE PREVIEW DEPLOYMENT
    Dev->>Vercel: 7. Configurar DATABASE_URL/DIRECT_URL no ambiente Preview
    Dev->>Vercel: 8. Trigger Preview Build na Vercel
    Dev->>Vercel: 9. Executar checklist funcional completo no Preview

    Note over Dev,Railway: FASE DE CUTOVER & PRODUÇÃO
    Dev->>Railway: 10. Backup final de segurança do banco Railway
    Dev->>Vercel: 11. Atualizar DATABASE_URL e DIRECT_URL em Production na Vercel
    Dev->>Vercel: 12. Redeploy da aplicação em Production
    Dev->>Vercel: 13. Smoke tests de validação em produção
    Dev->>Railway: 14. Pausar/Suspender serviço Railway após 48h de estabilidade
```

---

## 15. Checklist de Testes Pós-Migração

### Autenticação & Sessão
- [ ] Login do operador (`operator@nvhub.com.br`) com credenciais válidas.
- [ ] Login do administrador da organização (`admin@demo.nvhub.com.br`).
- [ ] Persistência de sessão (verificar cookie `better-auth.session_token`).
- [ ] Logout e invalidação de sessão.
- [ ] Redirecionamento de rotas protegidas pelo `proxy.ts`.

### Multi-Tenancy & Administração
- [ ] Resolução automática de tenant ativo (`getOrResolveActiveOrganizationId`).
- [ ] Operador acessando painel `/empresas`.
- [ ] Criação de nova organização com feature flags customizadas.
- [ ] Criação e vinculação de novo membro à organização.
- [ ] Alternância de organização ativa pelo operador.
- [ ] Validação de bloqueio em caso de organização desativada/suspensa.

### Módulo de Clientes
- [ ] Listagem de clientes (`getClients`).
- [ ] Criação de novo cliente (`createClient`).
- [ ] Edição de dados de cliente (`updateClient`).
- [ ] Arquivamento e restauração de cliente.
- [ ] Visualização de histórico do cliente (`getClientProfileDbData` — validação de performance do `AuditLog`).

### Módulo de Tarefas
- [ ] Listagem de tarefas por tenant (`getTasks`).
- [ ] Criação de tarefa vinculada a cliente e membro responsável.
- [ ] Alteração de status (concluir / reabrir).
- [ ] Adição de notas/comentários na tarefa (`addTaskNote`).

### Módulo de Publicações & Links Públicos
- [ ] Criação de publicação interna (`createRealPublication`).
- [ ] Geração do link curto `/a/[token]` com token único.
- [ ] Acesso anônimo via navegador em aba anônima ao link `/a/[token]`.
- [ ] Validação do DTO público (garantir ausência de `organizationId` e campos sensíveis no DOM/Network).
- [ ] Aprovação do post pelo link público (`approvePublicationByTokenAction`).
- [ ] Solicitação de ajustes com feedback (`requestPublicationChangesByTokenAction`).
- [ ] Regeneração de token de aprovação (`regeneratePublicationApprovalLinkAction`).
- [ ] Verificação de rate limiting (testar múltiplas requisições sequenciais).

### Integridade do Banco de Dados
- [ ] Teste de latência Vercel ↔ Supabase São Paulo (`perf:db` ou Server-Timing < 35ms).
- [ ] Verificação de conexões ativas no dashboard do Supabase (garantir que o Transaction Pooler mantém conexões baixas e estáveis).

---

## 16. Matriz de Riscos

| Risco | Severidade | Probabilidade | Impacto | Mitigação Técnica |
| :--- | :--- | :--- | :--- | :--- |
| **Saturação de Conexões no Postgres (Pool Exhaustion)** | **ALTO** | Baixa | Aplicação retorna erro 500 em picos | Uso do Supabase Transaction Pooler (porta 6543) com `?pgbouncer=true&connection_limit=1` na `DATABASE_URL`. |
| **Falha no `prisma migrate` por uso de Pooler** | **ALTO** | Média | Builds falham na Vercel | Inclusão obrigatória de `directUrl = env("DIRECT_URL")` no `schema.prisma`. |
| **Lentidão em Queries de Auditoria** | **MÉDIO** | Média | Queda de performance no perfil de clientes | Criação de índices compostos em `AuditLog` na baseline inicial. |
| **Vazamento de Dados entre Tenants** | **CRÍTICO** | Muito Baixa | Dados expostos entre organizações | Validação estrita de `organizationId` em todas as server actions + mascaramento `PUBLIC_APPROVAL_SELECT`. |
| **Seed Destrutivo Acidental em Produção** | **CRÍTICO** | Baixa | Perda de dados reais | Reescrever o seed com `upsert` e remover blocos de `deleteMany`. |
| **Incompatibilidade IPv6 na Conexão Direta** | **MÉDIO** | Baixa | CLI do Prisma não conecta da máquina local | Utilizar o endpoint Session Pooler do Supabase (porta 5432 IPv4) na `DIRECT_URL`. |
| **Deploy Apontando para Banco Errado** | **ALTO** | Baixa | Produção escrevendo no Railway legado | Segregação estrita de variáveis de ambiente por Environment na Vercel (Preview vs Production). |

---

## 17. Arquivos que Seriam Alterados na Execução

*(Nenhum desses arquivos foi alterado nesta etapa de auditoria)*

1. `prisma/schema.prisma`:
   - Adição de `directUrl = env("DIRECT_URL")` no bloco `datasource db`.
   - Adição de índices em `Member`, `Session`, `Account`, `AuditLog`, `Verification`.
   - Remoção de índice duplicado em `Publication`.
2. `prisma/migrations`:
   - Substituição das 7 pastas incrementais por 1 migration consolidada `0_init_clean`.
3. `prisma/seed.ts`:
   - Conversão para modelo estritamente idempotente com `upsert`.
4. `.env.example`:
   - Atualização das instruções para os formatos oficiais do Supabase (Transaction Pooler + Direct URL).
5. `.env` / `.env.local`:
   - Atualização das strings `DATABASE_URL` e `DIRECT_URL` com as credenciais do Supabase.

---

## 18. Comandos que Seriam Executados na Implementação

*(Nenhum comando foi executado nesta etapa)*

```bash
# 1. Limpeza da pasta de migrations antigas e criação da baseline limpa
# (Gera a migration SQL consolidada a partir do schema atualizado)
npx prisma migrate dev --name init_clean --create-only

# 2. Aplicação da baseline limpa no banco Supabase
npx prisma migrate deploy

# 3. Execução do seed idempotente
npx prisma db seed

# 4. Geração do Prisma Client tipado
npx prisma generate

# 5. Validação de TypeScript e Build
npx tsc --noEmit
npm run build

# 6. Medição de latência de conectividade
npm run perf:db
```

---

## 19. Variáveis de Ambiente Necessárias (Formatos)

Para configurar no `.env.local` e nas configurações de Environment Variables da Vercel:

```env
# Runtime / Vercel Serverless (Supabase Transaction Pooler - Porta 6543)
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[DB_PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# Prisma CLI / Migrations (Supabase Direct ou Session Pooler - Porta 5432)
DIRECT_URL="postgresql://postgres:[DB_PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"

# Better Auth
BETTER_AUTH_SECRET="[CHAVE_SECRETA_EXISTENTE]"
BETTER_AUTH_URL="https://nvhub.vercel.app"
NEXT_PUBLIC_APP_URL="https://nvhub.vercel.app"

# Modo de Dados (Padrão database fail-closed)
NEXT_PUBLIC_DATA_MODE="database"
```

---

## 20. Perguntas / Bloqueios Antes da Implementação

Antes de autorizar a execução da fase prática, favor confirmar:
1. **Credenciais Supabase:** Você já possui em mãos a senha do banco de dados (`[DB_PASSWORD]`) e o `PROJECT_REF` do projeto Supabase criado em São Paulo (`sa-east-1`)?
2. **Dados Legados Railway:** Confirmamos que nenhum dado da Railway precisa ser exportado/preservado (além do backup de segurança preventivo)?
3. **Estratégia C Aprovada:** Você aprova consolidar o schema com os índices de performance recomendados e gerar a baseline limpa única?

---

## Recomendação de GO / NO-GO

### **STATUS: GO COM AJUSTES**

**Justificativa Técnica:**  
O projeto possui uma arquitetura limpa, moderna (Next.js 16 + Better Auth + Prisma 6) e excelente separação de responsabilidades. Está **100% pronto** para a migração Clean Start para o Supabase, necessitando apenas dos ajustes técnicos pré-deploy identificados nesta auditoria:
1. Adição de `directUrl` no `schema.prisma` para viabilizar o pooler.
2. Inclusão dos índices essenciais em `AuditLog`, `Member`, `Session` e `Account`.
3. Criação da baseline unificada em substituição ao histórico de 7 migrations de prototipagem.
4. Ajuste do seed para modelo puramente idempotente com `upsert`.
