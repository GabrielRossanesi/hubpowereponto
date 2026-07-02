import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  Client, ClientStatus,
  Proposal, ProposalStatus,
  Contract, ContractStatus,
  Charge, ChargeStatus,
  Onboarding, OnboardingStepStatus,
  Publication, PublicationStatus,
  TeamTask, TaskStatus,
  HistoryEvent, TeamMember,
  Organization, PlanType, PlanLimits, UserRole,
  TenantIntegration, Lead, LeadStatus, LeadTemperature,
  OrganizationFeatures,
  FinancialEntry, FinancialRecurrence
} from '../types';

export const getPlanDefaultFeatures = (planId: PlanType): Omit<OrganizationFeatures, 'organizationId'> => {
  switch (planId) {
    case 'starter':
      return {
        leads: true,
        clients: true,
        proposals: true,
        contracts: false,
        charges: false,
        onboarding: false,
        publications: false,
        tasks: true,
        history: true,
        integrations: false,
        team: false,
        publicProposal: true,
        financial: true
      };
    case 'pro':
      return {
        leads: true,
        clients: true,
        proposals: true,
        contracts: true,
        charges: true,
        onboarding: true,
        publications: true,
        tasks: true,
        history: true,
        integrations: true,
        team: true,
        publicProposal: true,
        financial: true
      };
    case 'enterprise':
    default:
      return {
        leads: true,
        clients: true,
        proposals: true,
        contracts: true,
        charges: true,
        onboarding: true,
        publications: true,
        tasks: true,
        history: true,
        integrations: true,
        team: true,
        publicProposal: true,
        financial: true
      };
  }
};

interface SystemState {
  organizations: Organization[];
  currentOrganizationId: string;
  clients: Client[];
  proposals: Proposal[];
  contracts: Contract[];
  charges: Charge[];
  onboardings: Onboarding[];
  publications: Publication[];
  tasks: TeamTask[];
  historyEvents: HistoryEvent[];
  teamMembers: TeamMember[];
  currentUser: TeamMember;
  integrations: TenantIntegration[];
  leads: Lead[];
  organizationFeatures: OrganizationFeatures[];
  financialEntries: FinancialEntry[];
  financialRecurrences: FinancialRecurrence[];


  // Actions
  setCurrentOrganizationId: (id: string) => void;
  addFinancialEntry: (entry: Omit<FinancialEntry, 'id' | 'organizationId' | 'createdAt'>) => void;
  updateFinancialEntry: (id: string, entry: Partial<FinancialEntry>) => void;
  confirmFinancialPayment: (id: string, paidAmount?: number, paidAt?: string) => void;
  cancelFinancialEntry: (id: string) => void;
  addFinancialRecurrence: (recurrence: Omit<FinancialRecurrence, 'id' | 'organizationId' | 'isActive'>) => void;
  updateFinancialRecurrence: (id: string, recurrence: Partial<FinancialRecurrence>) => void;
  toggleFinancialRecurrence: (id: string) => void;
  resetFinancialSandboxData: () => void;
  upgradePlan: (planId: PlanType, orgId?: string) => void;
  updateOrganizationStatus: (orgId: string, status: 'active' | 'suspended' | 'trial' | 'pending') => void;
  updateTeamMemberRole: (id: string, role: UserRole) => void;
  updateTeamMemberStatus: (id: string, status: 'active' | 'pending' | 'disabled') => void;
  checkLimit: (type: 'clients' | 'users' | 'proposals' | 'tasks', orgId?: string) => boolean;
  addOrganization: (organization: Organization) => void;
  addTeamMember: (member: TeamMember) => void;
  createOrganization: (data: {
    name: string;
    cnpj: string;
    email: string;
    phone: string;
    segment: string;
    cityUf: string;
    responsibleName: string;
    responsibleEmail: string;
    planId: PlanType;
    status: 'active' | 'suspended' | 'trial' | 'pending';
    notes?: string;
    features: Omit<OrganizationFeatures, 'organizationId'>;
    ownerUser: {
      name: string;
      email: string;
      role: string;
      userRole: UserRole;
      status: 'active' | 'pending';
    };
    createMockData?: boolean;
  }) => void;

  addClient: (client: Omit<Client, 'id' | 'organizationId' | 'createdAt'> & { organizationId?: string }) => Client | null;
  updateClientStatus: (id: string, status: ClientStatus) => void;

  addProposal: (proposal: Omit<Proposal, 'id' | 'organizationId' | 'createdAt' | 'status'> & { organizationId?: string }) => Proposal | null;
  updateProposalStatus: (id: string, status: ProposalStatus) => void;
  acceptProposalFlow: (id: string) => void;
  declineProposalFlow: (id: string) => void;

  addContract: (contract: Omit<Contract, 'id' | 'organizationId' | 'createdAt'> & { organizationId?: string }) => Contract;
  updateContractStatus: (id: string, status: ContractStatus) => void;
  signContractFlow: (id: string) => void;

  addCharge: (charge: Omit<Charge, 'id' | 'organizationId' | 'createdAt'> & { organizationId?: string }) => Charge;
  updateChargeStatus: (id: string, status: ChargeStatus) => void;
  confirmPaymentFlow: (id: string) => void;

  updateOnboardingStep: (clientId: string, stepName: keyof Onboarding['steps'], status: OnboardingStepStatus) => void;
  updateOnboardingLinks: (clientId: string, links: Partial<Onboarding['links']>) => void;

  addPublication: (pub: Omit<Publication, 'id' | 'organizationId' | 'createdAt'> & { organizationId?: string }) => Publication;
  updatePublicationStatus: (id: string, status: PublicationStatus, comments?: string) => void;
  createPublicationApprovalLink: (publicationId: string) => string;
  regeneratePublicationApprovalLink: (publicationId: string) => string;
  approvePublicationByToken: (publicationId: string, token: string) => void;
  requestPublicationChangesByToken: (publicationId: string, token: string, feedback: string) => void;

  addTask: (task: Omit<TeamTask, 'id' | 'organizationId' | 'createdAt'> & { organizationId?: string }) => TeamTask | null;
  updateTaskStatus: (id: string, status: TaskStatus) => void;
  updateTask: (id: string, updates: Partial<TeamTask>) => void;
  addTaskNote: (taskId: string, content: string) => void;

  addHistoryEvent: (event: Omit<HistoryEvent, 'id' | 'organizationId' | 'createdAt'> & { organizationId?: string }) => void;

  activeSetupClientId: string | null;
  activeSetupStep: 'payment' | 'drive' | 'clickup' | 'tasks' | 'completed' | 'none';
  isSetupDismissed: boolean;
  clearActiveSetup: () => void;
  setSetupDismissed: (dismissed: boolean) => void;

  simulateCnpjSearch: (cnpj: string) => {
    companyName: string;
    tradeName: string;
    address: string;
    city: string;
    state: string;
    status: string;
    activity: string;
  } | null;

  resetState: () => void;
  updateIntegration: (orgId: string, data: Partial<TenantIntegration>) => void;
  testIntegrationConnection: (orgId: string, service: string) => void;

  addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'lastInteraction' | 'organizationId'> & { organizationId?: string }) => Lead;
  updateLeadStatus: (id: string, status: LeadStatus) => void;
  updateLeadTemperature: (id: string, temperature: LeadTemperature) => void;
  assignLead: (id: string, responsibleUser: string) => void;
  addLeadNote: (id: string, note: string) => void;
  convertLeadToClient: (id: string) => Client | null;
  createProposalFromLead: (id: string) => Proposal | null;
  markLeadAsLost: (id: string, reason: string) => void;

  // Organization features actions
  getFeaturesByOrganization: (orgId: string) => OrganizationFeatures;
  updateOrganizationFeature: (orgId: string, featureKey: keyof Omit<OrganizationFeatures, 'organizationId'>, enabled: boolean) => void;
  updateOrganizationFeatures: (orgId: string, data: Partial<Omit<OrganizationFeatures, 'organizationId'>>) => void;
  resetFeaturesToPlanDefaults: (orgId: string) => void;

  // Sidebar collapse state
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

const initialOrganizations: Organization[] = [
  {
    id: 'org_hub_power',
    name: 'Power & Ponto',
    cnpj: '12.345.678/0001-90',
    planId: 'pro',
    status: 'active',
    createdAt: '2026-05-10T10:00:00Z'
  },
  {
    id: 'org_spark',
    name: 'Spark Agency',
    cnpj: '44.333.222/0001-11',
    planId: 'starter',
    status: 'active',
    createdAt: '2026-06-01T10:00:00Z'
  },
  {
    id: 'org_morales',
    name: 'Morales Soluções',
    cnpj: '55.666.777/0001-88',
    planId: 'enterprise',
    status: 'active',
    createdAt: '2026-06-10T09:00:00Z'
  }
];

const initialIntegrations: TenantIntegration[] = [
  {
    organizationId: 'org_hub_power',
    asaasToken: '$asaas_live_token_738472938491028394',
    asaasWebhook: 'wh_token_asaas_sec_8392849',
    asaasStatus: 'sandbox',
    clickupToken: 'pk_48392_4728347293847239',
    clickupWorkspace: '90038472',
    clickupStatus: 'connected',
    googleKey: 'google-key-service-account-placeholder',
    googleFolder: 'drive_root_folder_id_98293489234',
    googleDriveStatus: 'connected',
    zapsignKey: 'api_key_zapsign_live_83928492',
    zapsignStatus: 'connected',
    whatsappToken: '',
    whatsappStatus: 'not_connected',
    metaAdsToken: '',
    metaAdsStatus: 'not_connected',
    googleAdsToken: '',
    googleAdsStatus: 'not_connected'
  },
  {
    organizationId: 'org_spark',
    asaasToken: '$asaas_sandbox_token_9837498732984',
    asaasWebhook: 'wh_token_spark_asaas_883928',
    asaasStatus: 'sandbox',
    clickupToken: '',
    clickupWorkspace: '',
    clickupStatus: 'not_connected',
    googleKey: '',
    googleFolder: '',
    googleDriveStatus: 'not_connected',
    zapsignKey: '',
    zapsignStatus: 'not_connected',
    whatsappToken: '',
    whatsappStatus: 'not_connected',
    metaAdsToken: '',
    metaAdsStatus: 'not_connected',
    googleAdsToken: '',
    googleAdsStatus: 'not_connected'
  },
  {
    organizationId: 'org_morales',
    asaasToken: '',
    asaasWebhook: '',
    asaasStatus: 'not_connected',
    clickupToken: 'pk_99321_morales_workspace_8392942',
    clickupWorkspace: '3349284',
    clickupStatus: 'sandbox',
    googleKey: 'google-key-morales-service-account',
    googleFolder: 'drive_morales_root_839284928',
    googleDriveStatus: 'connected',
    zapsignKey: 'api_key_zapsign_morales_993849',
    zapsignStatus: 'connected',
    whatsappToken: 'wa_token_morales_live_93849284',
    whatsappStatus: 'connected',
    metaAdsToken: 'meta_ads_token_morales_9839492',
    metaAdsStatus: 'connected',
    googleAdsToken: 'google_ads_token_morales_229384',
    googleAdsStatus: 'connected'
  }
];

// Helper functions for relative dates in mock data (avoids static outdated years/months)
const getRelativeMonthDate = (dayOfMonth: number, monthOffset = 0) => {
  const d = new Date();
  d.setMonth(d.getMonth() + monthOffset);
  // Cap day to month length
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const targetDay = Math.min(dayOfMonth, lastDay);
  d.setDate(targetDay);
  return d.toISOString().split('T')[0];
};

