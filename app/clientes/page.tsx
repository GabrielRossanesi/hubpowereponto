'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Building2, SearchCode, Edit3, Archive, RotateCcw, ArrowRight, SlidersHorizontal, Mail, Phone } from 'lucide-react';
import { useTenantStore } from '../../lib/store';
import { useMounted } from '../../hooks/useMounted';
import { PageHeader as UIHeader } from '../../components/ui/page-header';
import Button from '../../components/ui/button';
import Input from '../../components/ui/input';
import Textarea from '../../components/ui/textarea';
import Select from '../../components/ui/select';
import Modal from '../../components/ui/modal';
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import StatusBadge from '../../components/ui/status-badge';
import EmptyState from '../../components/ui/empty-state';
import ErrorState from '../../components/ui/error-state';
import PageLoadingSkeleton from '../../components/ui/page-loading-skeleton';
import SearchInput from '../../components/ui/search-input';
import TableToolbar from '../../components/ui/table-toolbar';
import Dropdown from '../../components/ui/dropdown';
import { ClientStatus, Client } from '../../types';
import { isDatabaseDataMode } from '../../lib/data-mode';
import { getClients, createClient, updateClient, archiveClient, restoreClient, getTenantMembers } from './actions';

type ClientFilter = 'all' | ClientStatus;

const clientStatusLabels: Record<ClientFilter, string> = {
  all: 'Todos',
  lead: 'Leads',
  onboarding: 'Onboarding',
  active: 'Ativos',
  inactive: 'Inativos',
  archived: 'Arquivados',
};

function getClientInitials(companyName: string) {
  return companyName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase() || 'CL';
}

