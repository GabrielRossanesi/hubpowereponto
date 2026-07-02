'use client';

import React, { useState } from 'react';
import { Download, BarChart2, CheckCircle, AlertTriangle } from 'lucide-react';
import { FinancialEntry } from '../../types';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/card';
import Button from '../ui/button';
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table';

interface ReportsTabProps {
  financialEntries: FinancialEntry[];
}

export function ReportsTab({ financialEntries }: ReportsTabProps) {
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isOverdue = (entry: FinancialEntry) => {
    if (entry.status === 'paid' || entry.status === 'cancelled') return false;
    if (entry.status === 'overdue') return true;
    const due = new Date(entry.dueDate);
    return !isNaN(due.getTime()) && due < today;
  };

  const receivables = financialEntries.filter(e => e.type === 'receivable');
  const payables = financialEntries.filter(e => e.type === 'payable');

  // 1. Entradas por categoria
  const entriesByCategory: Record<string, number> = {};
  receivables.forEach(r => {
    if (r.status !== 'cancelled') {
      entriesByCategory[r.category] = (entriesByCategory[r.category] || 0) + r.amount;
    }
  });
  const totalEntries = Object.values(entriesByCategory).reduce((sum, v) => sum + v, 0) || 1;
  const entriesReport = Object.entries(entriesByCategory)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: (amount / totalEntries) * 100
    }))
    .sort((a, b) => b.amount - a.amount);

  // 2. Saídas por categoria
  const exitsByCategory: Record<string, number> = {};
  payables.forEach(p => {
    if (p.status !== 'cancelled') {
      exitsByCategory[p.category] = (exitsByCategory[p.category] || 0) + p.amount;
    }
  });
  const totalExits = Object.values(exitsByCategory).reduce((sum, v) => sum + v, 0) || 1;
  const exitsReport = Object.entries(exitsByCategory)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: (amount / totalExits) * 100
    }))
    .sort((a, b) => b.amount - a.amount);

  // 3. Clientes Inadimplentes (Overdue Receivables)
  const overdueClients = receivables.filter(r => isOverdue(r));

  // 4. Fornecedores Pagos (Paid Payables)
  const paidSuppliers = payables.filter(p => p.status === 'paid');

  // Handle CSV Export simulation
  const handleExportCSV = () => {
    const totalLines = financialEntries.length;
    setExportMessage(`Exportação executada! ${totalLines} lançamentos gravados em "export_financeiro_${new Date().toISOString().split('T')[0]}.csv".`);
    setTimeout(() => {
      setExportMessage(null);
    }, 4500);
  };

  return (
    <div className="space-y-6">
      
      {/* Export row */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-card p-4 rounded-xl border border-border/80 shadow-sm gap-3">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-primary shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-foreground">Relatórios Analíticos do Sandbox</h4>
            <p className="text-[10px] text-muted-foreground">Consulte faturamentos, custos operacionais e exporte planilhas de auditoria fiscal.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto shrink-0">
          {exportMessage && (
            <div className="text-[10px] font-bold text-success bg-success/15 border border-success/30 px-3 py-2 rounded-lg animate-in fade-in slide-in-from-right-1 duration-200">
              {exportMessage}
            </div>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportCSV}
            className="h-10 text-xs font-bold gap-1.5 border-border hover:bg-muted/30 w-full sm:w-auto"
          >
            <Download className="h-3.5 w-3.5 text-primary" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Category Breakdown (Entradas vs Saídas) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Entradas */}
        <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Receitas por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {entriesReport.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground italic">Nenhum faturamento registrado.</div>
            ) : (
              entriesReport.map((item) => (
                <div key={item.category} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-foreground">
                    <span>{item.category}</span>
                    <span>R$ {item.amount.toLocaleString('pt-BR')} ({item.percentage.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 w-full bg-muted/65 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-success/80 rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Saídas */}
        <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Despesas por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {exitsReport.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground italic">Nenhuma despesa registrada.</div>
            ) : (
              exitsReport.map((item) => (
                <div key={item.category} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-foreground">
                    <span>{item.category}</span>
                    <span>R$ {item.amount.toLocaleString('pt-BR')} ({item.percentage.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 w-full bg-muted/65 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary/75 rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Clientes Inadimplentes & Fornecedores Quitados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Inadimplência */}
        <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
          <CardHeader className="flex flex-row justify-between items-center pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-danger shrink-0" />
              <span>Clientes com Cobranças Vencidas</span>
            </CardTitle>
            <span className="text-[10px] font-black text-danger bg-danger/10 border border-danger/20 px-2 py-0.5 rounded-full">
              Inadimplência
            </span>
          </CardHeader>
          <CardContent className="p-0 max-h-64 overflow-y-auto modal-scrollbar">
            {overdueClients.length === 0 ? (
              <div className="p-12 text-center text-xs text-muted-foreground italic">
                Excelente! Nenhuma pendência em atraso no momento.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente / Lançamento</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Valor Devido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueClients.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="font-extrabold text-foreground">{c.contactName || 'Cliente Genérico'}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 font-medium">{c.title}</div>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-danger">
                        {new Date(c.dueDate).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-xs font-black text-foreground">
                        R$ {(c.amount - (c.paidAmount || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Fornecedores Pagos */}
        <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
          <CardHeader className="flex flex-row justify-between items-center pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-success shrink-0" />
              <span>Fornecedores Liquidados</span>
            </CardTitle>
            <span className="text-[10px] font-black text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded-full">
              Histórico Pago
            </span>
          </CardHeader>
          <CardContent className="p-0 max-h-64 overflow-y-auto modal-scrollbar">
            {paidSuppliers.length === 0 ? (
              <div className="p-12 text-center text-xs text-muted-foreground italic">
                Nenhum pagamento efetuado no banco local.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fornecedor / Despesa</TableHead>
                    <TableHead>Data Pagamento</TableHead>
                    <TableHead>Valor Pago</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paidSuppliers.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="font-extrabold text-foreground">{s.contactName || 'Fornecedor'}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 font-medium">{s.title}</div>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-muted-foreground">
                        {s.paidAt ? new Date(s.paidAt).toLocaleDateString('pt-BR') : new Date(s.dueDate).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-xs font-black text-foreground">
                        R$ {s.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ReportsTab;