const initialFinancialEntries: FinancialEntry[] = [
  // --- org_hub_power (Pro) ---
  // Receivables (Entradas/A Receber)
  {
    id: 'fe_hp_r1',
    organizationId: 'org_hub_power',
    type: 'receivable',
    title: 'Mensalidade - Tech Solutions',
    description: 'Faturamento recorrente referente ao contrato de marketing digital',
    amount: 12500,
    paidAmount: 12500,
    dueDate: getRelativeMonthDate(5, 0),
    paidAt: getRelativeMonthDate(5, 0),
    status: 'paid',
    category: 'Contrato',
    contactName: 'Tech Solutions',
    paymentMethod: 'pix',
    isRecurring: true,
    recurrenceId: 'fr_hp_r1',
    createdAt: getRelativeMonthDate(1, 0)
  },
  {
    id: 'fe_hp_r2',
    organizationId: 'org_hub_power',
    type: 'receivable',
    title: 'Consultoria SEO - Reis & Advogados',
    description: 'Consultoria técnica de SEO on-page e auditoria semestral',
    amount: 8200,
    paidAmount: 8200,
    dueDate: getRelativeMonthDate(12, 0),
    paidAt: getRelativeMonthDate(11, 0),
    status: 'paid',
    category: 'Consultoria',
    contactName: 'Reis & Advogados Associados',
    paymentMethod: 'pix',
    createdAt: getRelativeMonthDate(10, 0)
  },
  {
    id: 'fe_hp_r3',
    organizationId: 'org_hub_power',
    type: 'receivable',
    title: 'Desenvolvimento Web - Grupo Alfa',
    description: 'Desenvolvimento da nova plataforma institucional',
    amount: 15000,
    dueDate: getRelativeMonthDate(25, 0),
    status: 'pending',
    category: 'Desenvolvimento',
    contactName: 'Grupo Alfa Ltda',
    paymentMethod: 'bank_transfer',
    createdAt: getRelativeMonthDate(15, 0)
  },
  {
    id: 'fe_hp_r4',
    organizationId: 'org_hub_power',
    type: 'receivable',
    title: 'Branding Avançado - Innovate Co',
    description: 'Entrega final da nova identidade visual e manual da marca',
    amount: 4500,
    dueDate: getRelativeMonthDate(25, -1), // Mês passado -> Vencido
    status: 'overdue',
    category: 'Design',
    contactName: 'Innovate Co.',
    paymentMethod: 'boleto',
    createdAt: getRelativeMonthDate(25, -2)
  },
  {
    id: 'fe_hp_r5',
    organizationId: 'org_hub_power',
    type: 'receivable',
    title: 'Mentoria de Equipe - Startup X',
    description: 'Sessões semanais de aceleração de lideranças operacionais',
    amount: 6000,
    paidAmount: 3000,
    dueDate: getRelativeMonthDate(20, 0),
    status: 'partial',
    category: 'Consultoria',
    contactName: 'Startup X Inc',
    paymentMethod: 'pix',
    createdAt: getRelativeMonthDate(1, 0)
  },
  {
    id: 'fe_hp_r6',
    organizationId: 'org_hub_power',
    type: 'receivable',
    title: 'Social Media Mockup - Beta Group',
    description: 'Briefing cancelado pelo cliente no início do projeto',
    amount: 2500,
    dueDate: getRelativeMonthDate(5, -1),
    status: 'cancelled',
    category: 'Design',
    contactName: 'Beta Group',
    createdAt: getRelativeMonthDate(1, -1)
  },
  // Payables (Saídas/A Pagar)
  {
    id: 'fe_hp_p1',
    organizationId: 'org_hub_power',
    type: 'payable',
    title: 'Aluguel Coworking - Headquarters',
    description: 'Mensalidade das salas exclusivas da agência',
    amount: 2500,
    dueDate: getRelativeMonthDate(15, 0),
    status: 'pending',
    category: 'Infraestrutura',
    contactName: 'Headquarters Coworking',
    paymentMethod: 'pix',
    isRecurring: true,
    recurrenceId: 'fr_hp_p1',
    createdAt: getRelativeMonthDate(1, 0)
  },
  {
    id: 'fe_hp_p2',
    organizationId: 'org_hub_power',
    type: 'payable',
    title: 'Licenças Figma Pro',
    description: 'Assinatura anual das contas de design',
    amount: 1200,
    paidAmount: 1200,
    dueDate: getRelativeMonthDate(1, 0),
    paidAt: getRelativeMonthDate(1, 0),
    status: 'paid',
    category: 'Ferramentas',
    contactName: 'Figma Inc.',
    paymentMethod: 'credit_card',
    isRecurring: true,
    recurrenceId: 'fr_hp_p2',
    createdAt: getRelativeMonthDate(1, 0)
  },
  {
    id: 'fe_hp_p3',
    organizationId: 'org_hub_power',
    type: 'payable',
    title: 'AWS Cloud Hosting',
    description: 'Servidores de staging e produção dos sistemas de clientes',
    amount: 950,
    paidAmount: 950,
    dueDate: getRelativeMonthDate(10, 0),
    paidAt: getRelativeMonthDate(10, 0),
    status: 'paid',
    category: 'Infraestrutura',
    contactName: 'Amazon Web Services',
    paymentMethod: 'credit_card',
    isRecurring: true,
    recurrenceId: 'fr_hp_p3',
    createdAt: getRelativeMonthDate(1, 0)
  },
  {
    id: 'fe_hp_p4',
    organizationId: 'org_hub_power',
    type: 'payable',
    title: 'Adobe Creative Suite',
    description: 'Licenças Adobe Premiere e Illustrator',
    amount: 350,
    dueDate: getRelativeMonthDate(28, -1), // Mês passado -> Vencido
    status: 'overdue',
    category: 'Ferramentas',
    contactName: 'Adobe Systems',
    paymentMethod: 'credit_card',
    createdAt: getRelativeMonthDate(28, -2)
  },
  {
    id: 'fe_hp_p5',
    organizationId: 'org_hub_power',
    type: 'payable',
    title: 'Contabilidade Mensal',
    description: 'Escrituração contábil e obrigações fiscais da agência',
    amount: 1500,
    dueDate: getRelativeMonthDate(30, 0),
    status: 'pending',
    category: 'Contador',
    contactName: 'Velasco Contadores Associados',
    paymentMethod: 'bank_transfer',
    isRecurring: true,
    recurrenceId: 'fr_hp_p4',
    createdAt: getRelativeMonthDate(1, 0)
  },

  // --- org_spark (Starter) ---
  {
    id: 'fe_sp_r1',
    organizationId: 'org_spark',
    type: 'receivable',
    title: 'Mensalidade - Cliente Spark',
    amount: 3000,
    paidAmount: 3000,
    dueDate: getRelativeMonthDate(10, 0),
    paidAt: getRelativeMonthDate(10, 0),
    status: 'paid',
    category: 'Contrato',
    contactName: 'Cliente Spark S/A',
    paymentMethod: 'pix',
    createdAt: getRelativeMonthDate(1, 0)
  },
  {
    id: 'fe_sp_r2',
    organizationId: 'org_spark',
    type: 'receivable',
    title: 'Edição de Vídeo Avulsa',
    amount: 1500,
    dueDate: getRelativeMonthDate(28, 0),
    status: 'pending',
    category: 'Serviço',
    contactName: 'Canal Criativo',
    paymentMethod: 'pix',
    createdAt: getRelativeMonthDate(10, 0)
  },
  {
    id: 'fe_sp_p1',
    organizationId: 'org_spark',
    type: 'payable',
    title: 'Assinatura Notion',
    amount: 150,
    paidAmount: 150,
    dueDate: getRelativeMonthDate(5, 0),
    paidAt: getRelativeMonthDate(5, 0),
    status: 'paid',
    category: 'Ferramentas',
    contactName: 'Notion Labs',
    paymentMethod: 'credit_card',
    createdAt: getRelativeMonthDate(1, 0)
  },
  {
    id: 'fe_sp_p2',
    organizationId: 'org_spark',
    type: 'payable',
    title: 'Designer Freelancer',
    amount: 400,
    dueDate: getRelativeMonthDate(20, 0),
    status: 'pending',
    category: 'Freelancer',
    contactName: 'Pedro Designer',
    paymentMethod: 'pix',
    createdAt: getRelativeMonthDate(15, 0)
  },

  // --- org_morales (Enterprise) ---
  {
    id: 'fe_mo_r1',
    organizationId: 'org_morales',
    type: 'receivable',
    title: 'Contrato Anual Corporativo',
    amount: 45000,
    paidAmount: 45000,
    dueDate: getRelativeMonthDate(1, 0),
    paidAt: getRelativeMonthDate(1, 0),
    status: 'paid',
    category: 'Contrato',
    contactName: 'Indústrias Morales',
    paymentMethod: 'bank_transfer',
    createdAt: getRelativeMonthDate(1, 0)
  },
  {
    id: 'fe_mo_r2',
    organizationId: 'org_morales',
    type: 'receivable',
    title: 'Auditoria de Processos',
    amount: 22000,
    dueDate: getRelativeMonthDate(25, 0),
    status: 'pending',
    category: 'Consultoria',
    contactName: 'Morales Consultores',
    paymentMethod: 'bank_transfer',
    createdAt: getRelativeMonthDate(10, 0)
  },
  {
    id: 'fe_mo_p1',
    organizationId: 'org_morales',
    type: 'payable',
    title: 'Folha de Pagamento - Equipe',
    amount: 12000,
    dueDate: getRelativeMonthDate(5, 0),
    status: 'pending',
    category: 'Salários',
    contactName: 'Colaboradores Morales',
    paymentMethod: 'bank_transfer',
    createdAt: getRelativeMonthDate(1, 0)
  }
];

const initialFinancialRecurrences: FinancialRecurrence[] = [
  // --- org_hub_power ---
  {
    id: 'fr_hp_r1',
    organizationId: 'org_hub_power',
    type: 'receivable',
    title: 'Mensalidade - Tech Solutions',
    amount: 12500,
    category: 'Contrato',
    frequency: 'monthly',
    startDate: getRelativeMonthDate(1, -2),
    nextDueDate: getRelativeMonthDate(5, 1),
    isActive: true,
    clientId: 'c_h1',
    paymentMethod: 'pix'
  },
  {
    id: 'fr_hp_r2',
    organizationId: 'org_hub_power',
    type: 'receivable',
    title: 'Assessoria Mensal - Innovate Co',
    amount: 3500,
    category: 'Contrato',
    frequency: 'monthly',
    startDate: getRelativeMonthDate(10, -1),
    nextDueDate: getRelativeMonthDate(10, 1),
    isActive: true,
    paymentMethod: 'pix'
  },
  {
    id: 'fr_hp_p1',
    organizationId: 'org_hub_power',
    type: 'payable',
    title: 'Aluguel Coworking',
    amount: 2500,
    category: 'Infraestrutura',
    frequency: 'monthly',
    startDate: getRelativeMonthDate(15, -6),
    nextDueDate: getRelativeMonthDate(15, 1),
    isActive: true,
    supplierName: 'Headquarters Coworking',
    paymentMethod: 'pix'
  },
  {
    id: 'fr_hp_p2',
    organizationId: 'org_hub_power',
    type: 'payable',
    title: 'Licenças Figma Pro',
    amount: 1200,
    category: 'Ferramentas',
    frequency: 'monthly',
    startDate: getRelativeMonthDate(1, -3),
    nextDueDate: getRelativeMonthDate(1, 1),
    isActive: true,
    supplierName: 'Figma Inc.',
    paymentMethod: 'credit_card'
  },
  {
    id: 'fr_hp_p3',
    organizationId: 'org_hub_power',
    type: 'payable',
    title: 'AWS Cloud Hosting',
    amount: 950,
    category: 'Infraestrutura',
    frequency: 'monthly',
    startDate: getRelativeMonthDate(10, -6),
    nextDueDate: getRelativeMonthDate(10, 1),
    isActive: true,
    supplierName: 'Amazon Web Services',
    paymentMethod: 'credit_card'
  },
  {
    id: 'fr_hp_p4',
    organizationId: 'org_hub_power',
    type: 'payable',
    title: 'Contabilidade Mensal',
    amount: 1500,
    category: 'Contador',
    frequency: 'monthly',
    startDate: getRelativeMonthDate(30, -12),
    nextDueDate: getRelativeMonthDate(30, 1),
    isActive: true,
    supplierName: 'Velasco Contadores Associados',
    paymentMethod: 'bank_transfer'
  }
];

const initialLeads: Lead[] = [
  // Power & Ponto Leads
  {
    id: 'l1',
    organizationId: 'org_hub_power',
    name: 'Carlos Oliveira',
    companyName: 'Oliveira Transportes',
    email: 'carlos@oliveiratrans.com.br',
    phone: '(11) 99888-1111',
    origin: 'Anúncio de Pesquisa',
    platform: 'google_ads',
    campaign: 'Pesquisa_Servicos_SP',
    adGroup: 'Controle_Ponto',
    adName: 'Ponto Eletrônico Rápido',
    formName: 'Formulário Principal',
    message: 'Gostaria de saber como funciona a integração com o relógio de ponto de parede.',
    status: 'new',
    temperature: 'hot',
    responsibleUser: 'Ana Silva',
    createdAt: '2026-06-12T09:00:00Z',
    lastInteraction: '2026-06-12T09:00:00Z',
    notes: 'Lead muito interessado. Entrou via Google Ads.'
  },
  {
    id: 'l2',
    organizationId: 'org_hub_power',
    name: 'Patrícia Souza',
    companyName: 'Souza Contabilidade',
    email: 'patricia@souzacontab.com.br',
    phone: '(11) 98888-2222',
    origin: 'Instagram Lead Form',
    platform: 'meta_ads',
    campaign: 'Meta_Conversao_Empresas',
    adGroup: 'RH_Gestao',
    adName: 'Automatizar Folha e Ponto',
    formName: 'Lead Form Redes Sociais',
    message: 'Temos 45 funcionários e hoje fazemos tudo em planilha Excel.',
    status: 'in_progress',
    temperature: 'warm',
    responsibleUser: 'João Santos',
    createdAt: '2026-06-10T14:30:00Z',
    lastInteraction: '2026-06-11T10:00:00Z',
    notes: 'Marcada conversa de acompanhamento. Entrou via Meta Ads.'
  },
  {
    id: 'l3',
    organizationId: 'org_hub_power',
    name: 'Roberto Diniz',
    companyName: 'Diniz Conveniência',
    email: 'roberto@dinizconveniencia.com',
    phone: '(21) 97777-3333',
    origin: 'WhatsApp Corporativo',
    platform: 'whatsapp',
    message: 'Olá, preciso de um orçamento para controle de ponto móvel via app.',
    status: 'qualified',
    temperature: 'hot',
    responsibleUser: 'Ana Silva',
    createdAt: '2026-06-13T10:00:00Z',
    lastInteraction: '2026-06-13T10:30:00Z',
    notes: 'Qualificado. Apresenta orçamento compatível com plano Pro.'
  },
  {
    id: 'l4',
    organizationId: 'org_hub_power',
    name: 'Luciana Mello',
    companyName: 'Mello Advocacia',
    email: 'luciana@mello.adv.br',
    phone: '(11) 96666-4444',
    origin: 'Indicação Comercial',
    platform: 'organic',
    message: 'Indicado por cliente antigo do plano Enterprise.',
    status: 'lost',
    temperature: 'cold',
    responsibleUser: 'Carlos Santos',
    createdAt: '2026-06-05T11:00:00Z',
    lastInteraction: '2026-06-08T09:00:00Z',
    notes: 'Perda registrada. Consideraram o preço inicial do setup muito alto.'
  },
  {
    id: 'l5',
    organizationId: 'org_hub_power',
    name: 'Sandra Helena',
    companyName: 'SH Boutique',
    email: 'sandra@shboutique.com.br',
    phone: '(11) 95555-5555',
    origin: 'Indicação',
    platform: 'organic',
    message: 'Interessada em marketing de influência e social media recorrente.',
    status: 'meeting',
    temperature: 'warm',
    responsibleUser: 'Maria Souza',
    createdAt: '2026-06-20T10:00:00Z',
    lastInteraction: '2026-06-22T14:00:00Z',
    notes: 'Reunião comercial de alinhamento de escopo agendada.'
  },
  {
    id: 'l6',
    organizationId: 'org_hub_power',
    name: 'Júlio Braga',
    companyName: 'Braga Advocacia',
    email: 'julio@braga.adv.br',
    phone: '(11) 94444-4444',
    origin: 'Google Ads Pesquisa',
    platform: 'google_ads',
    campaign: 'Braga_Adv_SP',
    adGroup: 'Institucional',
    message: 'Solicitação de proposta para SEO técnico e posts informativos semanais.',
    status: 'proposal_requested',
    temperature: 'hot',
    responsibleUser: 'Carlos Santos',
    createdAt: '2026-06-25T11:00:00Z',
    lastInteraction: '2026-06-26T15:00:00Z',
    notes: 'Proposta comercial de marketing de conteúdo solicitada e em elaboração.'
  },
  {
    id: 'l7',
    organizationId: 'org_hub_power',
    name: 'Carolina Lima',
    companyName: 'Ponto de Encontro Café',
    email: 'carolina@pontoencontro.com.br',
    phone: '(21) 97777-6666',
    origin: 'Instagram Lead Form',
    platform: 'meta_ads',
    campaign: 'Meta_Local_Focado',
    adGroup: 'Cafeteria_Premium',
    message: 'Queremos aumentar o fluxo físico de clientes através de anúncios geolocalizados.',
    status: 'converted',
    temperature: 'hot',
    responsibleUser: 'Ana Silva',
    createdAt: '2026-06-01T14:30:00Z',
    lastInteraction: '2026-06-02T10:00:00Z',
    notes: 'Lead convertido com sucesso em cliente e encaminhado para onboarding!'
  },

  // Spark Agency Leads
  {
    id: 'l_s1',
    organizationId: 'org_spark',
    name: 'Juliana Castro',
    companyName: 'Juliana Castro Estética',
    email: 'contato@julianacastro.com.br',
    phone: '(11) 98392-8239',
    origin: 'Facebook Leads',
    platform: 'meta_ads',
    campaign: 'Spark_Conversao_Beleza',
    adGroup: 'Estetica_Premium',
    message: 'Interessada em campanhas mensais de tráfego para atração de clientes locais.',
    status: 'new',
    temperature: 'hot',
    responsibleUser: 'Alice Costa',
    createdAt: '2026-06-14T08:00:00Z',
    lastInteraction: '2026-06-14T08:00:00Z',
    notes: 'Lead quente gerado recentemente pelo Meta Ads.'
  },
  {
    id: 'l_s2',
    organizationId: 'org_spark',
    name: 'Ricardo Neves',
    companyName: 'Neves Imobiliária',
    email: 'diretoria@nevesimoveis.com.br',
    phone: '(11) 97382-9938',
    origin: 'Formulário do Site',
    platform: 'landing_page',
    message: 'Preciso de reestruturação de site e criação de landing pages para lançamentos.',
    status: 'meeting',
    temperature: 'warm',
    responsibleUser: 'Roberto Lima',
    createdAt: '2026-06-11T16:00:00Z',
    lastInteraction: '2026-06-12T14:00:00Z',
    notes: 'Reunião agendada para 18/06 para alinhar escopo de desenvolvimento.'
  },
  {
    id: 'l_s3',
    organizationId: 'org_spark',
    name: 'André Melo',
    companyName: 'Melo Pizzaria',
    email: 'andre@melopizza.com',
    phone: '(19) 99839-2231',
    origin: 'WhatsApp Contato',
    platform: 'whatsapp',
    message: 'Olá, gostaria de saber se vocês fazem design de posts de cardápio e anúncios locais.',
    status: 'converted',
    temperature: 'hot',
    responsibleUser: 'Alice Costa',
    createdAt: '2026-06-01T10:00:00Z',
    lastInteraction: '2026-06-02T10:00:00Z',
    notes: 'Convertido em cliente! Já inserido no fluxo de onboarding da Spark.'
  },

  // Morales Soluções Leads
  {
    id: 'l_m1',
    organizationId: 'org_morales',
    name: 'Fernando Santos',
    companyName: 'Santos Supermercados',
    email: 'fernando@santosmercados.com.br',
    phone: '(11) 94839-2938',
    origin: 'Google Ads Pesquisa',
    platform: 'google_ads',
    campaign: 'Morales_SEO_Local',
    adGroup: 'Supermercados',
    message: 'Precisamos de consultoria completa de posicionamento no Google e SEO de e-commerce.',
    status: 'proposal_requested',
    temperature: 'hot',
    responsibleUser: 'Fabiana Melo',
    createdAt: '2026-06-12T11:00:00Z',
    lastInteraction: '2026-06-13T15:00:00Z',
    notes: 'Solicitou proposta de consultoria mensal. Proposta sendo estruturada.'
  },
  {
    id: 'l_m2',
    organizationId: 'org_morales',
    name: 'Letícia Lima',
    companyName: 'Lima Clínicas',
    email: 'leticia@limaclinicas.com',
    phone: '(11) 95829-9944',
    origin: 'Indicação',
    platform: 'organic',
    message: 'Indicação direta. Quer fazer SEO técnico e otimização de busca local.',
    status: 'meeting',
    temperature: 'warm',
    responsibleUser: 'Carlos Morales',
    createdAt: '2026-06-10T15:00:00Z',
    lastInteraction: '2026-06-11T11:00:00Z',
    notes: 'Reunião de alinhamento técnico agendada com Carlos Morales.'
  },
  {
    id: 'l_m3',
    organizationId: 'org_morales',
    name: 'Bruno Rocha',
    companyName: 'Rocha Engenharia',
    email: 'bruno@rochaeng.com.br',
    phone: '(11) 93948-2233',
    origin: 'Busca Orgânica',
    platform: 'organic',
    message: 'Interessado em auditoria de tráfego orgânico para construtoras.',
    status: 'new',
    temperature: 'cold',
    responsibleUser: 'Fabiana Melo',
    createdAt: '2026-06-14T17:00:00Z',
    lastInteraction: '2026-06-14T17:00:00Z',
    notes: 'Lead capturado recentemente por busca orgânica no blog Morales.'
  }
];

