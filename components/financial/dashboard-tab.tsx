'use client';

import React, { useState } from 'react';
import { 
  ArrowUpRight, ArrowDownRight, AlertCircle, 
  Calendar, RefreshCw, Landmark, TrendingUp
} from 'lucide-react';
import { FinancialEntry } from '../../types';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/card';
import Button from '../ui/button';

interface DashboardTabProps {
  financialEntries: FinancialEntry[];
  onReset: () => void;
}

export function DashboardTab({ financialEntries, onReset }: DashboardTabProps) {
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // 1. Setup today's reference (midnight)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

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

  // 2. Filter datasets
  const receivables = financialEntries.filter(e => e.type === 'receivable');
  const payables = financialEntries.filter(e => e.type === 'payable');

  // 3. Calculate KPIs
  // Recebido no mês (Somar valor pago de recebidos parciais ou totais no mês corrente)
  const recebidoMes = receivables.reduce((sum, r) => {
    const isPaid = r.status === 'paid';
    const isPartial = r.status === 'partial';
    const dateToCheck = r.paidAt || r.dueDate;
    if ((isPaid || isPartial) && isCurrentMonth(dateToCheck)) {
      return sum + (r.paidAmount || (isPaid ? r.amount : 0));
    }
    return sum;
  }, 0);

  // Pago no mês (Somar valor pago de contas pagas no mês corrente)
  const pagoMes = payables.reduce((sum, p) => {
    const isPaid = p.status === 'paid';
    const dateToCheck = p.paidAt || p.dueDate;
    if (isPaid && isCurrentMonth(dateToCheck)) {
      return sum + (p.paidAmount || p.amount);
    }
    return sum;
  }, 0);

  // A Receber Geral (Pendente / Parcial)
  const aReceberGeral = receivables.reduce((sum, r) => {
    if (r.status !== 'paid' && r.status !== 'cancelled') {
      const outstanding = r.amount - (r.paidAmount || 0);
      return sum + outstanding;
    }
    return sum;
  }, 0);

  // A Pagar Geral
  const aPagarGeral = payables.reduce((sum, p) => {
    if (p.status !== 'paid' && p.status !== 'cancelled') {
      return sum + p.amount;
    }
    return sum;
  }, 0);

  // Vencidos (Soma de valores pendentes de contas vencidas)
  const vencidosRecebiveis = receivables.reduce((sum, r) => {
    if (isOverdue(r)) {
      return sum + (r.amount - (r.paidAmount || 0));
    }
    return sum;
  }, 0);

  const vencidosDespesas = payables.reduce((sum, p) => {
    if (isOverdue(p)) {
      return sum + p.amount;
    }
    return sum;
  }, 0);

  const vencidosTotal = vencidosRecebiveis + vencidosDespesas;

  // Resultado Previsto do Mês (Entradas do mês - Saídas do mês)
  const totalReceivablesMonth = receivables.reduce((sum, r) => {
    if (r.status !== 'cancelled' && isCurrentMonth(r.dueDate)) {
      return sum + r.amount;
    }
    return sum;
  }, 0);

  const totalPayablesMonth = payables.reduce((sum, p) => {
    if (p.status !== 'cancelled' && isCurrentMonth(p.dueDate)) {
      return sum + p.amount;
    }
    return sum;
  }, 0);

  const resultadoPrevisto = totalReceivablesMonth - totalPayablesMonth;

  // Saldo Previsto do Mês (Saldo inicial simulado + Resultado Previsto)
  const saldoInicialSimulado = 25000;
  const saldoPrevistoMes = saldoInicialSimulado + resultadoPrevisto;

  // 4. Chart Data Generation (Last 6 Months Entradas x Saídas)
  const getPastMonths = (count = 6) => {
    const list = [];
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      list.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase()
      });
    }
    return list;
  };

  const monthsData = getPastMonths(6).map(m => {
    const mReceivables = receivables.reduce((sum, r) => {
      const rDate = new Date(r.dueDate);
      if (rDate.getFullYear() === m.year && rDate.getMonth() === m.month && r.status !== 'cancelled') {
        return sum + r.amount;
      }
      return sum;
    }, 0);

    const mPayables = payables.reduce((sum, p) => {
      const pDate = new Date(p.dueDate);
      if (pDate.getFullYear() === m.year && pDate.getMonth() === m.month && p.status !== 'cancelled') {
        return sum + p.amount;
      }
      return sum;
    }, 0);

    return { label: m.label, entry: mReceivables, exit: mPayables };
  });

  const maxChartVal = Math.max(...monthsData.map(d => Math.max(d.entry, d.exit)), 1000);

  // 5. Chart Data Generation (Fluxo de Caixa 30 dias)
  const getTimeline30Days = () => {
    const list = [];
    let currentBalance = saldoInicialSimulado + recebidoMes - pagoMes;
    
    // Group entries by date
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];

      const dayReceivables = receivables
        .filter(r => r.dueDate === dateStr && r.status !== 'paid' && r.status !== 'cancelled')
        .reduce((sum, r) => sum + (r.amount - (r.paidAmount || 0)), 0);

      const dayPayables = payables
        .filter(p => p.dueDate === dateStr && p.status !== 'paid' && p.status !== 'cancelled')
        .reduce((sum, p) => sum + p.amount, 0);

      currentBalance = currentBalance + dayReceivables - dayPayables;

      list.push({
        day: d.getDate(),
        balance: currentBalance
      });
    }
    return list;
  };

  const timelineData = getTimeline30Days();
  const balances = timelineData.map(t => t.balance);
  const minBalance = Math.min(...balances, 0);
  const maxBalance = Math.max(...balances, 1000);
  const balanceRange = maxBalance - minBalance || 1;

  const sparklineCoords = timelineData.map((t, idx) => {
    const x = (idx / 29) * 100;
    const y = 40 - ((t.balance - minBalance) / balanceRange) * 36; // 40px height, 2px padding top/bottom
    return `${x},${y}`;
  });

  // 6. Category Breakdown (Current month payables)
  const categoryTotals: Record<string, number> = {};
  payables.forEach(p => {
    if (p.status !== 'cancelled') {
      categoryTotals[p.category] = (categoryTotals[p.category] || 0) + p.amount;
    }
  });

  const totalExpenseForBreakdown = Object.values(categoryTotals).reduce((sum, v) => sum + v, 0) || 1;
  const categoryList = Object.entries(categoryTotals)
    .map(([name, amount]) => ({
      name,
      amount,
      percentage: (amount / totalExpenseForBreakdown) * 100
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const colors = [
    'bg-primary', 
    'bg-accent-cool', 
    'bg-warning', 
    'bg-danger', 
    'bg-success'
  ];

  return (
    <div className="space-y-6">
      {/* Top action row */}
      <div className="flex justify-between items-center bg-card/40 border border-border/30 rounded-xl p-4">
        <div className="flex items-center gap-2.5">
          <Landmark className="h-5 w-5 text-primary" />
          <div>
            <h4 className="text-xs font-bold text-foreground">Sandbox de Demonstração Financeira</h4>
            <p className="text-[10px] text-muted-foreground">Estes dados são simulados localmente e isolados por tenant.</p>
          </div>
        </div>
        
        {showResetConfirm ? (
          <div className="flex items-center gap-2 animate-in fade-in duration-200">
            <span className="text-[10px] font-bold text-danger">Confirmar reset?</span>
            <Button 
              variant="danger" 
              size="sm" 
              className="py-1 text-[10px] font-bold"
              onClick={() => {
                onReset();
                setShowResetConfirm(false);
              }}
            >
              Sim, Resetar
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="py-1 text-[10px] font-bold"
              onClick={() => setShowResetConfirm(false)}
            >
              Cancelar
            </Button>
          </div>
        ) : (
          <Button 
            variant="outline" 
            size="sm" 
            className="text-[10px] font-bold gap-1.5 h-8 border-border hover:bg-muted/30"
            onClick={() => setShowResetConfirm(true)}
          >
            <RefreshCw className="h-3 w-3 text-muted-foreground" />
            Resetar Sandbox
          </Button>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Saldo Previsto */}
        <Card className="p-4 border-border/50 relative overflow-hidden bg-card/60">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Saldo Previsto do Mês</span>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-3.5">
            <span className="text-[22px] font-black text-foreground">
              R$ {saldoPrevistoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[9px] text-muted-foreground block mt-1">
              Saldo Inicial de R$ {saldoInicialSimulado.toLocaleString('pt-BR')} incluso
            </span>
          </div>
        </Card>

        {/* A Receber */}
        <Card className="p-4 border-border/50 bg-card/60">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">A Receber (Em Aberto)</span>
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
          </div>
          <div className="mt-3.5">
            <span className="text-[22px] font-black text-foreground">
              R$ {aReceberGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <div className="text-[9px] text-muted-foreground mt-1 flex items-center gap-1.5">
              <span className="text-success font-bold flex items-center gap-0.5">
                <ArrowUpRight className="h-3 w-3" /> Recebido: R$ {recebidoMes.toLocaleString('pt-BR')}
              </span>
            </div>
          </div>
        </Card>

        {/* A Pagar */}
        <Card className="p-4 border-border/50 bg-card/60">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">A Pagar (Em Aberto)</span>
            <span className="h-2 w-2 rounded-full bg-accent-cool" />
          </div>
          <div className="mt-3.5">
            <span className="text-[22px] font-black text-foreground">
              R$ {aPagarGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <div className="text-[9px] text-muted-foreground mt-1 flex items-center gap-1.5">
              <span className="text-danger font-bold flex items-center gap-0.5">
                <ArrowDownRight className="h-3 w-3" /> Pago: R$ {pagoMes.toLocaleString('pt-BR')}
              </span>
            </div>
          </div>
        </Card>

        {/* Vencidos */}
        <Card className={`p-4 border-border/50 bg-card/60 ${vencidosTotal > 0 ? 'ring-1 ring-danger/20 border-danger/35' : ''}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Vencidos</span>
            <AlertCircle className={`h-4 w-4 ${vencidosTotal > 0 ? 'text-danger' : 'text-muted-foreground'}`} />
          </div>
          <div className="mt-3.5">
            <span className={`text-[22px] font-black ${vencidosTotal > 0 ? 'text-danger' : 'text-foreground'}`}>
              R$ {vencidosTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <div className="text-[9px] text-muted-foreground mt-1 flex gap-2">
              <span>Recebíveis: R$ {vencidosRecebiveis.toLocaleString('pt-BR')}</span>
              <span>•</span>
              <span>Despesas: R$ {vencidosDespesas.toLocaleString('pt-BR')}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Monthly realized values */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card/30 border border-border/20 rounded-xl p-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-success/10 text-success flex items-center justify-center shrink-0 font-bold">R</div>
          <div>
            <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider block">Recebido no Mês</span>
            <span className="text-sm font-extrabold text-foreground">R$ {recebidoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
        <div className="bg-card/30 border border-border/20 rounded-xl p-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-danger/10 text-danger flex items-center justify-center shrink-0 font-bold">P</div>
          <div>
            <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider block">Pago no Mês</span>
            <span className="text-sm font-extrabold text-foreground">R$ {pagoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
        <div className="bg-card/30 border border-border/20 rounded-xl p-3 flex items-center gap-3">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 font-bold ${resultadoPrevisto >= 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>$</div>
          <div>
            <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider block">Resultado Previsto do Mês</span>
            <span className={`text-sm font-extrabold ${resultadoPrevisto >= 0 ? 'text-success' : 'text-danger'}`}>
              R$ {resultadoPrevisto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Main Charts & Analytics Block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Entradas x Saídas Chart */}
        <Card className="lg:col-span-2 border-border/40 bg-card/40 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <span>Comparativo Semestral: Entradas x Saídas</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex flex-col justify-between pt-2">
            {/* Visual Bars Container */}
            <div className="flex-1 flex items-end justify-between px-4 pb-2 border-b border-border/20">
              {monthsData.map((d, idx) => {
                const entryHeight = Math.max((d.entry / maxChartVal) * 100, 2); // min 2% for visual presence
                const exitHeight = Math.max((d.exit / maxChartVal) * 100, 2);
                
                return (
                  <div key={idx} className="flex flex-col items-center gap-2 w-12 sm:w-16">
                    <div className="h-36 flex items-end gap-1.5 justify-center w-full">
                      {/* Entrada Bar */}
                      <div className="group relative w-4 sm:w-5">
                        <div 
                          className="w-full bg-success/80 rounded-t-[2px] transition-all hover:bg-success hover:scale-x-105 duration-200 cursor-pointer"
                          style={{ height: `${entryHeight}%` }}
                        />
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-card border border-border shadow-2xl text-[9px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                          Entrada: R$ {d.entry.toLocaleString('pt-BR')}
                        </div>
                      </div>
                      
                      {/* Saída Bar */}
                      <div className="group relative w-4 sm:w-5">
                        <div 
                          className="w-full bg-primary/70 rounded-t-[2px] transition-all hover:bg-primary hover:scale-x-105 duration-200 cursor-pointer"
                          style={{ height: `${exitHeight}%` }}
                        />
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-card border border-border shadow-2xl text-[9px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                          Saída: R$ {d.exit.toLocaleString('pt-BR')}
                        </div>
                      </div>
                    </div>
                    <span className="text-[9px] font-black text-muted-foreground">{d.label}</span>
                  </div>
                );
              })}
            </div>
            
            {/* Chart Legend */}
            <div className="flex gap-4 items-center justify-center py-2 text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-success/80" />
                <span className="text-muted-foreground font-bold">Faturamento (Entradas)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-primary/80" />
                <span className="text-muted-foreground font-bold">Despesas (Saídas)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Categories Distribution Donut */}
        <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Distribuição de Despesas</CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex flex-col justify-between pt-2">
            {categoryList.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                <AlertCircle className="h-5 w-5 text-muted-foreground mb-1" />
                <span className="text-xs text-muted-foreground italic">Nenhum lançamento no mês.</span>
              </div>
            ) : (
              <>
                {/* Custom responsive bars list */}
                <div className="space-y-3.5 flex-1 overflow-y-auto pr-1">
                  {categoryList.map((cat, idx) => {
                    const colorClass = colors[idx % colors.length];
                    return (
                      <div key={cat.name} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-foreground">
                          <span className="truncate max-w-[150px]">{cat.name}</span>
                          <span>R$ {cat.amount.toLocaleString('pt-BR')} ({cat.percentage.toFixed(0)}%)</span>
                        </div>
                        <div className="h-2 w-full bg-muted/65 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${colorClass} rounded-full`}
                            style={{ width: `${cat.percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cashflow timeline 30 days & Alerts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Fluxo de Caixa 30 Dias Sparkline */}
        <Card className="lg:col-span-2 border-border/40 bg-card/40 backdrop-blur-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Projeção de Caixa (Próximos 30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground mb-3">
              <span>Hoje: R$ {(saldoInicialSimulado + recebidoMes - pagoMes).toLocaleString('pt-BR')}</span>
              <span>Previsão D+30: R$ {timelineData[29].balance.toLocaleString('pt-BR')}</span>
            </div>

            {/* SVG Native Line Chart */}
            <div className="relative h-24 w-full border border-border/10 bg-card/25 rounded-lg p-2 flex items-center justify-center">
              <svg 
                className="w-full h-full overflow-visible text-primary stroke-primary"
                viewBox="0 0 100 40"
                preserveAspectRatio="none"
              >
                {/* Horizontal reference lines */}
                <line x1="0" y1="10" x2="100" y2="10" stroke="currentColor" strokeWidth="0.15" strokeDasharray="1,1" className="opacity-25" />
                <line x1="0" y1="20" x2="100" y2="20" stroke="currentColor" strokeWidth="0.15" strokeDasharray="1,1" className="opacity-25" />
                <line x1="0" y1="30" x2="100" y2="30" stroke="currentColor" strokeWidth="0.15" strokeDasharray="1,1" className="opacity-25" />

                <polyline
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={sparklineCoords.join(' ')}
                />
              </svg>
            </div>

            <div className="flex justify-between items-center text-[8px] font-extrabold uppercase tracking-widest text-muted-foreground/60 mt-2.5">
              <span>Dia 1</span>
              <span>Dia 10</span>
              <span>Dia 20</span>
              <span>Dia 30</span>
            </div>
          </CardContent>
        </Card>

        {/* Quick Lists (Vencimentos Próximos) */}
        <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-primary" />
              <span>Próximos Vencimentos</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {financialEntries.filter(e => e.status === 'pending' || e.status === 'partial' || e.status === 'overdue').length === 0 ? (
              <div className="flex items-center justify-center h-28 text-center">
                <span className="text-xs text-muted-foreground italic">Sem pendências futuras.</span>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-40 overflow-y-auto pr-1">
                {financialEntries
                  .filter(e => e.status === 'pending' || e.status === 'partial' || e.status === 'overdue')
                  .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                  .slice(0, 3)
                  .map(e => {
                    const isEntryOverdue = isOverdue(e);
                    const formattedDate = new Date(e.dueDate).toLocaleDateString('pt-BR');
                    
                    return (
                      <div key={e.id} className="flex justify-between items-center bg-card/50 border border-border/15 p-2 rounded-lg text-xs">
                        <div className="min-w-0 pr-2">
                          <span className="font-extrabold text-foreground block truncate">{e.title}</span>
                          <span className={`text-[8.5px] font-black uppercase tracking-wider ${isEntryOverdue ? 'text-danger' : 'text-muted-foreground'}`}>
                            {isEntryOverdue ? 'Vencido em' : 'Vence em'} {formattedDate}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-black text-foreground block">
                            R$ {(e.amount - (e.paidAmount || 0)).toLocaleString('pt-BR')}
                          </span>
                          <span className={`text-[8px] font-bold px-1 rounded block mt-0.5 ${e.type === 'receivable' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>
                            {e.type === 'receivable' ? 'Entrada' : 'Saída'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default DashboardTab;
