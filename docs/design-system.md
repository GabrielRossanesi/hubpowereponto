# NV Hub Design System

## Propósito

O NV Hub é uma ferramenta operacional para uso diário. O Design System prioriza leitura rápida, densidade controlada e continuidade entre áreas comerciais, operacionais e financeiras. O Dashboard é o piloto desta linguagem e Clientes é o primeiro módulo interno migrado.

> Antes de criar um componente novo, verificar se o Design System já possui um componente ou pattern que resolva o problema.

> Não utilizar valores visuais arbitrários quando existir token equivalente.

## Princípios

1. **Menos elementos visuais, mais hierarquia.** Agrupar por estrutura, espaço e tipografia antes de adicionar bordas ou superfícies.
2. **Informação antes de decoração.** Ícones, cores e movimento precisam explicar estado, prioridade ou ação.
3. **Densidade confortável.** O produto deve permitir leitura rápida sem comprimir controles ou criar grandes áreas vazias.
4. **Contexto contínuo.** A linha de sinal NV identifica a rota ativa, o contexto do cabeçalho e os indicadores prioritários.
5. **Evolução incremental.** Componentes compartilhados devem manter compatibilidade enquanto cada módulo é migrado.

## Foundations

Os tokens estão em `app/globals.css` e são expostos ao Tailwind CSS 4 por `@theme`.

### Cores semânticas

| Conceito | Light | Dark | Uso |
| --- | --- | --- | --- |
| `background` | `#F1F2F5` | `#090A0D` | Canvas geral neutro |
| `surface` | `#FBFBFC` | `#15181F` | Painéis e controles |
| `surface-subtle` | `#F5F5F7` | `#11141A` | Agrupamentos discretos |
| `surface-elevated` | `#FFFFFF` | `#1C2028` | Menus e overlays |
| `shell-sidebar` | `#F8F8FA` | `#0D0F14` | Navegação estrutural |
| `shell-topbar` | `#FBFBFC` | `#101217` | Barra contextual |
| `foreground` | `#181A20` | `#F2F1ED` | Texto principal |
| `foreground-secondary` | `#4B4E58` | `#C9C9C5` | Texto de apoio forte |
| `foreground-muted` | `#747883` | `#8F929B` | Legendas e metadados |
| `border` | `#DFE1E7` | `#262A33` | Divisores sutis |
| `border-strong` | `#C8CBD3` | `#383E49` | Controles e hover |
| `primary` | `#A66C18` | `#D8AA58` | Identidade NV e ação primária |
| `primary-hover` | `#8C570E` | `#E4B968` | Hover da ação primária |
| `primary-subtle` | `#F4E8D4` | `#2A2114` | Seleção e contexto ativo |
| `success` | `#2F6B55` | `#6DB394` | Conclusão confirmada |
| `warning` | `#9A6318` | `#D7A557` | Atenção sem falha |
| `danger` | `#A7443F` | `#DF8078` | Falha, atraso e ação destrutiva |
| `info` | `#3D657B` | `#78A9BF` | Estado informativo |

Cada estado semântico possui uma versão `*-subtle` para fundos de baixa saturação. Não usar cores semânticas para diferenciar categorias neutras.

A base estrutural é neutra: não introduzir verde, azul ou âmbar em `background`, `surface`, `shell-sidebar`, `shell-topbar` ou bordas. O dourado NV deve ocupar aproximadamente 10% da composição e ficar restrito à marca, foco, seleção e sinais de prioridade.

Aliases como `card`, `muted`, `secondary` e `accent-cool` permanecem por compatibilidade com os módulos ainda não migrados.

### Tipografia

- **Display e interface:** Geist Sans.
- **Dados e utilidade:** Geist Mono, restrito a métricas, datas, valores financeiros e identificadores curtos.

| Token Tailwind | Papel |
| --- | --- |
| `text-display` | Nome/contexto principal em telas amplas |
| `text-page-title` | Título de página |
| `text-section-title` | Título de seção |
| `text-card-title` | Título de painel ou card |
| `text-sm` | Corpo padrão |
| `text-body-small` | Corpo compacto operacional |
| `text-label` | Labels, ações e metadados fortes |
| `text-caption` | Microdados auxiliares |
| `text-metric` | Métricas compactas |

Usar `tabular-nums` em números que precisam se alinhar. Evitar pesos `black` e títulos maiores que o necessário para uma aplicação operacional.

### Espaçamento

| Token | Uso |
| --- | --- |
| `p-page` | Padding responsivo da área de conteúdo |
| `space-y-section`, `gap-section` | Distância entre seções principais |
| `p-card`, `px-card` | Padding interno de painéis |
| `gap-form` | Distância entre campos de formulário |
| `gap-toolbar` | Distância entre controles de uma toolbar |

