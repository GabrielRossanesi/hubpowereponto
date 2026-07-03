export type PlanType = 'starter' | 'pro' | 'enterprise';
export type UserRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface Organization {
  id: string;
  name: string;
  cnpj: string;
  planId: PlanType;
  status: 'active' | 'suspended' | 'trial' | 'pending' | 'archived';
  logoUrl?: string;
  createdAt: string;
}

export interface PlanLimits {
  clients: number;
  users: number;
  proposals: number;
  tasks: number;
  hasIntegrations: boolean;
}

export type ClientStatus = 'lead' | 'onboarding' | 'active' | 'inactive' | 'archived';

export interface Client {
  id: string;
  organizationId: string; // SaaS Tenant Isolation
  name: string;
  companyName: string;
  cnpj: string;
  phone: string;
  email: string;
  responsibleUser: string;
  commercialStatus: ClientStatus;
  notes?: string;
  createdAt: string;
}

export type ProposalStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired';

export interface ProposalItem {
  id: string;
  description: string;
  value: number;
  isMonthly: boolean; // recurring
}

export interface Proposal {
  id: string;
  organizationId: string; // SaaS Tenant Isolation
  clientId: string;
  clientName: string;
  companyName: string;
  description: string;
  items: ProposalItem[];
  totalValue: number;
  monthlyValue: number;
  validityDate: string;
  paymentTerms: string;
  notes?: string;
  status: ProposalStatus;
  createdAt: string;
}

export type ContractStatus =
  | 'not_generated'
  | 'drafting'
  | 'generated'
  | 'sent'
  | 'pending_signatures'
  | 'signed'
  | 'declined'
  | 'expired'
  | 'cancelled';

export interface Contract {
  id: string;
  organizationId: string; // SaaS Tenant Isolation
  clientId: string;
  clientName: string;
  companyName: string;
  proposalId: string;
  type: string; // e.g. "Prestação de Serviços"
  value: number;
  monthlyValue: number;
  startDate: string;
  firstPaymentDate: string;
  status: ContractStatus;
  documentUrl?: string; // ZapSign placeholder url
  version: string;
  createdAt: string;
}

export type ChargeStatus =
  | 'pending_generation'
  | 'created'
  | 'sent'
  | 'pending'
  | 'paid'
  | 'overdue'
  | 'cancelled';

export interface Charge {
  id: string;
  organizationId: string; // SaaS Tenant Isolation
  clientId: string;
  clientName: string;
  companyName: string;
  contractId: string;
  value: number;
  dueDate: string;
  paymentMethod: 'pix' | 'credit_card' | 'boleto';
  paymentUrl?: string; // Asaas placeholder url
  status: ChargeStatus;
  paidAt?: string;
  createdAt: string;
}

export type OnboardingStepStatus = 'pending' | 'completed';

export interface Onboarding {
  id: string;
  organizationId: string; // SaaS Tenant Isolation
  clientId: string;
  clientName: string;
  companyName: string;
  startDate: string;
  responsibleUser: string;
  steps: {
    paymentConfirmed: OnboardingStepStatus;
    driveCreated: OnboardingStepStatus;
    clickupCreated: OnboardingStepStatus;
    tasksCreated: OnboardingStepStatus;
    onboardingMeeting: OnboardingStepStatus;
    completed: OnboardingStepStatus;
  };
  links: {
    googleDrive?: string;
    clickup?: string;
    whatsAppGroup?: string;
    contract?: string;
    charge?: string;
    proposal?: string;
  };
  createdAt: string;
}

export type PublicationStatus =
  | 'draft'
  | 'ready_for_approval'
  | 'sent_to_client'
  | 'pending_approval'
  | 'approved'
  | 'changes_requested'
  | 'adjusting'
  | 'resubmitted'
  | 'scheduled'
  | 'posted';

export interface Publication {
  id: string;
  organizationId: string; // SaaS Tenant Isolation
  clientId: string;
  clientName: string;
  companyName: string;
  imageUrl: string;
  caption: string;
  scheduledDate: string;
  status: PublicationStatus;
  approvalLink: string;
  clientComments?: string;
  responsibleUser: string;
  createdAt: string;
  // Approval link details
  approvalToken?: string;
  approvalLinkCreatedAt?: string;
  approvalLinkExpiresAt?: string;
  approvalLinkStatus?: 'not_created' | 'active' | 'expired' | 'approved' | 'changes_requested';
  approvedAt?: string;
  changesRequestedAt?: string;
  clientFeedback?: string;
  // Sandbox upload details
  imageSource?: 'upload' | 'external_url' | 'mock';
  imageFileName?: string;
  imageMimeType?: string;
  imageSize?: number;
  platform?: 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'google_business' | 'other';
  postType?: 'single_image' | 'carousel';
  images?: string[];
}

