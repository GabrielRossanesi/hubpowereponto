'use client';

import React, { useState } from 'react';
import { Plus, X, Landmark, ToggleLeft, ToggleRight, Sparkles } from 'lucide-react';
import { FinancialRecurrence, RecurrenceFrequency } from '../../types';
import Button from '../ui/button';
import Card, { CardContent, CardHeader, CardTitle } from '../ui/card';
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table';

interface RecurrencesTabProps {
  financialRecurrences: FinancialRecurrence[];
  onAddRecurrence: (recurrence: Omit<FinancialRecurrence, 'id' | 'organizationId' | 'isActive'>) => void;
  onToggleRecurrence: (id: string) => void;
}

interface SimulatedEntry {
  title: string;
  type: 'receivable' | 'payable';
  amount: number;
  dueDate: string;
  category: string;
  contactName: string;
}

export function RecurrencesTab({
  financialRecurrences,
  onAddRecurrence,
  onToggleRecurrence
}: RecurrencesTabProps) {
  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [simulatedEntries, setSimulatedEntries] = useState<SimulatedEntry[]>([]);

  // Form States
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<'receivable' | 'payable'>('receivable');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState('Contrato');
  const [formFrequency, setFormFrequency] = useState<RecurrenceFrequency>('monthly');
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [formNextDueDate, setFormNextDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [formContactName, setFormContactName] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState('pix');

  // Handle open add modal
  const openAddModal = () => {
    setFormTitle('');
    setFormType('receivable');
    setFormAmount('');
    setFormCategory('Contrato');
    setFormFrequency('monthly');
    setFormStartDate(new Date().toISOString().split('T')[0]);
    setFormNextDueDate(new Date().toISOString().split('T')[0]);
    setFormContactName('');
    setFormPaymentMethod('pix');
    setIsAddModalOpen(true);
  };

  // Save Add
  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formAmount || !formStartDate || !formNextDueDate) return;
    const amountVal = parseFloat(formAmount);
    if (isNaN(amountVal) || amountVal <= 0) return;

    onAddRecurrence({
      type: formType,
      title: formTitle,
      amount: amountVal,
      category: formCategory,
      frequency: formFrequency,
      startDate: formStartDate,
      nextDueDate: formNextDueDate,
      clientId: formType === 'receivable' ? 'c_mock' : undefined,
      supplierName: formType === 'payable' ? formContactName.trim() : undefined,
      paymentMethod: formPaymentMethod
    });
    setIsAddModalOpen(false);
  };

  // Run Simulation for next 12 months
  const handleSimulate = () => {
    const simulated: SimulatedEntry[] = [];
    const activeRecs = financialRecurrences.filter(r => r.isActive);

    activeRecs.forEach((rec) => {
      const start = new Date(rec.nextDueDate);
      
      let intervals = 12; // months to project
      let stepMonths = 1;

      if (rec.frequency === 'quarterly') {
        intervals = 4;
        stepMonths = 3;
      } else if (rec.frequency === 'semiannual') {
        intervals = 2;
        stepMonths = 6;
      } else if (rec.frequency === 'annual') {
        intervals = 1;
        stepMonths = 12;
      }

      for (let i = 0; i < intervals; i++) {
        const dueDate = new Date(start);
        dueDate.setMonth(start.getMonth() + i * stepMonths);

        simulated.push({
          title: `${rec.title} (Simulado #${i + 1})`,
          type: rec.type,
          amount: rec.amount,
          dueDate: dueDate.toISOString().split('T')[0],
          category: rec.category,
          contactName: rec.type === 'receivable' ? 'Tech Solutions' : (rec.supplierName || 'Fornecedor')
        });
      }
    });

    // Sort by due date
    simulated.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    setSimulatedEntries(simulated);
  };

  const getFrequencyLabel = (freq: RecurrenceFrequency) => {
    const map = {
      monthly: 'Mensal',
      quarterly: 'Trimestral',
      semiannual: 'Semestral',
      annual: 'Anual'
    };
    return map[freq] || freq;
  };

  return (
    <div className="space-y-6">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-card p-4 rounded-xl border border-border/80 shadow-sm gap-3">
        <div className="flex items-center gap-2">
          <Landmark className="h-5 w-5 text-primary shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-foreground">Gestão de Faturamentos e Despesas Recorrentes</h4>
            <p className="text-[10px] text-muted-foreground">Cadastre contratos recorrentes. Na produção, estas regras geram faturas automaticamente via cron-job.</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-10 text-xs font-bold gap-1.5 border-border hover:bg-muted/30"
            onClick={handleSimulate}
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Simular Projeção (12m)
          </Button>

          <Button
            variant="primary"
            size="sm"
            className="h-10 text-xs font-bold gap-1.5"
            onClick={openAddModal}
          >
            <Plus className="h-4 w-4" />
            Nova Recorrência
          </Button>
        </div>
      </div>

      {/* Recurrences List Card */}
      <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recorrências Ativas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {financialRecurrences.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground italic">
              Nenhuma recorrência cadastrada. Crie uma nova para simular o caixa futuro.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título / Frequência</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Valor Fixo</TableHead>
                    <TableHead>Próximo Vencimento</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {financialRecurrences.map((r) => {
                    const formattedDate = new Date(r.nextDueDate).toLocaleDateString('pt-BR');
                    
                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="font-extrabold text-foreground">{r.title}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 font-semibold">Frequência: {getFrequencyLabel(r.frequency)}</div>
                        </TableCell>
                        <TableCell>
                          <span className={`text-[8.5px] font-bold px-2 py-0.5 rounded-full border ${
                            r.type === 'receivable' 
                              ? 'bg-success/10 text-success border-success/15' 
                              : 'bg-primary/10 text-primary border-primary/15'
                          }`}>
                            {r.type === 'receivable' ? 'Receita' : 'Despesa'}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-medium text-muted-foreground">{r.category}</TableCell>
                        <TableCell className="font-extrabold text-foreground text-xs md:text-sm">
                          R$ {r.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-semibold">{formattedDate}</TableCell>
                        <TableCell className="text-xs font-bold text-foreground uppercase">{r.paymentMethod || 'pix'}</TableCell>
                        <TableCell>
                          <span className={`text-[10px] font-bold ${r.isActive ? 'text-success' : 'text-muted-foreground'}`}>
                            {r.isActive ? 'Ativa' : 'Pausada'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <button
                            onClick={() => onToggleRecurrence(r.id)}
                            className="inline-flex items-center justify-center p-1 rounded-lg hover:bg-muted/40 cursor-pointer text-muted-foreground hover:text-foreground"
                            title={r.isActive ? "Pausar Recorrência" : "Reativar Recorrência"}
                          >
                            {r.isActive ? (
                              <ToggleRight className="h-6 w-6 text-primary" />
                            ) : (
                              <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                            )}
                          </button>
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

      {/* Sandbox Future Projections Panel */}
      {simulatedEntries.length > 0 && (
        <Card className="border-border/40 bg-card/40 backdrop-blur-sm animate-in slide-in-from-bottom-2 duration-300">
          <CardHeader className="flex flex-row justify-between items-center pb-2 border-b border-border/10">
            <div>
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Simulação de Lançamentos Futuros (Próximos 12 meses)</span>
              </CardTitle>
              <p className="text-[10px] text-muted-foreground mt-0.5">Simulação visual de parcelas projetadas a partir das recorrências ativas.</p>
            </div>
            <button 
              onClick={() => setSimulatedEntries([])} 
              className="h-6 w-6 rounded-full hover:bg-muted/40 flex items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </CardHeader>
          <CardContent className="p-0 max-h-96 overflow-y-auto modal-scrollbar">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data Prevista</TableHead>
                  <TableHead>Descrição Simulada</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Valor Previsto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {simulatedEntries.map((sim, idx) => {
                  const isR = sim.type === 'receivable';
                  const formattedDate = new Date(sim.dueDate).toLocaleDateString('pt-BR');
                  
                  return (
                    <TableRow key={idx}>
                      <TableCell className="text-xs text-muted-foreground font-semibold">{formattedDate}</TableCell>
                      <TableCell className="font-extrabold text-foreground">{sim.title}</TableCell>
                      <TableCell>
                        <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full border ${
                          isR 
                            ? 'bg-success/10 text-success border-success/15' 
                            : 'bg-primary/10 text-primary border-primary/15'
                        }`}>
                          {isR ? 'Receita' : 'Despesa'}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-medium">{sim.category}</TableCell>
                      <TableCell className={`text-xs font-black ${isR ? 'text-success' : 'text-danger'}`}>
                        R$ {sim.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border/40 rounded-2xl w-full max-w-lg shadow-2xl p-6 overflow-y-auto max-h-[90vh] modal-scrollbar">
            <div className="flex justify-between items-center border-b border-border/30 pb-3 mb-4">
              <h4 className="font-black text-sm text-foreground uppercase tracking-wider">Criar Recorrência</h4>
              <button onClick={() => setIsAddModalOpen(false)} className="h-6 w-6 rounded-full hover:bg-muted/40 flex items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Tipo de Transação *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      type="button"
                      onClick={() => {
                        setFormType('receivable');
                        setFormCategory('Contrato');
                      }}
                      className={`h-9 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        formType === 'receivable'
                          ? 'bg-success/15 text-success border-success/35 shadow-sm'
                          : 'bg-background text-muted-foreground border-border hover:bg-muted/20'
                      }`}
                    >
                      Receita (Receber)
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        setFormType('payable');
                        setFormCategory('Ferramentas');
                      }}
                      className={`h-9 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        formType === 'payable'
                          ? 'bg-primary/10 text-primary border-primary/30 shadow-sm'
                          : 'bg-background text-muted-foreground border-border hover:bg-muted/20'
                      }`}
                    >
                      Despesa (Pagar)
                    </button>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Frequência *</label>
                  <select 
                    value={formFrequency}
                    onChange={(e) => setFormFrequency(e.target.value as RecurrenceFrequency)}
                    className="h-10 w-full px-2.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="monthly">Mensal</option>
                    <option value="quarterly">Trimestral</option>
                    <option value="semiannual">Semestral</option>
                    <option value="annual">Anual</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Título da Recorrência *</label>
                <input 
                  type="text" 
                  required
                  placeholder="ex: Mensalidade - Tech Solutions"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="h-10 w-full px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Valor Fixo (R$) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="ex: 1200.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="h-10 w-full px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Categoria *</label>
                  {formType === 'receivable' ? (
                    <select 
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="h-10 w-full px-2.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      <option value="Contrato">Contrato</option>
                      <option value="Serviço">Serviço</option>
                      <option value="Consultoria">Consultoria</option>
                      <option value="Outros">Outros</option>
                    </select>
                  ) : (
                    <select 
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="h-10 w-full px-2.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      <option value="Ferramentas">Ferramentas</option>
                      <option value="Infraestrutura">Infraestrutura</option>
                      <option value="Salários">Salários</option>
                      <option value="Aluguel">Aluguel</option>
                      <option value="Contador">Contador</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Freelancer">Freelancer</option>
                      <option value="Outros">Outros</option>
                    </select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Data de Início *</label>
                  <input 
                    type="date" 
                    required
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="h-10 w-full px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Primeiro Vencimento *</label>
                  <input 
                    type="date" 
                    required
                    value={formNextDueDate}
                    onChange={(e) => setFormNextDueDate(e.target.value)}
                    className="h-10 w-full px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Forma de Pagamento</label>
                  <select 
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value)}
                    className="h-10 w-full px-2.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="pix">PIX</option>
                    <option value="credit_card">Cartão de Crédito</option>
                    <option value="boleto">Boleto Bancário</option>
                    <option value="bank_transfer">Transferência Bancária</option>
                    <option value="money">Dinheiro</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Contato / Cliente / Fornecedor</label>
                  <input 
                    type="text" 
                    placeholder="Nome da empresa parceira"
                    value={formContactName}
                    onChange={(e) => setFormContactName(e.target.value)}
                    className="h-10 w-full px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-border/20">
                <Button variant="outline" type="button" onClick={() => setIsAddModalOpen(false)}>Cancelar</Button>
                <Button variant="primary" type="submit" className="font-bold">Criar Recorrência</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecurrencesTab;
