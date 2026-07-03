'use server';

import prisma from '../../lib/prisma';
import { getSession, validateTenantAccess } from '../../lib/tenant';
import { isDatabaseDataMode } from '../../lib/data-mode';
import type { TeamTask, TaskStatus, TaskPriority, TaskNote } from '../../types';

// Helper to check if the 'tasks' feature is enabled for the organization
async function checkTasksFeature(organizationId: string) {
  const feature = await prisma.organizationFeature.findUnique({
    where: { organizationId },
  });
  if (feature && feature.tasks === false) {
    throw new Error('Módulo de tarefas desabilitado para esta organização.');
  }
}

// Map database Task to frontend TeamTask type
function mapDbTaskToTeamTask(dbTask: {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date | null;
  createdAt: Date;
  clientId: string | null;
  client?: { companyName: string } | null;
  assignedUser?: { name: string } | null;
  notes?: {
    id: string;
    authorName: string;
    content: string;
    createdAt: Date;
  }[];
}): TeamTask {
  return {
    id: dbTask.id,
    organizationId: dbTask.organizationId,
    title: dbTask.title,
    clientId: dbTask.clientId || '',
    clientName: dbTask.client?.companyName || '',
    responsibleUser: dbTask.assignedUser?.name || '',
    dueDate: dbTask.dueDate ? dbTask.dueDate.toISOString().split('T')[0] : '',
    status: dbTask.status as TaskStatus,
    priority: dbTask.priority as TaskPriority,
    description: dbTask.description || '',
    createdAt: dbTask.createdAt.toISOString(),
    notes: (dbTask.notes || []).map((n) => ({
      id: n.id,
      authorName: n.authorName,
      content: n.content,
      createdAt: n.createdAt.toISOString(),
    })),
  };
}

