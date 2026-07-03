import React from 'react';
import Badge from './badge';
import { 
  ClientStatus, ProposalStatus, ContractStatus, 
  ChargeStatus, PublicationStatus, TaskStatus, TaskPriority, OnboardingStepStatus
} from '../../types';

interface StatusBadgeProps {
  type: 'client' | 'proposal' | 'contract' | 'charge' | 'onboarding' | 'publication' | 'task' | 'priority';
  status: string;
}

type BadgeVariant = 'default' | 'muted' | 'success' | 'warning' | 'danger' | 'info';

export function StatusBadge({ type, status }: StatusBadgeProps) {
  let label = status;
  let variant: BadgeVariant = 'default';

  if (type === 'client') {
    const s = status as ClientStatus;
    const mapping: Record<ClientStatus, { label: string; variant: BadgeVariant }> = {
      lead: { label: 'Lead', variant: 'warning' },
      onboarding: { label: 'Onboarding', variant: 'info' },
      active: { label: 'Ativo', variant: 'success' },
      inactive: { label: 'Inativo', variant: 'danger' },
      archived: { label: 'Arquivado', variant: 'muted' }
    };
    if (mapping[s]) {
      label = mapping[s].label;
      variant = mapping[s].variant;
    }
  }

  if (type === 'proposal') {
    const s = status as ProposalStatus;
    const mapping: Record<ProposalStatus, { label: string; variant: BadgeVariant }> = {
      draft: { label: 'Rascunho', variant: 'muted' },
      sent: { label: 'Enviada', variant: 'info' },
      viewed: { label: 'Visualizada', variant: 'warning' },
      accepted: { label: 'Aceita', variant: 'success' },
      declined: { label: 'Recusada', variant: 'danger' },
      expired: { label: 'Expirada', variant: 'danger' }
    };
    if (mapping[s]) {
      label = mapping[s].label;
      variant = mapping[s].variant;
    }
  }

  if (type === 'contract') {
    const s = status as ContractStatus;
    const mapping: Record<ContractStatus, { label: string; variant: BadgeVariant }> = {
      not_generated: { label: 'Não Gerado', variant: 'danger' },
      drafting: { label: 'Em Preenchimento', variant: 'muted' },
      generated: { label: 'Gerado', variant: 'info' },
      sent: { label: 'Enviado para Assinatura', variant: 'info' },
      pending_signatures: { label: 'Aguardando Assinatura', variant: 'warning' },
      signed: { label: 'Assinado', variant: 'success' },
      declined: { label: 'Recusado', variant: 'danger' },
      expired: { label: 'Expirado', variant: 'danger' },
      cancelled: { label: 'Cancelado', variant: 'danger' }
    };
    if (mapping[s]) {
      label = mapping[s].label;
      variant = mapping[s].variant;
    }
  }

  if (type === 'charge') {
    const s = status as ChargeStatus;
    const mapping: Record<ChargeStatus, { label: string; variant: BadgeVariant }> = {
      pending_generation: { label: 'Não Criada', variant: 'muted' },
      created: { label: 'Cobrança Criada', variant: 'info' },
      sent: { label: 'Enviada', variant: 'info' },
      pending: { label: 'Aguardando Pagamento', variant: 'warning' },
      paid: { label: 'Paga', variant: 'success' },
      overdue: { label: 'Vencida', variant: 'danger' },
      cancelled: { label: 'Cancelada', variant: 'danger' }
    };
    if (mapping[s]) {
      label = mapping[s].label;
      variant = mapping[s].variant;
    }
  }

  if (type === 'onboarding') {
    const s = status as OnboardingStepStatus;
    const mapping: Record<OnboardingStepStatus, { label: string; variant: BadgeVariant }> = {
      pending: { label: 'Pendente', variant: 'warning' },
      completed: { label: 'Concluído', variant: 'success' }
    };
    if (mapping[s]) {
      label = mapping[s].label;
      variant = mapping[s].variant;
    }
  }

  if (type === 'publication') {
    const s = status as PublicationStatus;
    const mapping: Record<PublicationStatus, { label: string; variant: BadgeVariant }> = {
      draft: { label: 'Em Criação', variant: 'muted' },
      ready_for_approval: { label: 'Pronto para Aprovação', variant: 'info' },
      sent_to_client: { label: 'Enviado para Cliente', variant: 'info' },
      pending_approval: { label: 'Aguardando Aprovação', variant: 'warning' },
      approved: { label: 'Aprovado', variant: 'success' },
      changes_requested: { label: 'Alteração Solicitada', variant: 'danger' },
      adjusting: { label: 'Em Ajuste', variant: 'warning' },
      resubmitted: { label: 'Reenviado para Aprovação', variant: 'info' },
      scheduled: { label: 'Agendado', variant: 'success' },
      posted: { label: 'Postado', variant: 'success' }
    };
    if (mapping[s]) {
      label = mapping[s].label;
      variant = mapping[s].variant;
    }
  }

  if (type === 'task') {
    const s = status as TaskStatus;
    const mapping: Record<TaskStatus, { label: string; variant: BadgeVariant }> = {
      pending: { label: 'Pendente', variant: 'muted' },
      in_progress: { label: 'Em Andamento', variant: 'info' },
      in_review: { label: 'Em Revisão', variant: 'warning' },
      completed: { label: 'Concluída', variant: 'success' },
      overdue: { label: 'Atrasada', variant: 'danger' },
      cancelled: { label: 'Cancelada', variant: 'danger' },
      archived: { label: 'Arquivada', variant: 'muted' }
    };
    if (mapping[s]) {
      label = mapping[s].label;
      variant = mapping[s].variant;
    }
  }

  if (type === 'priority') {
    const s = status as TaskPriority;
    const mapping: Record<TaskPriority, { label: string; variant: BadgeVariant }> = {
      low: { label: 'Baixa', variant: 'muted' },
      medium: { label: 'Média', variant: 'info' },
      high: { label: 'Alta', variant: 'warning' },
      urgent: { label: 'Urgente', variant: 'danger' }
    };
    if (mapping[s]) {
      label = mapping[s].label;
      variant = mapping[s].variant;
    }
  }

  return <Badge variant={variant}>{label}</Badge>;
}

export default StatusBadge;