export default function ClientesPage() {
  const mounted = useMounted();
  const isDatabaseMode = isDatabaseDataMode;

  // Sandbox Store
  const sandboxStore = useTenantStore();

  // Database States
  const [dbClients, setDbClients] = useState<Client[]>([]);
  const [dbMembers, setDbMembers] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(isDatabaseMode);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Common UI States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ClientFilter>('all');
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
      setLoadError(null);
      const [fetchedClients, fetchedMembers] = await Promise.all([
        getClients(true), // Include archived for client-side status filtering
        getTenantMembers(),
      ]);
      setDbClients(fetchedClients);
      setDbMembers(fetchedMembers);
    } catch (err) {
      console.error('Erro ao carregar dados do inquilino:', err);
      setLoadError(err instanceof Error ? err.message : 'Não foi possível carregar a carteira de clientes.');
    } finally {
      setIsLoading(false);
    }
  }, [isDatabaseMode]);

  useEffect(() => {
    let active = true;
    if (isDatabaseMode) {
      const fetchInitial = async () => {
        try {
          setLoadError(null);
          const [fetchedClients, fetchedMembers] = await Promise.all([
            getClients(true),
            getTenantMembers(),
          ]);
          if (active) {
            setDbClients(fetchedClients);
            setDbMembers(fetchedMembers);
            setIsLoading(false);
          }
        } catch (err) {
          console.error('Erro ao carregar dados do inquilino inicialmente:', err);
          if (active) {
            setLoadError(err instanceof Error ? err.message : 'Não foi possível carregar a carteira de clientes.');
            setIsLoading(false);
          }
        }
      };
      fetchInitial();
    }
    return () => {
      active = false;
    };
  }, [isDatabaseMode]);

  if (!mounted || (isDatabaseMode && isLoading && dbClients.length === 0)) {
    return <PageLoadingSkeleton variant="table" />;
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

  const portfolioClients = activeClients.filter(client => client.commercialStatus !== 'archived');
  const statusCounts: Record<ClientFilter, number> = {
    all: portfolioClients.length,
    lead: activeClients.filter(client => client.commercialStatus === 'lead').length,
    onboarding: activeClients.filter(client => client.commercialStatus === 'onboarding').length,
    active: activeClients.filter(client => client.commercialStatus === 'active').length,
    inactive: activeClients.filter(client => client.commercialStatus === 'inactive').length,
    archived: activeClients.filter(client => client.commercialStatus === 'archived').length,
  };
  const hasActiveFilters = searchTerm.trim().length > 0 || statusFilter !== 'all';

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
  };

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
    const defaultResponsavel = isDatabaseMode
      ? (dbMembers[0]?.name || '')
      : 'Ana Silva';
    setResponsavel(defaultResponsavel);
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
      const res = await archiveClient(id);
      if (!res.success) {
        alert(res.error || 'Erro ao arquivar cliente.');
        return;
      }
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
      const res = await restoreClient(id);
      if (!res.success) {
        alert(res.error || 'Erro ao restaurar cliente.');
        return;
      }
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
          const res = await updateClient(editingClient.id, payload);
          if (!res.success) {
            alert(res.error || 'Erro ao atualizar cliente.');
            return;
          }
        } else {
          const res = await createClient(payload);
          if (!res.success) {
            alert(res.error || 'Erro ao cadastrar cliente.');
            return;
          }
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

  const teamOptions = isDatabaseMode
    ? (dbMembers.length > 0 
        ? dbMembers.map(m => ({ value: m.name, label: m.name }))
        : [{ value: '', label: 'Nenhum usuário encontrado nesta empresa' }])
    : sandboxStore.teamMembers.map(m => ({ value: m.name, label: m.name }));
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

  const statusFiltersList: ClientFilter[] = isDatabaseMode
    ? ['all', 'lead', 'onboarding', 'active', 'inactive', 'archived']
    : ['all', 'lead', 'onboarding', 'active', 'inactive'];

  return (
    <div className="space-y-section" aria-busy={isLoading}>
      <UIHeader 
        variant="operational"
        eyebrow="Carteira comercial"
        title="Clientes"
        description="Acompanhe contatos, responsáveis e o estágio comercial de cada cliente da organização."
        actions={
          <Button onClick={handleOpenCreateModal} className="gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" /> Novo cliente
          </Button>
        }
      />

      {loadError && (
        <ErrorState
          compact
          description="A carteira não pôde ser atualizada. Os dados exibidos podem estar desatualizados."
          onRetry={loadClients}
        />
      )}

      <section aria-label="Resumo da carteira" className="overflow-hidden rounded-lg border border-border bg-surface shadow-subtle">
        <dl className="grid grid-cols-2 md:grid-cols-5">
          {[
            { label: 'Na carteira', value: statusCounts.all },
            { label: 'Ativos', value: statusCounts.active },
            { label: 'Em onboarding', value: statusCounts.onboarding },
            { label: 'Leads', value: statusCounts.lead },
            { label: 'Inativos', value: statusCounts.inactive },
          ].map((item) => (
            <div key={item.label} className="min-w-0 border-b border-r border-border px-4 py-3.5 even:border-r-0 last:col-span-2 last:border-b-0 last:border-r-0 md:col-span-1 md:border-b-0 md:even:border-r md:last:col-span-1 md:last:border-r-0">
              <dt className="truncate text-caption font-semibold uppercase tracking-[0.12em] text-foreground-muted">{item.label}</dt>
              <dd className="mt-1.5 font-mono text-xl font-semibold tabular-nums text-foreground">{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <TableToolbar
        search={
          <SearchInput
            label="Buscar clientes"
            placeholder={isDatabaseMode ? 'Buscar por nome, empresa ou documento' : 'Buscar por nome, empresa ou CNPJ'}
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
            onClear={() => setSearchTerm('')}
          />
        }
        resultSummary={
          <span aria-live="polite">
            <strong className="font-mono font-semibold tabular-nums text-foreground">{filteredClients.length}</strong>
            {' '}de {statusFilter === 'all' ? statusCounts.all : statusCounts[statusFilter]}
          </span>
        }
        filters={
          <>
            <SlidersHorizontal className="h-4 w-4 shrink-0 text-foreground-muted" aria-hidden="true" />
            <span className="shrink-0 text-label font-semibold text-foreground-secondary">Status</span>
            <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5">
              {statusFiltersList.map((statusKey) => (
                <button
                  key={statusKey}
                  type="button"
                  aria-pressed={statusFilter === statusKey}
                  onClick={() => setStatusFilter(statusKey)}
                  className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-label font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                    statusFilter === statusKey
                      ? 'border-primary/25 bg-primary-subtle text-primary'
                      : 'border-border bg-surface-subtle text-foreground-muted hover:border-border-strong hover:text-foreground'
                  }`}
                >
                  {clientStatusLabels[statusKey]}
                  <span className="font-mono text-[0.625rem] tabular-nums opacity-75">{statusCounts[statusKey]}</span>
                </button>
              ))}
            </div>
            {hasActiveFilters && (
              <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0 gap-1.5 px-2" onClick={clearFilters}>
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Limpar filtros</span>
              </Button>
            )}
          </>
        }
      />

      <section aria-labelledby="client-list-title" className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="client-list-title" className="text-section-title font-semibold text-foreground">Carteira de clientes</h2>
            <p className="mt-1 text-body-small text-foreground-muted">Dados essenciais e ações comerciais em uma única superfície.</p>
          </div>
          <span className="hidden font-mono text-caption tabular-nums text-foreground-muted sm:block">
            {filteredClients.length} {filteredClients.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        {filteredClients.length === 0 ? (
          <EmptyState
            title={hasActiveFilters ? 'Nenhum cliente corresponde aos filtros.' : 'Nenhum cliente cadastrado ainda.'}
            description={hasActiveFilters
              ? 'Ajuste a busca ou remova os filtros para voltar a visualizar a carteira.'
              : 'Cadastre o primeiro cliente para começar a organizar a operação comercial.'}
            actionLabel={hasActiveFilters ? 'Limpar filtros' : 'Cadastrar cliente'}
            onAction={hasActiveFilters ? clearFilters : handleOpenCreateModal}
            icon={<Building2 className="h-5 w-5" aria-hidden="true" />}
          />
        ) : (
          <>
            <div className="hidden lg:block">
              <Table variant="operational">
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="hidden xl:table-cell">Contato</TableHead>
                    <TableHead className="hidden 2xl:table-cell">{isDatabaseMode ? 'Documento' : 'CNPJ'}</TableHead>
                    <TableHead className="hidden xl:table-cell">Responsável</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary-subtle font-mono text-caption font-bold tracking-wide text-primary">
                            {getClientInitials(client.companyName)}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-foreground">{client.companyName}</div>
                            <div className="mt-0.5 truncate text-caption font-normal text-foreground-muted">{client.email || 'E-mail não informado'}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <div className="font-medium text-foreground-secondary">{client.name}</div>
                        <div className="mt-0.5 text-caption font-normal text-foreground-muted">{client.phone || 'Telefone não informado'}</div>
                      </TableCell>
                      <TableCell className="hidden font-mono text-caption font-normal text-foreground-muted 2xl:table-cell">
                        {client.cnpj || 'Não informado'}
                      </TableCell>
                      <TableCell className="hidden text-body-small font-medium text-foreground-secondary xl:table-cell">
                        {client.responsibleUser || 'Não atribuído'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge type="client" status={client.commercialStatus} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/clientes/${client.id}`}
                            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-label font-semibold text-foreground-secondary transition-colors hover:bg-surface-subtle hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
                          >
                            Abrir <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </Link>
                          {isDatabaseMode && (
                            <Dropdown
                              label={`Ações de ${client.companyName}`}
                              items={[
                                {
                                  label: 'Editar cliente',
                                  icon: <Edit3 className="h-4 w-4" aria-hidden="true" />,
                                  onClick: () => handleOpenEditModal(client),
                                },
                                client.commercialStatus === 'archived'
                                  ? {
                                      label: 'Restaurar cliente',
                                      icon: <RotateCcw className="h-4 w-4" aria-hidden="true" />,
                                      onClick: () => handleRestoreClient(client.id),
                                    }
                                  : {
                                      label: 'Arquivar cliente',
                                      icon: <Archive className="h-4 w-4" aria-hidden="true" />,
                                      onClick: () => handleArchiveClient(client.id),
                                      variant: 'danger' as const,
                                    },
                              ]}
                            />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-subtle lg:hidden">
              <ul className="divide-y divide-border" aria-label="Clientes encontrados">
                {filteredClients.map((client) => (
                  <li key={client.id} className="px-4 py-4 sm:px-5">
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary-subtle font-mono text-caption font-bold tracking-wide text-primary">
                        {getClientInitials(client.companyName)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="truncate text-body-small font-semibold text-foreground">{client.companyName}</h3>
                            <p className="mt-0.5 truncate text-caption text-foreground-muted">{client.name}</p>
                          </div>
                          <StatusBadge type="client" status={client.commercialStatus} />
                        </div>

                        <dl className="mt-3 grid gap-x-4 gap-y-2 text-caption sm:grid-cols-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <Mail className="h-3.5 w-3.5 shrink-0 text-foreground-muted" aria-hidden="true" />
                            <dt className="sr-only">E-mail</dt>
                            <dd className="truncate text-foreground-secondary">{client.email || 'E-mail não informado'}</dd>
                          </div>
                          <div className="flex min-w-0 items-center gap-2">
                            <Phone className="h-3.5 w-3.5 shrink-0 text-foreground-muted" aria-hidden="true" />
                            <dt className="sr-only">Telefone</dt>
                            <dd className="truncate text-foreground-secondary">{client.phone || 'Telefone não informado'}</dd>
                          </div>
                          <div className="min-w-0">
                            <dt className="text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-foreground-muted">Responsável</dt>
                            <dd className="mt-0.5 truncate text-foreground-secondary">{client.responsibleUser || 'Não atribuído'}</dd>
                          </div>
                          <div className="min-w-0">
                            <dt className="text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-foreground-muted">{isDatabaseMode ? 'Documento' : 'CNPJ'}</dt>
                            <dd className="mt-0.5 truncate font-mono text-foreground-secondary">{client.cnpj || 'Não informado'}</dd>
                          </div>
                        </dl>

                        <div className="mt-3 flex items-center justify-end gap-1 border-t border-border pt-3">
                          <Link
                            href={`/clientes/${client.id}`}
                            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-label font-semibold text-foreground-secondary transition-colors hover:bg-surface-subtle hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
                          >
                            Abrir cliente <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </Link>
                          {isDatabaseMode && (
                            <Dropdown
                              label={`Ações de ${client.companyName}`}
                              items={[
                                {
                                  label: 'Editar cliente',
                                  icon: <Edit3 className="h-4 w-4" aria-hidden="true" />,
                                  onClick: () => handleOpenEditModal(client),
                                },
                                client.commercialStatus === 'archived'
                                  ? {
                                      label: 'Restaurar cliente',
                                      icon: <RotateCcw className="h-4 w-4" aria-hidden="true" />,
                                      onClick: () => handleRestoreClient(client.id),
                                    }
                                  : {
                                      label: 'Arquivar cliente',
                                      icon: <Archive className="h-4 w-4" aria-hidden="true" />,
                                      onClick: () => handleArchiveClient(client.id),
                                      variant: 'danger' as const,
                                    },
                              ]}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </section>

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
