'use client';

import React from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CheckSquare,
  Clock,
  CreditCard,
  FileSignature,
  Image as ImageIcon,
  Send,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { useTenantStore } from '../../lib/store';
import { useMounted } from '../../hooks/useMounted';
import { useDatabaseTenantContext } from '../../hooks/useDatabaseTenantContext';
import { isDatabaseDataMode } from '../../lib/data-mode';
import Badge from '../../components/ui/badge';
import Card from '../../components/ui/card';
import EmptyState from '../../components/ui/empty-state';
import ErrorState from '../../components/ui/error-state';
import MetricCard from '../../components/ui/metric-card';
import SectionHeader from '../../components/ui/section-header';
import StatusBadge from '../../components/ui/status-badge';
import type { Client, FinancialEntry, TeamTask } from '../../types';

type MetricTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

interface DashboardMetric {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  tone: MetricTone;
  href: string;
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
}

function formatDate(value?: string) {
  if (!value) return 'Sem prazo';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem prazo';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
}

function SectionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-label font-semibold text-foreground-secondary transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
    >
      {children}
      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
    </Link>
  );
}

function FlowItem({
  label,
  value,
  detail,
  icon,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  detail: string;
  icon: React.ReactNode;
  tone?: MetricTone;
}) {
  const tones: Record<MetricTone, string> = {
    neutral: 'bg-primary-subtle text-primary',
    success: 'bg-success-subtle text-success',
    warning: 'bg-warning-subtle text-warning',
    danger: 'bg-danger-subtle text-danger',
    info: 'bg-info-subtle text-info',
  };

  return (
    <div className="flex min-w-0 items-center gap-3 py-3">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${tones[tone]}`} aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body-small font-medium text-foreground">{label}</p>
        <p className="truncate text-caption text-foreground-muted">{detail}</p>
      </div>
      <span className="font-mono text-section-title font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  );
}

function FinancialMetric({ label, value, tone = 'neutral' }: { label: string; value: number; tone?: MetricTone }) {
  const valueColor: Record<MetricTone, string> = {
    neutral: 'text-foreground',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
    info: 'text-info',
  };

  return (
    <div className="min-w-0 border-t border-border px-4 py-4 first:border-l-0 sm:border-l sm:first:border-l-0 lg:border-t-0">
      <p className="text-caption font-semibold uppercase tracking-[0.1em] text-foreground-muted">{label}</p>
      <p className={`mt-2 truncate font-mono text-lg font-semibold tracking-[-0.035em] tabular-nums sm:text-xl ${valueColor[tone]}`} title={formatCurrency(value)}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}

export default function DashboardPageClient({
  initialClients,
  initialTasks,
}: {
  initialClients: Client[];
  initialTasks: TeamTask[];
}) {
  const mounted = useMounted();
  const {
    proposals,
    contracts,
    charges,
    onboardings,
    publications,
    tasks,
    historyEvents,
    clients,
    currentOrganization,
    currentFeatures,
    financialEntries,
  } = useTenantStore();
  const { context: databaseTenantContext, error: tenantContextError } = useDatabaseTenantContext();
  const isDatabaseMode = isDatabaseDataMode;
  const dashboardOrganization = isDatabaseMode ? databaseTenantContext?.organization : currentOrganization;
  const dashboardFeatures = isDatabaseMode ? databaseTenantContext?.features : currentFeatures;

  if (!isDatabaseMode && !mounted) {
    return <DashboardContentSkeleton />;
  }

  const showLeads = dashboardFeatures ? dashboardFeatures.leads !== false : true;
  const showClients = dashboardFeatures ? dashboardFeatures.clients !== false : true;
  const showProposals = dashboardFeatures ? dashboardFeatures.proposals !== false : true;
  const showContracts = dashboardFeatures ? dashboardFeatures.contracts !== false : true;
  const showCharges = dashboardFeatures ? dashboardFeatures.charges !== false : true;
  const showOnboarding = dashboardFeatures ? dashboardFeatures.onboarding !== false : true;
  const showPublications = dashboardFeatures ? dashboardFeatures.publications !== false : true;
  const showTasks = dashboardFeatures ? dashboardFeatures.tasks !== false : true;
  const showHistory = dashboardFeatures ? dashboardFeatures.history !== false : true;
  const showTeam = dashboardFeatures ? dashboardFeatures.team !== false : true;
  const showFinancial = dashboardFeatures ? dashboardFeatures.financial !== false : true;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const activeTasks = isDatabaseMode ? initialTasks : tasks;
  const activeClients = isDatabaseMode ? initialClients : clients;
  const financeEntries = isDatabaseMode ? [] : financialEntries || [];

  const isCurrentMonth = (dateStr?: string) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    return !Number.isNaN(date.getTime()) && date.getFullYear() === currentYear && date.getMonth() === currentMonth;
  };

  const isOverdue = (entry: FinancialEntry) => {
    if (entry.status === 'paid' || entry.status === 'cancelled') return false;
    if (entry.status === 'overdue') return true;
    const due = new Date(entry.dueDate);
    return !Number.isNaN(due.getTime()) && due < today;
  };

  const receivables = financeEntries.filter(entry => entry.type === 'receivable');
  const payables = financeEntries.filter(entry => entry.type === 'payable');
  const amountReceivable = receivables.reduce((sum, entry) => (
    entry.status !== 'paid' && entry.status !== 'cancelled'
      ? sum + entry.amount - (entry.paidAmount || 0)
      : sum
  ), 0);
  const amountPayable = payables.reduce((sum, entry) => (
    entry.status !== 'paid' && entry.status !== 'cancelled' ? sum + entry.amount : sum
  ), 0);
  const overdueAmount = financeEntries.reduce((sum, entry) => {
    if (!isOverdue(entry)) return sum;
    return sum + (entry.type === 'receivable' ? entry.amount - (entry.paidAmount || 0) : entry.amount);
  }, 0);
  const monthReceivables = receivables.reduce((sum, entry) => (
    entry.status !== 'cancelled' && isCurrentMonth(entry.dueDate) ? sum + entry.amount : sum
  ), 0);
  const monthPayables = payables.reduce((sum, entry) => (
    entry.status !== 'cancelled' && isCurrentMonth(entry.dueDate) ? sum + entry.amount : sum
  ), 0);
  const expectedResult = monthReceivables - monthPayables;

  const sentProposals = proposals.filter(proposal => proposal.status === 'sent' || proposal.status === 'viewed');
  const acceptedProposals = proposals.filter(proposal => proposal.status === 'accepted');
  const pendingContracts = contracts.filter(contract => contract.status === 'pending_signatures');
  const pendingCharges = charges.filter(charge => charge.status === 'pending');
  const paidCharges = charges.filter(charge => charge.status === 'paid');
  const activeOnboardings = onboardings.filter(onboarding => onboarding.steps.completed !== 'completed');
  const pendingPublications = publications.filter(publication => publication.status === 'pending_approval' || publication.status === 'ready_for_approval');
  const revisionPublications = publications.filter(publication => publication.status === 'changes_requested');
  const pendingTasks = activeTasks.filter(task => task.status === 'pending' || task.status === 'in_progress' || task.status === 'in_review');
  const overdueTasks = activeTasks.filter(task => (
    task.status === 'overdue' || (task.status !== 'completed' && task.dueDate && new Date(task.dueDate) < today)
  ));
  const activeClientList = activeClients.filter(client => client.commercialStatus === 'active' || client.commercialStatus === 'onboarding');
  const upcomingTasks = [...activeTasks]
    .filter(task => task.status !== 'completed' && task.status !== 'archived')
    .sort((first, second) => {
      if (!first.dueDate) return 1;
      if (!second.dueDate) return -1;
      return new Date(first.dueDate).getTime() - new Date(second.dueDate).getTime();
    })
    .slice(0, 5);
  const highlightedClients = activeClientList.slice(0, 5);
  const recentActivities = historyEvents.slice(0, 5);
  const teamProductivity = isDatabaseMode ? [] : [
    { name: 'Ana Silva', role: 'Operações / Onboarding', completed: 32, total: 40, avatar: 'AS' },
    { name: 'João Santos', role: 'Designer / Social Media', completed: 20, total: 25, avatar: 'JS' },
    { name: 'Maria Souza', role: 'Gestora de Tráfego', completed: 28, total: 30, avatar: 'MS' },
    { name: 'Carlos Santos', role: 'Diretor Comercial', completed: 15, total: 18, avatar: 'CS' },
  ];

  const candidateMetrics: Array<DashboardMetric | false> = [
    showTasks && {
      title: 'Tarefas abertas',
      value: pendingTasks.length,
      description: 'pendentes, em execução ou revisão',
      icon: <CheckSquare className="h-4 w-4" />,
      tone: 'neutral',
      href: '/tarefas',
    },
    showTasks && {
      title: 'Tarefas em atraso',
      value: overdueTasks.length,
      description: 'fora do prazo atual',
      icon: <AlertTriangle className="h-4 w-4" />,
      tone: overdueTasks.length > 0 ? 'danger' : 'success',
      href: '/tarefas',
    },
    showClients && {
      title: 'Clientes ativos',
      value: activeClientList.length,
      description: 'ativos ou em onboarding',
      icon: <Users className="h-4 w-4" />,
      tone: 'info',
      href: '/clientes',
    },
    showPublications && {
      title: 'Aprovações pendentes',
      value: pendingPublications.length,
      description: 'publicações aguardando retorno',
      icon: <ImageIcon className="h-4 w-4" />,
      tone: pendingPublications.length > 0 ? 'warning' : 'success',
      href: '/publicacoes',
    },
    showProposals && {
      title: 'Propostas em análise',
      value: sentProposals.length,
      description: 'enviadas ou visualizadas',
      icon: <Send className="h-4 w-4" />,
      tone: 'neutral',
      href: '/propostas',
    },
    showOnboarding && {
      title: 'Onboardings ativos',
      value: activeOnboardings.length,
      description: 'clientes em implantação',
      icon: <UserPlus className="h-4 w-4" />,
      tone: 'info',
      href: '/onboarding',
    },
  ];
  const priorityMetrics = candidateMetrics.filter((metric): metric is DashboardMetric => Boolean(metric)).slice(0, 4);

  const enabledCount = [
    showLeads,
    showClients,
    showProposals,
    showContracts,
    showCharges,
    showOnboarding,
    showPublications,
    showTasks,
    showHistory,
    showTeam,
    showFinancial,
  ].filter(Boolean).length;

  const hasOperationalFlow = showProposals || showContracts || showCharges || showOnboarding || showPublications;
  const planLabel = String(dashboardOrganization?.planId ?? 'sem plano').toUpperCase();

  return (
    <div className="dashboard-composition w-full space-y-section">
      <header className="border-b border-border pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <p className="flex items-center gap-2 text-caption font-bold uppercase tracking-[0.14em] text-primary">
                <span className="h-px w-5 bg-primary" aria-hidden="true" />
                Painel operacional
              </p>
              <Badge variant="muted" className="rounded-sm px-1.5 py-0 text-[0.625rem] uppercase tracking-wide">Plano {planLabel}</Badge>
            </div>
            <h1 className="truncate text-page-title font-semibold tracking-[-0.025em] text-foreground sm:text-display">
              {dashboardOrganization?.name || 'Organização não encontrada'}
            </h1>
            <p className="mt-1.5 max-w-2xl text-body-small text-foreground-muted">
              {isDatabaseMode
                ? 'Acompanhe os dados reais e as pendências da operação em um único lugar.'
                : 'Acompanhe o ritmo comercial e operacional deste ambiente sandbox.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {showClients && <SectionLink href="/clientes">Abrir clientes</SectionLink>}
            {showTasks && <SectionLink href="/tarefas">Abrir tarefas</SectionLink>}
          </div>
        </div>
      </header>

      {isDatabaseMode && tenantContextError && (
        <ErrorState
          compact
          description="A organização ativa ainda não foi validada. Os dados operacionais permanecerão indisponíveis até a sessão ser confirmada."
        />
      )}

      {enabledCount <= 3 && (
        <div className="flex items-start gap-3 rounded-md border border-border bg-surface-subtle px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-foreground-muted" aria-hidden="true" />
          <div>
            <p className="text-body-small font-semibold text-foreground">Poucos módulos estão habilitados</p>
            <p className="mt-0.5 text-label text-foreground-muted">Um operador do NV Hub pode revisar as funcionalidades desta organização em Empresas.</p>
          </div>
        </div>
      )}

      {priorityMetrics.length > 0 && (
        <section aria-labelledby="dashboard-priorities" className="space-y-4">
          <SectionHeader
            id="dashboard-priorities"
            eyebrow="Agora"
            title="Leitura rápida da operação"
            description="Indicadores compactos para localizar o próximo ponto de atenção."
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:gap-4">
            {priorityMetrics.map(metric => <MetricCard key={metric.title} {...metric} />)}
          </div>
        </section>
      )}

      {(showTasks || showClients) && (
        <section aria-label="Trabalho em andamento" className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(19rem,0.85fr)] 2xl:gap-5 2xl:grid-cols-[minmax(0,1.7fr)_minmax(22rem,0.8fr)]">
          {showTasks && (
            <Card variant="panel" className="overflow-hidden">
              <div className="flex items-start justify-between gap-4 border-b border-border px-card py-4">
                <div>
                  <p className="text-card-title font-semibold text-foreground">Próximos prazos</p>
                  <p className="mt-1 text-caption text-foreground-muted">Tarefas abertas ordenadas pela data de entrega.</p>
                </div>
                <SectionLink href="/tarefas">Ver todas</SectionLink>
              </div>
              <div className="px-card">
                {upcomingTasks.length === 0 ? (
                  <div className="py-card">
                    <EmptyState
                      compact
                      icon={<CheckSquare className="h-5 w-5" />}
                      title={isDatabaseMode ? 'Nenhuma tarefa real cadastrada' : 'Nenhuma tarefa pendente'}
                      description="Quando houver uma entrega em andamento, o próximo prazo aparecerá aqui."
                      href="/tarefas"
                      actionLabel="Abrir tarefas"
                    />
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {upcomingTasks.map(task => (
                      <div key={task.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-body-small font-semibold text-foreground">{task.title}</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-foreground-muted">
                            <span className="truncate">{task.clientName || 'Sem cliente'}</span>
                            <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                              <Clock className="h-3 w-3" aria-hidden="true" />
                              {formatDate(task.dueDate)}
                            </span>
                            <span className="truncate">{task.responsibleUser || 'Sem responsável'}</span>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                          <StatusBadge type="priority" status={task.priority} />
                          <StatusBadge type="task" status={task.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )}

          {showClients && (
            <Card variant="panel" className="overflow-hidden">
              <div className="flex items-start justify-between gap-4 border-b border-border px-card py-4">
                <div>
                  <p className="text-card-title font-semibold text-foreground">Carteira em foco</p>
                  <p className="mt-1 text-caption text-foreground-muted">Clientes ativos e em onboarding.</p>
                </div>
                <SectionLink href="/clientes">Ver todos</SectionLink>
              </div>
              <div className="px-card">
                {highlightedClients.length === 0 ? (
                  <div className="py-card">
                    <EmptyState
                      compact
                      icon={<Users className="h-5 w-5" />}
                      title="Nenhum cliente ativo"
                      description="Cadastre ou ative um cliente para acompanhar a carteira por aqui."
                      href="/clientes"
                      actionLabel="Abrir clientes"
                    />
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {highlightedClients.map(client => (
                      <Link
                        key={client.id}
                        href={`/clientes/${client.id}`}
                        className="group flex items-center justify-between gap-3 py-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-body-small font-semibold text-foreground transition-colors group-hover:text-primary">{client.companyName}</p>
                          <p className="mt-1 truncate text-caption text-foreground-muted">{client.responsibleUser || client.cnpj || 'Sem responsável'}</p>
                        </div>
                        <StatusBadge type="client" status={client.commercialStatus} />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )}
        </section>
      )}

      {hasOperationalFlow && (
        <section aria-labelledby="dashboard-flow" className="space-y-4">
          <SectionHeader
            id="dashboard-flow"
            eyebrow="Fluxos"
            title="Movimento entre áreas"
            description="Pendências e conclusões dos principais fluxos habilitados."
          />
          <Card variant="panel" className="px-card">
            <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
              <div className="divide-y divide-border md:pr-card">
                {showProposals && (
                  <>
                    <FlowItem label="Propostas em análise" value={sentProposals.length} detail="Enviadas ou visualizadas" icon={<Send className="h-4 w-4" />} />
                    <FlowItem label="Propostas aceitas" value={acceptedProposals.length} detail="Com aceite registrado" icon={<CheckCircle2 className="h-4 w-4" />} tone="success" />
                  </>
                )}
                {showContracts && <FlowItem label="Assinaturas pendentes" value={pendingContracts.length} detail="Contratos aguardando assinatura" icon={<FileSignature className="h-4 w-4" />} tone="warning" />}
                {showOnboarding && <FlowItem label="Onboardings ativos" value={activeOnboardings.length} detail="Implantações em andamento" icon={<UserPlus className="h-4 w-4" />} tone="info" />}
              </div>
              <div className="divide-y divide-border md:pl-card">
                {showCharges && (
                  <>
                    <FlowItem label="Cobranças pendentes" value={pendingCharges.length} detail="Aguardando pagamento" icon={<CreditCard className="h-4 w-4" />} tone="warning" />
                    <FlowItem label="Cobranças pagas" value={paidCharges.length} detail="Pagamento confirmado" icon={<CheckCircle2 className="h-4 w-4" />} tone="success" />
                  </>
                )}
                {showPublications && (
                  <>
                    <FlowItem label="Publicações para aprovar" value={pendingPublications.length} detail="Aguardando retorno" icon={<ImageIcon className="h-4 w-4" />} tone="info" />
                    <FlowItem label="Alterações solicitadas" value={revisionPublications.length} detail="Precisam de revisão" icon={<AlertCircle className="h-4 w-4" />} tone={revisionPublications.length > 0 ? 'danger' : 'success'} />
                  </>
                )}
              </div>
            </div>
          </Card>
        </section>
      )}

      {showFinancial && (
        <section aria-labelledby="dashboard-financial" className="space-y-4">
          <SectionHeader
            id="dashboard-financial"
            eyebrow="Financeiro"
            title="Resumo do mês"
            description={isDatabaseMode && financeEntries.length === 0 ? 'Nenhum lançamento financeiro real está disponível para este resumo.' : 'Valores consolidados dos lançamentos do período atual.'}
            actions={<SectionLink href="/financeiro">Abrir financeiro</SectionLink>}
          />
          <Card variant="panel" className="overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <FinancialMetric label="A receber" value={amountReceivable} tone="success" />
              <FinancialMetric label="A pagar" value={amountPayable} />
              <FinancialMetric label="Vencidos" value={overdueAmount} tone={overdueAmount > 0 ? 'danger' : 'neutral'} />
              <FinancialMetric label="Resultado previsto" value={expectedResult} tone={expectedResult >= 0 ? 'success' : 'danger'} />
            </div>
          </Card>
        </section>
      )}

      {(showTeam || showHistory) && (
        <section aria-label="Informações secundárias" className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:gap-5">
          {showTeam && (
            <Card variant="panel" className="overflow-hidden">
              <div className="border-b border-border px-card py-4">
                <p className="flex items-center gap-2 text-card-title font-semibold text-foreground">
                  <UserCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                  Ritmo da equipe
                </p>
                <p className="mt-1 text-caption text-foreground-muted">Tarefas concluídas no mês corrente.</p>
              </div>
              <div className="p-card">
                {teamProductivity.length === 0 ? (
                  <EmptyState
                    compact
                    icon={<UserCheck className="h-5 w-5" />}
                    title="Produtividade ainda sem dados"
                    description="As métricas da equipe aparecerão quando houver tarefas reais concluídas."
                  />
                ) : (
                  <div className="space-y-4">
                    {teamProductivity.map(person => {
                      const percentage = Math.round((person.completed / person.total) * 100);
                      return (
                        <div key={person.name}>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-subtle text-caption font-bold text-primary">{person.avatar}</span>
                              <div className="min-w-0">
                                <p className="truncate text-body-small font-semibold text-foreground">{person.name}</p>
                                <p className="truncate text-caption text-foreground-muted">{person.role}</p>
                              </div>
                            </div>
                            <span className="font-mono text-caption font-semibold tabular-nums text-foreground-secondary">{person.completed}/{person.total}</span>
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`Progresso de ${person.name}`} aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}>
                            <div className="h-full rounded-full bg-primary" style={{ width: `${percentage}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          )}

          {showHistory && (
            <Card variant="panel" className="overflow-hidden">
              <div className="flex items-start justify-between gap-4 border-b border-border px-card py-4">
                <div>
                  <p className="flex items-center gap-2 text-card-title font-semibold text-foreground">
                    <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
                    Atividade recente
                  </p>
                  <p className="mt-1 text-caption text-foreground-muted">Últimos eventos registrados na organização.</p>
                </div>
                <SectionLink href="/historico">Ver histórico</SectionLink>
              </div>
              <div className="p-card">
                {recentActivities.length === 0 ? (
                  <EmptyState
                    compact
                    icon={<Clock className="h-5 w-5" />}
                    title="Nenhuma atividade registrada"
                    description="As movimentações dos módulos aparecerão aqui conforme a operação avançar."
                    href="/historico"
                    actionLabel="Abrir histórico"
                  />
                ) : (
                  <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-1 before:top-2 before:w-px before:bg-border">
                    {recentActivities.map(event => (
                      <li key={event.id} className="relative pl-5">
                        <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full border-2 border-surface bg-primary" aria-hidden="true" />
                        <p className="text-body-small font-semibold text-foreground">{event.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-caption text-foreground-muted">{event.description}</p>
                        <time className="mt-1 block font-mono text-caption tabular-nums text-foreground-muted" dateTime={event.createdAt}>
                          {new Date(event.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).replace('.', '')}
                        </time>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </Card>
          )}
        </section>
      )}
    </div>
  );
}

function DashboardContentSkeleton() {
  return (
    <div className="dashboard-composition w-full space-y-section" aria-busy="true" aria-label="Carregando dashboard">
      <div className="space-y-2 border-b border-border pb-6">
        <div className="h-3 w-28 rounded bg-muted" />
        <div className="h-8 w-56 rounded bg-muted" />
        <div className="h-4 w-full max-w-lg rounded bg-muted" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:gap-4">
        {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-lg border border-border bg-surface" />)}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(19rem,0.85fr)] 2xl:gap-5 2xl:grid-cols-[minmax(0,1.7fr)_minmax(22rem,0.8fr)]">
        <div className="h-80 animate-pulse rounded-lg border border-border bg-surface" />
        <div className="h-80 animate-pulse rounded-lg border border-border bg-surface" />
      </div>
    </div>
  );
}