const initialTeamMembers: TeamMember[] = [
  {
    id: '1',
    organizationId: 'org_hub_power',
    name: 'Ana Silva',
    role: 'Gestora de Contas / Onboarding',
    email: 'ana@powerponto.com.br',
    userRole: 'admin',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    status: 'active',
    lastAccess: '2026-06-14T19:30:00Z'
  },
  {
    id: '2',
    organizationId: 'org_hub_power',
    name: 'João Santos',
    role: 'Social Media & Designer',
    email: 'joao@powerponto.com.br',
    userRole: 'member',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
    status: 'active',
    lastAccess: '2026-06-14T18:45:00Z'
  },
  {
    id: '3',
    organizationId: 'org_hub_power',
    name: 'Maria Souza',
    role: 'Gestora de Tráfego Pago',
    email: 'maria@powerponto.com.br',
    userRole: 'member',
    avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&auto=format&fit=crop&q=80',
    status: 'active',
    lastAccess: '2026-06-14T17:15:00Z'
  },
  {
    id: '4',
    organizationId: 'org_hub_power',
    name: 'Carlos Santos',
    role: 'Diretor Comercial',
    email: 'carlos@powerponto.com.br',
    userRole: 'owner',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80',
    status: 'active',
    lastAccess: '2026-06-14T19:55:00Z'
  },
  {
    id: '5',
    organizationId: 'org_spark',
    name: 'Roberto Lima',
    role: 'Diretor Criativo',
    email: 'roberto@sparkagency.com',
    userRole: 'owner',
    avatarUrl: '',
    status: 'active',
    lastAccess: '2026-06-14T12:00:00Z'
  },
  {
    id: '6',
    organizationId: 'org_spark',
    name: 'Alice Costa',
    role: 'Copywriter & Ads',
    email: 'alice@sparkagency.com',
    userRole: 'member',
    avatarUrl: '',
    status: 'active',
    lastAccess: '2026-06-13T16:20:00Z'
  },
  {
    id: '7',
    organizationId: 'org_morales',
    name: 'Carlos Morales',
    role: 'CEO & Diretor de TI',
    email: 'carlos@morales.com.br',
    userRole: 'owner',
    avatarUrl: '',
    status: 'active',
    lastAccess: '2026-06-14T20:01:00Z'
  },
  {
    id: '8',
    organizationId: 'org_morales',
    name: 'Fabiana Melo',
    role: 'Gerente Comercial',
    email: 'fabiana@morales.com.br',
    userRole: 'admin',
    avatarUrl: '',
    status: 'active',
    lastAccess: '2026-06-14T19:10:00Z'
  }
];

const initialClients: Client[] = [
  {
    id: 'c1',
    organizationId: 'org_hub_power',
    name: 'Roberto Souza',
    companyName: 'Power Energy Ltda',
    cnpj: '12.345.678/0001-90',
    phone: '(11) 98888-7777',
    email: 'roberto@powerenergy.com.br',
    responsibleUser: 'Maria Souza',
    commercialStatus: 'active',
    notes: 'Cliente focado em energia renovável. Exige relatórios semanais de tráfego.',
    createdAt: '2026-05-10T10:00:00Z'
  },
  {
    id: 'c2',
    organizationId: 'org_hub_power',
    name: 'Carolina Lima',
    companyName: 'Ponto de Encontro Café',
    cnpj: '98.765.432/0001-10',
    phone: '(21) 97777-6666',
    email: 'carolina@pontoencontro.com.br',
    responsibleUser: 'Ana Silva',
    commercialStatus: 'onboarding',
    notes: 'Onboarding iniciado. Necessita de criação de grupo de WhatsApp e ClickUp rápido.',
    createdAt: '2026-06-01T14:30:00Z'
  },
  {
    id: 'c3',
    organizationId: 'org_hub_power',
    name: 'Gabriel Faria',
    companyName: 'Alfa Tech Consultoria',
    cnpj: '55.444.333/0001-22',
    phone: '(31) 96666-5555',
    email: 'gabriel@alfatech.com',
    responsibleUser: 'Carlos Santos',
    commercialStatus: 'lead',
    notes: 'Proposta comercial enviada. Avaliando escopo de tráfego e posts de LinkedIn.',
    createdAt: '2026-06-05T09:15:00Z'
  },
  {
    id: 'c4',
    organizationId: 'org_hub_power',
    name: 'Sandra Helena',
    companyName: 'SH Boutique',
    cnpj: '44.333.222/0001-11',
    phone: '(11) 95555-5555',
    email: 'sandra@shboutique.com.br',
    responsibleUser: 'Maria Souza',
    commercialStatus: 'inactive',
    notes: 'Contrato temporariamente suspenso para readequação interna da boutique.',
    createdAt: '2026-04-01T10:00:00Z'
  },
  {
    id: 'c_s1',
    organizationId: 'org_spark',
    name: 'Eduardo Rocha',
    companyName: 'Spark Solar',
    cnpj: '33.222.111/0001-00',
    phone: '(11) 97777-8888',
    email: 'eduardo@sparksolar.com',
    responsibleUser: 'Roberto Lima',
    commercialStatus: 'active',
    notes: 'Cliente de energia solar da Spark Agency.',
    createdAt: '2026-06-01T10:00:00Z'
  },
  {
    id: 'c_s2',
    organizationId: 'org_spark',
    name: 'Mariana Costa',
    companyName: 'Estilo Modas',
    cnpj: '22.111.000/0001-99',
    phone: '(11) 96666-7777',
    email: 'mariana@estilomodas.com',
    responsibleUser: 'Alice Costa',
    commercialStatus: 'lead',
    notes: 'Lead interessado em tráfego de e-commerce.',
    createdAt: '2026-06-02T11:00:00Z'
  },
  {
    id: 'c_m1',
    organizationId: 'org_morales',
    name: 'Beatriz Reis',
    companyName: 'Reis & Advogados Associados',
    cnpj: '99.888.777/0001-00',
    phone: '(11) 95555-4444',
    email: 'beatriz@reisadvogados.com.br',
    responsibleUser: 'Fabiana Melo',
    commercialStatus: 'active',
    notes: 'Contrato de SEO e Blog Corporativo para advocacia.',
    createdAt: '2026-06-10T10:00:00Z'
  },
  {
    id: 'c_m2',
    organizationId: 'org_morales',
    name: 'Lucas Belo',
    companyName: 'Belo Pão Panificadora',
    cnpj: '11.222.333/0001-44',
    phone: '(11) 94444-3333',
    email: 'lucas@belopao.com.br',
    responsibleUser: 'Fabiana Melo',
    commercialStatus: 'onboarding',
    notes: 'Onboarding de tráfego local.',
    createdAt: '2026-06-12T11:00:00Z'
  }
];

const initialProposals: Proposal[] = [
  {
    id: 'p1',
    organizationId: 'org_hub_power',
    clientId: 'c3',
    clientName: 'Gabriel Faria',
    companyName: 'Alfa Tech Consultoria',
    description: 'Gestão Completa de Tráfego Pago e Copywriting para LinkedIn',
    items: [
      { id: 'pi1', description: 'Setup inicial de contas de anúncios (Google/Meta)', value: 1500.0, isMonthly: false },
      { id: 'pi2', description: 'Gestão de Tráfego Pago mensal (Meta Ads & Google Ads)', value: 2500.0, isMonthly: true },
      { id: 'pi3', description: 'Criação de 8 posts mensais para LinkedIn com criativos', value: 1000.0, isMonthly: true }
    ],
    totalValue: 5000.0,
    monthlyValue: 3500.0,
    validityDate: '2026-07-05',
    paymentTerms: 'Boleto bancário via Asaas. Setup à vista, mensalidades com vencimento todo dia 10.',
    notes: 'Validade de 30 dias a partir da data de emissão.',
    status: 'sent',
    createdAt: '2026-06-05T10:00:00Z'
  },
  {
    id: 'p2',
    organizationId: 'org_hub_power',
    clientId: 'c2',
    clientName: 'Carolina Lima',
    companyName: 'Ponto de Encontro Café',
    description: 'Marketing Digital e Gestão de Redes Sociais Integrada',
    items: [
      { id: 'pi4', description: 'Gestão de Redes Sociais (Instagram/Facebook) - 12 posts', value: 2000.0, isMonthly: true },
      { id: 'pi5', description: 'Tráfego Pago local para atração de clientes ao café', value: 1500.0, isMonthly: true }
    ],
    totalValue: 3500.0,
    monthlyValue: 3500.0,
    validityDate: '2026-06-15',
    paymentTerms: 'Cartão de crédito ou PIX via Asaas recorrente.',
    notes: 'Proposta negociada em reunião inicial.',
    status: 'accepted',
    createdAt: '2026-06-01T15:00:00Z'
  },
  {
    id: 'p_s1',
    organizationId: 'org_spark',
    clientId: 'c_s1',
    clientName: 'Eduardo Rocha',
    companyName: 'Spark Solar',
    description: 'Design de Branding & Logo',
    items: [
      { id: 'pi_s1', description: 'Criação de logotipo principal e manual de identidade', value: 2000.0, isMonthly: false }
    ],
    totalValue: 2000.0,
    monthlyValue: 0.0,
    validityDate: '2026-07-01',
    paymentTerms: 'PIX à vista.',
    status: 'accepted',
    createdAt: '2026-06-01T12:00:00Z'
  },
  {
    id: 'p_s2',
    organizationId: 'org_spark',
    clientId: 'c_s2',
    clientName: 'Mariana Costa',
    companyName: 'Estilo Modas',
    description: 'Gestão de Tráfego Pago Starter',
    items: [
      { id: 'pi_s2', description: 'Gestão mensal Meta Ads', value: 1200.0, isMonthly: true }
    ],
    totalValue: 1200.0,
    monthlyValue: 1200.0,
    validityDate: '2026-06-25',
    paymentTerms: 'Boleto bancário recorrente',
    status: 'sent',
    createdAt: '2026-06-02T14:00:00Z'
  },
  {
    id: 'p_m1',
    organizationId: 'org_morales',
    clientId: 'c_m1',
    clientName: 'Beatriz Reis',
    companyName: 'Reis & Advogados Associados',
    description: 'Marketing de Conteúdo & Otimização SEO',
    items: [
      { id: 'pi_m1', description: 'Criação de artigos e otimização on-page', value: 4500.0, isMonthly: true }
    ],
    totalValue: 4500.0,
    monthlyValue: 4500.0,
    validityDate: '2026-07-10',
    paymentTerms: 'Boleto 10 dias',
    status: 'accepted',
    createdAt: '2026-06-10T11:00:00Z'
  },
  {
    id: 'p_m2',
    organizationId: 'org_morales',
    clientId: 'c_m2',
    clientName: 'Lucas Belo',
    companyName: 'Belo Pão Panificadora',
    description: 'Marketing Local e Tráfego Pago',
    items: [
      { id: 'pi_m2', description: 'Google Business Profile & Anúncios Locais', value: 2500.0, isMonthly: true }
    ],
    totalValue: 2500.0,
    monthlyValue: 2500.0,
    validityDate: '2026-07-15',
    paymentTerms: 'Cartão de crédito ou PIX Asaas recorrente',
    status: 'draft',
    createdAt: '2026-06-12T11:30:00Z'
  },
  {
    id: 'p3',
    organizationId: 'org_hub_power',
    clientId: 'c1',
    clientName: 'Roberto Souza',
    companyName: 'Power Energy Ltda',
    description: 'Gestão de Tráfego Pago e Redes Sociais',
    items: [
      { id: 'pi6', description: 'Gestão mensal de Tráfego Pago (Google/Meta)', value: 2700.0, isMonthly: true },
      { id: 'pi7', description: 'Criação de Conteúdo e Copywriting para Redes Sociais', value: 1500.0, isMonthly: true }
    ],
    totalValue: 4200.0,
    monthlyValue: 4200.0,
    validityDate: '2026-06-10',
    paymentTerms: 'Boleto bancário via Asaas recorrente.',
    status: 'accepted',
    createdAt: '2026-05-08T10:00:00Z'
  }
];