Preferir a escala padrão do Tailwind para ajustes menores. Valores arbitrários devem ser reservados a constraints estruturais inevitáveis, como colunas do App Shell.

### Radius e sombras

- `rounded-sm`: elementos pequenos e tags retangulares.
- `rounded-md`: controles, navegação e estados.
- `rounded-lg`: cards e painéis.
- `shadow-subtle`: superfície apoiada no canvas.
- `shadow-elevated`: dropdown, modal e sheet.

Não usar `shadow-xl`, `shadow-2xl` ou elevação em elementos que não sobrepõem conteúdo. Não usar radius grande para todas as superfícies.

## Componentes

### Existentes e preservados

- `Button`
- `Input`
- `Textarea`
- `Select`
- `Checkbox` e `Switch` implementados localmente nos módulos atuais
- `Badge` e `StatusBadge`
- `Modal`
- `Dropdown`
- `Tabs`
- `Card`
- `Table`
- `PageLoadingSkeleton`
- `ThemeToggle`

### Criados ou ampliados no piloto

- `IconButton`: botão de ícone com label acessível obrigatório.
- `MetricCard`: KPI compacto, com tom semântico opcional e navegação opcional.
- `SectionHeader`: título de seção, descrição, eyebrow contextual e ações.
- `EmptyState`: suporta ação por callback ou `href` e densidade compacta.
- `ErrorState`: erro recuperável com descrição segura e retry opcional.
- `Card`: variantes `default`, `panel` e `flat`, mantendo `default` compatível.
- `PageHeader`: variante `operational`, com eyebrow contextual e hierarquia compacta.
- `Table`: variante `operational`, com superfície única e densidade de leitura.
- `SearchInput`: busca reutilizável com ícone, nome acessível e ação de limpar.
- `TableToolbar`: superfície única para busca, resumo de resultados, filtros e ações.

### Regras de API

- Acessibilidade faz parte da API. `IconButton` exige `label`; inputs exigem label visível ou nome acessível equivalente.
- Variantes devem representar intenção (`danger`, `panel`, `compact`), não uma página específica.
- Dados não devem ser copiados para estado global apenas para alimentar apresentação.
- Componentes visuais puros devem permanecer compatíveis com Server Components sempre que não precisarem de estado ou browser APIs.

## Patterns

### AppShell

`DashboardClientLayout` implementa:

```text
Sidebar + Topbar + Content Area
```

O shell preserva o conteúdo como `children` server-renderizado. A shell client-side existe para menu móvel, colapso da sidebar, tema e feature gating já estabelecidos.

- Sidebar expandida: `256px`.
- Sidebar compacta: `72px`.
- Header da Sidebar e Topbar: `68px`.
- O controle de colapso fica na Topbar, alinhado ao contexto da página.
- `AppContentContainer` é o boundary oficial de largura e gutters para Topbar e conteúdo.
- A área interna do shell pode crescer até `1960px`, incluindo os gutters; páginas não devem adicionar um segundo max-width estrutural.
- O estado expandido/compacto permanece no Zustand existente.

### ContentContainer

`AppContentContainer` alinha Topbar e módulos em uma única composição responsiva.

- Gutters: `16px` no mobile, `24px` a partir de `640px`, `32px` a partir de `1280px` e `40px` a partir de `1600px`.
- Max-width externo: `1960px`; em ultrawide o conteúdo útil chega a `1880px` e mantém espaço negativo lateral deliberado.
- Usar uma única vez no boundary do App Shell. Módulos ocupam `width: 100%` e controlam apenas grids internos.
- Não combinar com `max-w-7xl`, `container` ou outro wrapper centralizador no nível raiz do módulo.
- Containers locais menores continuam permitidos para formulários, mensagens de bloqueio e conteúdo cuja leitura exige linha curta.

### Wide Layout

- `1024`: composição compacta, com Sidebar desktop e gutter de `24px`.
- `1280`: composição confortável, gutter de `32px` e grids operacionais habilitados conforme o conteúdo.
- `1440`: composição expandida, ocupando praticamente toda a área útil sem encostar nas bordas.
- `1920`: layout wide com gutter de `40px`; KPIs e painéis recebem largura adicional real.
- `2560+`: o container para em `1960px`; a largura útil fica em `1880px` para evitar cards indefinidamente esticados.
- Grids podem ajustar `gap` e proporção no breakpoint `2xl`, mas não devem adicionar colunas sem necessidade informacional.

### Sidebar