export type TaskStatus = 'pending' | 'in_progress' | 'in_review' | 'completed' | 'overdue' | 'cancelled' | 'archived';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TaskNote {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface TeamTask {
  id: string;
  organizationId: string; // SaaS Tenant Isolation
  title: string;
  clientId: string;
  clientName: string;
  responsibleUser: string;
  dueDate: string;
  status: TaskStatus;
  priority: TaskPriority;
  description?: string;
  createdAt: string;
  notes?: TaskNote[];
}

export interface HistoryEvent {
  id: string;
  organizationId: string; // SaaS Tenant Isolation
  clientId?: string;
  clientName?: string;
  title: string;
  description: string;
  type:
    | 'client_created'
    | 'proposal_created'
    | 'proposal_sent'
    | 'proposal_viewed'
    | 'proposal_accepted'
    | 'contract_generated'
    | 'contract_sent'
    | 'contract_signed'
    | 'charge_generated'
    | 'charge_paid'
    | 'drive_created'
    | 'clickup_created'
    | 'publication_sent'
    | 'publication_approved'
    | 'publication_revision'
    | 'publication_posted'
    | 'task_completed'
    | 'onboarding_completed';
  createdAt: string;
}

export interface TeamMember {
  id: string;
  organizationId: string; // SaaS Tenant Isolation
  name: string;
  email?: string;
  role: string; // business title
  userRole: UserRole; // permission level
  avatarUrl?: string;
  status?: 'active' | 'pending' | 'disabled';
  lastAccess?: string;
}

export type IntegrationStatus = 'connected' | 'not_connected' | 'sandbox' | 'error' | 'pending';

export interface TenantIntegration {
  organizationId: string;

  // Asaas (Financeiro)
  asaasToken: string;
  asaasWebhook: string;
  asaasStatus: IntegrationStatus;

  // ClickUp (Operacional)
  clickupToken: string;
  clickupWorkspace: string;
  clickupStatus: IntegrationStatus;

  // Google Drive & Docs (Entrega)
  googleKey: string;
  googleFolder: string;
  googleDriveStatus: IntegrationStatus;

  // ZapSign (Contratos)
  zapsignKey: string;
  zapsignStatus: IntegrationStatus;

  // WhatsApp (Atendimento)
  whatsappToken: string;
  whatsappStatus: IntegrationStatus;

  // Meta Ads (Leads)
  metaAdsToken: string;
  metaAdsStatus: IntegrationStatus;

  // Google Ads (Leads)
  googleAdsToken: string;
  googleAdsStatus: IntegrationStatus;
}

export type LeadStatus = 'new' | 'in_progress' | 'qualified' | 'meeting' | 'proposal_requested' | 'converted' | 'lost';
export type LeadTemperature = 'cold' | 'warm' | 'hot';

export interface Lead {
  id: string;
  organizationId: string; // SaaS Tenant Isolation
  name: string;
  companyName?: string; // Company name of the lead (if applicable)
  email: string;
  phone: string; // WhatsApp
  origin: string; // ex: Google Search, Facebook Leads, Site Form
  platform: 'google_ads' | 'meta_ads' | 'organic' | 'landing_page' | 'whatsapp';
  campaign?: string;
  adGroup?: string;
  adName?: string;
  formName?: string;
  message?: string;
  formResponses?: Record<string, string>; // respostas de perguntas adicionais
  status: LeadStatus;
  temperature: LeadTemperature;
  responsibleUser: string;
  createdAt: string;
  lastInteraction: string;
  notes?: string;
}

export interface OrganizationFeatures {
  organizationId: string;
  leads: boolean;
  clients: boolean;
  proposals: boolean;
  contracts: boolean;
  charges: boolean;
  onboarding: boolean;
  publications: boolean;
  tasks: boolean;
  history: boolean;
  integrations: boolean;
  team: boolean;
  publicProposal: boolean;
  financial: boolean; // Novo módulo financeiro
}

export type FinancialType = 'receivable' | 'payable';

export type FinancialStatus =
  | 'pending'
  | 'paid'
  | 'overdue'
  | 'cancelled'
  | 'partial';

export interface FinancialEntry {
  id: string;
  organizationId: string;
  type: FinancialType;
  title: string;
  description?: string;
  amount: number;
  paidAmount?: number;
  dueDate: string;
  paidAt?: string;
  status: FinancialStatus;
  category: string;
  contactName?: string;
  clientId?: string;
  supplierName?: string;
  paymentMethod?: string;
  isRecurring?: boolean;
  recurrenceId?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export type RecurrenceFrequency =
  | 'monthly'
  | 'quarterly'
  | 'semiannual'
  | 'annual';

export interface FinancialRecurrence {
  id: string;
  organizationId: string;
  type: 'receivable' | 'payable';
  title: string;
  amount: number;
  category: string;
  frequency: RecurrenceFrequency;
  startDate: string;
  nextDueDate: string;
  isActive: boolean;
  clientId?: string;
  supplierName?: string;
  paymentMethod?: string;
}