const initialContracts: Contract[] = [
  {
    id: 'ct1',
    organizationId: 'org_hub_power',
    clientId: 'c2',
    clientName: 'Carolina Lima',
    companyName: 'Ponto de Encontro Café',
    proposalId: 'p2',
    type: 'Marketing Digital e Tráfego Local',
    value: 3500.0,
    monthlyValue: 3500.0,
    startDate: '2026-06-11',
    firstPaymentDate: '2026-06-15',
    status: 'pending_signatures',
    documentUrl: 'https://zapsign.com.br/sign/mock-ponto-de-encontro-cafe',
    version: 'v1.0',
    createdAt: '2026-06-02T09:00:00Z'
  },
  {
    id: 'ct2',
    organizationId: 'org_hub_power',
    clientId: 'c1',
    clientName: 'Roberto Souza',
    companyName: 'Power Energy Ltda',
    proposalId: 'p3',
    type: 'Gestão de Tráfego Pago & Copywriting',
    value: 4200.0,
    monthlyValue: 4200.0,
    startDate: '2026-05-10',
    firstPaymentDate: '2026-06-10',
    status: 'signed',
    documentUrl: 'https://zapsign.com.br/sign/mock-power-energy',
    version: 'v1.0',
    createdAt: '2026-05-10T09:00:00Z'
  },
  {
    id: 'ct_s1',
    organizationId: 'org_spark',
    clientId: 'c_s1',
    clientName: 'Eduardo Rocha',
    companyName: 'Spark Solar',
    proposalId: 'p_s1',
    type: 'Design de Branding & Logo',
    value: 2000.0,
    monthlyValue: 0.0,
    startDate: '2026-06-02',
    firstPaymentDate: '2026-06-02',
    status: 'signed',
    version: 'v1.0',
    createdAt: '2026-06-02T09:00:00Z'
  },
  {
    id: 'ct_m1',
    organizationId: 'org_morales',
    clientId: 'c_m1',
    clientName: 'Beatriz Reis',
    companyName: 'Reis & Advogados Associados',
    proposalId: 'p_m1',
    type: 'Marketing de Conteúdo & Otimização SEO',
    value: 4500.0,
    monthlyValue: 4500.0,
    startDate: '2026-06-11',
    firstPaymentDate: '2026-06-15',
    status: 'signed',
    version: 'v1.0',
    createdAt: '2026-06-10T12:00:00Z'
  }
];

const initialCharges: Charge[] = [
  {
    id: 'pay_asaas_sandbox_1',
    organizationId: 'org_hub_power',
    clientId: 'c2',
    clientName: 'Carolina Lima',
    companyName: 'Ponto de Encontro Café',
    contractId: 'ct1',
    value: 3500.0,
    dueDate: '2026-07-15',
    paymentMethod: 'pix',
    paymentUrl: 'https://cobranca.asaas.com/mock-cobranca-ponto-cafe',
    status: 'pending',
    createdAt: '2026-06-02T09:30:00Z'
  },
  {
    id: 'pay_asaas_sandbox_2',
    organizationId: 'org_hub_power',
    clientId: 'c1',
    clientName: 'Roberto Souza',
    companyName: 'Power Energy Ltda',
    contractId: 'ct2',
    value: 4200.0,
    dueDate: '2026-06-10',
    paymentMethod: 'pix',
    paymentUrl: 'https://cobranca.asaas.com/mock-cobranca-power-energy',
    status: 'paid',
    paidAt: '2026-06-10T10:00:00Z',
    createdAt: '2026-05-10T09:30:00Z'
  },
  {
    id: 'pay_asaas_sandbox_3',
    organizationId: 'org_hub_power',
    clientId: 'c4',
    clientName: 'Sandra Helena',
    companyName: 'SH Boutique',
    contractId: '',
    value: 2500.0,
    dueDate: '2026-06-15',
    paymentMethod: 'boleto',
    paymentUrl: 'https://cobranca.asaas.com/mock-cobranca-sh-boutique',
    status: 'overdue',
    createdAt: '2026-06-01T11:00:00Z'
  },
  {
    id: 'ch_s1',
    organizationId: 'org_spark',
    clientId: 'c_s1',
    clientName: 'Eduardo Rocha',
    companyName: 'Spark Solar',
    contractId: 'ct_s1',
    value: 2000.0,
    dueDate: '2026-06-02',
    paymentMethod: 'pix',
    status: 'paid',
    paidAt: '2026-06-02T10:00:00Z',
    createdAt: '2026-06-02T09:05:00Z'
  },
  {
    id: 'ch_m1',
    organizationId: 'org_morales',
    clientId: 'c_m1',
    clientName: 'Beatriz Reis',
    companyName: 'Reis & Advogados Associados',
    contractId: 'ct_m1',
    value: 4500.0,
    dueDate: '2026-06-15',
    paymentMethod: 'pix',
    status: 'paid',
    paidAt: '2026-06-15T09:00:00Z',
    createdAt: '2026-06-10T13:00:00Z'
  }
];

const initialOnboardings: Onboarding[] = [
  {
    id: 'o1',
    organizationId: 'org_hub_power',
    clientId: 'c2',
    clientName: 'Carolina Lima',
    companyName: 'Ponto de Encontro Café',
    startDate: '2026-06-02',
    responsibleUser: 'Ana Silva',
    steps: {
      paymentConfirmed: 'completed',
      driveCreated: 'completed',
      clickupCreated: 'pending',
      tasksCreated: 'pending',
      onboardingMeeting: 'pending',
      completed: 'pending'
    },
    links: {
      googleDrive: 'https://drive.google.com/drive/folders/mock-ponto-de-encontro-cafe',
      clickup: '',
      whatsAppGroup: '',
      contract: 'https://zapsign.com.br/sign/mock-ponto-de-encontro-cafe',
      charge: 'https://cobranca.asaas.com/mock-cobranca-ponto-cafe',
      proposal: 'p2'
    },
    createdAt: '2026-06-02T10:00:00Z'
  },
  {
    id: 'o_s1',
    organizationId: 'org_spark',
    clientId: 'c_s1',
    clientName: 'Eduardo Rocha',
    companyName: 'Spark Solar',
    startDate: '2026-06-02',
    responsibleUser: 'Roberto Lima',
    steps: {
      paymentConfirmed: 'completed',
      driveCreated: 'completed',
      clickupCreated: 'completed',
      tasksCreated: 'completed',
      onboardingMeeting: 'completed',
      completed: 'completed'
    },
    links: {
      googleDrive: 'https://drive.google.com/drive/folders/mock-sparksolar',
      clickup: 'https://app.clickup.com/folders/mock-sparksolar',
      whatsAppGroup: 'https://chat.whatsapp.com/mock-sparksolar',
      contract: '',
      charge: '',
      proposal: 'p_s1'
    },
    createdAt: '2026-06-02T10:00:00Z'
  },
  {
    id: 'o_m1',
    organizationId: 'org_morales',
    clientId: 'c_m1',
    clientName: 'Beatriz Reis',
    companyName: 'Reis & Advogados Associados',
    startDate: '2026-06-10',
    responsibleUser: 'Fabiana Melo',
    steps: {
      paymentConfirmed: 'completed',
      driveCreated: 'completed',
      clickupCreated: 'completed',
      tasksCreated: 'completed',
      onboardingMeeting: 'completed',
      completed: 'completed'
    },
    links: {
      googleDrive: 'https://drive.google.com/drive/folders/mock-moralesadv',
      clickup: 'https://app.clickup.com/folders/mock-moralesadv',
      whatsAppGroup: 'https://chat.whatsapp.com/mock-moralesadv',
      contract: '',
      charge: '',
      proposal: 'p_m1'
    },
    createdAt: '2026-06-10T14:00:00Z'
  }
];

const initialPublications: Publication[] = [
  {
    id: 'pub1',
    organizationId: 'org_hub_power',
    clientId: 'c1',
    clientName: 'Roberto Souza',
    companyName: 'Power Energy Ltda',
    imageUrl: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=600&auto=format&fit=crop&q=80',
    caption: '⚡ A transição para energia limpa não é mais o futuro, é o presente. Empresas que adotam fontes renováveis reduzem custos operacionais em até 30% e geram um impacto ambiental positivo imediato. Fale conosco para entender como podemos ajudar o seu negócio a decolar sustentavelmente! #EnergiaSolar #Sustentabilidade #Economia',
    scheduledDate: '2026-06-15',
    status: 'approved',
    approvalLink: 'https://nvhub.com.br/aprovar/pub1',
    responsibleUser: 'João Santos',
    createdAt: '2026-06-08T14:00:00Z'
  },
  {
    id: 'pub2',
    organizationId: 'org_hub_power',
    clientId: 'c2',
    clientName: 'Carolina Lima',
    companyName: 'Ponto de Encontro Café',
    imageUrl: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=600&auto=format&fit=crop&q=80',
    caption: '☕ O aroma de um café especial moído na hora tem o poder de transformar qualquer dia produtivo. No Ponto de Encontro, selecionamos grãos de pequenos produtores nacionais para garantir a xícara perfeita para suas reuniões ou pausas criativas. Venha trabalhar e se deliciar! #CafeEspecial #CoffeeLover #EspacoCoworking',
    scheduledDate: '2026-06-18',
    status: 'pending_approval',
    approvalLink: 'https://nvhub.com.br/aprovar/pub2',
    responsibleUser: 'João Santos',
    createdAt: '2026-06-10T11:00:00Z'
  },
  {
    id: 'pub_m1',
    organizationId: 'org_morales',
    clientId: 'c_m1',
    clientName: 'Beatriz Reis',
    companyName: 'Reis & Advogados Associados',
    imageUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600&auto=format&fit=crop&q=80',
    caption: '⚖️ Como a nova reforma tributária afeta o planejamento fiscal da sua empresa? Nosso time de especialistas preparou um guia exclusivo simplificando as principais mudanças para o seu negócio. Acesse nosso blog e leia na íntegra! #DireitoTributario #PlanejamentoFiscal #ReformaTributaria',
    scheduledDate: '2026-06-25',
    status: 'approved',
    approvalLink: 'https://nvhub.com.br/aprovar/pub_m1',
    responsibleUser: 'Carlos Morales',
    createdAt: '2026-06-12T10:00:00Z'
  }
];

const initialTasks: TeamTask[] = [
  {
    id: 't1',
    organizationId: 'org_hub_power',
    title: 'Fazer Reunião de Briefing de Onboarding',
    clientId: 'c2',
    clientName: 'Ponto de Encontro Café',
    responsibleUser: 'Ana Silva',
    dueDate: '2026-06-14',
    status: 'pending',
    priority: 'high',
    description: 'Reunião para extrair a identidade da marca, preferências de cores e estruturar o calendário editorial inicial.',
    createdAt: '2026-06-02T10:00:00Z'
  },
  {
    id: 't2',
    organizationId: 'org_hub_power',
    title: 'Criar criativos do post de Café Especial',
    clientId: 'c2',
    clientName: 'Ponto de Encontro Café',
    responsibleUser: 'João Santos',
    dueDate: '2026-06-10',
    status: 'completed',
    priority: 'medium',
    description: 'Desenvolver artes e legendas para os posts institucionais de lançamento.',
    createdAt: '2026-06-05T14:00:00Z'
  },
  {
    id: 't3',
    organizationId: 'org_hub_power',
    title: 'Mapear Público-Alvo e Configurar Pixel Facebook',
    clientId: 'c2',
    clientName: 'Ponto de Encontro Café',
    responsibleUser: 'Maria Souza',
    dueDate: '2026-06-16',
    status: 'in_progress',
    priority: 'urgent',
    description: 'Instalar pixel de conversão no site do café e configurar campanhas de tráfego de geolocalização.',
    createdAt: '2026-06-05T15:00:00Z'
  },
  {
    id: 't_s1',
    organizationId: 'org_spark',
    title: 'Desenhar rascunhos de logo',
    clientId: 'c_s1',
    clientName: 'Spark Solar',
    responsibleUser: 'Roberto Lima',
    dueDate: '2026-06-15',
    status: 'completed',
    priority: 'medium',
    description: 'Esboços iniciais de design de marca.',
    createdAt: '2026-06-02T10:00:00Z'
  },
  {
    id: 't_m1',
    organizationId: 'org_morales',
    title: 'Pesquisa de Palavras-Chave Jurídicas',
    clientId: 'c_m1',
    clientName: 'Reis & Advogados Associados',
    responsibleUser: 'Carlos Morales',
    dueDate: '2026-06-20',
    status: 'in_progress',
    priority: 'high',
    description: 'Pesquisa detalhada de volumes de busca para termos de direito tributário e empresarial.',
    createdAt: '2026-06-11T10:00:00Z'
  }
];

