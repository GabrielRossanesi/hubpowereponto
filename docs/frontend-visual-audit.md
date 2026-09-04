# Auditoria visual do frontend — fase piloto

Data: 27 de agosto de 2026

## Escopo

Auditoria realizada antes da implementação do Dashboard piloto. Nenhum módulo de negócio foi migrado nesta etapa.

## Arquitetura encontrada

- Next.js 16.2.9 com App Router.
- Tailwind CSS 4 configurado por `@import "tailwindcss"` e `@theme` em `app/globals.css`.
- Root Layout com Geist Sans, Geist Mono e `ThemeProvider`.
- Layout autenticado server-first em `app/dashboard/layout.tsx`.
- App Shell client-side em `DashboardClientLayout`, compartilhado por todos os módulos autenticados.
- Sidebar e Topbar compartilhadas.
- Zustand usado para sandbox e estado visual; modo database recebe contexto do tenant no servidor.
- Dados reais de clientes e tarefas do Dashboard iniciados em paralelo no Server Component.
- `loading.tsx` existente para Dashboard e Publicações.
- Biblioteca interna de UI em `components/ui`; nenhuma biblioteca externa de componentes.

## Componentes compartilhados encontrados

- Primitivos: Button, Input, Textarea, Select, Badge, Card, Table.
- Composição: Modal, Dropdown, Tabs, PageHeader, MetricCard, EmptyState.
- Estados: PageLoadingSkeleton e StatusBadge.
- Shell: Sidebar, Topbar, Logo e ThemeToggle.
- Componentes especializados: DatePicker, TaskCalendar, Sparkline e SetupProgressModal.

## Duplicações e inconsistências

1. O Dashboard mantinha um `EmptyState` local apesar de existir `components/ui/empty-state.tsx`.
2. Métricas eram implementadas manualmente no Dashboard apesar de existir `MetricCard`, que não era consumido.
3. Botões de ícone repetiam dimensões, padding e texto `sr-only` em Sidebar, Topbar e ThemeToggle.
4. Headers de painel e links “ver tudo” eram repetidos sem pattern comum.
5. Labels variavam entre 7 px, 7,5 px, 8 px, 8,5 px, 9 px, 10 px e 11 px.
6. Radius variava entre `rounded`, `rounded-lg`, `rounded-xl` e `rounded-full` sem correspondência clara com função.
7. Bordas usavam muitas opacidades locais (`/10`, `/20`, `/30`, `/40`, `/60`, `/80`).
8. Sombras variavam de `shadow-sm` a `shadow-2xl` e valores RGB arbitrários.

## Dívida visual

- Paleta inicial possuía aliases úteis, mas não distinguia `surface`, `surface-subtle`, `foreground-secondary`, `border-strong` ou variantes sutis dos estados.
- A identidade bronze existia, porém era combinada a blue accent, glows e gradientes sem regra consistente.
- O App Shell usava grid decorativo, vignette, glows, blur e parallax por `mousemove`.
- Havia animações contínuas de pulse, ping e bounce em marca, notificações, organização e acesso bloqueado.
- Sidebar reunia tooltips, sombras e microtipografia excessivamente pequena, elevando ruído e complexidade.
- Topbar continha busca e notificação visuais sem comportamento de produto implementado.
- Dashboard tinha 778 linhas, cinco cards de categoria, vários cards internos e hierarquia fragmentada.
- Conteúdo secundário competia visualmente com KPIs e tarefas prioritárias.

## Estados

- Loading: havia skeleton dimensional, mas ainda refletia a composição antiga do Dashboard.
- Empty: componente compartilhado existia, mas o Dashboard o duplicava; a API não aceitava `href`.
- Error: não existia pattern compartilhado para erro recuperável.
- Disabled: controles básicos possuíam estado disabled, mas nem todos os controles de shell tinham nome acessível consistente.

## Responsividade

- O App Shell já possuía sidebar móvel com backdrop e modo desktop colapsável.
- Tabelas compartilhadas usavam overflow horizontal semanticamente apropriado.
- O Dashboard usava grids responsivos, porém cards com sparklines e múltiplos badges criavam risco de compressão em larguras pequenas.
- Muitos valores arbitrários e conteúdos `whitespace-nowrap` aumentavam o risco de overflow entre 320 e 430 px.

## Acessibilidade

- Pontos positivos: labels em Input/Select/Textarea, texto `sr-only` em vários icon buttons, `lang="pt-BR"` e focus rings básicos.
- Pontos de atenção: dropdown e modal ainda precisam de uma auditoria específica de gerenciamento de foco e semântica de dialog/menu; isso ficou fora da migração piloto para evitar alteração transversal.
- Animações globais não possuíam uma política única de reduced motion.

## Performance

- A otimização server-first existente foi preservada.
- O Dashboard já era um Client Component por depender do sandbox Zustand; nenhum novo Client Component de página foi criado.
- A shell atualizava o DOM por `requestAnimationFrame` no parallax; o efeito foi removido no piloto.
- Nenhuma dependência foi adicionada.

## Decisões da fase piloto

- Consolidar tokens sem remover aliases usados pelos módulos legados.
- Aplicar composição nova somente ao Dashboard.
- Refinar Sidebar e Topbar como partes do App Shell, preservando comportamento e controle de acesso.
- Criar primitives/patterns compatíveis em vez de duplicar componentes.
- Adiar refatorações profundas de Modal, Dropdown, Tabs, formulários e tabelas para a migração dos módulos que efetivamente os utilizam.
