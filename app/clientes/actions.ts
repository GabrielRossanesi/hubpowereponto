'use server';

import prisma from '../../lib/prisma';
import { getSession, validateTenantAccess, getActiveOrganizationId } from '../../lib/tenant';
import { isDatabaseDataMode } from '../../lib/data-mode';
import { measureServerTiming } from '../../lib/performance';
import { getCurrentDatabaseTenantContext } from '../../lib/tenant-context-actions';
import type { Client, ClientStatus, TaskStatus, TaskPriority } from '../../types';

// Helper to check if the 'clients' feature is enabled for the organization
async function checkClientsFeature(organizationId: string) {
  const feature = await prisma.organizationFeature.findUnique({
    where: { organizationId },
    select: { clients: true },
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

  try {
    const tenantContext = await getCurrentDatabaseTenantContext();
    if (!tenantContext) throw new Error('Unauthorized tenant context.');
    if (tenantContext.features.clients === false) {
      throw new Error('Clients module is disabled for this organization.');
    }
    const activeOrgId = tenantContext.organization.id;

    const dbClients = await measureServerTiming('clients/query', () =>
      prisma.client.findMany({
        where: {
          organizationId: activeOrgId,
          ...(includeArchived ? {} : { status: { not: 'archived' } }),
        },
        select: {
          id: true,
          organizationId: true,
          companyName: true,
          document: true,
          documentType: true,
          contactName: true,
          email: true,
          phone: true,
          status: true,
          notes: true,
          responsibleUser: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      { includeArchived },
    );

    return dbClients.map(mapDbClientToClient);
  } catch (err) {
    console.error('Error fetching clients:', err);
    return [];
  }
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
}): Promise<{ success: boolean; data?: Client; error?: string }> {
  if (!isDatabaseDataMode) {
    return { success: false, error: 'Operação disponível apenas no modo database.' };
  }

  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Não autorizado: Sessão não encontrada.' };
    }

    const activeOrgId = await getActiveOrganizationId(session);
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
        return { success: false, error: `Limite do Plano Atingido (${maxClients} clientes). Faça o upgrade do seu plano.` };
      }
    }

    // Validate required fields
    if (!data.companyName.trim()) {
      return { success: false, error: 'Nome da empresa / Razão social é obrigatório.' };
    }
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return { success: false, error: 'Formato de e-mail inválido.' };
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

    return { success: true, data: mapDbClientToClient(dbClient) };
  } catch (error) {
    console.error('Error in createClient server action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Não foi possível cadastrar o cliente. Verifique os dados e tente novamente.'
    };
  }
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
): Promise<{ success: boolean; data?: Client; error?: string }> {
  if (!isDatabaseDataMode) {
    return { success: false, error: 'Operação disponível apenas no modo database.' };
  }

  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Não autorizado: Sessão não encontrada.' };
    }

    const activeOrgId = await getActiveOrganizationId(session);
    const executorId = session.user.id;
    await validateTenantAccess(activeOrgId);
    await checkClientsFeature(activeOrgId);

    // Validate required fields
    if (!data.companyName.trim()) {
      return { success: false, error: 'Nome da empresa / Razão social é obrigatório.' };
    }
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return { success: false, error: 'Formato de e-mail inválido.' };
    }

    // Update client with multi-tenant check
    const existingClient = await prisma.client.findFirst({
      where: { id, organizationId: activeOrgId }
    });
    if (!existingClient) {
      return { success: false, error: 'Cliente não encontrado ou acesso negado.' };
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

    return { success: true, data: mapDbClientToClient(dbClient) };
  } catch (error) {
    console.error('Error in updateClient server action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Não foi possível atualizar o cliente. Tente novamente.'
    };
  }
}

export async function archiveClient(id: string): Promise<{ success: boolean; data?: Client; error?: string }> {
  if (!isDatabaseDataMode) {
    return { success: false, error: 'Operação disponível apenas no modo database.' };
  }

  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Não autorizado: Sessão não encontrada.' };
    }

    const activeOrgId = await getActiveOrganizationId(session);
    const executorId = session.user.id;
    await validateTenantAccess(activeOrgId);

    const existingClient = await prisma.client.findFirst({
      where: { id, organizationId: activeOrgId }
    });
    if (!existingClient) {
      return { success: false, error: 'Cliente não encontrado ou acesso negado.' };
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

    return { success: true, data: mapDbClientToClient(dbClient) };
  } catch (error) {
    console.error('Error in archiveClient server action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao arquivar cliente.'
    };
  }
}