const initialHistory: HistoryEvent[] = [
  {
    id: 'h1',
    organizationId: 'org_hub_power',
    clientId: 'c1',
    clientName: 'Power Energy Ltda',
    title: 'Cliente Criado',
    description: 'Cadastro inicial efetuado no sistema por Carlos Santos.',
    type: 'client_created',
    createdAt: '2026-05-10T10:00:00Z'
  },
  {
    id: 'h2',
    organizationId: 'org_hub_power',
    clientId: 'c2',
    clientName: 'Ponto de Encontro Café',
    title: 'Cliente Criado',
    description: 'Cadastro efetuado no sistema por Carlos Santos após consulta de CNPJ.',
    type: 'client_created',
    createdAt: '2026-06-01T14:30:00Z'
  },
  {
    id: 'h3',
    organizationId: 'org_hub_power',
    clientId: 'c2',
    clientName: 'Ponto de Encontro Café',
    title: 'Proposta Comercial Criada',
    description: 'Proposta comercial de R$ 3.500,00 mensais foi elaborada por Carlos Santos.',
    type: 'proposal_created',
    createdAt: '2026-06-01T15:00:00Z'
  },
  {
    id: 'h4',
    organizationId: 'org_hub_power',
    clientId: 'c2',
    clientName: 'Ponto de Encontro Café',
    title: 'Proposta Aceita pelo Cliente',
    description: 'Carolina Lima visualizou e aceitou os termos da proposta na página pública.',
    type: 'proposal_accepted',
    createdAt: '2026-06-01T17:45:00Z'
  },
  {
    id: 'h5',
    organizationId: 'org_hub_power',
    clientId: 'c2',
    clientName: 'Ponto de Encontro Café',
    title: 'Contrato Gerado Automaticamente',
    description: 'Contrato de prestação de serviços gerado e enviado para assinatura via ZapSign.',
    type: 'contract_generated',
    createdAt: '2026-06-02T09:00:00Z'
  },
  {
    id: 'h6',
    organizationId: 'org_hub_power',
    clientId: 'c2',
    clientName: 'Ponto de Encontro Café',
    title: 'Cobrança Financeira Gerada',
    description: 'Cobrança recorrente de R$ 3.500,00 criada no integrador Asaas.',
    type: 'charge_generated',
    createdAt: '2026-06-02T09:30:00Z'
  },
  {
    id: 'h_s1',
    organizationId: 'org_spark',
    clientId: 'c_s1',
    clientName: 'Spark Solar',
    title: 'Cliente Criado',
    description: 'Spark Solar cadastrado por Roberto Lima.',
    type: 'client_created',
    createdAt: '2026-06-01T10:00:00Z'
  },
  {
    id: 'h_s2',
    organizationId: 'org_spark',
    clientId: 'c_s1',
    clientName: 'Spark Solar',
    title: 'Contrato Assinado',
    description: 'Contrato assinado via ZapSign.',
    type: 'contract_signed',
    createdAt: '2026-06-02T09:00:00Z'
  },
  {
    id: 'h_m1',
    organizationId: 'org_morales',
    clientId: 'c_m1',
    clientName: 'Reis & Advogados Associados',
    title: 'Cliente Criado',
    description: 'Reis & Advogados Associados cadastrado por Fabiana Melo.',
    type: 'client_created',
    createdAt: '2026-06-10T10:00:00Z'
  },
  {
    id: 'h_m2',
    organizationId: 'org_morales',
    clientId: 'c_m1',
    clientName: 'Reis & Advogados Associados',
    title: 'Contrato Assinado',
    description: 'Contrato de SEO assinado via ZapSign por Beatriz Reis.',
    type: 'contract_signed',
    createdAt: '2026-06-10T12:00:00Z'
  }
];

const initialFeatures: OrganizationFeatures[] = [
  {
    organizationId: 'org_hub_power',
    ...getPlanDefaultFeatures('pro')
  },
  {
    organizationId: 'org_spark',
    ...getPlanDefaultFeatures('starter')
  },
  {
    organizationId: 'org_morales',
    ...getPlanDefaultFeatures('enterprise')
  }
];

