'use server';

import prisma from '../../lib/prisma';
import { getSession, validateTenantAccess } from '../../lib/tenant';
import { isDatabaseDataMode } from '../../lib/data-mode';
import type { Client, ClientStatus } from '../../types';

// Helper to check if the 'clients' feature is enabled for the organization
async function checkClientsFeature(organizationId: string) {
  const feature = await prisma.organizationFeature.findUnique({
    where: { organizationId },
  });
  if (feature && feature.clients === false) {
    throw new Error('Módulo de clientes desabilitado para esta organização.');
  }
}

// Map database Client model to frontend Client type
function mapDbClientToClient(dbClient: {
  id: string;
  organizationId: string;
  companyName: string;
  document: string | null;
  documentType: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  notes: string | null;
  responsibleUser: string | null;
  createdAt: Date;
}): Client {
  return {
    id: dbClient.id,
    organizationId: dbClient.organizationId,
    name: dbClient.contactName || '',
    companyName: dbClient.companyName,
    cnpj: dbClient.document || '',
    phone: dbClient.phone || '',
    email: dbClient.email || '',
    responsibleUser: dbClient.responsibleUser || 'Ana Silva',
    commercialStatus: dbClient.status as ClientStatus,
    notes: dbClient.notes || '',
    createdAt: dbClient.createdAt.toISOString(),
  };
}