export async function getTasks(includeArchived = false): Promise<TeamTask[]> {
  if (!isDatabaseDataMode) return [];

  const session = await getSession();
  if (!session || !session.session.activeOrganizationId) {
    throw new Error('Não autorizado: Organização ativa não selecionada.');
  }

  const activeOrgId = session.session.activeOrganizationId;
  await Promise.all([
    validateTenantAccess(activeOrgId),
    checkTasksFeature(activeOrgId),
  ]);

  const dbTasks = await prisma.task.findMany({
    where: {
      organizationId: activeOrgId,
      ...(includeArchived ? {} : { status: { not: 'archived' } }),
    },
    include: {
      client: true,
      assignedUser: true,
      notes: {
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return dbTasks.map(mapDbTaskToTeamTask);
}

export async function getTaskById(id: string): Promise<TeamTask | null> {
  if (!isDatabaseDataMode) return null;

  const session = await getSession();
  if (!session || !session.session.activeOrganizationId) {
    throw new Error('Não autorizado: Organização ativa não selecionada.');
  }

  const activeOrgId = session.session.activeOrganizationId;
  await validateTenantAccess(activeOrgId);
  await checkTasksFeature(activeOrgId);

  const dbTask = await prisma.task.findFirst({
    where: { id, organizationId: activeOrgId },
    include: {
      client: true,
      assignedUser: true,
      notes: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!dbTask) return null;
  return mapDbTaskToTeamTask(dbTask);
}

export async function createTask(data: {
  title: string;
  clientId?: string;
  responsibleUser?: string; // resolved to user ID or user name
  dueDate?: string;
  priority: TaskPriority;
  description?: string;
  status?: TaskStatus;
}): Promise<TeamTask> {
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
  await checkTasksFeature(activeOrgId);

  if (!data.title.trim()) {
    throw new Error('Título da tarefa é obrigatório.');
  }

  let resolvedClientId: string | null = null;
  if (data.clientId) {
    const client = await prisma.client.findFirst({
      where: { id: data.clientId, organizationId: activeOrgId },
    });
    if (!client) {
      throw new Error('Cliente inválido ou de outra organização.');
    }
    resolvedClientId = client.id;
  }

  let resolvedUserId: string | null = null;
  if (data.responsibleUser) {
    const member = await prisma.member.findFirst({
      where: {
        organizationId: activeOrgId,
        OR: [
          { userId: data.responsibleUser },
          { user: { name: data.responsibleUser } },
        ],
      },
    });
    if (member) {
      resolvedUserId = member.userId;
    }
  }

  const dbTask = await prisma.task.create({
    data: {
      organizationId: activeOrgId,
      title: data.title,
      description: data.description || null,
      status: data.status || 'pending',
      priority: data.priority,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      clientId: resolvedClientId,
      assignedUserId: resolvedUserId,
    },
    include: {
      client: true,
      assignedUser: true,
      notes: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      action: 'TASK_CREATED',
      target: dbTask.id,
      organizationId: activeOrgId,
      userId: executorId,
    },
  });

  return mapDbTaskToTeamTask(dbTask);
}

export async function updateTask(
  id: string,
  data: {
    title?: string;
    clientId?: string;
    responsibleUser?: string;
    dueDate?: string;
    priority?: TaskPriority;
    description?: string;
    status?: TaskStatus;
  }
): Promise<TeamTask> {
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
  await checkTasksFeature(activeOrgId);

  const existingTask = await prisma.task.findFirst({
    where: { id, organizationId: activeOrgId },
  });
  if (!existingTask) {
    throw new Error('Tarefa não encontrada ou acesso negado.');
  }

  // Build prisma updates payload
  const updateData: {
    title?: string;
    description?: string | null;
    priority?: string;
    status?: string;
    dueDate?: Date | null;
    clientId?: string | null;
    assignedUserId?: string | null;
  } = {};
  if (data.title !== undefined) {
    if (!data.title.trim()) throw new Error('Título é obrigatório.');
    updateData.title = data.title;
  }
  if (data.description !== undefined) {
    updateData.description = data.description || null;
  }
  if (data.priority !== undefined) {
    updateData.priority = data.priority;
  }
  if (data.status !== undefined) {
    updateData.status = data.status;
  }
  if (data.dueDate !== undefined) {
    updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  }
  if (data.clientId !== undefined) {
    if (data.clientId) {
      const client = await prisma.client.findFirst({
        where: { id: data.clientId, organizationId: activeOrgId },
      });
      if (!client) throw new Error('Cliente inválido.');
      updateData.clientId = client.id;
    } else {
      updateData.clientId = null;
    }
  }
  if (data.responsibleUser !== undefined) {
    if (data.responsibleUser) {
      const member = await prisma.member.findFirst({
        where: {
          organizationId: activeOrgId,
          OR: [
            { userId: data.responsibleUser },
            { user: { name: data.responsibleUser } },
          ],
        },
      });
      if (!member) throw new Error('Responsável inválido.');
      updateData.assignedUserId = member.userId;
    } else {
      updateData.assignedUserId = null;
    }
  }

  const dbTask = await prisma.task.update({
    where: { id },
    data: updateData,
    include: {
      client: true,
      assignedUser: true,
      notes: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      action: 'TASK_UPDATED',
      target: dbTask.id,
      organizationId: activeOrgId,
      userId: executorId,
    },
  });

  return mapDbTaskToTeamTask(dbTask);
}

export async function completeTask(id: string): Promise<TeamTask> {
  if (!isDatabaseDataMode) {
    throw new Error('Operação disponível apenas no modo database.');
  }

  const session = await getSession();
  if (!session || !session.session.activeOrganizationId) {
    throw new Error('Não autorizado.');
  }

  const activeOrgId = session.session.activeOrganizationId;
  const executorId = session.user.id;
  await validateTenantAccess(activeOrgId);
  await checkTasksFeature(activeOrgId);

  const task = await prisma.task.findFirst({
    where: { id, organizationId: activeOrgId },
  });
  if (!task) throw new Error('Tarefa não encontrada.');

  const dbTask = await prisma.task.update({
    where: { id },
    data: {
      status: 'completed',
      completedAt: new Date(),
    },
    include: {
      client: true,
      assignedUser: true,
      notes: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      action: 'TASK_COMPLETED',
      target: dbTask.id,
      organizationId: activeOrgId,
      userId: executorId,
    },
  });

  return mapDbTaskToTeamTask(dbTask);
}

export async function reopenTask(id: string): Promise<TeamTask> {
  if (!isDatabaseDataMode) {
    throw new Error('Operação disponível apenas no modo database.');
  }

  const session = await getSession();
  if (!session || !session.session.activeOrganizationId) {
    throw new Error('Não autorizado.');
  }

  const activeOrgId = session.session.activeOrganizationId;
  const executorId = session.user.id;
  await validateTenantAccess(activeOrgId);
  await checkTasksFeature(activeOrgId);

  const task = await prisma.task.findFirst({
    where: { id, organizationId: activeOrgId },
  });
  if (!task) throw new Error('Tarefa não encontrada.');

  const dbTask = await prisma.task.update({
    where: { id },
    data: {
      status: 'pending',
      completedAt: null,
    },
    include: {
      client: true,
      assignedUser: true,
      notes: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      action: 'TASK_REOPENED',
      target: dbTask.id,
      organizationId: activeOrgId,
      userId: executorId,
    },
  });

  return mapDbTaskToTeamTask(dbTask);
}

export async function archiveTask(id: string): Promise<TeamTask> {
  if (!isDatabaseDataMode) {
    throw new Error('Operação disponível apenas no modo database.');
  }

  const session = await getSession();
  if (!session || !session.session.activeOrganizationId) {
    throw new Error('Não autorizado.');
  }

  const activeOrgId = session.session.activeOrganizationId;
  const executorId = session.user.id;
  await validateTenantAccess(activeOrgId);

  const task = await prisma.task.findFirst({
    where: { id, organizationId: activeOrgId },
  });
  if (!task) throw new Error('Tarefa não encontrada.');

  const dbTask = await prisma.task.update({
    where: { id },
    data: {
      status: 'archived',
      archivedAt: new Date(),
    },
    include: {
      client: true,
      assignedUser: true,
      notes: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      action: 'TASK_ARCHIVED',
      target: dbTask.id,
      organizationId: activeOrgId,
      userId: executorId,
    },
  });

  return mapDbTaskToTeamTask(dbTask);
}

export async function restoreTask(id: string): Promise<TeamTask> {
  if (!isDatabaseDataMode) {
    throw new Error('Operação disponível apenas no modo database.');
  }

  const session = await getSession();
  if (!session || !session.session.activeOrganizationId) {
    throw new Error('Não autorizado.');
  }

  const activeOrgId = session.session.activeOrganizationId;
  const executorId = session.user.id;
  await validateTenantAccess(activeOrgId);

  const task = await prisma.task.findFirst({
    where: { id, organizationId: activeOrgId },
  });
  if (!task) throw new Error('Tarefa não encontrada.');

  const dbTask = await prisma.task.update({
    where: { id },
    data: {
      status: 'pending',
      archivedAt: null,
    },
    include: {
      client: true,
      assignedUser: true,
      notes: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      action: 'TASK_RESTORED',
      target: dbTask.id,
      organizationId: activeOrgId,
      userId: executorId,
    },
  });

  return mapDbTaskToTeamTask(dbTask);
}

export async function addTaskNote(taskId: string, content: string): Promise<TaskNote> {
  if (!isDatabaseDataMode) {
    throw new Error('Operação disponível apenas no modo database.');
  }

  const session = await getSession();
  if (!session || !session.session.activeOrganizationId) {
    throw new Error('Não autorizado.');
  }

  const activeOrgId = session.session.activeOrganizationId;
  const executorId = session.user.id;
  await validateTenantAccess(activeOrgId);
  await checkTasksFeature(activeOrgId);

  if (!content.trim()) {
    throw new Error('Observação não pode ser vazia.');
  }

  const task = await prisma.task.findFirst({
    where: { id: taskId, organizationId: activeOrgId },
  });
  if (!task) throw new Error('Tarefa não encontrada.');

  const dbNote = await prisma.taskNote.create({
    data: {
      organizationId: activeOrgId,
      taskId,
      authorUserId: executorId,
      authorName: session.user.name || 'Usuário',
      content: content.trim(),
    },
  });

  await prisma.auditLog.create({
    data: {
      action: 'TASK_NOTE_ADDED',
      target: taskId,
      organizationId: activeOrgId,
      userId: executorId,
    },
  });

  return {
    id: dbNote.id,
    authorName: dbNote.authorName,
    content: dbNote.content,
    createdAt: dbNote.createdAt.toISOString(),
  };
}

export async function getTaskNotes(taskId: string): Promise<TaskNote[]> {
  if (!isDatabaseDataMode) return [];

  const session = await getSession();
  if (!session || !session.session.activeOrganizationId) {
    throw new Error('Não autorizado.');
  }

  const activeOrgId = session.session.activeOrganizationId;
  await validateTenantAccess(activeOrgId);
  await checkTasksFeature(activeOrgId);

  const task = await prisma.task.findFirst({
    where: { id: taskId, organizationId: activeOrgId },
  });
  if (!task) throw new Error('Tarefa não encontrada.');

  const dbNotes = await prisma.taskNote.findMany({
    where: { taskId, organizationId: activeOrgId },
    orderBy: { createdAt: 'asc' },
  });

  return dbNotes.map((n) => ({
    id: n.id,
    authorName: n.authorName,
    content: n.content,
    createdAt: n.createdAt.toISOString(),
  }));
}

export async function getOrganizationMembers() {
  if (!isDatabaseDataMode) return [];

  const session = await getSession();
  if (!session || !session.session.activeOrganizationId) {
    throw new Error('Não autorizado.');
  }

  const activeOrgId = session.session.activeOrganizationId;
  await validateTenantAccess(activeOrgId);

  const members = await prisma.member.findMany({
    where: { organizationId: activeOrgId },
    include: {
      user: true,
    },
  });

  return members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    role: m.role,
  }));
}