export const useStore = create<SystemState>()(
  persist(
    (set, get) => ({
      organizations: initialOrganizations,
      currentOrganizationId: 'org_hub_power',
      clients: initialClients,
      proposals: initialProposals,
      contracts: initialContracts,
      charges: initialCharges,
      onboardings: initialOnboardings,
      publications: initialPublications,
      tasks: initialTasks,
      historyEvents: initialHistory,
      teamMembers: initialTeamMembers,
      currentUser: initialTeamMembers[0], // Ana Silva default
      integrations: initialIntegrations,
      leads: initialLeads,
      organizationFeatures: initialFeatures,
      financialEntries: initialFinancialEntries,
      financialRecurrences: initialFinancialRecurrences,
      activeSetupClientId: null,
      activeSetupStep: 'none',
      isSetupDismissed: false,
      isSidebarCollapsed: false,
      clearActiveSetup: () => set({ activeSetupClientId: null, activeSetupStep: 'none', isSetupDismissed: false }),
      setSetupDismissed: (dismissed) => set({ isSetupDismissed: dismissed }),
      toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

      setCurrentOrganizationId: (id) => {
        // Change currentUser dynamically depending on the selected organization to mock authentication
        const orgMembers = get().teamMembers.filter(m => m.organizationId === id);
        const nextUser = orgMembers[0] || initialTeamMembers[0];
        set({ currentOrganizationId: id, currentUser: nextUser });
      },

      addFinancialEntry: (entry) => {
        const orgId = get().currentOrganizationId;
        const newEntry: FinancialEntry = {
          ...entry,
          id: 'fe_' + Math.random().toString(36).substring(2, 11),
          organizationId: orgId,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          financialEntries: [newEntry, ...state.financialEntries],
        }));

        get().addHistoryEvent({
          title: newEntry.type === 'receivable' ? 'Recebível Criado' : 'Conta a Pagar Criada',
          description: `${newEntry.title} - R$ ${newEntry.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} lançado em ${newEntry.category}.`,
          type: 'proposal_created',
          organizationId: orgId
        });
      },

      updateFinancialEntry: (id, entry) => {
        const orgId = get().currentOrganizationId;
        set((state) => ({
          financialEntries: state.financialEntries.map((fe) => {
            if (fe.id === id && fe.organizationId === orgId) {
              return { ...fe, ...entry, updatedAt: new Date().toISOString() };
            }
            return fe;
          }),
        }));
      },

      confirmFinancialPayment: (id, paidAmount, paidAt) => {
        const orgId = get().currentOrganizationId;
        const entry = get().financialEntries.find((fe) => fe.id === id && fe.organizationId === orgId);
        if (!entry) return;

        const actualPaidAmount = paidAmount !== undefined ? paidAmount : entry.amount;
        const actualPaidAt = paidAt || new Date().toISOString();
        const isPartial = actualPaidAmount < entry.amount;
        const newStatus = isPartial ? 'partial' : 'paid';

        set((state) => ({
          financialEntries: state.financialEntries.map((fe) => {
            if (fe.id === id && fe.organizationId === orgId) {
              return {
                ...fe,
                status: newStatus,
                paidAmount: actualPaidAmount,
                paidAt: actualPaidAt,
                updatedAt: new Date().toISOString(),
              };
            }
            return fe;
          }),
        }));

        get().addHistoryEvent({
          title: entry.type === 'receivable' ? 'Recebimento Confirmado' : 'Pagamento Confirmado',
          description: `${entry.type === 'receivable' ? 'Recebido' : 'Pago'}: ${entry.title} - R$ ${actualPaidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}${isPartial ? ' (Parcial)' : ''}.`,
          type: 'charge_paid',
          organizationId: orgId,
        });
      },

      cancelFinancialEntry: (id) => {
        const orgId = get().currentOrganizationId;
        const entry = get().financialEntries.find((fe) => fe.id === id && fe.organizationId === orgId);
        if (!entry) return;

        set((state) => ({
          financialEntries: state.financialEntries.map((fe) => {
            if (fe.id === id && fe.organizationId === orgId) {
              return {
                ...fe,
                status: 'cancelled',
                updatedAt: new Date().toISOString(),
              };
            }
            return fe;
          }),
        }));

        get().addHistoryEvent({
          title: entry.type === 'receivable' ? 'Recebível Cancelado' : 'Conta a Pagar Cancelada',
          description: `Cancelado: ${entry.title} no valor de R$ ${entry.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
          type: 'task_completed',
          organizationId: orgId,
        });
      },

      addFinancialRecurrence: (recurrence) => {
        const orgId = get().currentOrganizationId;
        const newRec: FinancialRecurrence = {
          ...recurrence,
          id: 'fr_' + Math.random().toString(36).substring(2, 11),
          organizationId: orgId,
          isActive: true,
        };
        set((state) => ({
          financialRecurrences: [newRec, ...state.financialRecurrences],
        }));

        get().addHistoryEvent({
          title: 'Recorrência Cadastrada',
          description: `Recorrência de ${newRec.type === 'receivable' ? 'receita' : 'despesa'} criada: ${newRec.title} - R$ ${newRec.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${newRec.frequency}).`,
          type: 'proposal_created',
          organizationId: orgId,
        });
      },

      updateFinancialRecurrence: (id, recurrence) => {
        const orgId = get().currentOrganizationId;
        set((state) => ({
          financialRecurrences: state.financialRecurrences.map((fr) => {
            if (fr.id === id && fr.organizationId === orgId) {
              return { ...fr, ...recurrence };
            }
            return fr;
          }),
        }));
      },

      toggleFinancialRecurrence: (id) => {
        const orgId = get().currentOrganizationId;
        set((state) => ({
          financialRecurrences: state.financialRecurrences.map((fr) => {
            if (fr.id === id && fr.organizationId === orgId) {
              return { ...fr, isActive: !fr.isActive };
            }
            return fr;
          }),
        }));
      },

      resetFinancialSandboxData: () => {
        const orgId = get().currentOrganizationId;
        const defaultEntriesForOrg = initialFinancialEntries.filter((fe) => fe.organizationId === orgId);
        const defaultRecsForOrg = initialFinancialRecurrences.filter((fr) => fr.organizationId === orgId);

        set((state) => ({
          financialEntries: [
            ...state.financialEntries.filter((fe) => fe.organizationId !== orgId),
            ...defaultEntriesForOrg,
          ],
          financialRecurrences: [
            ...state.financialRecurrences.filter((fr) => fr.organizationId !== orgId),
            ...defaultRecsForOrg,
          ],
        }));

        get().addHistoryEvent({
          title: 'Dados Financeiros Reiniciados',
          description: 'A base de lançamentos e recorrências financeiras simuladas foi reiniciada para os padrões originais do sandbox.',
          type: 'task_completed',
          organizationId: orgId,
        });
      },

      upgradePlan: (planId, orgId) => {
        const targetOrgId = orgId || get().currentOrganizationId;
        set((state) => ({
          organizations: state.organizations.map((org) =>
            org.id === targetOrgId ? { ...org, planId } : org
          )
        }));
      },

      updateOrganizationStatus: (orgId, status) => {
        set((state) => ({
          organizations: state.organizations.map((org) =>
            org.id === orgId ? { ...org, status } : org
          )
        }));
      },

      addOrganization: (organization) => {
        set((state) => ({
          organizations: [...state.organizations, organization]
        }));
      },

      addTeamMember: (member) => {
        set((state) => ({
          teamMembers: [...state.teamMembers, member]
        }));
      },

      createOrganization: (data) => {
        const orgId = `org_${Math.random().toString(36).substring(2, 9)}`;
        const newOrg: Organization = {
          id: orgId,
          name: data.name,
          cnpj: data.cnpj,
          planId: data.planId,
          status: data.status,
          createdAt: new Date().toISOString()
        };

        const newFeatures: OrganizationFeatures = {
          organizationId: orgId,
          ...data.features
        };

        const newMemberId = `m_${Math.random().toString(36).substring(2, 9)}`;
        const newMember: TeamMember = {
          id: newMemberId,
          organizationId: orgId,
          name: data.ownerUser.name,
          email: data.ownerUser.email,
          role: data.ownerUser.role,
          userRole: data.ownerUser.userRole,
          status: data.ownerUser.status,
          avatarUrl: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 100000)}?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80`,
          lastAccess: new Date().toISOString()
        };

        const newIntegration: TenantIntegration = {
          organizationId: orgId,
          asaasToken: '',
          asaasWebhook: '',
          asaasStatus: 'not_connected',
          clickupToken: '',
          clickupWorkspace: '',
          clickupStatus: 'not_connected',
          googleKey: '',
          googleFolder: '',
          googleDriveStatus: 'not_connected',
          zapsignKey: '',
          zapsignStatus: 'not_connected',
          whatsappToken: '',
          whatsappStatus: 'not_connected',
          metaAdsToken: '',
          metaAdsStatus: 'not_connected',
          googleAdsToken: '',
          googleAdsStatus: 'not_connected'
        };

        set((state) => ({
          organizations: [...state.organizations, newOrg],
          organizationFeatures: [...(state.organizationFeatures || []), newFeatures],
          teamMembers: [...state.teamMembers, newMember],
          integrations: [...state.integrations, newIntegration]
        }));

        // Log history of creation
        const operatorName = get().currentUser ? get().currentUser.name : 'Operador';
        get().addHistoryEvent({
          title: 'Empresa Criada',
          description: `[Operador] Empresa criada no NV Hub por ${operatorName}.`,
          type: 'client_created',
          organizationId: orgId
        });

        // Optionally create demo mock data
        if (data.createMockData) {
          const mockClientId = `c_mock_${Math.random().toString(36).substring(2, 9)}`;
          const mockLeadId = `l_mock_${Math.random().toString(36).substring(2, 9)}`;
          const mockProposalId = `prop_mock_${Math.random().toString(36).substring(2, 9)}`;
          const mockTaskId = `t_mock_${Math.random().toString(36).substring(2, 9)}`;

          const mockLead: Lead = {
            id: mockLeadId,
            organizationId: orgId,
            name: 'Fernanda Souza',
            companyName: 'Souza Alimentos',
            email: 'fernanda@souzaalimentos.com.br',
            phone: '(11) 98765-4321',
            origin: 'Formulário do Site',
            platform: 'landing_page',
            status: 'new',
            temperature: 'warm',
            responsibleUser: data.ownerUser.name,
            createdAt: new Date().toISOString(),
            lastInteraction: new Date().toISOString(),
            notes: 'Lead demonstrativo importado automaticamente do site.'
          };

          const mockClient: Client = {
            id: mockClientId,
            organizationId: orgId,
            name: 'Thiago Lacerda',
            companyName: 'Lacerda & Advogados',
            cnpj: '22.333.444/0001-55',
            phone: '(11) 97777-6666',
            email: 'thiago@lacerdaadv.com.br',
            responsibleUser: data.ownerUser.name,
            commercialStatus: 'active',
            notes: 'Cliente ativo gerado automaticamente para demonstração.',
            createdAt: new Date().toISOString()
          };

          const mockProposal: Proposal = {
            id: mockProposalId,
            organizationId: orgId,
            clientId: mockClientId,
            clientName: mockClient.name,
            companyName: mockClient.companyName,
            description: 'Assessoria Mensal de Tráfego Pago & Redes Sociais',
            items: [
              { id: 'item_1', description: 'Gestão de Tráfego Ads', value: 2000, isMonthly: true },
              { id: 'item_2', description: 'Produção de Conteúdo (Insta/Linkedin)', value: 1500, isMonthly: true }
            ],
            totalValue: 3500,
            monthlyValue: 3500,
            validityDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            paymentTerms: 'Boleto bancário em 5 dias úteis',
            status: 'sent',
            createdAt: new Date().toISOString()
          };

          const mockTask: TeamTask = {
            id: mockTaskId,
            organizationId: orgId,
            title: 'Reunião de Alinhamento de Onboarding',
            clientId: mockClientId,
            clientName: mockClient.name,
            responsibleUser: data.ownerUser.name,
            dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'pending',
            priority: 'high',
            description: 'Apresentar equipe e alinhar acessos às contas de anúncio.',
            createdAt: new Date().toISOString()
          };

          set((state) => ({
            leads: [mockLead, ...state.leads],
            clients: [mockClient, ...state.clients],
            proposals: [mockProposal, ...state.proposals],
            tasks: [mockTask, ...state.tasks]
          }));

          // Logs para os dados demonstrativos
          get().addHistoryEvent({
            clientId: mockLeadId,
            clientName: mockLead.name,
            title: 'Lead Recebido',
            description: `Lead Souza Alimentos importado do formulário do site.`,
            type: 'client_created',
            organizationId: orgId
          });

          get().addHistoryEvent({
            clientId: mockClientId,
            clientName: mockClient.name,
            title: 'Cliente Cadastrado',
            description: `Cliente Lacerda & Advogados cadastrado no sistema.`,
            type: 'client_created',
            organizationId: orgId
          });

          get().addHistoryEvent({
            clientId: mockClientId,
            clientName: mockClient.name,
            title: 'Proposta Enviada',
            description: `Proposta Assessoria Mensal de Tráfego Pago & Redes Sociais enviada para Thiago Lacerda.`,
            type: 'proposal_sent',
            organizationId: orgId
          });
        }
      },

      updateTeamMemberRole: (id, userRole) => {
        set((state) => ({
          teamMembers: state.teamMembers.map((m) => m.id === id ? { ...m, userRole } : m)
        }));
      },

      updateTeamMemberStatus: (id, status) => {
        set((state) => ({
          teamMembers: state.teamMembers.map((m) => m.id === id ? { ...m, status } : m)
        }));
      },

      updateIntegration: (orgId, data) => {
        set((state) => ({
          integrations: state.integrations.map((item) =>
            item.organizationId === orgId ? { ...item, ...data } : item
          )
        }));

        const updatedKeys = Object.keys(data);
        let serviceName = "integrações";
        if (updatedKeys.some(k => k.startsWith('asaas'))) serviceName = "Asaas";
        else if (updatedKeys.some(k => k.startsWith('clickup'))) serviceName = "ClickUp";
        else if (updatedKeys.some(k => k.startsWith('googleKey') || k.startsWith('googleFolder'))) serviceName = "Google Suite (Drive/Docs)";
        else if (updatedKeys.some(k => k.startsWith('zapsign'))) serviceName = "ZapSign";
        else if (updatedKeys.some(k => k.startsWith('whatsapp'))) serviceName = "WhatsApp";
        else if (updatedKeys.some(k => k.startsWith('metaAds'))) serviceName = "Meta Ads";
        else if (updatedKeys.some(k => k.startsWith('googleAds'))) serviceName = "Google Ads";

        get().addHistoryEvent({
          title: '[Configurações] Integração Salva',
          description: `Configurações da integração com ${serviceName} foram salvas por ${get().currentUser.name}.`,
          type: 'drive_created',
          organizationId: orgId
        });
      },

      testIntegrationConnection: (orgId, service) => {
        const statusFieldMap: Record<string, keyof TenantIntegration> = {
          asaas: 'asaasStatus',
          clickup: 'clickupStatus',
          googleDrive: 'googleDriveStatus',
          zapsign: 'zapsignStatus',
          whatsapp: 'whatsappStatus',
          metaAds: 'metaAdsStatus',
          googleAds: 'googleAdsStatus'
        };

        const field = statusFieldMap[service];
        if (field) {
          set((state) => ({
            integrations: state.integrations.map((item) =>
              item.organizationId === orgId ? { ...item, [field]: 'connected' } : item
            )
          }));
        }

        const serviceNames: Record<string, string> = {
          asaas: 'Asaas',
          clickup: 'ClickUp',
          googleDrive: 'Google Drive/Docs',
          zapsign: 'ZapSign',
          whatsapp: 'WhatsApp',
          metaAds: 'Meta Ads',
          googleAds: 'Google Ads'
        };

        get().addHistoryEvent({
          title: '[Configurações] Conexão Testada',
          description: `Conexão simulada com ${serviceNames[service] || service} testada por ${get().currentUser.name}.`,
          type: 'drive_created',
          organizationId: orgId
        });
      },

      addLead: (leadData) => {
        const targetOrgId = leadData.organizationId || get().currentOrganizationId;
        const newLead: Lead = {
          ...leadData,
          id: `l_${Date.now()}`,
          organizationId: targetOrgId,
          createdAt: new Date().toISOString(),
          lastInteraction: new Date().toISOString()
        } as Lead;

        set((state) => ({
          leads: [newLead, ...state.leads]
        }));

        get().addHistoryEvent({
          title: '[Leads] Novo Lead Cadastrado',
          description: `Lead ${newLead.name} foi adicionado manualmente por ${get().currentUser.name}.`,
          type: 'client_created',
          organizationId: targetOrgId
        });

        return newLead;
      },

      updateLeadStatus: (leadId, status) => {
        const lead = get().leads.find(l => l.id === leadId);
        if (!lead) return;

        set((state) => ({
          leads: state.leads.map((l) =>
            l.id === leadId ? { ...l, status, lastInteraction: new Date().toISOString() } : l
          )
        }));

        const statusLabels: Record<LeadStatus, string> = {
          new: 'Novo',
          in_progress: 'Em atendimento',
          qualified: 'Qualificado',
          meeting: 'Reunião marcada',
          proposal_requested: 'Proposta solicitada',
          converted: 'Convertido',
          lost: 'Perdido'
        };

        get().addHistoryEvent({
          title: '[Leads] Status Atualizado',
          description: `Status do lead ${lead.name} alterado para "${statusLabels[status]}" por ${get().currentUser.name}.`,
          type: 'client_created',
          organizationId: lead.organizationId
        });
      },

      updateLeadTemperature: (leadId, temperature) => {
        const lead = get().leads.find(l => l.id === leadId);
        if (!lead) return;

        set((state) => ({
          leads: state.leads.map((l) =>
            l.id === leadId ? { ...l, temperature, lastInteraction: new Date().toISOString() } : l
          )
        }));

        const tempLabels: Record<LeadTemperature, string> = {
          cold: 'Frio',
          warm: 'Morno',
          hot: 'Quente'
        };

        get().addHistoryEvent({
          title: '[Leads] Temperatura Atualizada',
          description: `Temperatura do lead ${lead.name} definida como "${tempLabels[temperature]}" por ${get().currentUser.name}.`,
          type: 'client_created',
          organizationId: lead.organizationId
        });
      },

      assignLead: (leadId, responsibleUser) => {
        const lead = get().leads.find(l => l.id === leadId);
        if (!lead) return;

        set((state) => ({
          leads: state.leads.map((l) =>
            l.id === leadId ? { ...l, responsibleUser, lastInteraction: new Date().toISOString() } : l
          )
        }));

        get().addHistoryEvent({
          title: '[Leads] Responsável Definido',
          description: `Lead ${lead.name} foi atribuído a ${responsibleUser} por ${get().currentUser.name}.`,
          type: 'client_created',
          organizationId: lead.organizationId
        });
      },

      addLeadNote: (leadId, note) => {
        const lead = get().leads.find(l => l.id === leadId);
        if (!lead) return;

        set((state) => ({
          leads: state.leads.map((l) =>
            l.id === leadId ? { ...l, notes: note, lastInteraction: new Date().toISOString() } : l
          )
        }));

        get().addHistoryEvent({
          title: '[Leads] Observação Adicionada',
          description: `Nova anotação inserida no lead ${lead.name} por ${get().currentUser.name}.`,
          type: 'client_created',
          organizationId: lead.organizationId
        });
      },

      convertLeadToClient: (leadId) => {
        const lead = get().leads.find(l => l.id === leadId);
        if (!lead) return null;

        const targetOrgId = lead.organizationId;

        // Check if client with same email or phone already exists in this tenant
        const existingClient = get().clients.find(c =>
          c.organizationId === targetOrgId &&
          (c.email.toLowerCase() === lead.email.toLowerCase() || c.phone.replace(/\D/g, '') === lead.phone.replace(/\D/g, ''))
        );

        if (existingClient) {
          // Mark lead as converted but return existing client to avoid duplication
          set((state) => ({
            leads: state.leads.map(l => l.id === leadId ? { ...l, status: 'converted', lastInteraction: new Date().toISOString() } : l)
          }));

          get().addHistoryEvent({
            clientId: existingClient.id,
            clientName: existingClient.companyName,
            title: '[Leads] Lead Associado a Cliente Existente',
            description: `Lead ${lead.name} associado ao cliente existente ${existingClient.companyName} por ${get().currentUser.name}.`,
            type: 'client_created',
            organizationId: targetOrgId
          });

          return existingClient;
        }

        const newClient = get().addClient({
          name: lead.name,
          companyName: lead.companyName || `${lead.name} Ltda`,
          cnpj: '',
          phone: lead.phone,
          email: lead.email,
          responsibleUser: lead.responsibleUser,
          commercialStatus: 'active',
          notes: lead.notes || `Convertido a partir do Lead originário de ${lead.origin}.`,
          organizationId: targetOrgId
        });

        set((state) => ({
          leads: state.leads.map(l => l.id === leadId ? { ...l, status: 'converted', lastInteraction: new Date().toISOString() } : l)
        }));

        get().addHistoryEvent({
          clientId: newClient?.id,
          clientName: newClient?.companyName,
          title: '[Leads] Lead Convertido',
          description: `Lead ${lead.name} convertido em cliente por ${get().currentUser.name}.`,
          type: 'client_created',
          organizationId: targetOrgId
        });

        return newClient;
      },

      createProposalFromLead: (leadId) => {
        const lead = get().leads.find(l => l.id === leadId);
        if (!lead) return null;

        const targetOrgId = lead.organizationId;

        // Find or convert to client
        let client: Client | null = get().clients.find(c => c.organizationId === targetOrgId && c.email.toLowerCase() === lead.email.toLowerCase()) || null;
        if (!client) {
          client = get().convertLeadToClient(leadId);
        }

        if (!client) return null;

        const newProposal = get().addProposal({
          clientId: client.id,
          clientName: client.name,
          companyName: client.companyName,
          description: `Proposta de Serviço - Tráfego & Social Media (Central de Leads)`,
          items: [
            { id: `pi_${Date.now()}`, description: `Setup e Gestão Mensal de Campanhas - Originado do Lead (${lead.origin})`, value: 2500, isMonthly: true }
          ],
          totalValue: 2500,
          monthlyValue: 2500,
          validityDate: new Date(Date.now() + 15*24*60*60*1000).toISOString().split('T')[0],
          paymentTerms: 'Boleto via Asaas recorrente',
          notes: `Proposta gerada automaticamente a partir do lead ${lead.name}.`,
          organizationId: targetOrgId
        });

        set((state) => ({
          leads: state.leads.map(l => l.id === leadId ? { ...l, status: 'proposal_requested', lastInteraction: new Date().toISOString() } : l)
        }));

        get().addHistoryEvent({
          clientId: client.id,
          clientName: client.companyName,
          title: '[Leads] Proposta Criada',
          description: `Proposta de venda criada a partir do lead ${lead.name} por ${get().currentUser.name}.`,
          type: 'proposal_created',
          organizationId: targetOrgId
        });

        return newProposal;
      },

      markLeadAsLost: (leadId, reason) => {
        const lead = get().leads.find(l => l.id === leadId);
        if (!lead) return;

        set((state) => ({
          leads: state.leads.map((l) =>
            l.id === leadId ? { ...l, status: 'lost', notes: l.notes ? `${l.notes} | Perda: ${reason}` : `Motivo de perda: ${reason}`, lastInteraction: new Date().toISOString() } : l
          )
        }));

        get().addHistoryEvent({
          title: '[Leads] Lead Descartado',
          description: `Lead ${lead.name} marcado como perdido por ${get().currentUser.name}. Motivo: ${reason}`,
          type: 'client_created',
          organizationId: lead.organizationId
        });
      },

      checkLimit: (type, orgId) => {
        const state = get();
        const targetOrgId = orgId || state.currentOrganizationId;
        const org = state.organizations.find(o => o.id === targetOrgId);
        if (!org) return true;

        const planLimits: Record<PlanType, PlanLimits> = {
          starter: { clients: 3, users: 2, proposals: 5, tasks: 10, hasIntegrations: false },
          pro: { clients: 30, users: 5, proposals: 50, tasks: 99999, hasIntegrations: true },
          enterprise: { clients: 99999, users: 99999, proposals: 99999, tasks: 99999, hasIntegrations: true }
        };

        const limits = planLimits[org.planId];

        switch (type) {
          case 'clients': {
            const count = state.clients.filter(c => c.organizationId === targetOrgId).length;
            return count < limits.clients;
          }
          case 'users': {
            const count = state.teamMembers.filter(m => m.organizationId === targetOrgId).length;
            return count < limits.users;
          }
          case 'proposals': {
            const count = state.proposals.filter(p => p.organizationId === targetOrgId).length;
            return count < limits.proposals;
          }
          case 'tasks': {
            const count = state.tasks.filter(t => t.organizationId === targetOrgId).length;
            return count < limits.tasks;
          }
          default:
            return true;
        }
      },

      // Actions
      addClient: (clientData) => {
        const targetOrgId = clientData.organizationId || get().currentOrganizationId;
        if (!get().checkLimit('clients', targetOrgId)) {
          return null; // Limit exceeded
        }

        const newClient: Client = {
          ...clientData,
          id: `c_${Date.now()}`,
          organizationId: targetOrgId,
          createdAt: new Date().toISOString()
        } as Client;

        set((state) => ({
          clients: [newClient, ...state.clients],
        }));

        get().addHistoryEvent({
          clientId: newClient.id,
          clientName: newClient.name,
          title: 'Cliente Cadastrado',
          description: `Novo cliente comercial ${newClient.companyName} cadastrado no sistema por ${get().currentUser.name}.`,
          type: 'client_created',
          organizationId: targetOrgId
        });

        return newClient;
      },

      updateClientStatus: (id, status) => {
        set((state) => ({
          clients: state.clients.map((c) => c.id === id ? { ...c, commercialStatus: status } : c)
        }));
      },

      addProposal: (proposalData) => {
        const targetOrgId = proposalData.organizationId || get().currentOrganizationId;
        if (!get().checkLimit('proposals', targetOrgId)) {
          return null; // Limit exceeded
        }

        const newProposal: Proposal = {
          ...proposalData,
          id: `p_${Date.now()}`,
          organizationId: targetOrgId,
          status: 'draft',
          createdAt: new Date().toISOString()
        } as Proposal;

        set((state) => ({
          proposals: [newProposal, ...state.proposals]
        }));

        get().addHistoryEvent({
          clientId: newProposal.clientId,
          clientName: newProposal.clientName,
          title: 'Proposta Comercial Criada',
          description: `Nova proposta de R$ ${newProposal.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} elaborada sob status Rascunho.`,
          type: 'proposal_created',
          organizationId: targetOrgId
        });

        return newProposal;
      },

      updateProposalStatus: (id, status) => {
        set((state) => ({
          proposals: state.proposals.map((p) => p.id === id ? { ...p, status } : p)
        }));

        const proposal = get().proposals.find(p => p.id === id);
        if (proposal) {
          get().addHistoryEvent({
            clientId: proposal.clientId,
            clientName: proposal.clientName,
            title: `Proposta Status Atualizado: ${status}`,
            description: `A proposta comercial mudou seu status para '${status}'.`,
            type: 'proposal_sent',
            organizationId: proposal.organizationId
          });
        }
      },

      acceptProposalFlow: (id) => {
        const proposal = get().proposals.find(p => p.id === id);
        if (!proposal) return;

        // Update Proposal Status
        set((state) => ({
          proposals: state.proposals.map((p) => p.id === id ? { ...p, status: 'accepted' } : p)
        }));

        // Update Client Status to Onboarding
        get().updateClientStatus(proposal.clientId, 'onboarding');

        // Add History Event for Acceptance
        get().addHistoryEvent({
          clientId: proposal.clientId,
          clientName: proposal.clientName,
          title: 'Proposta Comercial Aceita',
          description: `O cliente aceitou eletronicamente os termos da proposta via link público.`,
          type: 'proposal_accepted',
          organizationId: proposal.organizationId
        });

        // Check if contract already exists
        const existsContract = get().contracts.some(c => c.proposalId === id);
        if (!existsContract) {
          // Auto-generate Contract
          const newContract: Contract = {
            id: `ct_${Date.now()}`,
            organizationId: proposal.organizationId,
            clientId: proposal.clientId,
            clientName: proposal.clientName,
            companyName: proposal.companyName,
            proposalId: proposal.id,
            type: proposal.description,
            value: proposal.totalValue,
            monthlyValue: proposal.monthlyValue,
            startDate: new Date().toISOString().split('T')[0],
            firstPaymentDate: new Date(Date.now() + 5*24*60*60*1000).toISOString().split('T')[0], // 5 days out
            status: 'pending_signatures',
            documentUrl: `https://zapsign.com.br/sign/mock-${proposal.id}`,
            version: 'v1.0',
            createdAt: new Date().toISOString()
          };

          set((state) => ({
            contracts: [newContract, ...state.contracts]
          }));

          get().addHistoryEvent({
            clientId: proposal.clientId,
            clientName: proposal.clientName,
            title: 'Contrato Gerado Automaticamente',
            description: `Contrato '${newContract.type}' criado sob status 'Aguardando Assinatura' na ZapSign.`,
            type: 'contract_generated',
            organizationId: proposal.organizationId
          });

          // Check if Onboarding checklist already exists
          const existsOnboarding = get().onboardings.some(o => o.clientId === proposal.clientId);
          if (!existsOnboarding) {
            const newOnboarding: Onboarding = {
              id: `o_${Date.now()}`,
              organizationId: proposal.organizationId,
              clientId: proposal.clientId,
              clientName: proposal.clientName,
              companyName: proposal.companyName,
              startDate: new Date().toISOString().split('T')[0],
              responsibleUser: get().currentUser.name,
              steps: {
                paymentConfirmed: 'pending',
                driveCreated: 'pending',
                clickupCreated: 'pending',
                tasksCreated: 'pending',
                onboardingMeeting: 'pending',
                completed: 'pending'
              },
              links: {
                googleDrive: '',
                clickup: '',
                whatsAppGroup: '',
                contract: newContract.documentUrl,
                charge: '',
                proposal: proposal.id
              },
              createdAt: new Date().toISOString()
            };

            set((state) => ({
              onboardings: [newOnboarding, ...state.onboardings]
            }));
          }
        }
      },

      declineProposalFlow: (id) => {
        const proposal = get().proposals.find(p => p.id === id);
        if (!proposal) return;

        set((state) => ({
          proposals: state.proposals.map((p) => p.id === id ? { ...p, status: 'declined' } : p)
        }));

        get().addHistoryEvent({
          clientId: proposal.clientId,
          clientName: proposal.clientName,
          title: 'Proposta Recusada',
          description: `O cliente recusou os termos da proposta na página pública.`,
          type: 'proposal_sent',
          organizationId: proposal.organizationId
        });
      },

      addContract: (contractData) => {
        const targetOrgId = contractData.organizationId || get().currentOrganizationId;
        const newContract: Contract = {
          ...contractData,
          id: `ct_${Date.now()}`,
          organizationId: targetOrgId,
          createdAt: new Date().toISOString()
        } as Contract;

        set((state) => ({
          contracts: [newContract, ...state.contracts]
        }));

        get().addHistoryEvent({
          clientId: newContract.clientId,
          clientName: newContract.clientName,
          title: 'Contrato Adicionado',
          description: `Contrato do tipo '${newContract.type}' criado manualmente.`,
          type: 'contract_generated',
          organizationId: targetOrgId
        });

        return newContract;
      },

      updateContractStatus: (id, status) => {
        set((state) => ({
          contracts: state.contracts.map((c) => c.id === id ? { ...c, status } : c)
        }));
      },

      signContractFlow: (id) => {
        const contract = get().contracts.find(c => c.id === id);
        if (!contract) return;

        // Update Contract status
        set((state) => ({
          contracts: state.contracts.map((c) => c.id === id ? { ...c, status: 'signed' } : c)
        }));

        get().addHistoryEvent({
          clientId: contract.clientId,
          clientName: contract.clientName,
          title: 'Contrato Assinado',
          description: `O contrato foi assinado por todas as partes via ZapSign.`,
          type: 'contract_signed',
          organizationId: contract.organizationId
        });

        // Auto-generate Charge in Asaas
        const existsCharge = get().charges.some(ch => ch.contractId === id);
        if (!existsCharge) {
          const newCharge: Charge = {
            id: `ch_${Date.now()}`,
            organizationId: contract.organizationId,
            clientId: contract.clientId,
            clientName: contract.clientName,
            companyName: contract.companyName,
            contractId: contract.id,
            value: contract.monthlyValue,
            dueDate: new Date(Date.now() + 3*24*60*60*1000).toISOString().split('T')[0], // 3 days from signature
            paymentMethod: 'pix',
            paymentUrl: `https://cobranca.asaas.com/mock-cobranca-${contract.id}`,
            status: 'pending',
            createdAt: new Date().toISOString()
          };

          set((state) => ({
            charges: [newCharge, ...state.charges]
          }));

          get().addHistoryEvent({
            clientId: contract.clientId,
            clientName: contract.clientName,
            title: 'Cobrança Asaas Gerada',
            description: `Faturamento recorrente de R$ ${newCharge.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} gerado no Asaas.`,
            type: 'charge_generated',
            organizationId: contract.organizationId
          });

          // Link charge url to Onboarding
          set((state) => ({
            onboardings: state.onboardings.map((o) => o.clientId === contract.clientId ? {
              ...o,
              links: { ...o.links, charge: newCharge.paymentUrl }
            } : o)
          }));
        }
      },

      addCharge: (chargeData) => {
        const targetOrgId = chargeData.organizationId || get().currentOrganizationId;
        const newCharge: Charge = {
          ...chargeData,
          id: `ch_${Date.now()}`,
          organizationId: targetOrgId,
          createdAt: new Date().toISOString()
        } as Charge;

        set((state) => ({
          charges: [newCharge, ...state.charges]
        }));

        return newCharge;
      },

      updateChargeStatus: (id, status) => {
        set((state) => ({
          charges: state.charges.map((ch) => ch.id === id ? { ...ch, status } : ch)
        }));
      },

      confirmPaymentFlow: (id) => {
        const charge = get().charges.find(ch => ch.id === id);
        if (!charge) return;

        // Update charge status to paid
        set((state) => ({
          charges: state.charges.map((ch) => ch.id === id ? { ...ch, status: 'paid', paidAt: new Date().toISOString() } : ch),
          activeSetupClientId: charge.clientId,
          activeSetupStep: 'payment',
          isSetupDismissed: false
        }));

        get().addHistoryEvent({
          clientId: charge.clientId,
          clientName: charge.clientName,
          title: 'Cobrança Confirmada (Asaas)',
          description: `Pagamento de R$ ${charge.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} compensado com sucesso via Asaas.`,
          type: 'charge_paid',
          organizationId: charge.organizationId
        });

        // Update Onboarding: set paymentConfirmed to completed
        set((state) => ({
          onboardings: state.onboardings.map((o) => o.clientId === charge.clientId ? {
            ...o,
            steps: { ...o.steps, paymentConfirmed: 'completed' }
          } : o)
        }));

        // Auto trigger operational setup simulator
        // 1. Setup Google Drive
        setTimeout(() => {
          set((state) => ({
            onboardings: state.onboardings.map((o) => o.clientId === charge.clientId ? {
              ...o,
              steps: { ...o.steps, driveCreated: 'completed' },
              links: { ...o.links, googleDrive: `https://drive.google.com/drive/folders/mock-${charge.clientId}` }
            } : o),
            activeSetupStep: 'drive'
          }));

          get().addHistoryEvent({
            clientId: charge.clientId,
            clientName: charge.clientName,
            title: 'Pasta Criada no Google Drive',
            description: `Automação gerou com sucesso a estrutura de pastas do cliente no Google Drive.`,
            type: 'drive_created',
            organizationId: charge.organizationId
          });
        }, 1000);

        // 2. Setup ClickUp
        setTimeout(() => {
          set((state) => ({
            onboardings: state.onboardings.map((o) => o.clientId === charge.clientId ? {
              ...o,
              steps: { ...o.steps, clickupCreated: 'completed' },
              links: { ...o.links, clickup: `https://app.clickup.com/folders/mock-${charge.clientId}`, whatsAppGroup: `https://chat.whatsapp.com/mock-${charge.clientId}` }
            } : o),
            activeSetupStep: 'clickup'
          }));

          get().addHistoryEvent({
            clientId: charge.clientId,
            clientName: charge.clientName,
            title: 'Projeto Criado no ClickUp & WhatsApp',
            description: `Automação ClickUp criou a pasta de projetos. Grupo do WhatsApp operacional criado.`,
            type: 'clickup_created',
            organizationId: charge.organizationId
          });
        }, 2000);

        // 3. Setup Tasks
        setTimeout(() => {
          // Generate onboarding tasks
          get().addTask({
            title: 'Reunião de Alinhamento de Onboarding',
            clientId: charge.clientId,
            clientName: charge.clientName,
            responsibleUser: 'Ana Silva',
            dueDate: new Date(Date.now() + 3*24*60*60*1000).toISOString().split('T')[0],
            status: 'pending',
            priority: 'high',
            description: 'Primeira conversa oficial pós-pagamento para definição de cronograma operacional.',
            organizationId: charge.organizationId
          });

          get().addTask({
            title: 'Planejar Calendário Editorial e Grade de Temas',
            clientId: charge.clientId,
            clientName: charge.clientName,
            responsibleUser: 'João Santos',
            dueDate: new Date(Date.now() + 5*24*60*60*1000).toISOString().split('T')[0],
            status: 'pending',
            priority: 'medium',
            description: 'Roteirizar primeiros 6 posts com base na identidade extraída no onboarding.',
            organizationId: charge.organizationId
          });

          set((state) => ({
            onboardings: state.onboardings.map((o) => o.clientId === charge.clientId ? {
              ...o,
              steps: { ...o.steps, tasksCreated: 'completed' }
            } : o),
            activeSetupStep: 'tasks'
          }));
        }, 3000);

        // 4. Completed step
        setTimeout(() => {
          set(() => ({
            activeSetupStep: 'completed'
          }));
        }, 4000);

        // 5. Hide Modal after completion
        setTimeout(() => {
          set(() => ({
            activeSetupClientId: null,
            activeSetupStep: 'none'
          }));
        }, 5500);
      },

      updateOnboardingStep: (clientId, stepName, status) => {
        set((state) => {
          const onboardings = state.onboardings.map((o) => {
            if (o.clientId === clientId) {
              const updatedSteps = { ...o.steps, [stepName]: status };

              // If all steps except 'completed' are completed, auto complete
              const allDone =
                updatedSteps.paymentConfirmed === 'completed' &&
                updatedSteps.driveCreated === 'completed' &&
                updatedSteps.clickupCreated === 'completed' &&
                updatedSteps.tasksCreated === 'completed' &&
                updatedSteps.onboardingMeeting === 'completed';

              updatedSteps.completed = allDone ? 'completed' : 'pending';

              return { ...o, steps: updatedSteps };
            }
            return o;
          });

          return { onboardings };
        });

        // Log if onboarding overall is completed
        const updatedOnb = get().onboardings.find(o => o.clientId === clientId);
        if (updatedOnb && updatedOnb.steps.completed === 'completed') {
          get().updateClientStatus(clientId, 'active');
          get().addHistoryEvent({
            clientId,
            clientName: updatedOnb.clientName,
            title: 'Onboarding Concluído',
            description: `Onboarding operacional finalizado. O cliente foi movido para o status ATIVO na carteira.`,
            type: 'onboarding_completed',
            organizationId: updatedOnb.organizationId
          });
        }
      },

      updateOnboardingLinks: (clientId, links) => {
        set((state) => ({
          onboardings: state.onboardings.map((o) => o.clientId === clientId ? {
            ...o,
            links: { ...o.links, ...links }
          } : o)
        }));
      },

      addPublication: (pubData) => {
        const targetOrgId = pubData.organizationId || get().currentOrganizationId;
        const newPub: Publication = {
          ...pubData,
          id: `pub_${Date.now()}`,
          organizationId: targetOrgId,
          createdAt: new Date().toISOString()
        } as Publication;

        set((state) => ({
          publications: [newPub, ...state.publications]
        }));

        get().addHistoryEvent({
          clientId: newPub.clientId,
          clientName: newPub.clientName,
          title: 'Publicação Enviada para Aprovação',
          description: `Novo criativo e legenda enviados para a fila de aprovação de ${newPub.companyName}.`,
          type: 'publication_sent',
          organizationId: targetOrgId
        });

        return newPub;
      },

      updatePublicationStatus: (id, status, comments) => {
        set((state) => ({
          publications: state.publications.map((pub) =>
            pub.id === id ? { ...pub, status, clientComments: comments || pub.clientComments } : pub
          )
        }));

        const pub = get().publications.find(p => p.id === id);
        if (pub) {
          const title = status === 'approved' ? 'Publicação Aprovada' : 'Alteração Solicitada na Publicação';
          const type = status === 'approved' ? 'publication_approved' : 'publication_revision';

          get().addHistoryEvent({
            clientId: pub.clientId,
            clientName: pub.clientName,
            title,
            description: status === 'approved'
              ? `A publicação agendada para ${pub.scheduledDate} foi aprovada sem ressalvas pelo cliente.`
              : `O cliente solicitou alterações: "${comments || ''}"`,
            type,
            organizationId: pub.organizationId
          });

          // Auto create clickup adjustment task if revision is requested
          if (status === 'changes_requested') {
            get().addTask({
              title: `Ajuste de Publicação - ${pub.companyName}`,
              clientId: pub.clientId,
              clientName: pub.clientName,
              responsibleUser: pub.responsibleUser,
              dueDate: new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0], // 1 day limit
              status: 'pending',
              priority: 'high',
              description: `Solicitação de alteração do cliente: "${comments || ''}"`,
              organizationId: pub.organizationId
            });
          }
        }
      },

      createPublicationApprovalLink: (publicationId) => {
        const token = `approval_${Math.random().toString(36).substring(2, 15)}`;
        const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
        const approvalLink = `${origin}/publicacao/${publicationId}/aprovacao?token=${token}`;
        
        set((state) => ({
          publications: state.publications.map((pub) =>
            pub.id === publicationId
              ? {
                  ...pub,
                  approvalToken: token,
                  approvalLinkCreatedAt: new Date().toISOString(),
                  approvalLinkExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                  approvalLinkStatus: 'active',
                  approvalLink
                }
              : pub
          )
        }));
        
        return approvalLink;
      },

      regeneratePublicationApprovalLink: (publicationId) => {
        return get().createPublicationApprovalLink(publicationId);
      },

      approvePublicationByToken: (publicationId, token) => {
        const pub = get().publications.find(
          (p) => p.id === publicationId && p.approvalToken === token
        );
        if (!pub) return;

        get().updatePublicationStatus(publicationId, 'approved');

        set((state) => ({
          publications: state.publications.map((p) =>
            p.id === publicationId
              ? {
                  ...p,
                  approvalLinkStatus: 'approved',
                  approvedAt: new Date().toISOString()
                }
              : p
          )
        }));
      },

      requestPublicationChangesByToken: (publicationId, token, feedback) => {
        const pub = get().publications.find(
          (p) => p.id === publicationId && p.approvalToken === token
        );
        if (!pub) return;

        get().updatePublicationStatus(publicationId, 'changes_requested', feedback);

        set((state) => ({
          publications: state.publications.map((p) =>
            p.id === publicationId
              ? {
                  ...p,
                  approvalLinkStatus: 'changes_requested',
                  changesRequestedAt: new Date().toISOString(),
                  clientFeedback: feedback
                }
              : p
          )
        }));
      },

      addTask: (taskData) => {
        const targetOrgId = taskData.organizationId || get().currentOrganizationId;
        if (!get().checkLimit('tasks', targetOrgId)) {
          return null; // Limit exceeded
        }

        const newTask: TeamTask = {
          ...taskData,
          id: `t_${Date.now()}`,
          organizationId: targetOrgId,
          createdAt: new Date().toISOString()
        } as TeamTask;

        set((state) => ({
          tasks: [newTask, ...state.tasks]
        }));

        return newTask;
      },

      updateTaskStatus: (id, status) => {
        set((state) => ({
          tasks: state.tasks.map((t) => t.id === id ? { ...t, status } : t)
        }));

        const task = get().tasks.find(t => t.id === id);
        if (task && status === 'completed') {
          get().addHistoryEvent({
            clientId: task.clientId,
            clientName: task.clientName,
            title: 'Tarefa Concluída',
            description: `Tarefa '${task.title}' concluída por ${task.responsibleUser}.`,
            type: 'task_completed',
            organizationId: task.organizationId
          });
        }
      },

      updateTask: (id, updates) => {
        const activeOrgId = get().currentOrganizationId;
        set((state) => ({
          tasks: state.tasks.map((t) => 
            (t.id === id && t.organizationId === activeOrgId) ? { ...t, ...updates } : t
          )
        }));
      },

      addTaskNote: (taskId, content) => {
        if (!content || !content.trim()) return;
        const activeOrgId = get().currentOrganizationId;
        const author = get().currentUser ? get().currentUser.name : 'Operador';
        const newNote = {
          id: `note_${Date.now()}`,
          authorName: author,
          content: content.trim(),
          createdAt: new Date().toISOString()
        };

        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (t.id === taskId && t.organizationId === activeOrgId) {
              return {
                ...t,
                notes: [...(t.notes || []), newNote]
              };
            }
            return t;
          })
        }));
      },

      addHistoryEvent: (eventData) => {
        const client = eventData.clientId ? get().clients.find(c => c.id === eventData.clientId) : null;
        const finalClientName = client ? client.companyName : eventData.clientName;
        const targetOrgId = eventData.organizationId || get().currentOrganizationId;

        const newEvent: HistoryEvent = {
          ...eventData,
          clientName: finalClientName,
          organizationId: targetOrgId,
          id: `h_${Date.now()}`,
          createdAt: new Date().toISOString()
        } as HistoryEvent;

        set((state) => ({
          historyEvents: [newEvent, ...state.historyEvents]
        }));
      },

      simulateCnpjSearch: (cnpj) => {
        const cleanCnpj = cnpj.replace(/\D/g, '');
        if (!cleanCnpj || cleanCnpj.length !== 14) return null;

        const mockDb: Record<string, ReturnType<SystemState['simulateCnpjSearch']>> = {
          '12345678000190': {
            companyName: 'Power Energy Solar e Automação Ltda',
            tradeName: 'Power Energy',
            address: 'Av. Paulista, 1000 - Bela Vista',
            city: 'São Paulo',
            state: 'SP',
            status: 'ATIVA',
            activity: '71.12-8-00 - Serviços de Engenharia e Eficiência Energética'
          },
          '98765432000110': {
            companyName: 'Carolina Lima & Ponto de Encontro Café Ltda',
            tradeName: 'Ponto de Encontro Café',
            address: 'Rua Visconde de Pirajá, 350 - Ipanema',
            city: 'Rio de Janeiro',
            state: 'RJ',
            status: 'ATIVA',
            activity: '56.11-2-03 - Lanchonetes, casas de chá, de sucos e similares'
          },
          '55444333000122': {
            companyName: 'Alfa Tech Consultoria Tecnológica e Operacional S/A',
            tradeName: 'Alfa Tech Consultoria',
            address: 'Av. do Contorno, 6000 - Savassi',
            city: 'Belo Horizonte',
            state: 'MG',
            status: 'ATIVA',
            activity: '62.04-0-00 - Consultoria em tecnologia da informação'
          }
        };

        return mockDb[cleanCnpj] || {
          companyName: `Empresa Simulada CNPJ ${cnpj}`,
          tradeName: `Nome Fantasia ${cnpj.slice(0, 5)}`,
          address: 'Rua das Automações, 123 - Centro',
          city: 'São Paulo',
          state: 'SP',
          status: 'ATIVA',
          activity: '70.20-4-00 - Atividades de consultoria em gestão empresarial'
        };
      },

      resetState: () => {
        set(() => ({
          organizations: initialOrganizations,
          currentOrganizationId: 'org_hub_power',
          clients: initialClients,
          proposals: initialProposals,
          contracts: initialContracts,
          charges: initialCharges,
          onboardings: initialOnboardings,
          publications: initialPublications,
          tasks: initialTasks,
          historyEvents: initialHistory,
          teamMembers: initialTeamMembers,
          currentUser: initialTeamMembers[0],
          integrations: initialIntegrations,
          leads: initialLeads,
          organizationFeatures: initialFeatures,
        }));
      },

      getFeaturesByOrganization: (orgId) => {
        const features = get().organizationFeatures || [];
        const found = features.find(f => f.organizationId === orgId);
        if (found) return found;

        // Backfill if not found based on organization plan
        const org = get().organizations.find(o => o.id === orgId);
        const planId = org ? org.planId : 'starter';
        const defaultFeatures = {
          organizationId: orgId,
          ...getPlanDefaultFeatures(planId)
        };

        // Save backfilled features
        set(state => ({
          organizationFeatures: [...(state.organizationFeatures || []), defaultFeatures]
        }));
        return defaultFeatures;
      },

      updateOrganizationFeature: (orgId, featureKey, enabled) => {
        set(state => {
          const features = state.organizationFeatures || [];
          const index = features.findIndex(f => f.organizationId === orgId);

          if (index > -1) {
            const updated = [...features];
            updated[index] = {
              ...updated[index],
              [featureKey]: enabled
            };
            return { organizationFeatures: updated };
          } else {
            const org = state.organizations.find(o => o.id === orgId);
            const planId = org ? org.planId : 'starter';
            const newFeatureObj = {
              organizationId: orgId,
              ...getPlanDefaultFeatures(planId),
              [featureKey]: enabled
            };
            return { organizationFeatures: [...features, newFeatureObj] };
          }
        });
      },

      updateOrganizationFeatures: (orgId, data) => {
        set(state => {
          const features = state.organizationFeatures || [];
          const index = features.findIndex(f => f.organizationId === orgId);

          if (index > -1) {
            const updated = [...features];
            updated[index] = {
              ...updated[index],
              ...data
            };
            return { organizationFeatures: updated };
          } else {
            const org = state.organizations.find(o => o.id === orgId);
            const planId = org ? org.planId : 'starter';
            const newFeatureObj = {
              organizationId: orgId,
              ...getPlanDefaultFeatures(planId),
              ...data
            };
            return { organizationFeatures: [...features, newFeatureObj] };
          }
        });
      },

      resetFeaturesToPlanDefaults: (orgId) => {
        set(state => {
          const org = state.organizations.find(o => o.id === orgId);
          const planId = org ? org.planId : 'starter';
          const defaultFeatures = {
            organizationId: orgId,
            ...getPlanDefaultFeatures(planId)
          };

          const features = state.organizationFeatures || [];
          const index = features.findIndex(f => f.organizationId === orgId);

          if (index > -1) {
            const updated = [...features];
            updated[index] = defaultFeatures;
            return { organizationFeatures: updated };
          } else {
            return { organizationFeatures: [...features, defaultFeatures] };
          }
        });
      }
    }),
    {
      name: 'hub-power-ponto-storage',
      storage: createJSONStorage(() => localStorage),
        merge: (persistedState: unknown, currentState: SystemState): SystemState => {
          if (!persistedState) return currentState;
          const state = persistedState as Partial<SystemState>;

          const backfill = <T extends { id: string; organizationId?: string }>(list: T[] | undefined, initialList: T[]): T[] => {
            if (!list) return initialList;
            const migratedList = list.map(item => {
              const initialItem = initialList.find(i => i.id === item.id);
              return {
                ...initialItem,
                ...item,
                organizationId: item.organizationId || initialItem?.organizationId || 'org_hub_power'
              };
            });
            const migratedIds = new Set(migratedList.map(item => item.id));
            const missingItems = initialList.filter(item => !migratedIds.has(item.id));
            return [...migratedList, ...missingItems];
          };

          const backfillIntegrations = (list: TenantIntegration[] | undefined, initialList: TenantIntegration[]): TenantIntegration[] => {
            if (!list) return initialList;
            const migratedList = list.map(item => {
              const initialItem = initialList.find(i => i.organizationId === item.organizationId);
              return {
                ...initialItem,
                ...item,
                organizationId: item.organizationId || initialItem?.organizationId || 'org_hub_power'
              };
            });
            const migratedOrgs = new Set(migratedList.map(item => item.organizationId));
            const missingItems = initialList.filter(item => !migratedOrgs.has(item.organizationId));
            return [...migratedList, ...missingItems];
          };

          const backfillFeatures = (list: OrganizationFeatures[] | undefined, initialList: OrganizationFeatures[]): OrganizationFeatures[] => {
            if (!list) return initialList;
            const migratedList = list.map(item => {
              const initialItem = initialList.find(i => i.organizationId === item.organizationId);
              return {
                ...initialItem,
                ...item,
                organizationId: item.organizationId || initialItem?.organizationId || 'org_hub_power'
              };
            });
            const migratedOrgs = new Set(migratedList.map(item => item.organizationId));
            const missingItems = initialList.filter(item => !migratedOrgs.has(item.organizationId));
            return [...migratedList, ...missingItems];
          };

          return {
            ...currentState,
            ...state,
            organizations: backfill(state.organizations, currentState.organizations),
            currentOrganizationId: state.currentOrganizationId || currentState.currentOrganizationId,
            clients: backfill(state.clients, currentState.clients),
            proposals: backfill(state.proposals, currentState.proposals),
            contracts: backfill(state.contracts, currentState.contracts),
            charges: backfill(state.charges, currentState.charges),
            onboardings: backfill(state.onboardings, currentState.onboardings),
            publications: backfill(state.publications, currentState.publications),
            tasks: backfill(state.tasks, currentState.tasks),
            historyEvents: backfill(state.historyEvents, currentState.historyEvents),
            teamMembers: backfill(state.teamMembers, currentState.teamMembers),
            currentUser: state.currentUser
              ? { ...currentState.currentUser, ...state.currentUser }
              : currentState.currentUser,
            integrations: backfillIntegrations(state.integrations, currentState.integrations),
            leads: backfill(state.leads, currentState.leads),
            organizationFeatures: backfillFeatures(state.organizationFeatures, currentState.organizationFeatures),
          };
        }
    }
  )
);

