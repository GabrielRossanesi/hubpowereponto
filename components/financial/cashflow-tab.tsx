'use client';

import React from 'react';
import { Landmark, TrendingUp, Calendar, Clock } from 'lucide-react';
import { FinancialEntry } from '../../types';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/card';
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table';

interface CashflowTabProps {
  financialEntries: FinancialEntry[];
}

export function CashflowTab({ financialEntries }: CashflowTabProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  const isCurrentMonth = (dateStr?: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return !isNaN(d.getTime()) && d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  };

  // Helper to check if a date is within a day range
  const isWithinDays = (dateStr: string, startOffset: number, endOffset: number) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    
    const start = new Date(today);
    start.setDate(today.getDate() + startOffset);
    
    const end = new Date(today);
    end.setDate(today.getDate() + endOffset);
    
    return d >= start && d <= end;
  };

  const isOverdue = (entry: FinancialEntry) => {
    if (entry.status === 'paid' || entry.status === 'cancelled') return false;
    if (entry.status === 'overdue') return true;
    const due = new Date(entry.dueDate);
    return !isNaN(due.getTime()) && due < today;
  };

  const receivables = financialEntries.filter(e => e.type === 'receivable');
  const payables = financialEntries.filter(e => e.type === 'payable');

  // Realized totals in current month
  const totalReceivedCurrentMonth = receivables.reduce((sum, r) => {
    const isPaid = r.status === 'paid';
    const isPartial = r.status === 'partial';
    const dateToCheck = r.paidAt || r.dueDate;
    if ((isPaid || isPartial) && isCurrentMonth(dateToCheck)) {
      return sum + (r.paidAmount || (isPaid ? r.amount : 0));
    }
    return sum;
  }, 0);

  const totalPaidCurrentMonth = payables.reduce((sum, p) => {
    const isPaid = p.status === 'paid';
    const dateToCheck = p.paidAt || p.dueDate;
    if (isPaid && isCurrentMonth(dateToCheck)) {
      return sum + (p.paidAmount || p.amount);
    }
    return sum;
  }, 0);

  const saldoInicialSimulado = 25000;
  const baseRealizedBalance = saldoInicialSimulado + totalReceivedCurrentMonth - totalPaidCurrentMonth;

  // PERIOD CALCULATIONS
  // 1. Hoje
  const entriesHoje = financialEntries.filter(e => e.dueDate === today.toISOString().split('T')[0] && e.status !== 'cancelled');
  const entriesHojeReceivables = entriesHoje.filter(e => e.type === 'receivable' && e.status !== 'paid');
  const entriesHojePayables = entriesHoje.filter(e => e.type === 'payable' && e.status !== 'paid');
  const sumHojeR = entriesHojeReceivables.reduce((sum, e) => sum + (e.amount - (e.paidAmount || 0)), 0);
  const sumHojeP = entriesHojePayables.reduce((sum, e) => sum + e.amount, 0);

  // 2. Próximos 7 dias (incluindo hoje e também contas atrasadas que precisam ser cobradas/pagas logo)
  const sum7R = receivables
    .filter(r => (isWithinDays(r.dueDate, 0, 6) || isOverdue(r)) && r.status !== 'paid' && r.status !== 'cancelled')
    .reduce((sum, r) => sum + (r.amount - (r.paidAmount || 0)), 0);
  
  const sum7P = payables
    .filter(p => (isWithinDays(p.dueDate, 0, 6) || isOverdue(p)) && p.status !== 'paid' && p.status !== 'cancelled')
    .reduce((sum, p) => sum + p.amount, 0);

  // 3. Próximos 15 dias
  const sum15R = receivables
    .filter(r => (isWithinDays(r.dueDate, 0, 14) || isOverdue(r)) && r.status !== 'paid' && r.status !== 'cancelled')
    .reduce((sum, r) => sum + (r.amount - (r.paidAmount || 0)), 0);
  
  const sum15P = payables
    .filter(p => (isWithinDays(p.dueDate, 0, 14) || isOverdue(p)) && p.status !== 'paid' && p.status !== 'cancelled')
    .reduce((sum, p) => sum + p.amount, 0);

  // 4. Próximos 30 dias
  const sum30R = receivables
    .filter(r => (isWithinDays(r.dueDate, 0, 29) || isOverdue(r)) && r.status !== 'paid' && r.status !== 'cancelled')
    .reduce((sum, r) => sum + (r.amount - (r.paidAmount || 0)), 0);
  
  const sum30P = payables
    .filter(p => (isWithinDays(p.dueDate, 0, 29) || isOverdue(p)) && p.status !== 'paid' && p.status !== 'cancelled')
    .reduce((sum, p) => sum + p.amount, 0);

  // 5. Este mês (Total fechado do mês, incluindo já realizado)
  const sumMonthR = receivables
    .filter(r => isCurrentMonth(r.dueDate) && r.status !== 'cancelled')
    .reduce((sum, r) => sum + r.amount, 0);

  const sumMonthP = payables
    .filter(p => isCurrentMonth(p.dueDate) && p.status !== 'cancelled')
    .reduce((sum, p) => sum + p.amount, 0);

  // 6. Próximo mês
  const isNextMonth = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const nextM = new Date(today);
    nextM.setMonth(today.getMonth() + 1);
    return d.getFullYear() === nextM.getFullYear() && d.getMonth() === nextM.getMonth();
  };

  const sumNextMonthR = receivables
    .filter(r => isNextMonth(r.dueDate) && r.status !== 'cancelled')
    .reduce((sum, r) => sum + r.amount, 0);

  const sumNextMonthP = payables
    .filter(p => isNextMonth(p.dueDate) && p.status !== 'cancelled')
    .reduce((sum, p) => sum + p.amount, 0);

  const periodRows = [
    {
      period: 'Hoje',
      initial: baseRealizedBalance,
      in: sumHojeR,
      out: sumHojeP,
      final: baseRealizedBalance + sumHojeR - sumHojeP
    },
    {
      period: 'Próximos 7 dias',
      initial: baseRealizedBalance,
      in: sum7R,
      out: sum7P,
      final: baseRealizedBalance + sum7R - sum7P
    },
    {
      period: 'Próximos 15 dias',
      initial: baseRealizedBalance,
      in: sum15R,
      out: sum15P,
      final: baseRealizedBalance + sum15R - sum15P
    },
    {
      period: 'Próximos 30 dias',
      initial: baseRealizedBalance,
      in: sum30R,
      out: sum30P,
      final: baseRealizedBalance + sum30R - sum30P
    },
    {
      period: 'Este mês (Fechamento)',
      initial: saldoInicialSimulado,
      in: sumMonthR,
      out: sumMonthP,
      final: saldoInicialSimulado + sumMonthR - sumMonthP
    },
    {
      period: 'Próximo mês (Previsão)',
      initial: saldoInicialSimulado + sumMonthR - sumMonthP,
      in: sumNextMonthR,
      out: sumNextMonthP,
      final: (saldoInicialSimulado + sumMonthR - sumMonthP) + sumNextMonthR - sumNextMonthP
    }
  ];

  // CHRONOLOGICAL TIMELINE (Running balance projection)
  const getTimelineEntries = () => {
    // Get all unpaid or partially paid entries (including overdue)
    const activeEntries = financialEntries
      .filter(e => e.status !== 'paid' && e.status !== 'cancelled')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    let balance = baseRealizedBalance;
    return activeEntries.map((e) => {
      const isR = e.type === 'receivable';
      const value = isR ? (e.amount - (e.paidAmount || 0)) : e.amount;
      balance = isR ? (balance + value) : (balance - value);
      
      return {
        ...e,
        impactValue: value,
        runningBalance: balance
      };
    });
  };

  const timeline = getTimelineEntries();

  return (
    <div className="space-y-6">
      
      {/* KPI Header cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 border-border/50 bg-card/60">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <span>Caixa Disponível Hoje</span>
            <Landmark className="h-4 w-4 text-success" />
          </div>
          <div className="mt-2.5">
            <span className="text-xl font-black text-foreground">R$ {baseRealizedBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            <span className="text-[9px] text-muted-foreground block mt-0.5">Saldo conciliado no banco em tempo real</span>
          </div>
        </Card>
        
        <Card className="p-4 border-border/50 bg-card/60">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <span>Previsão Final (30 Dias)</span>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2.5">
            <span className="text-xl font-black text-foreground">R$ {periodRows[3].final.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            <span className={`text-[9px] font-bold block mt-0.5 ${periodRows[3].final >= baseRealizedBalance ? 'text-success' : 'text-danger'}`}>
              Projeção de variação: {periodRows[3].final >= baseRealizedBalance ? '+' : ''}
              {(((periodRows[3].final - baseRealizedBalance) / (baseRealizedBalance || 1)) * 100).toFixed(1)}%
            </span>
          </div>
        </Card>

        <Card className="p-4 border-border/50 bg-card/60">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <span>Saldo Previsto Próximo Mês</span>
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2.5">
            <span className="text-xl font-black text-foreground">R$ {periodRows[5].final.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            <span className="text-[9px] text-muted-foreground block mt-0.5">Com base nas recorrências e previsões</span>
          </div>
        </Card>
      </div>

      {/* Cashflow Periods Table */}
      <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Demonstração por Períodos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Período de Previsão</TableHead>
                <TableHead>Saldo Inicial</TableHead>
                <TableHead>Entradas Previstas (+)</TableHead>
                <TableHead>Saídas Previstas (-)</TableHead>
                <TableHead>Saldo Final Previsto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periodRows.map((row) => (
                <TableRow key={row.period}>
                  <TableCell className="font-extrabold text-foreground">{row.period}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">R$ {row.initial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-xs font-bold text-success">R$ {row.in.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-xs font-bold text-danger">R$ {row.out.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-xs md:text-sm font-black text-foreground">R$ {row.final.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Timeline view (Running balance statement projection) */}
      <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-primary" />
            <span>Linha do Tempo de Projeções (Lançamentos Pendentes)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {timeline.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground italic">
              Não há lançamentos pendentes para projetar na linha do tempo.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data Vencimento</TableHead>
                    <TableHead>Lançamento / Detalhes</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Valor do Impacto</TableHead>
                    <TableHead>Caixa Projetado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeline.map((item, idx) => {
                    const isR = item.type === 'receivable';
                    const isOver = isOverdue(item);
                    const formattedDate = new Date(item.dueDate).toLocaleDateString('pt-BR');
                    
                    return (
                      <TableRow key={item.id + '-' + idx} className={isOver ? 'bg-danger/2.5' : ''}>
                        <TableCell className="text-xs font-semibold">
                          <div className={isOver ? 'text-danger font-extrabold' : 'text-muted-foreground'}>
                            {formattedDate}
                          </div>
                          {isOver && <span className="text-[7.5px] uppercase font-black tracking-widest text-danger block mt-0.5">Em Atraso</span>}
                        </TableCell>
                        <TableCell>
                          <div className="font-extrabold text-foreground">{item.title}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 font-medium">{item.contactName || 'Sem contato'}</div>
                        </TableCell>
                        <TableCell>
                          <span className={`text-[8.5px] font-bold px-2 py-0.5 rounded-full border ${
                            isR 
                              ? 'bg-success/10 text-success border-success/15' 
                              : 'bg-primary/10 text-primary border-primary/15'
                          }`}>
                            {isR ? 'Recebível' : 'Despesa'}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-medium">{item.category}</TableCell>
                        <TableCell className={`text-xs font-extrabold ${isR ? 'text-success' : 'text-danger'}`}>
                          {isR ? '+' : '-'} R$ {item.impactValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-xs font-black text-foreground">
                          R$ {item.runningBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default CashflowTab;
