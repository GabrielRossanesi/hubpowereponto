'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Search, Filter, Eye, Building2, SearchCode, Edit3, Archive, RotateCcw } from 'lucide-react';
import { useTenantStore } from '../../lib/store';
import { useMounted } from '../../hooks/useMounted';
import { PageHeader as UIHeader } from '../../components/ui/page-header';
import Button from '../../components/ui/button';
import Input from '../../components/ui/input';
import Textarea from '../../components/ui/textarea';
import Select from '../../components/ui/select';
import Modal from '../../components/ui/modal';
import Card, { CardContent } from '../../components/ui/card';
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import StatusBadge from '../../components/ui/status-badge';
import EmptyState from '../../components/ui/empty-state';
import { ClientStatus, Client } from '../../types';
import { isDatabaseDataMode } from '../../lib/data-mode';
import { getClients, createClient, updateClient, archiveClient, restoreClient } from './actions';

export default function ClientesPage() {
  const mounted = useMounted();
  const isDatabaseMode = isDatabaseDataMode;

  // Sandbox Store
  const sandboxStore = useTenantStore();

  // Database States
  const [dbClients, setDbClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(isDatabaseMode);

  // Common UI States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Form States
  const [nome, setNome] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [responsavel, setResponsavel] = useState('Ana Silva');
  const [status, setStatus] = useState<ClientStatus>('lead');
  const [observacoes, setObservacoes] = useState('');

  // CNPJ search simulation states
  const [isSearchingCnpj, setIsSearchingCnpj] = useState(false);
  const [cnpjSearchMessage, setCnpjSearchMessage] = useState('');

  // Load clients in database mode
  const loadClients = useCallback(async () => {
    if (!isDatabaseMode) return;
    try {
      const fetched = await getClients(true); // Include archived for client-side status filtering
      setDbClients(fetched);
    } catch (err) {
      console.error('Erro ao carregar clientes:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isDatabaseMode]);

  useEffect(() => {
    let active = true;
    if (isDatabaseMode) {
      const fetchInitial = async () => {
        try {
          const fetched = await getClients(true);
          if (active) {
            setDbClients(fetched);
            setIsLoading(false);
          }
        } catch (err) {
          console.error('Erro ao carregar clientes inicialmente:', err);
          if (active) setIsLoading(false);
        }
      };
      fetchInitial();
    }
    return () => {
      active = false;
    };
  }, [isDatabaseMode]);

  if (!mounted || (isDatabaseMode && isLoading && dbClients.length === 0)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
      </div>
    );
  }

  // Active client list based on mode
  const activeClients = isDatabaseMode ? dbClients : sandboxStore.clients;

  // Filter clients locally
  const filteredClients = activeClients.filter((client) => {
    const matchesSearch = 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.cnpj.replace(/\D/g, '').includes(searchTerm.replace(/\D/g, '')) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase());
      
    // If 'all', hide archived ones in database mode
    const matchesStatus = 
      statusFilter === 'all'
        ? client.commercialStatus !== 'archived'
        : client.commercialStatus === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Handle CNPJ search simulation
  const handleCnpjSearch = () => {
    if (!cnpj) {
      setCnpjSearchMessage('Digite um documento para consultar.');
      return;
    }
    
    setIsSearchingCnpj(true);
    setCnpjSearchMessage('');
    
    setTimeout(() => {
      const result = sandboxStore.simulateCnpjSearch(cnpj);
      setIsSearchingCnpj(false);
      
      if (result) {
        setEmpresa(result.companyName);
        setObservacoes(
          `Endereço: ${result.address}, ${result.city}-${result.state}\n` +
          `Situação Cadastral: ${result.status}\n` +
          `Atividade Principal: ${result.activity}\n` +
          (observacoes ? `\nObservações Adicionais:\n${observacoes}` : '')
        );
        setCnpjSearchMessage('Dados preenchidos automaticamente! ✅');
      } else {
        setCnpjSearchMessage('Documento inválido ou simulado não encontrado.');
      }
    }, 1000);
  };

  const handleOpenCreateModal = () => {
    setEditingClient(null);
    setNome('');
    setEmpresa('');
    setCnpj('');
    setTelefone('');
    setEmail('');
    setResponsavel('Ana Silva');
    setStatus('lead');
    setObservacoes('');
    setCnpjSearchMessage('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (client: Client) => {
    setEditingClient(client);
    setNome(client.name);
    setEmpresa(client.companyName);
    setCnpj(client.cnpj);
    setTelefone(client.phone);
    setEmail(client.email);
    setResponsavel(client.responsibleUser);
    setStatus(client.commercialStatus);
    setObservacoes(client.notes || '');
    setCnpjSearchMessage('');
    setIsModalOpen(true);
  };

  const handleArchiveClient = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja arquivar este cliente?')) return;
    try {
      setIsLoading(true);
      await archiveClient(id);
      await loadClients();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao arquivar cliente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreClient = async (id: string) => {
    try {
      setIsLoading(true);
      await restoreClient(id);
      await loadClients();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao restaurar cliente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validations
    if (!empresa.trim()) {
      alert('Razão Social / Nome da Empresa é obrigatório.');
      return;
    }
    if (!nome.trim()) {
      alert('Nome do Contato Principal é obrigatório.');
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert('Por favor, informe um e-mail em formato válido.');
      return;
    }

    if (isDatabaseMode) {
      setIsLoading(true);
      try {
        const payload = {
          name: nome,
          companyName: empresa,
          cnpj: cnpj,
          phone: telefone,
          email: email,
          responsibleUser: responsavel,
          commercialStatus: status,
          notes: observacoes
        };

        if (editingClient) {
          await updateClient(editingClient.id, payload);
        } else {
          await createClient(payload);
        }

        await loadClients();
        setIsModalOpen(false);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Erro ao salvar cliente.');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Sandbox mode original logic (with fallback validations)
      if (!nome || !empresa || !cnpj || !email) {
        alert('Nome, empresa, CNPJ e e-mail são obrigatórios no modo sandbox.');
        return;
      }

      const result = sandboxStore.addClient({
        name: nome,
        companyName: empresa,
        cnpj: cnpj,
        phone: telefone,
        email: email,
        responsibleUser: responsavel,
        commercialStatus: status,
        notes: observacoes
      });
      
      if (!result) {
        alert('Limite do Plano Atingido! Faça o upgrade do seu plano nas Configurações para continuar.');
        return;
      }
      setIsModalOpen(false);
    }
  };

  const teamOptions = sandboxStore.teamMembers.map(m => ({ value: m.name, label: m.name }));
  const statusOptions = isDatabaseMode
    ? [
        { value: 'lead', label: 'Lead' },
        { value: 'onboarding', label: 'Onboarding' },
        { value: 'active', label: 'Ativo' },
        { value: 'inactive', label: 'Inativo' },
        { value: 'archived', label: 'Arquivado' }
      ]
    : [
        { value: 'lead', label: 'Lead' },
        { value: 'onboarding', label: 'Onboarding' },
        { value: 'active', label: 'Ativo' },
        { value: 'inactive', label: 'Inativo' }
      ];

  const statusFiltersList = isDatabaseMode
    ? ['all', 'lead', 'onboarding', 'active', 'inactive', 'archived']
    : ['all', 'lead', 'onboarding', 'active', 'inactive'];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <UIHeader 
        title="Gestão de Clientes" 
        description={isDatabaseMode ? "Acompanhe e administre clientes reais cadastrados no PostgreSQL." : "Visualize e cadastre os clientes corporativos da sua carteira."}
        actions={
          <Button onClick={handleOpenCreateModal} className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Novo Cliente
          </Button>
        }
      />

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row items-center gap-4 justify-between bg-card p-4 rounded-xl border border-border/80 shadow-sm">
        {/* Search */}
        <div className="relative w-full md:w-80 flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={isDatabaseMode ? "Pesquisar por nome, empresa, documento..." : "Pesquisar por nome, empresa, CNPJ..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full pl-9 pr-3 rounded-lg border border-border bg-background text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary transition-all placeholder:text-muted-foreground/75"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex gap-1.5 overflow-x-auto w-full md:w-auto">
            {statusFiltersList.map((statusKey) => (
              <button
                key={statusKey}
                onClick={() => setStatusFilter(statusKey)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                  statusFilter === statusKey
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-background text-muted-foreground border-border hover:text-foreground'
                }`}
              >
                {statusKey === 'all' && 'Todos'}
                {statusKey === 'lead' && 'Leads'}
                {statusKey === 'onboarding' && 'Onboarding'}
                {statusKey === 'active' && 'Ativos'}
                {statusKey === 'inactive' && 'Inativos'}
                {statusKey === 'archived' && 'Arquivados'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Client List */}
      <Card>
        <CardContent className="p-0">
          {filteredClients.length === 0 ? (
            <div className="p-12">
              <EmptyState 
                title={isDatabaseMode ? "Nenhum cliente cadastrado ainda." : "Nenhum cliente encontrado"} 
                description={isDatabaseMode ? "Cadastre seu primeiro cliente para começar a organizar sua operação." : "Experimente ajustar a busca ou clique no botão acima para cadastrar um novo cliente."}
                actionLabel={isDatabaseMode ? "Cadastrar cliente" : "Cadastrar Cliente"}
                onAction={handleOpenCreateModal}
                icon={<Building2 className="h-6 w-6" />}
              />
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa / Razão Social</TableHead>
                      <TableHead>Contato Principal</TableHead>
                      <TableHead>{isDatabaseMode ? "Documento" : "CNPJ"}</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Status Comercial</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell>
                          <div className="font-semibold text-foreground">{client.companyName}</div>
                          <div className="text-xs text-muted-foreground">{client.email || 'Sem e-mail'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-foreground font-medium">{client.name}</div>
                          <div className="text-xs text-muted-foreground">{client.phone || 'Sem telefone'}</div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{client.cnpj || 'Não informado'}</TableCell>
                        <TableCell>
                          <div className="text-xs font-medium text-foreground">{client.responsibleUser}</div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge type="client" status={client.commercialStatus} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            <Link href={`/clientes/${client.id}`}>
                              <Button variant="outline" size="sm" className="h-8 gap-1.5">
                                <Eye className="h-3.5 w-3.5" /> Detalhes
                              </Button>
                            </Link>

                            {isDatabaseMode && (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 gap-1 border-primary/30 text-primary hover:bg-primary/5"
                                  onClick={() => handleOpenEditModal(client)}
                                >
                                  <Edit3 className="h-3.5 w-3.5" /> Editar
                                </Button>

                                {client.commercialStatus === 'archived' ? (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-8 gap-1 border-success/30 text-success hover:bg-success/5"
                                    onClick={() => handleRestoreClient(client.id)}
                                  >
                                    <RotateCcw className="h-3.5 w-3.5" /> Restaurar
                                  </Button>
                                ) : (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-8 gap-1 border-danger/30 text-danger hover:bg-danger/5"
                                    onClick={() => handleArchiveClient(client.id)}
                                  >
                                    <Archive className="h-3.5 w-3.5" /> Arquivar
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="block md:hidden divide-y divide-border/30 px-4">
                {filteredClients.map((client) => (
                  <div key={client.id} className="py-4 space-y-3.5 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="font-semibold text-sm text-foreground block">{client.companyName}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">Doc: {client.cnpj || 'Não informado'}</span>
                      </div>
                      <StatusBadge type="client" status={client.commercialStatus} />
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                      <div className="p-2 bg-muted/20 border border-border/40 rounded-lg">
                        <span className="text-[10px] text-muted-foreground block">Contato</span>
                        <strong className="text-foreground text-xs block mt-0.5 truncate">{client.name}</strong>
                      </div>
                      <div className="p-2 bg-muted/20 border border-border/40 rounded-lg">
                        <span className="text-[10px] text-muted-foreground block">Telefone</span>
                        <strong className="text-foreground text-xs block mt-0.5 truncate">{client.phone || 'N/A'}</strong>
                      </div>
                      <div className="p-2 bg-muted/20 border border-border/40 rounded-lg col-span-2">
                        <span className="text-[10px] text-muted-foreground block">Email</span>
                        <strong className="text-foreground text-[11px] block mt-0.5 truncate">{client.email || 'N/A'}</strong>
                      </div>
                      <div className="p-2 bg-muted/20 border border-border/40 rounded-lg">
                        <span className="text-[10px] text-muted-foreground block">Responsável</span>
                        <strong className="text-foreground text-xs block mt-0.5 truncate">{client.responsibleUser}</strong>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Link href={`/clientes/${client.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full h-8.5 text-xs gap-1.5">
                          <Eye className="h-3.5 w-3.5" /> Detalhes
                        </Button>
                      </Link>

                      {isDatabaseMode && (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8.5 text-xs gap-1 border-primary/30 text-primary"
                            onClick={() => handleOpenEditModal(client)}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>

                          {client.commercialStatus === 'archived' ? (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8.5 text-xs gap-1 border-success/30 text-success"
                              onClick={() => handleRestoreClient(client.id)}
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8.5 text-xs gap-1 border-danger/30 text-danger"
                              onClick={() => handleArchiveClient(client.id)}
                            >
                              <Archive className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Register/Edit Client Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClient ? "Editar Cliente" : "Cadastrar Novo Cliente"}
        description={isDatabaseMode ? "Insira os dados da empresa e contato operacional." : "Preencha os dados cadastrais. Você pode usar o preenchimento por CNPJ para acelerar."}
        size="lg"
      >
        <form onSubmit={handleSaveClient} className="space-y-4 pt-2">
          {(!isDatabaseMode && !sandboxStore.checkLimit('clients')) && (
            <div className="p-3 bg-danger/10 border border-danger/20 text-danger text-xs font-semibold rounded-lg">
              Aviso: O limite de clientes do seu plano foi atingido. Faça o upgrade nas Configurações para continuar.
            </div>
          )}
          {/* CNPJ / Document Field with autofill button */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="md:col-span-2">
              <Input
                label={isDatabaseMode ? "Documento (Opcional)" : "CNPJ da Empresa"}
                type="text"
                placeholder={isDatabaseMode ? "CPF ou CNPJ" : "00.000.000/0000-00"}
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                required={!isDatabaseMode}
              />
            </div>
            <div>
              <Button
                type="button"
                variant="secondary"
                className="w-full flex items-center justify-center gap-1.5 h-10 border border-border"
                onClick={handleCnpjSearch}
                isLoading={isSearchingCnpj}
              >
                <SearchCode className="h-4 w-4 text-primary" /> Consultar
              </Button>
            </div>
          </div>

          {cnpjSearchMessage && (
            <p className={`text-xs font-semibold ${cnpjSearchMessage.includes('✅') ? 'text-success' : 'text-danger'}`}>
              {cnpjSearchMessage}
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Razão Social / Nome da Empresa"
              type="text"
              placeholder="Razão Social Ltda"
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              required
            />
            <Input
              label="Nome do Contato Principal"
              type="text"
              placeholder="Nome do contato comercial"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={isDatabaseMode ? "E-mail de Contato (Opcional)" : "E-mail de Contato"}
              type="text"
              placeholder="contato@empresa.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required={!isDatabaseMode}
            />
            <Input
              label="Telefone / WhatsApp"
              type="text"
              placeholder="(00) 90000-0000"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Responsável Interno"
              options={teamOptions}
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
            />
            <Select
              label="Status Comercial"
              options={statusOptions}
              value={status}
              onChange={(e) => setStatus(e.target.value as ClientStatus)}
            />
          </div>

          <Textarea
            label="Observações Cadastrais / Endereço Completo"
            placeholder="Informações adicionais..."
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={4}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-border/20">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {editingClient ? "Salvar Alterações" : "Gravar Cliente"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