// SaaS Custom Selector Hook for dynamic tenant isolation
export function useTenantStore() {
  const store = useStore();
  const currentOrgId = store.currentOrganizationId;
  const currentOrg = store.organizations.find(o => o.id === currentOrgId) || store.organizations[0];
  const currentFeatures = store.organizationFeatures?.find(f => f.organizationId === currentOrgId) || {
    organizationId: currentOrgId,
    ...getPlanDefaultFeatures(currentOrg?.planId || 'starter')
  };

  return {
    ...store,
    currentOrganization: currentOrg,
    currentFeatures,
    currentIntegration: store.integrations.find(i => i.organizationId === currentOrgId) || store.integrations[0],
    clients: store.clients.filter(c => c.organizationId === currentOrgId),
    proposals: store.proposals.filter(p => p.organizationId === currentOrgId),
    contracts: store.contracts.filter(c => c.organizationId === currentOrgId),
    charges: store.charges.filter(c => c.organizationId === currentOrgId),
    onboardings: store.onboardings.filter(o => o.organizationId === currentOrgId),
    publications: store.publications.filter(p => p.organizationId === currentOrgId),
    tasks: store.tasks.filter(t => t.organizationId === currentOrgId),
    historyEvents: store.historyEvents.filter(h => h.organizationId === currentOrgId),
    teamMembers: store.teamMembers.filter(m => m.organizationId === currentOrgId),
    leads: store.leads.filter(l => l.organizationId === currentOrgId),
    financialEntries: store.financialEntries.filter(f => f.organizationId === currentOrgId),
    financialRecurrences: store.financialRecurrences.filter(f => f.organizationId === currentOrgId),
  };
}
