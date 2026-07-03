'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getOperatorAccessState,
  getRealOrganizations,
  createRealOrganization,
  updateRealOrganization,
  resetUserPasswordInDatabase
} from './actions';
import { useSession } from '../../lib/auth-client';
import {
  Building2, Users, DollarSign, ShieldAlert, Sparkles,
  Activity, Calendar, Settings, Play, Lock,
  Unlock, Send, CheckCircle2, UserX, UserCheck, Target,
  Check, ArrowRight, ArrowLeft
} from 'lucide-react';
import { useStore, getPlanDefaultFeatures } from '../../lib/store';
import { useMounted } from '../../hooks/useMounted';
import { UserRole, OrganizationFeatures, Organization } from '../../types';
import { PageHeader as UIHeader } from '../../components/ui/page-header';
import Button from '../../components/ui/button';
import Card, { CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import Modal from '../../components/ui/modal';
import Tabs, { TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import Input from '../../components/ui/input';
import Select from '../../components/ui/select';
import Textarea from '../../components/ui/textarea';

import { isDatabaseDataMode } from '../../lib/data-mode';

export default function EmpresasAdminPage() {
  const mounted = useMounted();
  const router = useRouter();

  const isDatabaseMode = isDatabaseDataMode;
  useSession(); // Hook registration to trigger session logic

  const [realOrgs, setRealOrgs] = useState<(Organization & {
    slug: string;
    users?: {
      id: string;
      name: string;
      email: string;
      role: 'owner' | 'admin' | 'member' | 'viewer';
      status: 'active';
      joinedAt: string;
    }[];
    features?: Omit<OrganizationFeatures, 'organizationId'>;
  })[]>([]);
  const [isOp, setIsOp] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadRealData = useCallback(async () => {
    try {
      const orgs = await getRealOrganizations();
      setRealOrgs(orgs as typeof realOrgs);
    } catch (err) {
      console.error('Erro ao buscar empresas reais:', err);
    }
  }, []);

  useEffect(() => {
    if (isDatabaseMode) {
      const checkOperatorAndLoad = async () => {
        const state = await getOperatorAccessState();
        setIsOp(state.isOperator);
        if (state.isOperator) {
          await loadRealData();
        }
      };
      checkOperatorAndLoad();
    }
  }, [isDatabaseMode, loadRealData]);

  const {
    organizations,
    clients,
    proposals,
    tasks,
    teamMembers,
    historyEvents,
    integrations,
    leads,
    upgradePlan,
    updateOrganizationStatus,
    updateTeamMemberRole,
    updateTeamMemberStatus,
    setCurrentOrganizationId,
    organizationFeatures,
    updateOrganizationFeature,
    resetFeaturesToPlanDefaults,
    createOrganization
  } = useStore();

  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'usuarios' | 'clientes' | 'historico' | 'leads' | 'funcionalidades'>('usuarios');
  const [modalFeedbackMsg, setModalFeedbackMsg] = useState<string | null>(null);

  // Wizard state variables
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createStep, setCreateStep] = useState(1);

  // Step 1: Company details
  const [companyName, setCompanyName] = useState('');
  const [companyCnpj, setCompanyCnpj] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companySegment, setCompanySegment] = useState('');
  const [companyCityUf, setCompanyCityUf] = useState('');
  const [companyResponsible, setCompanyResponsible] = useState('');
  const [companyResponsibleEmail, setCompanyResponsibleEmail] = useState('');

  // Step 2: Plan and status
  const [companyPlan, setCompanyPlan] = useState<'starter' | 'pro' | 'enterprise'>('pro');
  const [companyStatus, setCompanyStatus] = useState<'active' | 'suspended' | 'trial' | 'pending'>('active');
  const [companyStartDate, setCompanyStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [companyNotes, setCompanyNotes] = useState('');

  // Step 3: Features custom override
  const [features, setFeatures] = useState<Omit<OrganizationFeatures, 'organizationId'>>(() => getPlanDefaultFeatures('pro'));

  // Step 4: Initial User
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('Proprietário');
  const [userPermissionRole, setUserPermissionRole] = useState<'owner' | 'admin' | 'member' | 'viewer'>('owner');
  const [userStatus, setUserStatus] = useState<'active' | 'pending'>('active');

  // Step 5: Demo mock checkbox
  const [createMockData, setCreateMockData] = useState(true);

  // Error validations state
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
      </div>
    );
  }

  if (isDatabaseMode && isOp === false) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 max-w-md mx-auto">
        <div className="h-16 w-16 rounded-full bg-danger/10 text-danger flex items-center justify-center mb-6 ring-8 ring-danger/5">
          <ShieldAlert className="h-8 w-8 animate-pulse" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-3 tracking-tight">
          Acesso Restrito
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-8">
          Apenas usuários operadores ou administradores da plataforma possuem acesso a esta página no modo banco de dados.
        </p>
        <Button onClick={() => router.push('/dashboard')} className="w-full">
          Voltar ao Dashboard
        </Button>
      </div>
    );
  }

  const activeOrgsList = isDatabaseMode ? realOrgs : organizations;

  // Aggregate stats
  const totalOrgs = activeOrgsList.length;
  const activeOrgs = activeOrgsList.filter(o => o.status === 'active').length;
  const trialOrgs = activeOrgsList.filter(o => o.status === 'trial').length;
  const suspendedOrgs = activeOrgsList.filter(o => o.status === 'suspended').length;

  const planPrices = { starter: 199, pro: 499, enterprise: 1499 };
  const monthlyRevenue = activeOrgsList
    .filter(o => o.status === 'active')
    .reduce((acc, org) => acc + planPrices[org.planId], 0);

  const totalUsers = isDatabaseMode
    ? (activeOrgsList as typeof realOrgs).reduce((acc, org) => acc + (org.users?.length || 0), 0)
    : teamMembers.length;
  const totalClients = isDatabaseMode ? 0 : clients.length;
  const totalProposals = isDatabaseMode ? 0 : proposals.length;

  const selectedOrg = activeOrgsList.find(o => o.id === selectedOrgId) as (Organization & {
    slug?: string;
    users?: {
      id: string;
      name: string;
      email: string;
      role: 'owner' | 'admin' | 'member' | 'viewer';
      status: 'active';
      joinedAt: string;
    }[];
    features?: Omit<OrganizationFeatures, 'organizationId'>;
  }) | undefined;

  // Helper for plan limits
  const getOrgLimits = (planId: 'starter' | 'pro' | 'enterprise') => {
    const limits = {
      starter: { clients: 3, users: 2, proposals: 5, tasks: 10 },
      pro: { clients: 30, users: 5, proposals: 50, tasks: 99999 },
      enterprise: { clients: 99999, users: 99999, proposals: 99999, tasks: 99999 }
    };
    return limits[planId];
  };

  const renderProgressBar = (current: number, max: number) => {
    if (max >= 99999) {
      return (
        <div className="space-y-0.5">
          <div className="flex justify-between text-[9px] font-semibold text-muted-foreground">
            <span>{current} / ∞</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1">
            <div className="bg-primary/30 h-1 rounded-full" style={{ width: '10%' }} />
          </div>
        </div>
      );
    }
    const pct = Math.min((current / max) * 100, 100);
    const color = pct >= 90 ? 'bg-danger' : pct >= 75 ? 'bg-warning' : 'bg-success';
    return (
      <div className="space-y-0.5">
        <div className="flex justify-between text-[9px] font-semibold text-muted-foreground">
          <span>{current} / {max}</span>
          <span>{Math.round(pct)}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-1">
          <div className={`${color} h-1 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  };

  const handleSimulateAccess = (orgId: string) => {
    setCurrentOrganizationId(orgId);
    router.push('/dashboard');
  };

  const showModalFeedback = (msg: string) => {
    setModalFeedbackMsg(msg);
    setTimeout(() => setModalFeedbackMsg(null), 4500);
  };

  const handleResendInvite = (userName: string, email: string) => {
    showModalFeedback(`Convite enviado com sucesso para ${userName} (${email})!`);
  };

  const handleUpgradePlan = async (plan: 'starter' | 'pro' | 'enterprise', orgId: string) => {
    if (isDatabaseMode) {
      try {
        const org = realOrgs.find(o => o.id === orgId);
        if (!org) return;
        await updateRealOrganization(
          orgId,
          {
            name: org.name,
            slug: org.slug,
            planId: plan,
            isActive: org.status === 'active'
          },
          org.features || getPlanDefaultFeatures(plan)
        );
        await loadRealData();
        showModalFeedback(`Plano atualizado com sucesso para ${plan.toUpperCase()}!`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao atualizar plano.';
        alert(message);
      }
    } else {
      upgradePlan(plan, orgId);
      showModalFeedback(`Plano atualizado com sucesso para ${plan.toUpperCase()}!`);
    }
  };

  const handleUpdateStatus = async (orgId: string, status: 'active' | 'suspended' | 'trial' | 'pending') => {
    if (isDatabaseMode) {
      try {
        const org = realOrgs.find(o => o.id === orgId);
        if (!org) return;
        await updateRealOrganization(
          orgId,
          {
            name: org.name,
            slug: org.slug,
            planId: org.planId,
            isActive: status === 'active'
          },
          org.features || getPlanDefaultFeatures(org.planId)
        );
        await loadRealData();
        const statusText = status === 'active' ? 'Reativada' : 'Suspensa';
        showModalFeedback(`Conta da organização foi ${statusText} com sucesso!`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao atualizar status.';
        alert(message);
      }
    } else {
      updateOrganizationStatus(orgId, status);
      const statusText =
        status === 'active' ? 'Reativada' :
        status === 'trial' ? 'colocada em Trial' :
        status === 'pending' ? 'marcada como Pendente' :
        'Suspensa';
      showModalFeedback(`Conta da organização foi ${statusText} com sucesso!`);
    }
  };

  const handleResetFeatures = async (orgId: string, planId: 'starter' | 'pro' | 'enterprise') => {
    if (isDatabaseMode) {
      try {
        const org = realOrgs.find(o => o.id === orgId);
        if (!org) return;
        const defaults = getPlanDefaultFeatures(planId);
        await updateRealOrganization(
          orgId,
          {
            name: org.name,
            slug: org.slug,
            planId: org.planId,
            isActive: org.status === 'active'
          },
          defaults
        );
        await loadRealData();
        showModalFeedback(`Configurações de funcionalidades resetadas para o padrão do plano ${planId.toUpperCase()}!`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao resetar funcionalidades.';
        alert(message);
      }
    } else {
      resetFeaturesToPlanDefaults(orgId);
      showModalFeedback(`Configurações de funcionalidades resetadas para o padrão do plano ${planId.toUpperCase()}!`);
    }
  };

  const handleToggleFeature = async (orgId: string, featureKey: keyof Omit<OrganizationFeatures, 'organizationId'>, value: boolean) => {
    if (isDatabaseMode) {
      try {
        const org = realOrgs.find(o => o.id === orgId);
        if (!org) return;
        const updatedFeatures = {
          ...(org.features || getPlanDefaultFeatures(org.planId)),
          [featureKey]: value
        };
        await updateRealOrganization(
          orgId,
          {
            name: org.name,
            slug: org.slug,
            planId: org.planId,
            isActive: org.status === 'active'
          },
          updatedFeatures
        );
        await loadRealData();
        showModalFeedback(`Módulo atualizado com sucesso!`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao alternar módulo.';
        alert(message);
      }
    } else {
      updateOrganizationFeature(orgId, featureKey, value);
      showModalFeedback(`Módulo atualizado com sucesso!`);
    }
  };

  const handleResetUserPassword = async (userId: string, email: string) => {
    if (!window.confirm(`Deseja resetar a senha de ${email}? Uma nova senha temporária aleatória será gerada e exibida.`)) {
      return;
    }
    const generatedPassword = Math.random().toString(36).substring(2, 10) + 'A1!';
    try {
      await resetUserPasswordInDatabase(userId, generatedPassword);
      showModalFeedback(`Senha de ${email} resetada! Nova senha temporária: ${generatedPassword}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao resetar senha.';
      alert(message);
    }
  };

  const handleNextFromStep1 = () => {
    const errors: Record<string, string> = {};
    if (!companyName.trim()) errors.companyName = 'Nome da empresa é obrigatório';
    if (!companyCnpj.trim()) errors.companyCnpj = 'CNPJ é obrigatório';
    if (!companyResponsible.trim()) errors.companyResponsible = 'Nome do responsável é obrigatório';
    if (!companyResponsibleEmail.trim()) {
      errors.companyResponsibleEmail = 'E-mail do responsável é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyResponsibleEmail)) {
      errors.companyResponsibleEmail = 'Formato de e-mail inválido';
    }

    // Check unique company name
    const nameConflict = activeOrgsList.some(
      (org) => org.name.toLowerCase().trim() === companyName.toLowerCase().trim()
    );
    if (nameConflict) {
      errors.companyName = 'Uma empresa com este nome já está cadastrada';
    }

    // Check unique CNPJ (only in sandbox mode)
    if (!isDatabaseMode) {
      const cleanCnpjStr = (val: string) => val.replace(/\D/g, '');
      const cnpjConflict = organizations.some(
        (org) => cleanCnpjStr(org.cnpj) === cleanCnpjStr(companyCnpj)
      );
      if (cnpjConflict) {
        errors.companyCnpj = 'Uma empresa com este CNPJ já está cadastrada';
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});

    // Propagate responsible fields to Step 4 if Step 4 fields are empty
    if (!userName) setUserName(companyResponsible);
    if (!userEmail) setUserEmail(companyResponsibleEmail);

    setCreateStep(2);
  };

  const handleNextFromStep4 = () => {
    const errors: Record<string, string> = {};
    if (!userName.trim()) errors.userName = 'Nome do usuário é obrigatório';
    if (!userEmail.trim()) {
      errors.userEmail = 'E-mail do usuário é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
      errors.userEmail = 'Formato de e-mail inválido';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});
    setCreateStep(5);
  };

  const handleCreateCompanySubmit = async () => {
    if (isDatabaseMode) {
      setIsSubmitting(true);
      try {
        const orgPayload = {
          name: companyName,
          slug: companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
          planId: companyPlan,
          isActive: companyStatus === 'active',
          features: {
            leads: features.leads,
            clients: features.clients,
            proposals: features.proposals,
            contracts: features.contracts,
            charges: features.charges,
            onboarding: features.onboarding,
            publications: features.publications,
            tasks: features.tasks,
            history: features.history,
            team: features.team,
            financial: features.financial
          }
        };

        const generatedPassword = Math.random().toString(36).substring(2, 10) + 'A1!';

        const userPayload = {
          name: userName,
          email: userEmail,
          passwordRaw: generatedPassword,
          role: userPermissionRole
        };

        const result = await createRealOrganization(orgPayload, userPayload);
        if (result.success) {
          showModalFeedback(
            `Empresa criada com sucesso! Email Admin: ${userEmail} | Senha temporária: ${generatedPassword}`
          );
          await loadRealData();
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao criar organização.';
        alert(message);
        return;
      } finally {
        setIsSubmitting(false);
      }
    } else {
      createOrganization({
        name: companyName,
        cnpj: companyCnpj,
        email: companyEmail,
        phone: companyPhone,
        segment: companySegment,
        cityUf: companyCityUf,
        responsibleName: companyResponsible,
        responsibleEmail: companyResponsibleEmail,
        planId: companyPlan,
        status: companyStatus,
        notes: companyNotes,
        features,
        ownerUser: {
          name: userName,
          email: userEmail,
          role: userRole,
          userRole: userPermissionRole,
          status: userStatus
        },
        createMockData
      });
      showModalFeedback('Empresa cadastrada com sucesso!');
    }

    // Reset forms
    setIsCreateModalOpen(false);
    setCreateStep(1);
    setCompanyName('');
    setCompanyCnpj('');
    setCompanyEmail('');
    setCompanyPhone('');
    setCompanySegment('');
    setCompanyCityUf('');
    setCompanyResponsible('');
    setCompanyResponsibleEmail('');
    setCompanyPlan('pro');
    setCompanyStatus('active');
    setCompanyNotes('');
    setFeatures(getPlanDefaultFeatures('pro'));
    setUserName('');
    setUserEmail('');
    setUserRole('Proprietário');
    setUserPermissionRole('owner');
    setUserStatus('active');
    setCreateMockData(true);
    setValidationErrors({});
  };

  return (
    <div className="space-y-6">
      {/* Top operational alert */}
      <div className="p-3.5 bg-primary/10 border border-primary/20 text-primary text-xs font-semibold rounded-lg flex items-center gap-2.5 shadow-sm">
        <ShieldAlert className="h-4.5 w-4.5 shrink-0" />
        <span>Área administrativa da plataforma — visão do operador NV Hub.</span>
      </div>

      {/* Page Header */}
      <UIHeader
        title="Controle de Empresas"
        description="Visualize métricas agregadas da plataforma SaaS, configure planos de assinantes e simule acessos."
        actions={
          <Button
            variant="primary"
            className="gap-2 shadow-sm font-semibold"
            onClick={() => {
              setIsCreateModalOpen(true);
              setCreateStep(1);
            }}
          >
            <Building2 className="h-4 w-4" /> Nova Empresa
          </Button>
        }
      />

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Empresas Cadastradas</span>
              <div className="text-xl font-bold flex items-baseline gap-1.5">
                {totalOrgs}
                <span className="text-[10px] text-muted-foreground font-normal">total</span>
              </div>
            </div>
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Building2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Status Operacional</span>
              <div className="text-xs font-semibold flex flex-col gap-0.5">
                <span className="text-success flex items-center gap-1">● {activeOrgs} Ativas</span>
                <span className="text-warning flex items-center gap-1">● {trialOrgs} em Trial</span>
                <span className="text-danger flex items-center gap-1">● {suspendedOrgs} Suspended</span>
              </div>
            </div>
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center text-success">
              <Activity className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Receita Mensal Simulada</span>
              <div className="text-xl font-bold text-success flex items-baseline gap-1.5">
                R$ {monthlyRevenue.toLocaleString('pt-BR')}
                <span className="text-[10px] text-muted-foreground font-normal">/mês</span>
              </div>
            </div>
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center text-success">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Recursos Totais</span>
              <div className="text-xs font-semibold flex flex-col gap-0.5 text-muted-foreground">
                <span>Usuários: <strong className="text-foreground">{totalUsers}</strong></span>
                <span>Clientes: <strong className="text-foreground">{totalClients}</strong></span>
                <span>Propostas: <strong className="text-foreground">{totalProposals}</strong></span>
              </div>
            </div>
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Companies Table */}
      <Card>
        <CardHeader className="px-6 py-4 border-b border-border/40">
          <CardTitle className="text-base font-bold">Empresas Assinantes</CardTitle>
          <CardDescription>Lista completa de tenants cadastrados no simulador da NV Hub.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Plano / Status</TableHead>
                  <TableHead>Criada em</TableHead>
                  <TableHead>Limites &amp; Uso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeOrgsList.map((org) => {
                  const o = org as typeof realOrgs[number];
                  const orgUsers = isDatabaseMode ? (o.users?.length || 0) : teamMembers.filter(m => m.organizationId === o.id).length;
                  const orgClients = isDatabaseMode ? 0 : clients.filter(c => c.organizationId === o.id).length;
                  const orgProposals = isDatabaseMode ? 0 : proposals.filter(p => p.organizationId === o.id).length;
                  const orgTasks = isDatabaseMode ? 0 : tasks.filter(t => t.organizationId === o.id).length;
                  const limits = getOrgLimits(o.planId);

                  return (
                    <TableRow key={o.id}>
                      <TableCell>
                        <div className="font-bold text-foreground text-sm">{o.name}</div>
                        <div className="text-[10px] font-mono text-muted-foreground">ID: {o.id}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {o.cnpj}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 items-start">
                          <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                            {o.planId}
                          </span>
                          <span className={`text-[10px] font-bold flex items-center gap-1 ${
                            o.status === 'active' ? 'text-success' :
                            o.status === 'trial' ? 'text-warning' : 'text-danger'
                          }`}>
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {o.status === 'active' ? 'Ativo' : o.status === 'trial' ? 'Trial' : 'Suspenso'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(o.createdAt).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="min-w-[200px]">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                          <div>
                            <span className="text-[9px] text-muted-foreground block">Membros</span>
                            {renderProgressBar(orgUsers, limits.users)}
                          </div>
                          <div>
                            <span className="text-[9px] text-muted-foreground block">Clientes</span>
                            {renderProgressBar(orgClients, limits.clients)}
                          </div>
                          <div>
                            <span className="text-[9px] text-muted-foreground block">Propostas</span>
                            {renderProgressBar(orgProposals, limits.proposals)}
                          </div>
                          <div>
                            <span className="text-[9px] text-muted-foreground block">Tarefas</span>
                            {renderProgressBar(orgTasks, limits.tasks)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedOrgId(o.id);
                              setActiveTab('usuarios');
                            }}
                          >
                            Ver detalhes
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            className="gap-1"
                            onClick={() => handleSimulateAccess(o.id)}
                          >
                            <Play className="h-3 w-3 fill-current" /> Acessar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Details Modal */}
      {selectedOrg && (
        <Modal
          isOpen={!!selectedOrgId}
          onClose={() => setSelectedOrgId(null)}
          title={`Administração: ${selectedOrg.name}`}
          description="Painel do operador NV Hub para gerenciamento de limites, status e membros do tenant."
          size="xl"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Organization Admin Controls */}
            <div className="lg:col-span-1 space-y-6">
              <Card>
                <CardHeader className="p-4 border-b border-border/40 bg-muted/20">
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                    <Settings className="h-4 w-4 text-muted-foreground" /> Configurações Gerais
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4 text-xs">
                  <div>
                    <span className="text-muted-foreground block font-medium">CNPJ</span>
                    <span className="font-mono font-semibold text-foreground">{selectedOrg.cnpj}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block font-medium">Data de Cadastro</span>
                    <span className="font-semibold text-foreground">
                      {new Date(selectedOrg.createdAt).toLocaleDateString('pt-BR')} às {new Date(selectedOrg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <hr className="border-border/40" />

                  {/* Plan Control */}
                  <div className="space-y-2">
                    <span className="text-muted-foreground block font-bold uppercase tracking-wider text-[10px]">Alterar Plano (Assinatura)</span>
                    <div className="grid grid-cols-3 gap-1">
                      {(['starter', 'pro', 'enterprise'] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handleUpgradePlan(p, selectedOrg.id)}
                          className={`px-2 py-1.5 rounded text-[10px] font-bold uppercase border transition-all ${
                            selectedOrg.planId === p
                              ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                              : 'bg-background border-border text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Status Toggle Control */}
                  <div className="space-y-2">
                    <span className="text-muted-foreground block font-bold uppercase tracking-wider text-[10px]">Status do Inquilino</span>
                    <div className="flex gap-2">
                      {selectedOrg.status === 'suspended' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full gap-1.5 border-success text-success hover:bg-success/10"
                          onClick={() => handleUpdateStatus(selectedOrg.id, 'active')}
                        >
                          <Unlock className="h-3.5 w-3.5" /> Reativar Conta
                        </Button>
                      ) : (
                        <Button
                          variant="danger"
                          size="sm"
                          className="w-full gap-1.5"
                          onClick={() => handleUpdateStatus(selectedOrg.id, 'suspended')}
                        >
                          <Lock className="h-3.5 w-3.5" /> Suspender Conta
                        </Button>
                      )}
                      {selectedOrg.status !== 'trial' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateStatus(selectedOrg.id, 'trial')}
                        >
                          Trial
                        </Button>
                      )}
                    </div>
                  </div>

                  <hr className="border-border/40" />

                  {/* Simulation Command */}
                  <div className="space-y-2">
                    <span className="text-muted-foreground block font-bold uppercase tracking-wider text-[10px]">Simular Login</span>
                    <Button
                      variant="primary"
                      className="w-full gap-1.5 justify-center"
                      onClick={() => handleSimulateAccess(selectedOrg.id)}
                    >
                      <Play className="h-3.5 w-3.5 fill-current" /> Ver Painel Operacional
                    </Button>
                    <p className="text-[10px] text-muted-foreground leading-normal mt-1 text-center">
                      Redireciona para o painel com isolamento de dados da {selectedOrg.name}.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Progress limit box */}
              <Card>
                <CardHeader className="p-4 border-b border-border/40 bg-muted/20">
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                    <Activity className="h-4 w-4 text-muted-foreground" /> Limites &amp; Uso
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {(() => {
                    const orgUsers = teamMembers.filter(m => m.organizationId === selectedOrg.id).length;
                    const orgClients = clients.filter(c => c.organizationId === selectedOrg.id).length;
                    const orgProposals = proposals.filter(p => p.organizationId === selectedOrg.id).length;
                    const orgTasks = tasks.filter(t => t.organizationId === selectedOrg.id).length;
                    const limits = getOrgLimits(selectedOrg.planId);

                    return (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span>Membros da Equipe</span>
                          </div>
                          {renderProgressBar(orgUsers, limits.users)}
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span>Clientes Gerenciados</span>
                          </div>
                          {renderProgressBar(orgClients, limits.clients)}
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span>Propostas Emitidas</span>
                          </div>
                          {renderProgressBar(orgProposals, limits.proposals)}
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span>Tarefas Ativas</span>
                          </div>
                          {renderProgressBar(orgTasks, limits.tasks)}
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Integrations Status Box */}
              <Card>
                <CardHeader className="p-4 border-b border-border/40 bg-muted/20">
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                    <Settings className="h-4 w-4 text-muted-foreground" /> Status das Integrações
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {(() => {
                    const orgIntegration = integrations.find(i => i.organizationId === selectedOrg.id);

                    const conectorList = [
                      { name: 'Asaas (Financeiro)', status: orgIntegration?.asaasStatus || 'not_connected', code: 'asaas' },
                      { name: 'ClickUp (Operações)', status: orgIntegration?.clickupStatus || 'not_connected', code: 'clickup' },
                      { name: 'Google Drive (Arquivos)', status: orgIntegration?.googleDriveStatus || 'not_connected', code: 'googleDrive' },
                      { name: 'Google Docs (Relatórios)', status: orgIntegration?.googleDriveStatus || 'not_connected', code: 'googleDocs' },
                      { name: 'ZapSign (Contratos)', status: orgIntegration?.zapsignStatus || 'not_connected', code: 'zapsign' },
                      { name: 'WhatsApp Business', status: orgIntegration?.whatsappStatus || 'not_connected', code: 'whatsapp' },
                      { name: 'Meta Ads (Leads)', status: orgIntegration?.metaAdsStatus || 'not_connected', code: 'metaAds' },
                      { name: 'Google Ads (Leads)', status: orgIntegration?.googleAdsStatus || 'not_connected', code: 'googleAds' },
                    ];

                    const getStatusColor = (status: string) => {
                      switch (status) {
                        case 'connected': return 'bg-success/10 text-success border-success/20';
                        case 'sandbox': return 'bg-info/10 text-info border-info/20';
                        case 'not_connected': return 'bg-slate-100 dark:bg-slate-800 text-muted-foreground border-border';
                        case 'error': return 'bg-danger/10 text-danger border-danger/20';
                        case 'pending': return 'bg-warning/10 text-warning border-warning/20';
                        default: return 'bg-muted text-muted-foreground border-border';
                      }
                    };

                    const getStatusText = (status: string) => {
                      switch (status) {
                        case 'connected': return 'Conectado';
                        case 'sandbox': return 'Sandbox';
                        case 'not_connected': return 'Inativo';
                        case 'error': return 'Erro';
                        case 'pending': return 'Pendente';
                        default: return 'Inativo';
                      }
                    };

                    return (
                      <div className="space-y-3">
                        {conectorList.map((c, idx) => {
                          const hasConnection = c.status === 'connected' || c.status === 'sandbox';
                          const orgHistory = historyEvents.filter(h => h.organizationId === selectedOrg.id);
                          const lastTestEvent = orgHistory.find(h =>
                            h.description.toLowerCase().includes(c.code.toLowerCase()) ||
                            h.description.toLowerCase().includes(c.name.toLowerCase())
                          );

                          let lastTestLabel = '-';
                          if (lastTestEvent) {
                            lastTestLabel = new Date(lastTestEvent.createdAt).toLocaleDateString('pt-BR');
                          } else if (hasConnection) {
                            lastTestLabel = 'Simulado (OK)';
                          }

                          return (
                            <div key={idx} className="flex items-center justify-between text-xs pb-2 border-b border-border/10 last:border-0 last:pb-0">
                              <div className="space-y-0.5">
                                <span className="font-semibold text-foreground block">{c.name}</span>
                                <span className="text-[10px] text-muted-foreground block">
                                  Último teste: {lastTestLabel}
                                </span>
                              </div>
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${getStatusColor(c.status)}`}>
                                {getStatusText(c.status)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Dynamic Sub-tabs for detailed resources */}
            <div className="lg:col-span-2 space-y-4">
              {modalFeedbackMsg && (
                <div className="p-3 bg-success/15 border border-success/20 text-success text-xs font-semibold rounded-lg flex items-center gap-2 animate-fade-in">
                  <CheckCircle2 className="h-4.5 w-4.5" />
                  <span>{modalFeedbackMsg}</span>
                </div>
              )}

              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'usuarios' | 'clientes' | 'historico' | 'leads' | 'funcionalidades')}>
                <TabsList className="w-full grid grid-cols-2 md:grid-cols-5 gap-1 md:gap-0 bg-transparent md:bg-muted p-1">
                  <TabsTrigger value="usuarios" className="text-[11px] md:text-xs">
                    <Users className="h-3.5 w-3.5 mr-1 md:mr-1.5" /> Usuários ({isDatabaseMode ? (selectedOrg.users?.length || 0) : teamMembers.filter(m => m.organizationId === selectedOrg.id).length})
                  </TabsTrigger>
                  <TabsTrigger value="clientes" className="text-[11px] md:text-xs">
                    <Building2 className="h-3.5 w-3.5 mr-1 md:mr-1.5" /> Clientes ({isDatabaseMode ? 0 : clients.filter(c => c.organizationId === selectedOrg.id).length})
                  </TabsTrigger>
                  <TabsTrigger value="leads" className="text-[11px] md:text-xs">
                    <Target className="h-3.5 w-3.5 mr-1 md:mr-1.5" /> Leads ({isDatabaseMode ? 0 : leads.filter(l => l.organizationId === selectedOrg.id).length})
                  </TabsTrigger>
                  <TabsTrigger value="historico" className="text-[11px] md:text-xs">
                    <Activity className="h-3.5 w-3.5 mr-1 md:mr-1.5" /> Histórico ({isDatabaseMode ? 0 : historyEvents.filter(h => h.organizationId === selectedOrg.id).length})
                  </TabsTrigger>
                  <TabsTrigger value="funcionalidades" className="text-[11px] md:text-xs col-span-2 md:col-span-1">
                    <Settings className="h-3.5 w-3.5 mr-1 md:mr-1.5" /> Módulos
                  </TabsTrigger>
                </TabsList>

                {/* Sub-tab 1: Users */}
                <TabsContent value="usuarios" className="pt-3">
                  <Card>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-border/40 text-[10px] font-bold text-muted-foreground uppercase bg-muted/20">
                              <th className="p-3">Nome / E-mail</th>
                              <th className="p-3">Papel / Função</th>
                              <th className="p-3">Status</th>
                              <th className="p-3 text-right">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/20 text-xs">
                            {((isDatabaseMode ? (selectedOrg.users || []) : teamMembers.filter(m => m.organizationId === selectedOrg.id)) as {
                              id: string;
                              name: string;
                              email?: string;
                              lastAccess?: string;
                              role: string;
                              userRole?: UserRole;
                              status: string;
                            }[]).map((user) => (
                                <tr key={user.id} className="hover:bg-muted/10">
                                  <td className="p-3">
                                    <div className="font-bold text-foreground">{user.name}</div>
                                    <div className="text-[10px] text-muted-foreground">{user.email || 'sem e-mail'}</div>
                                    <div className="text-[9px] text-muted-foreground font-mono mt-0.5">Último acesso: {user.lastAccess || 'nunca'}</div>
                                  </td>
                                  <td className="p-3 space-y-1">
                                    {isDatabaseMode ? (
                                      <div className="font-semibold text-foreground uppercase text-[10px] bg-primary/5 border border-primary/10 rounded px-1.5 py-0.5 w-fit">
                                        {user.role}
                                      </div>
                                    ) : (
                                      <>
                                        <div className="font-medium text-foreground">{user.role}</div>
                                        <select
                                          value={user.userRole}
                                          onChange={(e) => updateTeamMemberRole(user.id, e.target.value as UserRole)}
                                          className="bg-background border border-border rounded px-1.5 py-0.5 text-[10px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary animate-none"
                                        >
                                          <option value="owner">Owner</option>
                                          <option value="admin">Admin</option>
                                          <option value="member">Member</option>
                                          <option value="viewer">Viewer</option>
                                        </select>
                                      </>
                                    )}
                                  </td>
                                  <td className="p-3">
                                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                      user.status === 'active' ? 'bg-success/10 text-success' :
                                      user.status === 'pending' ? 'bg-warning/10 text-warning' :
                                      'bg-danger/10 text-danger'
                                    }`}>
                                      {user.status === 'active' ? 'Ativo' :
                                       user.status === 'pending' ? 'Pendente' : 'Desativado'}
                                    </span>
                                  </td>
                                  <td className="p-3 text-right">
                                    <div className="flex flex-col gap-1 items-end">
                                      {isDatabaseMode ? (
                                        <button
                                          type="button"
                                          onClick={() => handleResetUserPassword(user.id, user.email || '')}
                                          className="text-[10px] font-bold text-accent-cool hover:underline flex items-center gap-0.5"
                                        >
                                          <Settings className="h-3 w-3" /> Resetar Senha
                                        </button>
                                      ) : (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => updateTeamMemberStatus(user.id, user.status === 'disabled' ? 'active' : 'disabled')}
                                            className={`text-[10px] font-bold flex items-center gap-0.5 ${
                                              user.status === 'disabled' ? 'text-success hover:underline' : 'text-danger hover:underline'
                                            }`}
                                          >
                                            {user.status === 'disabled' ? (
                                              <><UserCheck className="h-3.5 w-3.5" /> Ativar</>
                                            ) : (
                                              <><UserX className="h-3.5 w-3.5" /> Desativar</>
                                            )}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleResendInvite(user.name, user.email || '')}
                                            className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5"
                                          >
                                            <Send className="h-3.5 w-3.5" /> Reenviar convite
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Sub-tab 2: Clients */}
                <TabsContent value="clientes" className="pt-3">
                  <Card>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-border/40 text-[10px] font-bold text-muted-foreground uppercase bg-muted/20">
                              <th className="p-3">Cliente / Contato</th>
                              <th className="p-3">CNPJ</th>
                              <th className="p-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/20 text-xs">
                            {clients
                              .filter(c => c.organizationId === selectedOrg.id)
                              .map((client) => (
                                <tr key={client.id} className="hover:bg-muted/10">
                                  <td className="p-3">
                                    <div className="font-bold text-foreground">{client.companyName}</div>
                                    <div className="text-[10px] text-muted-foreground">{client.name} &bull; {client.email}</div>
                                  </td>
                                  <td className="p-3 font-mono text-xs text-muted-foreground">
                                    {client.cnpj}
                                  </td>
                                  <td className="p-3">
                                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                      client.commercialStatus === 'active' ? 'bg-success/10 text-success' :
                                      client.commercialStatus === 'onboarding' ? 'bg-info/10 text-info' :
                                      client.commercialStatus === 'lead' ? 'bg-warning/10 text-warning' :
                                      'bg-danger/10 text-danger'
                                    }`}>
                                      {client.commercialStatus === 'active' ? 'Ativo' :
                                       client.commercialStatus === 'onboarding' ? 'Onboarding' :
                                       client.commercialStatus === 'lead' ? 'Lead' : 'Inativo'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            {clients.filter(c => c.organizationId === selectedOrg.id).length === 0 && (
                              <tr>
                                <td colSpan={3} className="p-6 text-center text-muted-foreground">
                                  Nenhum cliente cadastrado nesta organização.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Sub-tab 4: Leads Summary */}
                <TabsContent value="leads" className="pt-3">
                  <Card>
                    <CardHeader className="p-4 border-b border-border/40 bg-muted/20">
                      <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                        <Target className="h-4 w-4 text-primary" /> Resumo Operacional de Leads
                      </CardTitle>
                      <CardDescription>
                        Métricas gerais e principais origens de aquisição. Dados pessoais ocultados por privacidade.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 space-y-6">
                      {(() => {
                        const orgLeads = leads.filter(l => l.organizationId === selectedOrg.id);
                        const totalLeads = orgLeads.length;
                        const newLeads = orgLeads.filter(l => l.status === 'new').length;
                        const convertedLeads = orgLeads.filter(l => l.status === 'converted').length;
                        const hotLeads = orgLeads.filter(l => l.temperature === 'hot').length;
                        const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

                        // Get origin counts
                        const originCounts: Record<string, number> = {};
                        orgLeads.forEach(l => {
                          originCounts[l.origin] = (originCounts[l.origin] || 0) + 1;
                        });
                        const mainOrigins = Object.entries(originCounts)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 3)
                          .map(([origin, count]) => ({ origin, count }));

                        return (
                          <>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                              <div className="p-3 bg-muted/30 border border-border/20 rounded-lg text-center">
                                <span className="text-[10px] text-muted-foreground font-medium block">Total de Leads</span>
                                <strong className="text-lg font-bold text-foreground block mt-1">{totalLeads}</strong>
                              </div>
                              <div className="p-3 bg-muted/30 border border-border/20 rounded-lg text-center">
                                <span className="text-[10px] text-muted-foreground font-medium block">Novos Leads</span>
                                <strong className="text-lg font-bold text-info block mt-1">{newLeads}</strong>
                              </div>
                              <div className="p-3 bg-muted/30 border border-border/20 rounded-lg text-center">
                                <span className="text-[10px] text-muted-foreground font-medium block">Leads Convertidos</span>
                                <strong className="text-lg font-bold text-success block mt-1">{convertedLeads}</strong>
                              </div>
                              <div className="p-3 bg-muted/30 border border-border/20 rounded-lg text-center">
                                <span className="text-[10px] text-muted-foreground font-medium block">Leads Quentes</span>
                                <strong className="text-lg font-bold text-danger block mt-1">{hotLeads}</strong>
                              </div>
                              <div className="p-3 bg-muted/30 border border-border/20 rounded-lg text-center col-span-2 sm:col-span-2">
                                <span className="text-[10px] text-muted-foreground font-medium block">Taxa de Conversão</span>
                                <strong className="text-lg font-bold text-success block mt-1">
                                  {conversionRate.toFixed(1)}%
                                </strong>
                              </div>
                            </div>

                            <div className="space-y-3 pt-2">
                              <h4 className="text-xs font-bold text-foreground">Principais Origens de Entrada</h4>
                              {mainOrigins.length > 0 ? (
                                <div className="space-y-2">
                                  {mainOrigins.map((orig, idx) => {
                                    const pct = totalLeads > 0 ? (orig.count / totalLeads) * 100 : 0;
                                    return (
                                      <div key={idx} className="space-y-1">
                                        <div className="flex justify-between text-xs font-medium">
                                          <span className="text-foreground">{orig.origin || 'Desconhecida'}</span>
                                          <span className="text-muted-foreground">{orig.count} ({pct.toFixed(0)}%)</span>
                                        </div>
                                        <div className="w-full bg-muted rounded-full h-1.5">
                                          <div className="bg-primary h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground text-center py-4 bg-muted/10 rounded-lg border border-dashed border-border">
                                  Nenhuma origem registrada para esta empresa.
                                </p>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Sub-tab 3: History */}
                <TabsContent value="historico" className="pt-3">
                  <Card>
                    <CardContent className="p-4 space-y-4 max-h-[350px] overflow-y-auto">
                      {historyEvents
                        .filter(h => h.organizationId === selectedOrg.id)
                        .map((event) => (
                          <div key={event.id} className="flex gap-3 text-xs leading-normal">
                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                              <Calendar className="h-3.5 w-3.5" />
                            </div>
                            <div className="space-y-0.5 min-w-0">
                              <div className="font-bold text-foreground">{event.title}</div>
                              <p className="text-muted-foreground text-[11px]">{event.description}</p>
                              {event.clientName && (
                                <span className="inline-block text-[9px] font-semibold bg-muted px-1 py-0.2 rounded text-muted-foreground">
                                  {event.clientName}
                                </span>
                              )}
                              <span className="block text-[9px] text-muted-foreground font-mono">
                                {new Date(event.createdAt).toLocaleString('pt-BR')}
                              </span>
                            </div>
                          </div>
                        ))}
                      {historyEvents.filter(h => h.organizationId === selectedOrg.id).length === 0 && (
                        <div className="text-center py-6 text-muted-foreground">
                          Nenhum evento registrado nesta organização.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Sub-tab 5: Funcionalidades / Módulos */}
                <TabsContent value="funcionalidades" className="pt-3">
                  <Card>
                    <CardContent className="p-4 space-y-6">

                      {/* Top Action Bar */}
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-4 border-b border-border/40 gap-3">
                        <div>
                          <h3 className="text-sm font-bold text-foreground">Funcionalidades do Tenant</h3>
                          <p className="text-[11px] text-muted-foreground">Ative ou desative módulos específicos do SaaS para esta organização.</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            handleResetFeatures(selectedOrg.id, selectedOrg.planId);
                          }}
                          className="text-xs flex items-center justify-center gap-1.5 py-1.5"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                          Aplicar padrão do plano
                        </Button>
                      </div>

                      {/* Categories Lists */}
                      {(() => {
                        const orgFeatures = isDatabaseMode
                          ? (selectedOrg.features || {
                              organizationId: selectedOrg.id,
                              ...getPlanDefaultFeatures(selectedOrg.planId)
                            })
                          : (organizationFeatures?.find(f => f.organizationId === selectedOrg.id) || {
                              organizationId: selectedOrg.id,
                              ...getPlanDefaultFeatures(selectedOrg.planId)
                            });
                        const planDefaults = getPlanDefaultFeatures(selectedOrg.planId);

                        const categories = [
                          {
                            title: 'Comercial',
                            items: [
                              { key: 'leads', label: 'Leads', desc: 'Captura de leads, origens e distribuição comercial.' },
                              { key: 'clients', label: 'Clientes', desc: 'Cadastro e gestão de clientes.' },
                              { key: 'proposals', label: 'Propostas', desc: 'Criação e acompanhamento de propostas.' },
                              { key: 'publicProposal', label: 'Página Pública de Proposta', desc: 'Visualização e aceitação online de propostas por clientes.' },
                              { key: 'financial', label: 'Financeiro', desc: 'Controle independente de contas a pagar, a receber e fluxo de caixa.' },
                            ]
                          },
                          {
                            title: 'Operação',
                            items: [
                              { key: 'contracts', label: 'Contratos', desc: 'Geração e assinatura digital de contratos.' },
                              { key: 'charges', label: 'Cobranças', desc: 'Gestão de faturamento recorrente e pagamentos.' },
                              { key: 'onboarding', label: 'Onboarding', desc: 'Acompanhamento do setup inicial do cliente.' },
                              { key: 'publications', label: 'Publicações', desc: 'Calendário e aprovação de posts.' },
                              { key: 'tasks', label: 'Tarefas', desc: 'Fluxos de trabalho e pendências da equipe.' },
                            ]
                          },
                          {
                            title: 'Gestão',
                            items: [
                              { key: 'history', label: 'Histórico', desc: 'Auditoria de eventos e log de ações.' },
                              { key: 'integrations', label: 'Integrações', desc: 'Configuração de APIs e chaves externas.' },
                              { key: 'team', label: 'Equipe', desc: 'Colaboradores e permissões de acesso.' },
                            ]
                          }
                        ];

                        return (
                          <div className="space-y-6">
                            {categories.map((cat) => (
                              <div key={cat.title} className="space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-border/20 pb-1">
                                  {cat.title}
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {cat.items.map((item) => {
                                    const featureKey = item.key as keyof Omit<typeof orgFeatures, 'organizationId'>;
                                    const isEnabled = orgFeatures[featureKey] === true;
                                    const isPlanDefault = planDefaults[featureKey] === true;

                                    return (
                                      <div
                                        key={item.key}
                                        className="flex items-start justify-between p-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors gap-3"
                                      >
                                        <div className="space-y-1 min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-bold text-foreground truncate">
                                              {item.label}
                                            </span>
                                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                              isEnabled
                                                ? 'bg-success/10 text-success'
                                                : 'bg-muted-foreground/10 text-muted-foreground'
                                            }`}>
                                              {isEnabled ? 'Ativo' : 'Inativo'}
                                            </span>
                                          </div>
                                          <p className="text-[10px] text-muted-foreground leading-snug">
                                            {item.desc}
                                          </p>
                                          <div className="pt-0.5">
                                            {isPlanDefault ? (
                                              <span className="text-[8px] font-bold text-primary/80 bg-primary/5 px-1 py-0.2 rounded border border-primary/10">
                                                Incluso no plano {selectedOrg.planId.toUpperCase()}
                                              </span>
                                            ) : (
                                              <span className="text-[8px] font-bold text-muted-foreground bg-muted px-1 py-0.2 rounded border border-border/40">
                                                Módulo Extra
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        <button
                                           type="button"
                                           onClick={() => {
                                             handleToggleFeature(selectedOrg.id, featureKey, !isEnabled);
                                           }}
                                           className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-1 bg-muted shrink-0 ${
                                             isEnabled ? 'bg-primary' : 'bg-muted-foreground/30'
                                           }`}
                                           title={`Clique para ${isEnabled ? 'desativar' : 'ativar'} o módulo ${item.label}`}
                                         >
                                           <span
                                             className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                                               isEnabled ? 'translate-x-4' : 'translate-x-0'
                                             }`}
                                           />
                                         </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </Modal>
      )}

      {/* Wizard de Criação de Nova Empresa */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Cadastrar Nova Empresa"
        description="Painel do operador para inicializar um novo inquilino na plataforma NV Hub."
        size="lg"
      >
        <div className="space-y-6">
          {/* Step Indicator */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
              <span className={createStep >= 1 ? 'text-primary font-bold' : ''}>1. Dados Cadastrais</span>
              <span className={createStep >= 2 ? 'text-primary font-bold' : ''}>2. Plano &amp; Status</span>
              <span className={createStep >= 3 ? 'text-primary font-bold' : ''}>3. Módulos</span>
              <span className={createStep >= 4 ? 'text-primary font-bold' : ''}>4. Usuário Inicial</span>
              <span className={createStep >= 5 ? 'text-primary font-bold' : ''}>5. Revisão Final</span>
            </div>
            <div className="w-full bg-muted h-1.5 rounded-full mt-2 overflow-hidden flex">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${(createStep / 5) * 100}%` }}
              />
            </div>
          </div>

          {/* Step 1: Company details */}
          {createStep === 1 && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/20 border border-border/40 rounded-lg text-[11px] text-muted-foreground flex gap-2">
                <ShieldAlert className="h-4.5 w-4.5 text-warning shrink-0" />
                <span>Campos marcados com * são obrigatórios. O Nome da Empresa e o CNPJ não podem ser duplicados.</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nome da Empresa *"
                  placeholder="Ex: Acme Corp"
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                    if (validationErrors.companyName) {
                      setValidationErrors((prev) => ({ ...prev, companyName: '' }));
                    }
                  }}
                  error={validationErrors.companyName}
                />
                <Input
                  label="CNPJ *"
                  placeholder="Ex: 00.000.000/0000-00"
                  value={companyCnpj}
                  onChange={(e) => {
                    setCompanyCnpj(e.target.value);
                    if (validationErrors.companyCnpj) {
                      setValidationErrors((prev) => ({ ...prev, companyCnpj: '' }));
                    }
                  }}
                  error={validationErrors.companyCnpj}
                />
                <Input
                  label="E-mail principal"
                  type="email"
                  placeholder="Ex: contato@acme.com"
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                />
                <Input
                  label="Telefone / WhatsApp"
                  placeholder="Ex: (11) 99999-9999"
                  value={companyPhone}
                  onChange={(e) => setCompanyPhone(e.target.value)}
                />
                <Input
                  label="Segmento"
                  placeholder="Ex: Tecnologia, Marketing, Varejo"
                  value={companySegment}
                  onChange={(e) => setCompanySegment(e.target.value)}
                />
                <Input
                  label="Cidade / UF"
                  placeholder="Ex: São Paulo / SP"
                  value={companyCityUf}
                  onChange={(e) => setCompanyCityUf(e.target.value)}
                />
                <Input
                  label="Nome do Responsável *"
                  placeholder="Ex: João da Silva"
                  value={companyResponsible}
                  onChange={(e) => {
                    setCompanyResponsible(e.target.value);
                    if (validationErrors.companyResponsible) {
                      setValidationErrors((prev) => ({ ...prev, companyResponsible: '' }));
                    }
                  }}
                  error={validationErrors.companyResponsible}
                />
                <Input
                  label="E-mail do Responsável *"
                  type="email"
                  placeholder="Ex: joao@acme.com"
                  value={companyResponsibleEmail}
                  onChange={(e) => {
                    setCompanyResponsibleEmail(e.target.value);
                    if (validationErrors.companyResponsibleEmail) {
                      setValidationErrors((prev) => ({ ...prev, companyResponsibleEmail: '' }));
                    }
                  }}
                  error={validationErrors.companyResponsibleEmail}
                />
              </div>
              <div className="flex justify-end pt-4">
                <Button variant="primary" onClick={handleNextFromStep1} className="gap-1.5">
                  Próximo <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Plan and status */}
          {createStep === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="w-full flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground select-none">Plano de Assinatura *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['starter', 'pro', 'enterprise'] as const).map((plan) => (
                      <button
                        key={plan}
                        type="button"
                        onClick={() => {
                          setCompanyPlan(plan);
                          setFeatures(getPlanDefaultFeatures(plan));
                        }}
                        className={`px-3 py-2.5 rounded-lg text-xs font-bold uppercase border flex flex-col items-center justify-center gap-1 transition-all ${
                          companyPlan === plan
                            ? 'bg-primary/10 border-primary text-primary shadow-sm'
                            : 'bg-card border-border text-muted-foreground hover:bg-muted/10 hover:text-foreground'
                        }`}
                      >
                        <span>{plan}</span>
                        <span className="text-[9px] font-normal lowercase text-muted-foreground/85">
                          {plan === 'starter' ? 'básico' : plan === 'pro' ? 'completo' : 'ilimitado'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <Select
                  label="Status Inicial *"
                  options={[
                    { value: 'trial', label: 'Trial (Período de Teste)' },
                    { value: 'active', label: 'Ativa (SaaS Liberado)' },
                    { value: 'pending', label: 'Pendente (Aguardando Configuração)' },
                    { value: 'suspended', label: 'Suspensa (Inativa)' }
                  ]}
                  value={companyStatus}
                  onChange={(e) => setCompanyStatus(e.target.value as 'active' | 'suspended' | 'trial' | 'pending')}
                />

                <Input
                  label="Data de Início"
                  type="date"
                  value={companyStartDate}
                  onChange={(e) => setCompanyStartDate(e.target.value)}
                />

                <div className="md:col-span-2">
                  <div className="w-full flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground select-none">Observações Internas (Operador)</label>
                    <Textarea
                      placeholder="Adicione anotações internas sobre a contratação ou condições especiais desta empresa..."
                      value={companyNotes}
                      onChange={(e) => setCompanyNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setCreateStep(1)} className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" /> Voltar
                </Button>
                <Button variant="primary" onClick={() => setCreateStep(3)} className="gap-1.5">
                  Próximo <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Features */}
          {createStep === 3 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-3 border-b border-border/40 gap-3">
                <div>
                  <h4 className="text-xs font-bold text-foreground">Permissões de Módulos</h4>
                  <p className="text-[10px] text-muted-foreground">Defina quais partes do sistema estarão disponíveis para este inquilino.</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFeatures(getPlanDefaultFeatures(companyPlan));
                  }}
                  className="text-xs flex items-center justify-center gap-1.5 py-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Aplicar padrão do plano ({companyPlan.toUpperCase()})
                </Button>
              </div>

              {(() => {
                const categories = [
                  {
                    title: 'Comercial',
                    items: [
                      { key: 'leads', label: 'Leads', desc: 'Captura de leads, origens e distribuição comercial.' },
                      { key: 'clients', label: 'Clientes', desc: 'Cadastro e gestão de clientes.' },
                      { key: 'proposals', label: 'Propostas', desc: 'Criação e acompanhamento de propostas.' },
                      { key: 'publicProposal', label: 'Página Pública de Proposta', desc: 'Visualização e aceitação online de propostas por clientes.' },
                      { key: 'financial', label: 'Financeiro', desc: 'Controle independente de contas a pagar, a receber e fluxo de caixa.' },
                    ]
                  },
                  {
                    title: 'Operação',
                    items: [
                      { key: 'contracts', label: 'Contratos', desc: 'Geração e assinatura digital de contratos.' },
                      { key: 'charges', label: 'Cobranças', desc: 'Gestão de faturamento recorrente e pagamentos.' },
                      { key: 'onboarding', label: 'Onboarding', desc: 'Acompanhamento do setup inicial do cliente.' },
                      { key: 'publications', label: 'Publicações', desc: 'Calendário e aprovação de posts.' },
                      { key: 'tasks', label: 'Tarefas', desc: 'Fluxos de trabalho e pendências da equipe.' },
                    ]
                  },
                  {
                    title: 'Gestão',
                    items: [
                      { key: 'history', label: 'Histórico', desc: 'Auditoria de eventos e log de ações.' },
                      { key: 'integrations', label: 'Integrações', desc: 'Configuração de APIs e chaves externas.' },
                      { key: 'team', label: 'Equipe', desc: 'Colaboradores e permissões de acesso.' },
                    ]
                  }
                ];

                return (
                  <div className="space-y-5 max-h-[40vh] overflow-y-auto pr-1 scrollbar-thin">
                    {categories.map((cat) => (
                      <div key={cat.title} className="space-y-2.5">
                        <h5 className="text-[10px] font-bold uppercase tracking-wider text-primary border-b border-border/20 pb-0.5">
                          {cat.title}
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {cat.items.map((item) => {
                            const featureKey = item.key as keyof typeof features;
                            const isEnabled = features[featureKey] === true;
                            const planDefaults = getPlanDefaultFeatures(companyPlan);
                            const isPlanDefault = planDefaults[featureKey] === true;

                            return (
                              <div
                                key={item.key}
                                className="flex items-start justify-between p-2.5 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors gap-3"
                              >
                                <div className="space-y-0.5 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-bold text-foreground truncate">
                                      {item.label}
                                    </span>
                                    <span className={`text-[8px] font-bold px-1.5 rounded uppercase ${
                                      isEnabled
                                        ? 'bg-success/10 text-success'
                                        : 'bg-muted-foreground/10 text-muted-foreground'
                                    }`}>
                                      {isEnabled ? 'Ativo' : 'Inativo'}
                                    </span>
                                  </div>
                                  <p className="text-[9px] text-muted-foreground leading-snug">
                                    {item.desc}
                                  </p>
                                  <div className="pt-0.5">
                                    {isPlanDefault ? (
                                      <span className="text-[7px] font-bold text-primary/80 bg-primary/5 px-1 py-0.1 rounded border border-primary/10">
                                        Incluso no plano
                                      </span>
                                    ) : (
                                      <span className="text-[7px] font-bold text-muted-foreground bg-muted px-1 py-0.1 rounded border border-border/40">
                                        Opcional
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setFeatures((prev) => ({
                                      ...prev,
                                      [featureKey]: !isEnabled
                                    }));
                                  }}
                                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none bg-muted ${
                                    isEnabled ? 'bg-primary' : 'bg-muted-foreground/30'
                                  }`}
                                >
                                  <span
                                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                                      isEnabled ? 'translate-x-4' : 'translate-x-0'
                                    }`}
                                  />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setCreateStep(2)} className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" /> Voltar
                </Button>
                <Button variant="primary" onClick={() => setCreateStep(4)} className="gap-1.5">
                  Próximo <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Initial user */}
          {createStep === 4 && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/20 border border-border/40 rounded-lg text-[11px] text-muted-foreground flex gap-2">
                <Users className="h-4.5 w-4.5 text-primary shrink-0" />
                <span>Esse usuário será cadastrado como proprietário inicial. Seus dados foram pré-preenchidos com base no responsável da Etapa 1.</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nome Completo *"
                  placeholder="Ex: João da Silva"
                  value={userName}
                  onChange={(e) => {
                    setUserName(e.target.value);
                    if (validationErrors.userName) {
                      setValidationErrors((prev) => ({ ...prev, userName: '' }));
                    }
                  }}
                  error={validationErrors.userName}
                />
                <Input
                  label="E-mail do Usuário *"
                  type="email"
                  placeholder="Ex: joao@acme.com"
                  value={userEmail}
                  onChange={(e) => {
                    setUserEmail(e.target.value);
                    if (validationErrors.userEmail) {
                      setValidationErrors((prev) => ({ ...prev, userEmail: '' }));
                    }
                  }}
                  error={validationErrors.userEmail}
                />
                <Input
                  label="Função (Cargo)"
                  placeholder="Ex: Diretor de Operações"
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                />
                <Select
                  label="Nível de Permissão *"
                  options={[
                    { value: 'owner', label: 'Owner (Proprietário)' },
                    { value: 'admin', label: 'Admin (Administrador)' },
                    { value: 'member', label: 'Member (Colaborador)' },
                    { value: 'viewer', label: 'Viewer (Visualizador)' }
                  ]}
                  value={userPermissionRole}
                  onChange={(e) => setUserPermissionRole(e.target.value as 'owner' | 'admin' | 'member' | 'viewer')}
                />
                <Select
                  label="Status do Acesso *"
                  options={[
                    { value: 'active', label: 'Ativo (Login Liberado)' },
                    { value: 'pending', label: 'Pendente (Aguardando primeiro login)' }
                  ]}
                  value={userStatus}
                  onChange={(e) => setUserStatus(e.target.value as 'active' | 'pending')}
                />
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setCreateStep(3)} className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" /> Voltar
                </Button>
                <Button variant="primary" onClick={handleNextFromStep4} className="gap-1.5">
                  Próximo <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {createStep === 5 && (
            <div className="space-y-4">
              <div className="p-3 bg-primary/10 border border-primary/20 text-primary text-xs font-semibold rounded-lg flex items-center gap-2 shadow-xs">
                <ShieldAlert className="h-4.5 w-4.5 shrink-0" />
                <span>Ambiente demonstrativo: a criação de empresas é simulada e armazenada localmente no navegador.</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Resumo da Empresa */}
                <Card>
                  <CardHeader className="p-3.5 border-b border-border/40 bg-muted/20">
                    <CardTitle className="text-xs font-bold">Resumo da Empresa</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3.5 space-y-2">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Nome da Empresa:</span>
                      <span className="font-semibold text-foreground text-sm">{companyName}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">CNPJ:</span>
                      <span className="font-mono font-semibold text-foreground">{companyCnpj}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Plano:</span>
                        <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase text-[9px] inline-block mt-0.5">
                          {companyPlan}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Status:</span>
                        <span className="font-semibold text-foreground capitalize mt-0.5 block">{companyStatus}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Resumo do Usuário */}
                <Card>
                  <CardHeader className="p-3.5 border-b border-border/40 bg-muted/20">
                    <CardTitle className="text-xs font-bold">Usuário Inicial</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3.5 space-y-2">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Nome Completo:</span>
                      <span className="font-semibold text-foreground text-sm">{userName}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">E-mail de Login:</span>
                      <span className="font-semibold text-foreground">{userEmail}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Cargo:</span>
                        <span className="font-semibold text-foreground mt-0.5 block">{userRole || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Nível:</span>
                        <span className="font-semibold text-foreground capitalize mt-0.5 block">{userPermissionRole}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Resumo de Funcionalidades */}
                <Card className="md:col-span-2">
                  <CardHeader className="p-3.5 border-b border-border/40 bg-muted/20">
                    <CardTitle className="text-xs font-bold">Módulos Habilitados</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3.5">
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(features).map(([key, enabled]) => {
                        if (!enabled) return null;
                        const labelMap: Record<string, string> = {
                          leads: 'Leads',
                          clients: 'Clientes',
                          proposals: 'Propostas',
                          contracts: 'Contratos',
                          charges: 'Cobranças',
                          onboarding: 'Onboarding',
                          publications: 'Publicações',
                          tasks: 'Tarefas',
                          history: 'Histórico',
                          integrations: 'Integrações',
                          team: 'Equipe',
                          publicProposal: 'Página Pública',
                          financial: 'Financeiro'
                        };
                        return (
                          <span
                            key={key}
                            className="bg-success/10 text-success text-[10px] font-semibold px-2 py-0.5 rounded-full border border-success/20"
                          >
                            {labelMap[key] || key}
                          </span>
                        );
                      })}
                      {Object.values(features).every(v => v === false) && (
                        <span className="text-muted-foreground italic">Nenhum módulo selecionado (Acesso restrito).</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Demo Mock Data Toggle */}
              <div className="flex items-center gap-2 p-3 bg-muted/20 border border-border/40 rounded-lg">
                <input
                  type="checkbox"
                  id="createMockDataCheckbox"
                  checked={createMockData}
                  onChange={(e) => setCreateMockData(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/40"
                />
                <label
                  htmlFor="createMockDataCheckbox"
                  className="text-xs font-semibold text-foreground select-none cursor-pointer"
                >
                  Criar com dados demonstrativos (1 lead, 1 cliente, 1 proposta e 1 tarefa para demonstração)
                </label>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setCreateStep(4)} className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" /> Voltar
                </Button>
                <Button
                  variant="primary"
                  onClick={handleCreateCompanySubmit}
                  disabled={isSubmitting}
                  className="gap-1.5 bg-success hover:bg-success/90 border-success text-success-foreground"
                >
                  <Check className="h-4 w-4" /> {isSubmitting ? 'Criando...' : 'Criar Empresa'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