export async function restoreClient(id: string): Promise<{ success: boolean; data?: Client; error?: string }> {
  if (!isDatabaseDataMode) {
    return { success: false, error: 'Operação disponível apenas no modo database.' };
  }

  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Não autorizado: Sessão não encontrada.' };
    }

    const activeOrgId = await getActiveOrganizationId(session);
    const executorId = session.user.id;
    await validateTenantAccess(activeOrgId);

    const existingClient = await prisma.client.findFirst({
      where: { id, organizationId: activeOrgId }
    });
    if (!existingClient) {
      return { success: false, error: 'Cliente não encontrado ou acesso negado.' };
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

    return { success: true, data: mapDbClientToClient(dbClient) };
  } catch (error) {
    console.error('Error in restoreClient server action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao restaurar cliente.'
    };
  }
}

export async function getTenantMembers(): Promise<{ id: string; name: string }[]> {
  if (!isDatabaseDataMode) return [];

  try {
    const tenantContext = await getCurrentDatabaseTenantContext();
    if (!tenantContext) throw new Error('Unauthorized tenant context.');
    const activeOrgId = tenantContext.organization.id;

    const members = await measureServerTiming('members/query', () =>
      prisma.member.findMany({
        where: { organizationId: activeOrgId },
        select: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        },
        orderBy: {
          createdAt: 'asc',
        },
      }),
    );

    return members
      .map((m) => ({
        id: m.user.id,
        name: m.user.name || 'Sem nome',
      }))
      .filter((u) => u.name);
  } catch (error) {
    console.error('Error fetching tenant members:', error);
    return [];
  }
}

export async function getClientById(clientId: string): Promise<Client | null> {
  if (!isDatabaseDataMode) return null;

  try {
    const activeOrgId = await getActiveOrganizationId();
    await validateTenantAccess(activeOrgId);

    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        organizationId: activeOrgId,
        archivedAt: null,
      },
    });

    if (!client) return null;
    return mapDbClientToClient(client);
  } catch (error) {
    console.error('Error in getClientById:', error);
    return null;
  }
}

export async function getClientProfileDbData(clientId: string) {
  if (!isDatabaseDataMode) {
    return { success: false, error: 'Apenas em modo database.' };
  }

  try {
    const activeOrgId = await getActiveOrganizationId();
    await validateTenantAccess(activeOrgId);

    // 1. Fetch Client
    const client = await getClientById(clientId);
    if (!client) {
      return { success: false, error: 'Cliente não encontrado ou não pertence à organização ativa.' };
    }

    // 2. Fetch Tasks
    const dbTasks = await prisma.task.findMany({
      where: {
        clientId,
        organizationId: activeOrgId,
        archivedAt: null,
      },
      include: {
        assignedUser: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const tasks = dbTasks.map((t) => ({
      id: t.id,
      organizationId: t.organizationId,
      clientId: t.clientId || '',
      clientName: client.companyName,
      title: t.title,
      description: t.description || '',
      status: t.status as TaskStatus,
      priority: t.priority as TaskPriority,
      dueDate: t.dueDate ? t.dueDate.toISOString().split('T')[0] : '',
      completedAt: t.completedAt ? t.completedAt.toISOString() : undefined,
      responsibleUser: t.assignedUser?.name || 'Ana Silva',
      createdAt: t.createdAt.toISOString(),
    }));

    // 3. Fetch History (Audit Logs)
    const dbAuditLogs = await prisma.auditLog.findMany({
      where: {
        target: clientId,
        organizationId: activeOrgId,
      },
      include: {
        user: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const history = dbAuditLogs.map((log) => ({
      id: log.id,
      title: log.action === 'CLIENT_CREATED' ? 'Cliente Cadastrado' : log.action === 'CLIENT_UPDATED' ? 'Cadastro Atualizado' : log.action,
      description: `Ação realizada por ${log.user.name || log.user.email}`,
      type: 'client_created' as const,
      organizationId: log.organizationId,
      clientId,
      createdAt: log.createdAt.toISOString(),
    }));

    return {
      success: true,
      client,
      tasks,
      history,
    };
  } catch (error) {
    console.error('Error in getClientProfileDbData:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao obter dados do cliente.'
    };
  }
}
