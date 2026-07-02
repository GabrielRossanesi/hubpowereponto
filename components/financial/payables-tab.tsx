'use client';

import React, { useState } from 'react';
import { Search, Filter, Plus, Edit, Check, X, Truck, FileText } from 'lucide-react';
import { FinancialEntry, FinancialStatus } from '../../types';
import Button from '../ui/button';
import Card, { CardContent } from '../ui/card';
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table';

interface PayablesTabProps {
  financialEntries: FinancialEntry[];
  onAddEntry: (entry: Omit<FinancialEntry, 'id' | 'organizationId' | 'createdAt'>) => void;
  onUpdateEntry: (id: string, entry: Partial<FinancialEntry>) => void;
  onConfirmPayment: (id: string, paidAmount?: number, paidAt?: string) => void;
  onCancelEntry: (id: string) => void;
}

export function PayablesTab({
  financialEntries,
  onAddEntry,
  onUpdateEntry,
  onConfirmPayment,
  onCancelEntry
}: PayablesTabProps) {
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
  const [formCategory, setFormCategory] = useState('Ferramentas');
  const [formSupplierName, setFormSupplierName] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState('credit_card');
  const [formDescription, setFormDescription] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Form States (Confirm Payment)
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

  // Filter payables
  const payables = financialEntries.filter(e => e.type === 'payable');

  const filteredPayables = payables.filter((p) => {
    const effStatus = getEffectiveStatus(p);
    const matchesSearch = 
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.contactName && p.contactName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = statusFilter === 'all' || effStatus === statusFilter;
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const categories = Array.from(new Set(payables.map(p => p.category)));

  // Badge mapping
  const renderBadge = (status: FinancialStatus) => {
    const config: Record<FinancialStatus, { label: string; className: string }> = {
      pending: { label: 'A pagar', className: 'bg-warning/10 text-warning border-warning/20' },
      paid: { label: 'Pago', className: 'bg-success/10 text-success border-success/20' },
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
    setFormCategory('Ferramentas');
    setFormSupplierName('');
    setFormPaymentMethod('credit_card');
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
    setFormSupplierName(entry.contactName || '');
    setFormPaymentMethod(entry.paymentMethod || 'credit_card');
    setFormDescription(entry.description || '');
    setFormNotes(entry.notes || '');
  };

  // Save Add
  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formAmount || !formDueDate || !formCategory) return;
    const amountVal = parseFloat(formAmount);
    if (isNaN(amountVal) || amountVal <= 0) return;

    onAddEntry({
      type: 'payable',
      title: formTitle,
      amount: amountVal,
      dueDate: formDueDate,
      category: formCategory,
      contactName: formSupplierName.trim() || undefined,
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
      contactName: formSupplierName.trim() || undefined,
      paymentMethod: formPaymentMethod,
      description: formDescription.trim() || undefined,
      notes: formNotes.trim() || undefined
    });
    setEditingEntry(null);
  };

  // Save Payment Confirmation
  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingEntry) return;
    onConfirmPayment(payingEntry.id, payingEntry.amount, formPaidAt);
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
              placeholder="Pesquisar por fornecedor, despesa, categoria..."
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
            {['all', 'pending', 'paid', 'overdue', 'cancelled'].map((statusKey) => (
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
                {statusKey === 'pending' && 'A pagar'}
                {statusKey === 'paid' && 'Pagos'}
                {statusKey === 'overdue' && 'Vencidos'}
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
            Nova Despesa
          </Button>
        </div>
      </div>

      {/* Payables List Container */}
      <Card>
        <CardContent className="p-0">
          {filteredPayables.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center justify-center">
              <FileText className="h-10 w-10 text-muted-foreground/60 mb-3" />
              <h5 className="text-sm font-bold text-foreground">Nenhuma despesa localizada</h5>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                Não localizamos contas a pagar com os filtros selecionados. Lance um novo pagamento.
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
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Recorrente</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayables.map((p) => {
                      const effStatus = getEffectiveStatus(p);
                      const formattedDueDate = new Date(p.dueDate).toLocaleDateString('pt-BR');

                      return (
                        <TableRow key={p.id}>
                          <TableCell>
                            <div className="font-extrabold text-foreground">{p.title}</div>
                            {p.description && <div className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-xs">{p.description}</div>}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-foreground/80">
                              <Truck className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                              <span className="truncate max-w-[150px]">{p.contactName || <span className="italic text-muted-foreground/50">Não informado</span>}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-muted-foreground">{p.category}</TableCell>
                          <TableCell className="font-extrabold text-foreground text-xs md:text-sm">
                            R$ {p.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-semibold">
                            {formattedDueDate}
                          </TableCell>
                          <TableCell>{renderBadge(effStatus)}</TableCell>
                          <TableCell>
                            {p.isRecurring ? (
                              <span className="bg-primary/10 text-primary border border-primary/20 text-[9px] font-black px-1.5 py-0.5 rounded-full">Recorrente</span>
                            ) : (
                              <span className="text-[9px] text-muted-foreground italic font-medium">Avulso</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs font-bold text-foreground uppercase">{p.paymentMethod || 'credit_card'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {effStatus !== 'paid' && effStatus !== 'cancelled' && (
                                <>
                                  <Button 
                                    variant="primary" 
                                    size="sm" 
                                    className="h-8 w-8 p-0 bg-success hover:bg-success/90 border-success/20 text-white" 
                                    title="Marcar como Pago"
                                    onClick={() => setPayingEntry(p)}
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button 
                                    variant="danger" 
                                    size="sm" 
                                    className="h-8 w-8 p-0 border border-danger/20 bg-danger/10 text-danger hover:bg-danger/20" 
                                    title="Cancelar Lançamento"
                                    onClick={() => onCancelEntry(p.id)}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 w-8 p-0 border-border hover:bg-muted/20" 
                                title="Editar Despesa"
                                onClick={() => openEditModal(p)}
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
                {filteredPayables.map((p) => {
                  const effStatus = getEffectiveStatus(p);
                  const formattedDueDate = new Date(p.dueDate).toLocaleDateString('pt-BR');

                  return (
                    <div key={p.id} className="p-4 space-y-3.5">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <h6 className="font-extrabold text-foreground text-sm truncate">{p.title}</h6>
                          <span className="text-[10px] text-muted-foreground block font-medium mt-0.5">{p.category} • {p.contactName || 'Sem fornecedor'}</span>
                        </div>
                        {renderBadge(effStatus)}
                      </div>

                      <div className="flex justify-between items-center text-xs border-t border-border/10 pt-2.5">
                        <div>
                          <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider">Valor total</span>
                          <span className="font-black text-foreground">R$ {p.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider">Vencimento</span>
                          <span className="font-semibold text-muted-foreground">{formattedDueDate}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-xs">
                        <div>
                          <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider">Recorrência</span>
                          <span>
                            {p.isRecurring ? (
                              <span className="text-primary font-bold text-[9px]">Mensal</span>
                            ) : (
                              <span className="text-muted-foreground italic text-[9px]">Avulso</span>
                            )}
                          </span>
                        </div>
                        {p.paymentMethod && (
                          <div className="text-right">
                            <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider">Método</span>
                            <span className="font-bold text-foreground uppercase">{p.paymentMethod}</span>
                          </div>
                        )}
                      </div>

                      {/* Mobil Actions Panel */}
                      <div className="flex gap-2 justify-end pt-2 border-t border-border/10">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 gap-1.5 flex-1 max-w-[120px] text-[11px] font-bold border-border"
                          onClick={() => openEditModal(p)}
                        >
                          <Edit className="h-3 w-3" /> Editar
                        </Button>
                        {effStatus !== 'paid' && effStatus !== 'cancelled' && (
                          <>
                            <Button 
                              variant="danger" 
                              size="sm" 
                              className="h-8 gap-1 border border-danger/20 bg-danger/10 text-danger hover:bg-danger/20 shrink-0" 
                              onClick={() => onCancelEntry(p.id)}
                              title="Cancelar Despesa"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                              variant="primary" 
                              size="sm" 
                              className="h-8 gap-1 flex-1 text-[11px] font-bold bg-success hover:bg-success/90 border-success/20 text-white"
                              onClick={() => setPayingEntry(p)}
                            >
                              <Check className="h-3 w-3" /> Pagar
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
              <h4 className="font-black text-sm text-foreground uppercase tracking-wider">Lançar Nova Despesa</h4>
              <button onClick={() => setIsAddModalOpen(false)} className="h-6 w-6 rounded-full hover:bg-muted/40 flex items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Título da Despesa *</label>
                <input 
                  type="text" 
                  required
                  placeholder="ex: Conta de Luz - Julho"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="h-10 w-full px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Valor (R$) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="ex: 350.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="h-10 w-full px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Data de Vencimento *</label>
                  <input 
                    type="date" 
                    required
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="h-10 w-full px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Categoria *</label>
                  <select 
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="h-10 w-full px-2.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="Ferramentas">Ferramentas</option>
                    <option value="Infraestrutura">Infraestrutura</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Salários">Salários</option>
                    <option value="Aluguel">Aluguel</option>
                    <option value="Contador">Contador</option>
                    <option value="Impostos">Impostos</option>
                    <option value="Freelancer">Freelancer</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Fornecedor</label>
                  <input 
                    type="text" 
                    placeholder="Nome do fornecedor"
                    value={formSupplierName}
                    onChange={(e) => setFormSupplierName(e.target.value)}
                    className="h-10 w-full px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
                    <option value="credit_card">Cartão de Crédito</option>
                    <option value="pix">PIX</option>
                    <option value="boleto">Boleto Bancário</option>
                    <option value="bank_transfer">Transferência Bancária</option>
                    <option value="money">Dinheiro</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Descrição Curta</label>
                  <input 
                    type="text" 
                    placeholder="Descrição da despesa"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="h-10 w-full px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Observações Internas</label>
                <textarea 
                  placeholder="Informações adicionais da nota fiscal ou pagamento..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="h-20 w-full p-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-border/20">
                <Button variant="outline" type="button" onClick={() => setIsAddModalOpen(false)}>Cancelar</Button>
                <Button variant="primary" type="submit" className="font-bold">Salvar Lançamento</Button>
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
              <h4 className="font-black text-sm text-foreground uppercase tracking-wider">Editar Despesa</h4>
              <button onClick={() => setEditingEntry(null)} className="h-6 w-6 rounded-full hover:bg-muted/40 flex items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Título da Despesa *</label>
                <input 
                  type="text" 
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="h-10 w-full px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Valor (R$) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0.01"
                    required
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="h-10 w-full px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Data de Vencimento *</label>
                  <input 
                    type="date" 
                    required
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="h-10 w-full px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Categoria *</label>
                  <select 
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="h-10 w-full px-2.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="Ferramentas">Ferramentas</option>
                    <option value="Infraestrutura">Infraestrutura</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Salários">Salários</option>
                    <option value="Aluguel">Aluguel</option>
                    <option value="Contador">Contador</option>
                    <option value="Impostos">Impostos</option>
                    <option value="Freelancer">Freelancer</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Fornecedor</label>
                  <input 
                    type="text" 
                    value={formSupplierName}
                    onChange={(e) => setFormSupplierName(e.target.value)}
                    className="h-10 w-full px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
                    <option value="credit_card">Cartão de Crédito</option>
                    <option value="pix">PIX</option>
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
                    className="h-10 w-full px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Observações Internas</label>
                <textarea 
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="h-20 w-full p-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
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
          <div className="bg-card border border-border/40 rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex justify-between items-center border-b border-border/30 pb-3 mb-4">
              <h4 className="font-black text-sm text-foreground uppercase tracking-wider">Confirmar Pagamento</h4>
              <button onClick={() => setPayingEntry(null)} className="h-6 w-6 rounded-full hover:bg-muted/40 flex items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="space-y-4">
              <div className="p-3 bg-muted/20 border border-border/30 rounded-lg text-xs space-y-1">
                <span className="text-muted-foreground block">Despesa: <strong className="text-foreground">{payingEntry.title}</strong></span>
                <span className="text-muted-foreground block">Fornecedor: <strong className="text-foreground">{payingEntry.contactName || 'Sem fornecedor'}</strong></span>
                <span className="text-muted-foreground block">Valor a pagar: <strong className="text-danger font-bold">R$ {payingEntry.amount.toLocaleString('pt-BR')}</strong></span>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Data de Pagamento</label>
                <input 
                  type="date" 
                  required
                  value={formPaidAt}
                  onChange={(e) => setFormPaidAt(e.target.value)}
                  className="h-10 w-full px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-border/20">
                <Button variant="outline" type="button" onClick={() => setPayingEntry(null)}>Cancelar</Button>
                 <Button variant="primary" type="submit" className="font-bold bg-success hover:bg-success/90 border-success/20 text-white">Marcar como Pago</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default PayablesTab;