export async function getClients(includeArchived = false): Promise<Client[]> {
  if (!isDatabaseDataMode) return [];

  const session = await getSession();
  if (!session || !session.session.activeOrganizationId) {
    throw new Error('Não autorizado: Organização ativa não selecionada.');
  }

  const activeOrgId = session.session.activeOrganizationId;
  await Promise.all([
    validateTenantAccess(activeOrgId),
    checkClientsFeature(activeOrgId),
  ]);

  const dbClients = await prisma.client.findMany({
    where: {
      organizationId: activeOrgId,
      ...(includeArchived ? {} : { status: { not: 'archived' } }),
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return dbClients.map(mapDbClientToClient);
}

export async function createClient(data: {
  name: string;
  companyName: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  responsibleUser?: string;
  commercialStatus: ClientStatus;
  notes?: string;
}): Promise<Client> {
  if (!isDatabaseDataMode) {
    throw new Error('Operação disponível apenas no modo database.');
  }

  const session = await getSession();
  if (!session || !session.session.activeOrganizationId) {
    throw new Error('Não autorizado: Organização ativa não selecionada.');
  }

  const activeOrgId = session.session.activeOrganizationId;
  const executorId = session.user.id;
  await validateTenantAccess(activeOrgId);
  await checkClientsFeature(activeOrgId);

  // Validate plan limits
  const org = await prisma.organization.findUnique({
    where: { id: activeOrgId },
    select: { planId: true }
  });
  
  if (org) {
    const limits = {
      starter: 3,
      pro: 30,
      enterprise: 99999
    };
    const maxClients = limits[org.planId as 'starter' | 'pro' | 'enterprise'] || 3;
    
    const currentClientsCount = await prisma.client.count({
      where: {
        organizationId: activeOrgId,
        status: { not: 'archived' }
      }
    });

    if (currentClientsCount >= maxClients) {
      throw new Error(`Limite do Plano Atingido (${maxClients} clientes). Faça o upgrade do seu plano.`);
    }
  }

  // Validate required fields
  if (!data.companyName.trim()) {
    throw new Error('Nome da empresa / Razão social é obrigatório.');
  }
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    throw new Error('Formato de e-mail inválido.');
  }

  const dbClient = await prisma.client.create({
    data: {
      organizationId: activeOrgId,
      companyName: data.companyName,
      contactName: data.name,
      document: data.cnpj || null,
      documentType: data.cnpj ? (data.cnpj.replace(/\D/g, '').length === 11 ? 'cpf' : 'cnpj') : null,
      phone: data.phone || null,
      email: data.email || null,
      status: data.commercialStatus,
      notes: data.notes || null,
      responsibleUser: data.responsibleUser || 'Ana Silva',
    },
  });

  // Create Audit Log
  await prisma.auditLog.create({
    data: {
      action: 'CLIENT_CREATED',
      target: dbClient.id,
      organizationId: activeOrgId,
      userId: executorId,
    },
  });

  return mapDbClientToClient(dbClient);
}

export async function updateClient(
  id: string,
  data: {
    name: string;
    companyName: string;
    cnpj?: string;
    phone?: string;
    email?: string;
    responsibleUser?: string;
    commercialStatus: ClientStatus;
    notes?: string;
  }
): Promise<Client> {
  if (!isDatabaseDataMode) {
    throw new Error('Operação disponível apenas no modo database.');
  }

  const session = await getSession();
  if (!session || !session.session.activeOrganizationId) {
    throw new Error('Não autorizado: Organização ativa não selecionada.');
  }

  const activeOrgId = session.session.activeOrganizationId;
  const executorId = session.user.id;
  await validateTenantAccess(activeOrgId);
  await checkClientsFeature(activeOrgId);

  // Validate required fields
  if (!data.companyName.trim()) {
    throw new Error('Nome da empresa / Razão social é obrigatório.');
  }
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    throw new Error('Formato de e-mail inválido.');
  }

  // Update client with multi-tenant check
  const existingClient = await prisma.client.findFirst({
    where: { id, organizationId: activeOrgId }
  });
  if (!existingClient) {
    throw new Error('Cliente não encontrado ou acesso negado.');
  }

  const dbClient = await prisma.client.update({
    where: { id },
    data: {
      companyName: data.companyName,
      contactName: data.name,
      document: data.cnpj || null,
      documentType: data.cnpj ? (data.cnpj.replace(/\D/g, '').length === 11 ? 'cpf' : 'cnpj') : null,
      phone: data.phone || null,
      email: data.email || null,
      status: data.commercialStatus,
      notes: data.notes || null,
      responsibleUser: data.responsibleUser || 'Ana Silva',
    },
  });

  // Create Audit Log
  await prisma.auditLog.create({
    data: {
      action: 'CLIENT_UPDATED',
      target: dbClient.id,
      organizationId: activeOrgId,
      userId: executorId,
    },
  });

  return mapDbClientToClient(dbClient);
}

export async function archiveClient(id: string): Promise<Client> {
  if (!isDatabaseDataMode) {
    throw new Error('Operação disponível apenas no modo database.');
  }

  const session = await getSession();
  if (!session || !session.session.activeOrganizationId) {
    throw new Error('Não autorizado: Organização ativa não selecionada.');
  }

  const activeOrgId = session.session.activeOrganizationId;
  const executorId = session.user.id;
  await validateTenantAccess(activeOrgId);

  const existingClient = await prisma.client.findFirst({
    where: { id, organizationId: activeOrgId }
  });
  if (!existingClient) {
    throw new Error('Cliente não encontrado ou acesso negado.');
  }

  const dbClient = await prisma.client.update({
    where: { id },
    data: {
      status: 'archived',
      archivedAt: new Date(),
    },
  });

  // Create Audit Log
  await prisma.auditLog.create({
    data: {
      action: 'CLIENT_ARCHIVED',
      target: dbClient.id,
      organizationId: activeOrgId,
      userId: executorId,
    },
  });

  return mapDbClientToClient(dbClient);
}

export async function restoreClient(id: string): Promise<Client> {
  if (!isDatabaseDataMode) {
    throw new Error('Operação disponível apenas no modo database.');
  }

  const session = await getSession();
  if (!session || !session.session.activeOrganizationId) {
    throw new Error('Não autorizado: Organização ativa não selecionada.');
  }

  const activeOrgId = session.session.activeOrganizationId;
  const executorId = session.user.id;
  await validateTenantAccess(activeOrgId);

  const existingClient = await prisma.client.findFirst({
    where: { id, organizationId: activeOrgId }
  });
  if (!existingClient) {
    throw new Error('Cliente não encontrado ou acesso negado.');
  }

  const dbClient = await prisma.client.update({
    where: { id },
    data: {
      status: 'active',
      archivedAt: null,
    },
  });

  // Create Audit Log
  await prisma.auditLog.create({
    data: {
      action: 'CLIENT_RESTORED',
      target: dbClient.id,
      organizationId: activeOrgId,
      userId: executorId,
    },
  });

  return mapDbClientToClient(dbClient);
}
