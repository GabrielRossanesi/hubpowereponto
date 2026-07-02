'use client';

import React, { useState } from 'react';
import { Search, Filter, Plus, Edit, Check, X, User, FileText } from 'lucide-react';
import { FinancialEntry, FinancialStatus } from '../../types';
import Button from '../ui/button';
import Card, { CardContent } from '../ui/card';
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table';

interface ReceivablesTabProps {
  financialEntries: FinancialEntry[];
  onAddEntry: (entry: Omit<FinancialEntry, 'id' | 'organizationId' | 'createdAt'>) => void;
  onUpdateEntry: (id: string, entry: Partial<FinancialEntry>) => void;
  onConfirmPayment: (id: string, paidAmount?: number, paidAt?: string) => void;
  onCancelEntry: (id: string) => void;
}

export function ReceivablesTab({
  financialEntries,
  onAddEntry,
  onUpdateEntry,
  onConfirmPayment,
  onCancelEntry
}: ReceivablesTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FinancialEntry | null>(null);
  const [payingEntry, setPayingEntry] = useState<FinancialEntry | null>(null);

  // Form States (Create / Edit)
  const [formTitle, setFormTitle] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formCategory, setFormCategory] = useState('Contrato');
  const [formContactName, setFormContactName] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState('pix');
  const [formDescription, setFormDescription] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Form States (Confirm Payment)
  const [paymentType, setPaymentType] = useState<'total' | 'partial'>('total');
  const [formPaidAmount, setFormPaidAmount] = useState('');
  const [formPaidAt, setFormPaidAt] = useState(new Date().toISOString().split('T')[0]);

  // Today reference for overdue calculations
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getEffectiveStatus = (entry: FinancialEntry): FinancialStatus => {
    if (entry.status === 'paid' || entry.status === 'cancelled') return entry.status;
    if (entry.status === 'overdue') return 'overdue';
    const due = new Date(entry.dueDate);
    if (!isNaN(due.getTime()) && due < today) return 'overdue';
    return entry.status;
  };

  // Filter receivables
  const receivables = financialEntries.filter(e => e.type === 'receivable');

  const filteredReceivables = receivables.filter((r) => {
    const effStatus = getEffectiveStatus(r);
    const matchesSearch = 
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.contactName && r.contactName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      r.category.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = statusFilter === 'all' || effStatus === statusFilter;
    const matchesCategory = categoryFilter === 'all' || r.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const categories = Array.from(new Set(receivables.map(r => r.category)));

  // Badge mapping
  const renderBadge = (status: FinancialStatus) => {
    const config: Record<FinancialStatus, { label: string; className: string }> = {
      pending: { label: 'Pendente', className: 'bg-warning/10 text-warning border-warning/20' },
      paid: { label: 'Recebido', className: 'bg-success/10 text-success border-success/20' },
      overdue: { label: 'Vencido', className: 'bg-danger/10 text-danger border-danger/35 animate-pulse' },
      cancelled: { label: 'Cancelado', className: 'bg-muted-foreground/10 text-muted-foreground border-border' },
      partial: { label: 'Parcial', className: 'bg-info/10 text-info border-info/20' }
    };
    const c = config[status] || { label: status, className: 'bg-muted text-foreground' };
    return (
      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold select-none whitespace-nowrap ${c.className}`}>
        {c.label}
      </span>
    );
  };

  // Handle open add modal
  const openAddModal = () => {
    setFormTitle('');
    setFormAmount('');
    setFormDueDate(new Date().toISOString().split('T')[0]);
    setFormCategory('Contrato');
    setFormContactName('');
    setFormPaymentMethod('pix');
    setFormDescription('');
    setFormNotes('');
    setIsAddModalOpen(true);
  };

  // Handle open edit modal
  const openEditModal = (entry: FinancialEntry) => {
    setEditingEntry(entry);
    setFormTitle(entry.title);
    setFormAmount(entry.amount.toString());
    setFormDueDate(entry.dueDate);
    setFormCategory(entry.category);
    setFormContactName(entry.contactName || '');
    setFormPaymentMethod(entry.paymentMethod || 'pix');
    setFormDescription(entry.description || '');
    setFormNotes(entry.notes || '');
  };

  // Handle open payment confirmation modal
  const openPaymentModal = (entry: FinancialEntry) => {
    setPayingEntry(entry);
    setPaymentType('total');
    setFormPaidAmount((entry.amount - (entry.paidAmount || 0)).toString());
    setFormPaidAt(new Date().toISOString().split('T')[0]);
  };

  // Save Add
  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formAmount || !formDueDate || !formCategory) return;
    const amountVal = parseFloat(formAmount);
    if (isNaN(amountVal) || amountVal <= 0) return;

    onAddEntry({
      type: 'receivable',
      title: formTitle,
      amount: amountVal,
      dueDate: formDueDate,
      category: formCategory,
      contactName: formContactName.trim() || undefined,
      paymentMethod: formPaymentMethod,
      description: formDescription.trim() || undefined,
      notes: formNotes.trim() || undefined,
      status: 'pending'
    });
    setIsAddModalOpen(false);
  };

  // Save Edit
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;
    if (!formTitle.trim() || !formAmount || !formDueDate || !formCategory) return;
    const amountVal = parseFloat(formAmount);
    if (isNaN(amountVal) || amountVal <= 0) return;

    onUpdateEntry(editingEntry.id, {
      title: formTitle,
      amount: amountVal,
      dueDate: formDueDate,
      category: formCategory,
      contactName: formContactName.trim() || undefined,
      paymentMethod: formPaymentMethod,
      description: formDescription.trim() || undefined,
      notes: formNotes.trim() || undefined
    });
    setEditingEntry(null);
  };

  // Save Payment
  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingEntry) return;
    const paidVal = parseFloat(formPaidAmount);
    if (isNaN(paidVal) || paidVal <= 0) return;

    const outstanding = payingEntry.amount - (payingEntry.paidAmount || 0);
    if (paidVal > outstanding) return;

    if (paymentType === 'total' || paidVal === outstanding) {
      // Full payment (adds to existing paidAmount if any)
      const newPaidTotal = (payingEntry.paidAmount || 0) + paidVal;
      onConfirmPayment(payingEntry.id, newPaidTotal, formPaidAt);
    } else {
      // Partial payment
      const newPaidTotal = (payingEntry.paidAmount || 0) + paidVal;
      onUpdateEntry(payingEntry.id, {
        status: 'partial',
        paidAmount: newPaidTotal,
        paidAt: formPaidAt,
        notes: payingEntry.notes 
          ? `${payingEntry.notes}\n[Recebimento parcial de R$ ${paidVal.toLocaleString('pt-BR')} em ${new Date(formPaidAt).toLocaleDateString('pt-BR')}]`
          : `[Recebimento parcial de R$ ${paidVal.toLocaleString('pt-BR')} em ${new Date(formPaidAt).toLocaleDateString('pt-BR')}]`
      });
    }
    setPayingEntry(null);
  };

  return (
    <div className="space-y-6">
      {/* Header filter controls */}
      <div className="flex flex-col xl:flex-row items-center gap-4 justify-between bg-card p-4 rounded-xl border border-border/80 shadow-sm">
        
        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto flex-1">
          <div className="relative w-full sm:w-80 flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Pesquisar por cliente, título, categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-full pl-9 pr-3 rounded-lg border border-border bg-background text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary transition-all placeholder:text-muted-foreground/75"
            />
          </div>

          <div className="relative w-full sm:w-48 flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-10 w-full pl-2 pr-8 rounded-lg bg-background border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer transition-all"
            >
              <option value="all">Todas Categorias</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Button & Status Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-4 justify-between xl:justify-end w-full xl:w-auto">
          <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-thin">
            {['all', 'pending', 'paid', 'overdue', 'partial', 'cancelled'].map((statusKey) => (
              <button
                key={statusKey}
                onClick={() => setStatusFilter(statusKey)}
                className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === statusKey
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-background text-muted-foreground border-border hover:text-foreground hover:bg-muted/20'
                }`}
              >
                {statusKey === 'all' && 'Todos'}
                {statusKey === 'pending' && 'Pendentes'}
                {statusKey === 'paid' && 'Recebidos'}
                {statusKey === 'overdue' && 'Vencidos'}
                {statusKey === 'partial' && 'Parciais'}
                {statusKey === 'cancelled' && 'Cancelados'}
              </button>
            ))}
          </div>

          <Button 
            variant="primary" 
            size="sm" 
            className="w-full sm:w-auto h-10 gap-1.5 font-bold shrink-0"
            onClick={openAddModal}
          >
            <Plus className="h-4 w-4" />
            Novo Recebível
          </Button>
        </div>
      </div>

      {/* Receivables List Container */}
      <Card>
        <CardContent className="p-0">
          {filteredReceivables.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center justify-center">
              <FileText className="h-10 w-10 text-muted-foreground/60 mb-3" />
              <h5 className="text-sm font-bold text-foreground">Nenhum recebível localizado</h5>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                Não localizamos lançamentos para receber com os filtros ativos. Crie um novo lançamento avulso.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título / Descrição</TableHead>
                      <TableHead>Cliente / Contato</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Valor Total</TableHead>
                      <TableHead>Saldo em Aberto</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReceivables.map((r) => {
                      const effStatus = getEffectiveStatus(r);
                      const outstanding = r.amount - (r.paidAmount || 0);
                      const formattedDueDate = new Date(r.dueDate).toLocaleDateString('pt-BR');

                      return (
                        <TableRow key={r.id}>
                          <TableCell>
                            <div className="font-extrabold text-foreground">{r.title}</div>
                            {r.description && <div className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-xs">{r.description}</div>}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-foreground/80">
                              <User className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                              <span className="truncate max-w-[150px]">{r.contactName || <span className="italic text-muted-foreground/50">Não informado</span>}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-muted-foreground">{r.category}</TableCell>
                          <TableCell className="font-extrabold text-foreground text-xs md:text-sm">
                            R$ {r.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-xs font-bold text-foreground">
                            {outstanding > 0 ? (
                              <span className="text-foreground">R$ {outstanding.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            ) : (
                              <span className="text-success font-extrabold">Quitado</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-semibold">
                            {formattedDueDate}
                          </TableCell>
                          <TableCell>{renderBadge(effStatus)}</TableCell>
                          <TableCell className="text-xs font-bold text-foreground uppercase">{r.paymentMethod || 'pix'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {effStatus !== 'paid' && effStatus !== 'cancelled' && (
                                <>
                                  <Button 
                                    variant="primary" 
                                    size="sm" 
                                    className="h-8 w-8 p-0 bg-success hover:bg-success/90 border-success/20 text-white" 
                                    title="Confirmar Recebimento"
                                    onClick={() => openPaymentModal(r)}
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button 
                                    variant="danger" 
                                    size="sm" 
                                    className="h-8 w-8 p-0 border border-danger/20 bg-danger/10 text-danger hover:bg-danger/20" 
                                    title="Cancelar Recebível"
                                    onClick={() => onCancelEntry(r.id)}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 w-8 p-0 border-border hover:bg-muted/20" 
                                title="Editar Recebível"
                                onClick={() => openEditModal(r)}
                              >
                                <Edit className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card List View */}
              <div className="block lg:hidden divide-y divide-border/20">
                {filteredReceivables.map((r) => {
                  const effStatus = getEffectiveStatus(r);
                  const outstanding = r.amount - (r.paidAmount || 0);
                  const formattedDueDate = new Date(r.dueDate).toLocaleDateString('pt-BR');

                  return (
                    <div key={r.id} className="p-4 space-y-3.5">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <h6 className="font-extrabold text-foreground text-sm truncate">{r.title}</h6>
                          <span className="text-[10px] text-muted-foreground block font-medium mt-0.5">{r.category} • {r.contactName || 'Sem contato'}</span>
                        </div>
                        {renderBadge(effStatus)}
                      </div>

                      <div className="flex justify-between items-center text-xs border-t border-border/10 pt-2.5">
                        <div>
                          <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider">Valor total</span>
                          <span className="font-black text-foreground">R$ {r.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider">Saldo em aberto</span>
                          <span className="font-black text-foreground">
                            {outstanding > 0 ? `R$ ${outstanding.toLocaleString('pt-BR')}` : 'Quitado'}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-xs">
                        <div>
                          <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider">Vencimento</span>
                          <span className="font-semibold text-muted-foreground">{formattedDueDate}</span>
                        </div>
                        {r.paymentMethod && (
                          <div className="text-right">
                            <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider">Método</span>
                            <span className="font-bold text-foreground uppercase">{r.paymentMethod}</span>
                          </div>
                        )}
                      </div>

                      {/* Mobil Actions Panel */}
                      <div className="flex gap-2 justify-end pt-2 border-t border-border/10">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 gap-1.5 flex-1 max-w-[120px] text-[11px] font-bold border-border"
                          onClick={() => openEditModal(r)}
                        >
                          <Edit className="h-3 w-3" /> Editar
                        </Button>
                        {effStatus !== 'paid' && effStatus !== 'cancelled' && (
                          <>
                            <Button 
                              variant="danger" 
                              size="sm" 
                              className="h-8 gap-1 border border-danger/20 bg-danger/10 text-danger hover:bg-danger/20 shrink-0" 
                              onClick={() => onCancelEntry(r.id)}
                              title="Cancelar Lançamento"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                              variant="primary" 
                              size="sm" 
                              className="h-8 gap-1 flex-1 text-[11px] font-bold bg-success hover:bg-success/90 border-success/20 text-white"
                              onClick={() => openPaymentModal(r)}
                            >
                              <Check className="h-3 w-3" /> Receber
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border/40 rounded-2xl w-full max-w-lg shadow-2xl p-6 overflow-y-auto max-h-[90vh] modal-scrollbar">
            <div className="flex justify-between items-center border-b border-border/30 pb-3 mb-4">
              <h4 className="font-black text-sm text-foreground uppercase tracking-wider">Lançar Novo Recebível</h4>
              <button onClick={() => setIsAddModalOpen(false)} className="h-6 w-6 rounded-full hover:bg-muted/40 flex items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Título do Lançamento *</label>
                <input 
                  type="text" 
                  required
                  placeholder="ex: Mensalidade Julho - Cliente Y"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="h-10 w-full px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Valor do Lançamento (R$) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="ex: 1500.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="h-10 w-full px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Data de Vencimento *</label>
                  <input 
                    type="date" 
                    required
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="h-10 w-full px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Categoria *</label>
                  <select 
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="h-10 w-full px-2.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
                  >
                    <option value="Contrato">Contrato</option>
                    <option value="Serviço">Serviço</option>
                    <option value="Consultoria">Consultoria</option>
                    <option value="Desenvolvimento">Desenvolvimento</option>
                    <option value="Design">Design</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Cliente / Contato</label>
                  <input 
                    type="text" 
                    placeholder="Nome do cliente"
                    value={formContactName}
                    onChange={(e) => setFormContactName(e.target.value)}
                    className="h-10 w-full px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Método de Recebimento</label>
                  <select 
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value)}
                    className="h-10 w-full px-2.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
                  >
                    <option value="pix">PIX</option>
                    <option value="credit_card">Cartão de Crédito</option>
                    <option value="boleto">Boleto Bancário</option>
                    <option value="bank_transfer">Transferência Bancária</option>
                    <option value="money">Dinheiro</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Descrição Curta</label>
                  <input 
                    type="text" 
                    placeholder="Descrição do serviço"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="h-10 w-full px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Observações Internas</label>
                <textarea 
                  placeholder="Instruções adicionais de cobrança..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="h-20 w-full p-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-border/20">
                <Button variant="outline" type="button" onClick={() => setIsAddModalOpen(false)}>Cancelar</Button>
                <Button variant="primary" type="submit" className="font-bold">Salvar Recebível</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border/40 rounded-2xl w-full max-w-lg shadow-2xl p-6 overflow-y-auto max-h-[90vh] modal-scrollbar">
            <div className="flex justify-between items-center border-b border-border/30 pb-3 mb-4">
              <h4 className="font-black text-sm text-foreground uppercase tracking-wider">Editar Recebível</h4>
              <button onClick={() => setEditingEntry(null)} className="h-6 w-6 rounded-full hover:bg-muted/40 flex items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Título do Lançamento *</label>
                <input 
                  type="text" 
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="h-10 w-full px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Valor do Lançamento (R$) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0.01"
                    required
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="h-10 w-full px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Data de Vencimento *</label>
                  <input 
                    type="date" 
                    required
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="h-10 w-full px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Categoria *</label>
                  <select 
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="h-10 w-full px-2.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
                  >
                    <option value="Contrato">Contrato</option>
                    <option value="Serviço">Serviço</option>
                    <option value="Consultoria">Consultoria</option>
                    <option value="Desenvolvimento">Desenvolvimento</option>
                    <option value="Design">Design</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Cliente / Contato</label>
                  <input 
                    type="text" 
                    value={formContactName}
                    onChange={(e) => setFormContactName(e.target.value)}
                    className="h-10 w-full px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Método de Recebimento</label>
                  <select 
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value)}
                    className="h-10 w-full px-2.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
                  >
                    <option value="pix">PIX</option>
                    <option value="credit_card">Cartão de Crédito</option>
                    <option value="boleto">Boleto Bancário</option>
                    <option value="bank_transfer">Transferência Bancária</option>
                    <option value="money">Dinheiro</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Descrição Curta</label>
                  <input 
                    type="text" 
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="h-10 w-full px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Observações Internas</label>
                <textarea 
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="h-20 w-full p-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-border/20">
                <Button variant="outline" type="button" onClick={() => setEditingEntry(null)}>Cancelar</Button>
                <Button variant="primary" type="submit" className="font-bold">Salvar Alterações</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Payment Modal */}
      {payingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border/40 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex justify-between items-center border-b border-border/30 pb-3 mb-4">
              <h4 className="font-black text-sm text-foreground uppercase tracking-wider">Confirmar Recebimento</h4>
              <button onClick={() => setPayingEntry(null)} className="h-6 w-6 rounded-full hover:bg-muted/40 flex items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="space-y-4">
              <div className="p-3 bg-muted/20 border border-border/30 rounded-lg text-xs space-y-1">
                <span className="text-muted-foreground block">Lançamento: <strong className="text-foreground">{payingEntry.title}</strong></span>
                <span className="text-muted-foreground block">Valor do Lançamento: <strong className="text-foreground">R$ {payingEntry.amount.toLocaleString('pt-BR')}</strong></span>
                {payingEntry.paidAmount && (
                  <span className="text-muted-foreground block">Valor já recebido: <strong className="text-success font-bold">R$ {payingEntry.paidAmount.toLocaleString('pt-BR')}</strong></span>
                )}
                <span className="text-muted-foreground block">Restante em aberto: <strong className="text-foreground">R$ {(payingEntry.amount - (payingEntry.paidAmount || 0)).toLocaleString('pt-BR')}</strong></span>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Tipo de Liquidação</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button"
                    onClick={() => {
                      setPaymentType('total');
                      setFormPaidAmount((payingEntry.amount - (payingEntry.paidAmount || 0)).toString());
                    }}
                    className={`h-9 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                      paymentType === 'total'
                        ? 'bg-primary/10 text-primary border-primary/30 shadow-sm'
                        : 'bg-background text-muted-foreground border-border hover:bg-muted/25'
                    }`}
                  >
                    Recebimento Total
                  </button>
                  <button 
                    type="button"
                    onClick={() => setPaymentType('partial')}
                    className={`h-9 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                      paymentType === 'partial'
                        ? 'bg-primary/10 text-primary border-primary/30 shadow-sm'
                        : 'bg-background text-muted-foreground border-border hover:bg-muted/25'
                    }`}
                  >
                    Recebimento Parcial
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Valor Recebido (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0.01"
                    max={payingEntry.amount - (payingEntry.paidAmount || 0)}
                    disabled={paymentType === 'total'}
                    required
                    value={formPaidAmount}
                    onChange={(e) => setFormPaidAmount(e.target.value)}
                    className="h-10 w-full px-3 rounded-lg border border-border bg-background disabled:bg-muted/30 text-sm text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Data de Recebimento</label>
                  <input 
                    type="date" 
                    required
                    value={formPaidAt}
                    onChange={(e) => setFormPaidAt(e.target.value)}
                    className="h-10 w-full px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-border/20">
                <Button variant="outline" type="button" onClick={() => setPayingEntry(null)}>Cancelar</Button>
                <Button variant="primary" type="submit" className="font-bold bg-success hover:bg-success/90 border-success/20 text-white">Confirmar</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReceivablesTab;
