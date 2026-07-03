'use client';

import React from 'react';
import Link from 'next/link';
import {
  Send, CheckCircle, FileSignature, CreditCard,
  UserCheck, Image as ImageIcon, AlertTriangle, CheckSquare,
  Clock, ArrowRight, UserPlus, AlertCircle
} from 'lucide-react';
import { useTenantStore } from '../../lib/store';
import { useMounted } from '../../hooks/useMounted';
import { useDatabaseTenantContext } from '../../hooks/useDatabaseTenantContext';
import { isDatabaseDataMode } from '../../lib/data-mode';
import PageHeader from '../../components/ui/page-header';
import Sparkline from '../../components/ui/sparkline';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import StatusBadge from '../../components/ui/status-badge';
import { FinancialEntry, Client, TeamTask } from '../../types';
import { getClients } from '../clientes/actions';
import { getTasks } from '../tarefas/actions';

// Helper function to dynamically generate sparkline points from mock data dates
function getSparklinePoints<T>(
  items: T[],
  dateSelector?: (item: T) => string | undefined,
  daysWindow = 30
): number[] {
  const total = items.length;
  if (total === 0) return [0, 0, 0, 0, 0, 0, 0];

  const now = new Date();
  const msInDay = 24 * 60 * 60 * 1000;
  const points = [0, 0, 0, 0, 0, 0, 0];

  // 1. Generate 7 chronological checkpoints in our window
  const timePoints = Array.from({ length: 7 }, (_, i) => {
    const daysAgo = daysWindow - (i * daysWindow) / 6;
    return new Date(now.getTime() - daysAgo * msInDay);
  });

  // 2. Count active items at each checkpoint
  for (let i = 0; i < 7; i++) {
    const limitDate = timePoints[i];
    points[i] = items.filter(item => {
      const dateStr = dateSelector ? dateSelector(item) : (item as { createdAt?: string }).createdAt;
      if (!dateStr) return false;
      const itemDate = new Date(dateStr);
      return !isNaN(itemDate.getTime()) && itemDate <= limitDate;
    }).length;
  }

  // 3. Fallback: If variance is 0 (e.g. all created on same day or before window)
  const min = Math.min(...points);
  const max = Math.max(...points);

  if (max - min === 0 && total > 0) {
    return [
      Math.round(total * 0.2),
      Math.round(total * 0.4),
      Math.round(total * 0.5),
      Math.round(total * 0.7),
      Math.round(total * 0.8),
      Math.round(total * 0.9),
      total
    ];
  }

  return points;
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

function EmptyState({
  icon: Icon,
  title,
  description,
  href,
  actionLabel,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/10 px-6 py-8 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">{description}</p>
      {href && actionLabel && (
        <Link href={href} className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
          {actionLabel} <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const mounted = useMounted();
  const {
    proposals, contracts, charges, onboardings,
    publications, tasks, historyEvents, clients,
    currentOrganization, currentFeatures, financialEntries
  } = useTenantStore();
  const {
    context: databaseTenantContext,
    isLoading: isTenantContextLoading,
    error: tenantContextError,
  } = useDatabaseTenantContext();
  const isDatabaseMode = isDatabaseDataMode;
  const dashboardOrganization = isDatabaseMode
    ? databaseTenantContext?.organization
    : currentOrganization;
  const dashboardFeatures = isDatabaseMode
    ? databaseTenantContext?.features
    : currentFeatures;

  const [realClients, setRealClients] = React.useState<Client[]>([]);
  const [realTasks, setRealTasks] = React.useState<TeamTask[]>([]);

  React.useEffect(() => {
    if (isDatabaseMode) {
      getClients().then(setRealClients).catch(err => console.error('Erro ao carregar clientes no dashboard:', err));
      getTasks().then(setRealTasks).catch(err => console.error('Erro ao carregar tarefas no dashboard:', err));
    }
  }, [isDatabaseMode]);

  if (!mounted || (isDatabaseMode && isTenantContextLoading)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
      </div>
    );
  }

  // Feature flags
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

  // Financial calculations for dashboard summary
  const today = new Date();
  today.setHours(0,0,0,0);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  const isCurrentMonth = (dateStr?: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return !isNaN(d.getTime()) && d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  };

  const isOverdue = (entry: FinancialEntry) => {
    if (entry.status === 'paid' || entry.status === 'cancelled') return false;
    if (entry.status === 'overdue') return true;
    const due = new Date(entry.dueDate);
    return !isNaN(due.getTime()) && due < today;
  };

  const financeEntries = isDatabaseMode ? [] : financialEntries || [];
  const recs = financeEntries.filter((e: FinancialEntry) => e.type === 'receivable');
  const pays = financeEntries.filter((e: FinancialEntry) => e.type === 'payable');

  const dashAReceber = recs.reduce((sum: number, r: FinancialEntry) => {
    if (r.status !== 'paid' && r.status !== 'cancelled') {
      return sum + (r.amount - (r.paidAmount || 0));
    }
    return sum;
  }, 0);

  const dashAPagar = pays.reduce((sum: number, p: FinancialEntry) => {
    if (p.status !== 'paid' && p.status !== 'cancelled') {
      return sum + p.amount;
    }
    return sum;
  }, 0);

  const dashVencidos = financeEntries.reduce((sum: number, e: FinancialEntry) => {
    if (isOverdue(e)) {
      const outstanding = e.type === 'receivable' ? (e.amount - (e.paidAmount || 0)) : e.amount;
      return sum + outstanding;
    }
    return sum;
  }, 0);

  const dashMonthReceivables = recs.reduce((sum: number, r: FinancialEntry) => {
    if (r.status !== 'cancelled' && isCurrentMonth(r.dueDate)) return sum + r.amount;
    return sum;
  }, 0);

  const dashMonthPayables = pays.reduce((sum: number, p: FinancialEntry) => {
    if (p.status !== 'cancelled' && isCurrentMonth(p.dueDate)) return sum + p.amount;
    return sum;
  }, 0);

  const dashResultadoPrevisto = dashMonthReceivables - dashMonthPayables;

  // Calculate Metrics (Keep filtered arrays to generate reactive sparklines)
  const propostasEnviadasItems = proposals.filter(p => p.status === 'sent' || p.status === 'viewed');
  const propostasEnviadas = propostasEnviadasItems.length;

  const propostasAceitasItems = proposals.filter(p => p.status === 'accepted');
  const propostasAceitas = propostasAceitasItems.length;

  const contratosAguardandoAssinaturaItems = contracts.filter(c => c.status === 'pending_signatures');
  const contratosAguardandoAssinatura = contratosAguardandoAssinaturaItems.length;

  const cobrancasAguardandoPagamentoItems = charges.filter(c => c.status === 'pending');
  const cobrancasAguardandoPagamento = cobrancasAguardandoPagamentoItems.length;

  const cobrancasPagasItems = charges.filter(c => c.status === 'paid');
  const cobrancasPagas = cobrancasPagasItems.length;

  const clientesEmOnboardingItems = onboardings.filter(o => o.steps.completed !== 'completed');
  const clientesEmOnboarding = clientesEmOnboardingItems.length;

  const publicacoesAguardandoAprovacaoItems = publications.filter(p => p.status === 'pending_approval' || p.status === 'ready_for_approval');
  const publicacoesAguardandoAprovacao = publicacoesAguardandoAprovacaoItems.length;

  const publicacoesComAlteracaoItems = publications.filter(p => p.status === 'changes_requested');
  const publicacoesComAlteracao = publicacoesComAlteracaoItems.length;

  const activeTasksList = isDatabaseMode ? realTasks : tasks;

  const tarefasPendentesItems = activeTasksList.filter(t => t.status === 'pending' || t.status === 'in_progress' || t.status === 'in_review');
  const tarefasPendentes = tarefasPendentesItems.length;

  const tarefasAtrasadasItems = activeTasksList.filter(t => t.status === 'overdue' || (t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < new Date()));
  const tarefasAtrasadas = tarefasAtrasadasItems.length;

  // Recent History (max 5)
  const recentActivities = historyEvents.slice(0, 5);

  // Near due tasks (max 4)
  const upcomingTasks = activeTasksList
    .filter(t => t.status !== 'completed' && t.status !== 'archived')
    .sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    })
    .slice(0, 4);

  // Top clients (max 4 active ones)
  const highlightClients = (isDatabaseMode ? realClients : clients)
    .filter(c => c.commercialStatus === 'active' || c.commercialStatus === 'onboarding')
    .slice(0, 4);

  // Team productivity is sandbox-only until real task/member metrics are migrated.
  const teamProductivity = isDatabaseMode ? [] : [
    { name: 'Ana Silva', role: 'Operações / Onboarding', completed: 32, total: 40, avatar: 'AS' },
    { name: 'João Santos', role: 'Designer / Social Media', completed: 20, total: 25, avatar: 'JS' },
    { name: 'Maria Souza', role: 'Gestora de Tráfego', completed: 28, total: 30, avatar: 'MS' },
    { name: 'Carlos Santos', role: 'Diretor Comercial', completed: 15, total: 18, avatar: 'CS' }
  ];

  // Operational KPI cards stay balanced; financial summary has its own row.
  const operationalKpis = [
    showProposals,
    (showContracts || showCharges),
    showOnboarding,
    showPublications,
    showTasks
  ].filter(Boolean).length;

  // Overall enabled count (excluding publicProposal since it's external)
  const enabledCount = [
    showLeads, showClients, showProposals, showContracts, showCharges,
    showOnboarding, showPublications, showTasks, showHistory, showTeam, showFinancial
  ].filter(Boolean).length;

  const hasDashboardSections = showTasks || showClients || showTeam || showHistory;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 2xl:max-w-7xl">
      {/* Page Header */}
      <PageHeader
        title={`Dashboard: ${dashboardOrganization?.name || 'Organização não encontrada'}`}
        description={`${isDatabaseMode ? 'Acompanhamento operacional com dados reais da organização.' : 'Acompanhamento operacional em tempo real da organização.'} Plano: ${String(dashboardOrganization?.planId ?? 'sem plano').toUpperCase()}`}
      />

      {isDatabaseMode && tenantContextError && (
        <div className="rounded-lg border border-warning/20 bg-warning/10 px-4 py-3 text-xs font-medium text-warning">
          Não foi possível carregar a organização ativa. O dashboard permanecerá sem dados operacionais até a sessão ser validada.
        </div>
      )}

      {/* Warning banner if too few modules are enabled */}
      {enabledCount <= 3 && (
        <div className="p-4 bg-muted/40 border border-border rounded-lg text-center leading-relaxed flex flex-col items-center justify-center gap-2 max-w-2xl mx-auto my-6 animate-in fade-in duration-300">
          <AlertCircle className="h-7 w-7 text-muted-foreground animate-pulse mb-1" />
          <p className="text-sm font-semibold text-foreground">Poucos módulos estão habilitados para esta organização.</p>
          <p className="text-xs text-muted-foreground">
            O operador NV Hub pode habilitar ou desabilitar módulos a partir do menu &quot;Empresas&quot;.
          </p>
        </div>
      )}

      {/* KPI Metrics Categories Grid */}
      {operationalKpis > 0 && (
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Filtro de Desempenho Operacional</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">

            {/* Comercial */}
            {showProposals && (
              <Card className="p-4 border-border/50">
                <div className="flex items-center justify-between border-b border-border/30 pb-2 mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Comercial</span>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
                        <Send className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="whitespace-nowrap font-medium">Enviadas</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">Em análise</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Sparkline points={getSparklinePoints(propostasEnviadasItems, p => p.createdAt)} variant="primary" className="w-16 sm:w-20 md:w-24" />
                      <span className="text-lg font-bold text-foreground">{propostasEnviadas}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-border/10 pt-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
                        <CheckCircle className="h-3.5 w-3.5 text-success shrink-0" />
                        <span className="whitespace-nowrap font-medium">Aceitas</span>
                      </div>
                      <span className={`text-[10px] font-medium block mt-0.5 ${isDatabaseMode ? 'text-muted-foreground' : 'text-success'}`}>
                        {isDatabaseMode ? 'Sem dados reais' : '+15% mês'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Sparkline points={getSparklinePoints(propostasAceitasItems, p => p.createdAt)} variant="success" className="w-16 sm:w-20 md:w-24" />
                      <span className="text-lg font-bold text-foreground">{propostasAceitas}</span>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Financeiro */}
            {(showContracts || showCharges) && (
              <Card className="p-4 border-border/50">
                <div className="flex items-center justify-between border-b border-border/30 pb-2 mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Financeiro</span>
                </div>
                <div className="space-y-3.5">
                  {showContracts && (
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
                          <FileSignature className="h-3.5 w-3.5 text-warning shrink-0" />
                          <span className="whitespace-nowrap font-medium">Assinaturas</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground block mt-0.5">ZapSign</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Sparkline points={getSparklinePoints(contratosAguardandoAssinaturaItems, c => c.createdAt)} variant="neutral" className="w-16 sm:w-20 md:w-24" />
                        <span className="text-lg font-bold text-foreground">{contratosAguardandoAssinatura}</span>
                      </div>
                    </div>
                  )}

                  {showCharges && (
                    <>
                       <div className={`flex items-center justify-between gap-2 ${showContracts ? 'border-t border-border/10 pt-3.5' : ''}`}>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="whitespace-nowrap font-medium">Pendente</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground block mt-0.5">Asaas</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <Sparkline points={getSparklinePoints(cobrancasAguardandoPagamentoItems, c => c.createdAt)} variant="neutral" className="w-16 sm:w-20 md:w-24" />
                          <span className="text-lg font-bold text-foreground">{cobrancasAguardandoPagamento}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 border-t border-border/10 pt-3.5">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
                            <CreditCard className="h-3.5 w-3.5 text-success shrink-0" />
                            <span className="whitespace-nowrap font-medium">Pago</span>
                          </div>
                          <span className={`text-[10px] font-medium block mt-0.5 ${isDatabaseMode ? 'text-muted-foreground' : 'text-success'}`}>
                            {isDatabaseMode ? 'Sem dados reais' : '+8% sem.'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <Sparkline points={getSparklinePoints(cobrancasPagasItems, c => c.paidAt || c.createdAt)} variant="success" className="w-16 sm:w-20 md:w-24" />
                          <span className="text-lg font-bold text-foreground">{cobrancasPagas}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </Card>
            )}

            {/* Operações */}
            {showOnboarding && (
              <Card className="p-4 border-border/50">
                <div className="flex items-center justify-between border-b border-border/30 pb-2 mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Operações</span>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
                        <UserPlus className="h-3.5 w-3.5 text-info shrink-0" />
                        <span className="whitespace-nowrap font-medium">Onboarding</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">Em andamento</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Sparkline points={getSparklinePoints(clientesEmOnboardingItems, o => o.createdAt)} variant="info" className="w-16 sm:w-20 md:w-24" />
                      <span className="text-lg font-bold text-foreground">{clientesEmOnboarding}</span>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Conteúdo */}
            {showPublications && (
              <Card className="p-4 border-border/50">
                <div className="flex items-center justify-between border-b border-border/30 pb-2 mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Conteúdo</span>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
                        <ImageIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="whitespace-nowrap font-medium">Aprovar</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">Pendentes</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Sparkline points={getSparklinePoints(publicacoesAguardandoAprovacaoItems, p => p.createdAt)} variant="primary" className="w-16 sm:w-20 md:w-24" />
                      <span className="text-lg font-bold text-foreground">{publicacoesAguardandoAprovacao}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-border/10 pt-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
                        <AlertCircle className="h-3.5 w-3.5 text-danger shrink-0" />
                        <span className="whitespace-nowrap font-medium">Alterar</span>
                      </div>
                      <span className="text-[10px] text-danger font-medium block mt-0.5">Revisar</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Sparkline points={getSparklinePoints(publicacoesComAlteracaoItems, p => p.createdAt)} variant="danger" className="w-16 sm:w-20 md:w-24" />
                      <span className="text-lg font-bold text-foreground">{publicacoesComAlteracao}</span>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Tarefas */}
            {showTasks && (
              <Card className="p-4 border-border/50">
                <div className="flex items-center justify-between border-b border-border/30 pb-2 mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tarefas</span>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
                        <CheckSquare className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="whitespace-nowrap font-medium">Pendentes</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">Equipe</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Sparkline points={getSparklinePoints(tarefasPendentesItems, t => t.createdAt)} variant="primary" className="w-16 sm:w-20 md:w-24" />
                      <span className="text-lg font-bold text-foreground">{tarefasPendentes}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-border/10 pt-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
                        <AlertTriangle className="h-3.5 w-3.5 text-danger shrink-0" />
                        <span className="whitespace-nowrap font-medium">Atrasadas</span>
                      </div>
                      <span className={`text-[10px] font-medium block mt-0.5 ${isDatabaseMode ? 'text-muted-foreground' : 'text-danger'}`}>
                        {isDatabaseMode ? 'Sem atrasos reais' : 'Crítico'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Sparkline points={getSparklinePoints(tarefasAtrasadasItems, t => t.createdAt)} variant="danger" className="w-16 sm:w-20 md:w-24" />
                      <span className="text-lg font-bold text-foreground">{tarefasAtrasadas}</span>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {showFinancial && (
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Resumo Financeiro (Mês)</h2>
          <Card className="p-5 border-border/50 bg-card/40 backdrop-blur-sm">
            <div className="flex flex-col gap-3 border-b border-border/30 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-foreground">Financeiro real</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isDatabaseMode && financeEntries.length === 0
                    ? 'Nenhum lançamento financeiro real cadastrado.'
                    : 'Consolidado dos lançamentos do mês corrente.'}
                </p>
              </div>
              <Link href="/financeiro" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                Detalhes <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-border/30 bg-muted/10 p-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  <span>A Receber</span>
                </div>
                <p className="mt-2 text-xl font-bold text-foreground">R$ {formatCurrency(dashAReceber)}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">Em aberto</p>
              </div>

              <div className="rounded-lg border border-border/30 bg-muted/10 p-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>A Pagar</span>
                </div>
                <p className="mt-2 text-xl font-bold text-foreground">R$ {formatCurrency(dashAPagar)}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">Em aberto</p>
              </div>

              <div className="rounded-lg border border-border/30 bg-muted/10 p-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-danger" />
                  <span>Vencidos</span>
                </div>
                <p className={`mt-2 text-xl font-bold ${dashVencidos > 0 ? 'text-danger' : 'text-foreground'}`}>
                  R$ {formatCurrency(dashVencidos)}
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">Total atrasado</p>
              </div>

              <div className="rounded-lg border border-border/30 bg-muted/10 p-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-info" />
                  <span>Resultado</span>
                </div>
                <p className={`mt-2 text-xl font-bold ${dashResultadoPrevisto >= 0 ? 'text-success' : 'text-danger'}`}>
                  R$ {formatCurrency(dashResultadoPrevisto)}
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">Previsto do mês</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Main Content Dashboard Sections */}
      {hasDashboardSections && (
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
          {showTasks && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-primary" />
                  Tarefas Próximas do Prazo
                </CardTitle>
                <Link href="/tarefas" className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline">
                  Ver tudo <ArrowRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent>
                {upcomingTasks.length === 0 ? (
                  <EmptyState
                    icon={CheckSquare}
                    title={isDatabaseMode ? 'Nenhuma tarefa real cadastrada ainda.' : 'Nenhuma tarefa pendente no momento.'}
                    description={isDatabaseMode ? 'Quando tarefas reais forem registradas, os prazos aparecerão aqui.' : 'As próximas entregas aparecerão aqui assim que forem criadas.'}
                    href="/tarefas"
                    actionLabel="Abrir tarefas"
                  />
                ) : (
                  <div className="divide-y divide-border/30">
                    {upcomingTasks.map((task) => (
                      <div key={task.id} className="py-3.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                        <div className="min-w-0">
                          <span className="font-semibold text-sm text-foreground block truncate">{task.title}</span>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-[11px] font-medium text-muted-foreground">{task.clientName}</span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                            </span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-[11px] font-medium text-muted-foreground">Resp: {task.responsibleUser}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <StatusBadge type="priority" status={task.priority} />
                          <StatusBadge type="task" status={task.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {showClients && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-bold">
                  Clientes em Destaque
                </CardTitle>
                <Link href="/clientes" className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline">
                  Todos <ArrowRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent>
                {highlightClients.length === 0 ? (
                  <EmptyState
                    icon={UserPlus}
                    title={isDatabaseMode ? 'Nenhum cliente real cadastrado ainda.' : 'Nenhum cliente cadastrado.'}
                    description={isDatabaseMode ? 'Cadastre clientes reais no módulo correspondente para acompanhar a carteira.' : 'Clientes ativos ou em onboarding aparecerão nesta lista.'}
                    href="/clientes"
                    actionLabel="Abrir clientes"
                  />
                ) : (
                  <div className="space-y-3.5">
                    {highlightClients.map((client) => (
                      <Link
                        key={client.id}
                        href={`/clientes/${client.id}`}
                        className="block p-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-sm text-foreground block truncate">{client.companyName}</span>
                          <StatusBadge type="client" status={client.commercialStatus} />
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Resp: {client.responsibleUser}</span>
                          <span>{client.cnpj}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {showTeam && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-primary" />
                  Produtividade da Equipe (Mês Corrente)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {teamProductivity.length === 0 ? (
                  <EmptyState
                    icon={UserCheck}
                    title="Nenhum dado real de produtividade disponível."
                    description="Quando tarefas reais forem concluídas, a produtividade da equipe aparecerá aqui."
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {teamProductivity.map((person) => {
                      const percent = Math.round((person.completed / person.total) * 100);
                      return (
                        <div key={person.name} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-[10px]">
                                {person.avatar}
                              </div>
                              <div>
                                <span className="text-sm font-semibold block text-foreground leading-none">{person.name}</span>
                                <span className="text-[10px] text-muted-foreground mt-0.5 block">{person.role}</span>
                              </div>
                            </div>
                            <span className="text-xs font-bold text-foreground">
                              {person.completed}/{person.total} ({percent}%)
                            </span>
                          </div>
                          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-500"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {showHistory && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Histórico Recente
                </CardTitle>
                <Link href="/historico" className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline">
                  Ver auditoria <ArrowRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent>
                {recentActivities.length === 0 ? (
                  <EmptyState
                    icon={Clock}
                    title={isDatabaseMode ? 'Nenhum histórico operacional real cadastrado.' : 'Sem atividades registradas.'}
                    description={isDatabaseMode ? 'Eventos reais serão listados aqui quando os módulos operacionais forem usados.' : 'As movimentações da organização aparecerão neste histórico.'}
                    href="/historico"
                    actionLabel="Abrir histórico"
                  />
                ) : (
                  <div className="relative pl-4 border-l border-border/80 space-y-6">
                    {recentActivities.map((event) => (
                      <div key={event.id} className="relative group">
                        <span className="absolute -left-6.5 top-1 h-2.5 w-2.5 rounded-full bg-primary border border-card ring-2 ring-primary/20" />

                        <div className="space-y-0.5">
                          <span className="text-xs font-semibold text-foreground block">
                            {event.title}
                          </span>
                          {event.clientName && (
                            <span className="text-[10px] font-medium text-primary block">
                              {event.clientName}
                            </span>
                          )}
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {event.description}
                          </p>
                          <span className="text-[10px] text-muted-foreground/80 block mt-1">
                            {new Date(event.createdAt).toLocaleTimeString('pt-BR')} em {new Date(event.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