- Ordem estrutural: marca, workspace, navegação rolável e conta fixa no rodapé.
- Agrupar módulos por domínio real: Comercial, Operações, Gestão e Administração.
- Estado ativo combina trilho NV de `2px` com glow mínimo, superfície em gradiente semântico, texto forte e icon well elevado.
- Modo compacto mantém marca, workspace, ícones, indicador ativo, tooltips acessíveis e avatar da conta.
- Itens continuam filtrados por permissões e feature flags.
- O menu mobile ignora a preferência compacta e sempre abre expandido.
- No mobile, usar off-canvas com backdrop, body lock, foco inicial no botão fechar, focus trap, Escape e retorno de foco ao trigger.

### NavigationItem

- Altura padrão: `44px`.
- Ícone: `20px`, centralizado em um icon well de `32px`.
- Label: `text-body-small`, peso médio.
- O hover altera apenas superfície, texto e ícone; não deslocar o item.
- Usar `aria-current="page"` na rota ativa.
- No compacto, o tooltip aparece em hover e foco e é conectado por `aria-describedby`.
- Badge de navegação só pode existir com informação real. O badge `ADMIN` representa permissão real, não contagem.

### WorkspaceSwitcher

- Label oficial: `Workspace`.
- Combina monograma da organização, nome real, plano real e chevron quando há alternância disponível.
- Em database-mode com uma única organização, permanece informativo e não simula dropdown.
- Em sandbox, reutiliza `currentOrganizationId` e `setCurrentOrganizationId` do Zustand.
- Menu usa `menuitemradio`, `aria-checked`, Escape e restauração de foco.

### AccountMenu

- Integra avatar, nome, função real e permissão administrativa no rodapé da Sidebar.
- Ações permitidas nesta fase: Configurações e logout.
- Não duplicar perfil, tema ou outras ações sem comportamento implementado.
- No compacto, mostra apenas avatar; o menu contextual abre ao lado.
- Usa `aria-haspopup="menu"`, `aria-expanded`, Escape e restauração de foco.

### Topbar

- Mostra o contexto da rota atual.
- Contém somente controles globais reais.
- Não simular busca ou notificações sem comportamento implementado.
- Complementa a Sidebar com controle de colapso, contexto da página, workspace atual e tema.
- Topbar e conteúdo usam o mesmo `AppContentContainer`; o conector estrutural central ocupa o espaço wide sem simular funcionalidade.
- Não repetir logout: essa ação pertence ao AccountMenu.
- No mobile, o trigger informa `aria-expanded` e controla o off-canvas por `aria-controls`.

### PageHeader

- Eyebrow opcional para contexto, não decoração.
- Título compacto.
- Descrição de uma linha sempre que possível.
- Ações secundárias como links discretos; ação principal como `Button`.

### MetricCard

Estrutura recomendada:

```text
label                 icon
valor
contexto curto           ↗
```

Não usar ícone grande, gráfico decorativo ou trend fictício. O tom semântico precisa corresponder ao significado real do valor.

### OperationalPanel

Painel com um único contorno, header separado por divisor e conteúdo em listas. Itens internos usam divisores; não criar cards dentro de cards.

### Portfolio Index

Resumo compacto derivado exclusivamente dos dados já carregados pela página. Usa uma única superfície segmentada, labels curtos e números tabulares; não deve ser apresentado como uma coleção de KPI cards nem justificar queries adicionais.

### TableToolbar

Agrupa busca, metadados de resultados, filtros e ações relacionadas à listagem em uma única superfície. Filtros ativos usam estado pressionado visível e oferecem “Limpar filtros” quando houver estado real a remover. Contagens devem ser derivadas do conjunto de dados já disponível.

### DataTable operacional

- Uma única superfície com header discreto, divisores e hover de baixa intensidade.
- Primeira célula concentra a identificação primária; iniciais podem substituir avatar quando derivadas de um nome real.
- Ação principal permanece explícita. Ações secundárias e destrutivas vão para menu contextual com nome acessível.
- Colunas secundárias podem ser ocultadas progressivamente, sem remover informações críticas da representação responsiva.
- Não tornar a linha inteira clicável quando esse comportamento não existia anteriormente.

### Responsive Data List

Alternativa à tabela comprimida em telas estreitas. Mantém todos os registros em uma única superfície contínua com divisores, preservando status, identificação, dados essenciais e ações. Não criar um card independente por registro.

### EmptyState

Deve responder:

1. O que está vazio?
2. Por que isso importa ou quando será preenchido?
3. Qual é a próxima ação real, quando houver?

### ErrorState

- Título objetivo.
- Descrição sem stack trace, ids internos ou detalhes de infraestrutura.
- Retry apenas quando a ação for realmente recuperável.
- Usar `role="alert"` para erros apresentados após interação ou carregamento.

### LoadingState

- Manter App Shell visível.
- Skeleton deve reproduzir dimensões do conteúdo final.
- Preferir `loading.tsx` e Suspense a um spinner que bloqueia a página inteira.
- Animação respeita `prefers-reduced-motion` globalmente.

## Responsividade

- **320–430:** uma coluna; ações quebram linha; listas mantêm alvos clicáveis; valores financeiros truncam com `title` quando necessário.
- **768:** KPIs e resumo financeiro passam a duas colunas.
- **1024:** sidebar desktop é exibida; conteúdo continua priorizando uma coluna quando necessário.
- **1280–1920:** KPIs em quatro colunas e painéis operacionais usam composição assimétrica.
- Scroll horizontal é permitido somente em tabelas e componentes cuja semântica exige colunas.
- A área principal usa `min-w-0` para impedir overflow provocado por conteúdo flex/grid.

## Acessibilidade

- Foco visível com anel `primary` de baixa opacidade.
- Alvos interativos com aproximadamente 36–44 px sempre que possível.
- Ícones decorativos usam `aria-hidden="true"`.
- Rota ativa usa `aria-current="page"`.
- Progresso usa `role="progressbar"` e valores ARIA.
- Tema claro e escuro devem preservar contraste de texto, borda e estados.
- Não depender apenas de cor para comunicar estado: usar label, ícone ou contexto textual.

## Movimento

Usar transições rápidas apenas para hover, foco, abertura e feedback. O App Shell pode usar atmosfera estática e parallax de baixa amplitude exclusivamente nas camadas decorativas do canvas.

- O parallax escreve CSS variables por `requestAnimationFrame`; nunca atualiza estado React em `pointermove`.
- Amplitudes oficiais: `8px`, `5px` e `3px`, conforme a profundidade da camada.
- O listener de ponteiro existe somente em desktop com ponteiro preciso e possui cleanup.
- Em mobile, touch e `prefers-reduced-motion: reduce`, todas as camadas permanecem estáticas.
- Conteúdo, cards, Sidebar e Topbar nunca participam do deslocamento.
- Não usar animações contínuas de ping, pulse ou bounce, nem glow forte em superfícies funcionais.

### NV Signal e Atmosphere

`NV Signal` é a assinatura gráfica abstrata do App Shell. Representa fluxos operacionais conectados por trajetórias contínuas e poucos pontos de sinal.

- Composição: curvas neutras de `1px`, um trecho dourado curto e até três nós discretos.
- Distribuição: extremidades, topo e áreas vazias do canvas; nunca posicionar intencionalmente atrás de títulos ou controles.
- Atmosphere: no máximo três layers — profundidade neutra, NV Signal e field/grid.
- Light Mode usa linhas ainda mais discretas para não sujar o canvas; Dark Mode preserva graphite/charcoal sem azul dominante.
- O dourado permanece raro e não deve virar wallpaper, halo central ou superfície colorida.
- O SVG é decorativo, não recebe foco e se move apenas junto da layer por `translate3d`.
- Não usar blur animado, filter animado, partículas ou sombras gigantes nas layers.

## Boas práticas

- Derivar métricas apenas de dados reais já disponíveis.
- Reutilizar `SectionHeader`, `MetricCard`, `EmptyState` e `ErrorState`.
- Preferir um painel com divisores a vários cards aninhados.
- Usar `foreground-secondary` para informação útil e `foreground-muted` para metadados.
- Manter Server Components e streaming existentes; adicionar `use client` somente na menor fronteira interativa possível.
- Verificar light, dark, teclado, loading, vazio, erro e tamanhos de viewport antes de concluir uma tela.

## Anti-patterns

- Hex, RGB, shadow ou radius arbitrário quando existe token.
- Cards dentro de cards.
- Gradiente sem função informacional.
- Glassmorphism, blur ou sombra pesada em superfícies comuns.
- Ícones grandes em KPIs.
- Títulos de landing page em telas operacionais.
- Badge saturado ocupando área grande.
- Métrica, trend ou gráfico fictício para preencher espaço.
- Busca, notificação ou controle visual sem comportamento real.
- Duplicar dados de servidor no Zustand para simplificar renderização.
- Criar `/design-system`, Storybook ou showcase público nesta fase.

## Status da migração

O Design System foi aplicado ao App Shell, ao Dashboard piloto e à tela principal de Clientes. O detalhe de Clientes e os módulos Leads, Propostas, Contratos, Cobranças, Onboarding, Publicações, Tarefas, Histórico, Financeiro, Configurações e Empresas continuam fora desta migração e devem evoluir somente em rodadas próprias.
