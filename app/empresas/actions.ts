'use server';

import { getSession } from '../../lib/tenant';
import prisma from '../../lib/prisma';
import { hashPassword } from 'better-auth/crypto';

// Reusable server-side guard to check if the user is a platform operator
async function requireOperator() {
  const session = await getSession();
  
  if (!session) {
    throw new Error('Unauthorized: Session not found.');
  }

  // Query database directly to bypass any stale client-side session data
  const user = await prisma.user.findUnique({
    where: { id: session.user.id }
  });

  if (!user || (user.platformRole !== 'operator' && user.platformRole !== 'platform_admin')) {
    throw new Error('Unauthorized: Access denied.');
  }

  return { executorId: user.id, executorEmail: user.email };
}

/**
 * Returns access authorization states for the active platform operator.
 */
export async function getOperatorAccessState() {
  const session = await getSession();
  if (!session) {
    return { isOperator: false, platformRole: null };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (!user) {
      return { isOperator: false, platformRole: null };
    }

    const isOp = user.platformRole === 'operator' || user.platformRole === 'platform_admin';
    return {
      isOperator: isOp,
      platformRole: user.platformRole as 'operator' | 'platform_admin' | null
    };
  } catch (error) {
    console.error('Error in getOperatorAccessState:', error);
    return { isOperator: false, platformRole: null };
  }
}

/**
 * Queries and lists all organizations from the PostgreSQL database.
 */
export async function getRealOrganizations() {
  await requireOperator();

  try {
    const orgs = await prisma.organization.findMany({
      include: {
        features: true,
        members: {
          include: {
            user: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return orgs.map((org) => {
      // Map members into users structure expected by frontend
      const usersList = org.members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role as 'owner' | 'admin' | 'member' | 'viewer',
        status: 'active' as const, // standard state in real DB
        joinedAt: m.createdAt.toISOString()
      }));

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        cnpj: '',
        email: '',
        phone: '',
        segment: '',
        cityUf: '',
        responsibleName: '',
        responsibleEmail: '',
        planId: org.planId as 'starter' | 'pro' | 'enterprise',
        status: org.archivedAt ? ('archived' as const) : (org.isActive ? ('active' as const) : ('suspended' as const)),
        notes: '',
        createdAt: org.createdAt.toISOString(),
        logo: org.logo || undefined,
        users: usersList,
        features: org.features ? {
          leads: org.features.leads,
          clients: org.features.clients,
          proposals: org.features.proposals,
          contracts: org.features.contracts,
          charges: org.features.charges,
          onboarding: org.features.onboarding,
          publications: org.features.publications,
          tasks: org.features.tasks,
          history: org.features.history,
          team: org.features.team,
          financial: org.features.financial
        } : undefined
      };
    });
  } catch (error) {
    console.error('Error in getRealOrganizations:', error);
    throw new Error('Failed to retrieve organizations.');
  }
}

interface CreateOrgPayload {
  name: string;
  slug: string;
  planId: 'starter' | 'pro' | 'enterprise';
  isActive: boolean;
  features: {
    leads: boolean;
    clients: boolean;
    proposals: boolean;
    contracts: boolean;
    charges: boolean;
    onboarding: boolean;
    publications: boolean;
    tasks: boolean;
    history: boolean;
    team: boolean;
    financial: boolean;
  };
}

interface CreateUserPayload {
  name: string;
  email: string;
  passwordRaw: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
}

/**
 * Creates a new Organization, features mapping, User, and Member in a transaction.
 */
export async function createRealOrganization(
  orgPayload: CreateOrgPayload,
  userPayload: CreateUserPayload
) {
  const { executorId } = await requireOperator();

  try {
    // 1. Hash the temporary password using Better Auth crypto utility
    const hashedPassword = await hashPassword(userPayload.passwordRaw);

    // 2. Perform Prisma Transaction
    const result = await prisma.$transaction(async (tx) => {
      // Check slug uniqueness
      const existingOrg = await tx.organization.findUnique({
        where: { slug: orgPayload.slug }
      });
      if (existingOrg) {
        throw new Error(`O slug "${orgPayload.slug}" já está em uso.`);
      }

      // Check email uniqueness
      const existingUser = await tx.user.findUnique({
        where: { email: userPayload.email }
      });
      if (existingUser) {
        throw new Error(`O e-mail "${userPayload.email}" já está cadastrado.`);
      }

      // Create Organization
      const org = await tx.organization.create({
        data: {
          name: orgPayload.name,
          slug: orgPayload.slug,
          planId: orgPayload.planId,
          isActive: orgPayload.isActive,
          features: {
            create: {
              leads: orgPayload.features.leads,
              clients: orgPayload.features.clients,
              proposals: orgPayload.features.proposals,
              contracts: orgPayload.features.contracts,
              charges: orgPayload.features.charges,
              onboarding: orgPayload.features.onboarding,
              publications: orgPayload.features.publications,
              tasks: orgPayload.features.tasks,
              history: orgPayload.features.history,
              team: orgPayload.features.team,
              financial: orgPayload.features.financial
            }
          }
        }
      });

      // Create User
      const user = await tx.user.create({
        data: {
          name: userPayload.name,
          email: userPayload.email,
          emailVerified: true,
          accounts: {
            create: {
              providerId: 'credential',
              accountId: userPayload.email,
              password: hashedPassword
            }
          },
          memberships: {
            create: {
              organizationId: org.id,
              role: userPayload.role
            }
          }
        }
      });

      // Log to Audit Log
      await tx.auditLog.create({
        data: {
          action: 'ORGANIZATION_CREATED',
          target: org.id,
          organizationId: org.id,
          userId: executorId
        }
      });

      return { org, user };
    });

    return { success: true, orgId: result.org.id, userId: result.user.id };
  } catch (error) {
    console.error('Error in createRealOrganization:', error);
    const message = error instanceof Error ? error.message : 'Erro ao criar organização.';
    throw new Error(message);
  }
}

/**
 * Updates plan, status, and features config for an existing organization.
 */
export async function updateRealOrganization(
  orgId: string,
  orgPayload: Omit<CreateOrgPayload, 'features'>,
  featurePayload: CreateOrgPayload['features']
) {
  const { executorId } = await requireOperator();

  try {
    await prisma.$transaction(async (tx) => {
      // Update Org info
      await tx.organization.update({
        where: { id: orgId },
        data: {
          name: orgPayload.name,
          slug: orgPayload.slug,
          planId: orgPayload.planId,
          isActive: orgPayload.isActive
        }
      });

      // Update Features
      await tx.organizationFeature.update({
        where: { organizationId: orgId },
        data: {
          leads: featurePayload.leads,
          clients: featurePayload.clients,
          proposals: featurePayload.proposals,
          contracts: featurePayload.contracts,
          charges: featurePayload.charges,
          onboarding: featurePayload.onboarding,
          publications: featurePayload.publications,
          tasks: featurePayload.tasks,
          history: featurePayload.history,
          team: featurePayload.team,
          financial: featurePayload.financial
        }
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          action: 'ORGANIZATION_UPDATED',
          target: orgId,
          organizationId: orgId,
          userId: executorId
        }
      });
    });

    return { success: true };
  } catch (error) {
    console.error('Error in updateRealOrganization:', error);
    const message = error instanceof Error ? error.message : 'Erro ao atualizar organização.';
    throw new Error(message);
  }
}

/**
 * Resets a user password in the Database.
 */
export async function resetUserPasswordInDatabase(userId: string, passwordRaw: string) {
  const { executorId } = await requireOperator();

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { memberships: true }
    });

    if (!user) {
      throw new Error('Usuário não encontrado.');
    }

    const orgId = user.memberships[0]?.organizationId;
    if (!orgId) {
      throw new Error('Usuário não está vinculado a nenhuma organização.');
    }

    // 1. Hash the password
    const hashedPassword = await hashPassword(passwordRaw);

    // 2. Update or upsert the credentials Account record
    await prisma.account.updateMany({
      where: {
        userId,
        providerId: 'credential'
      },
      data: {
        password: hashedPassword
      }
    });

    // 3. Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'USER_PASSWORD_RESET',
        target: userId,
        organizationId: orgId,
        userId: executorId
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error in resetUserPasswordInDatabase:', error);
    const message = error instanceof Error ? error.message : 'Erro ao resetar senha.';
    throw new Error(message);
  }
}

/**
 * Archives a real organization (soft delete).
 */
export async function archiveRealOrganization(organizationId: string) {
  const { executorId } = await requireOperator();
  const session = await getSession();

  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!org) {
      throw new Error('Organização não encontrada.');
    }

    if (org.slug === 'nv-hub-admin') {
      throw new Error('Não é permitido arquivar a organização administrativa raiz da plataforma.');
    }

    if (session?.session?.activeOrganizationId === organizationId) {
      throw new Error('Não é permitido arquivar a organização na qual você está ativo no momento. Mude de organização ativa antes de arquivá-la.');
    }

    await prisma.$transaction(async (tx) => {
      await tx.organization.update({
        where: { id: organizationId },
        data: {
          isActive: false,
          archivedAt: new Date(),
          archivedBy: executorId
        }
      });

      await tx.auditLog.create({
        data: {
          action: 'ORGANIZATION_ARCHIVED',
          target: organizationId,
          organizationId: organizationId,
          userId: executorId
        }
      });
    });

    return { success: true };
  } catch (error) {
    console.error('Error in archiveRealOrganization:', error);
    const message = error instanceof Error ? error.message : 'Erro ao arquivar organização.';
    throw new Error(message);
  }
}

/**
 * Restores an archived organization.
 */
export async function restoreRealOrganization(organizationId: string) {
  const { executorId } = await requireOperator();

  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!org) {
      throw new Error('Organização não encontrada.');
    }

    await prisma.$transaction(async (tx) => {
      await tx.organization.update({
        where: { id: organizationId },
        data: {
          isActive: true,
          archivedAt: null,
          archivedBy: null
        }
      });

      await tx.auditLog.create({
        data: {
          action: 'ORGANIZATION_RESTORED',
          target: organizationId,
          organizationId: organizationId,
          userId: executorId
        }
      });
    });

    return { success: true };
  } catch (error) {
    console.error('Error in restoreRealOrganization:', error);
    const message = error instanceof Error ? error.message : 'Erro ao restaurar organização.';
    throw new Error(message);
  }
}

/**
 * Lists all users/members of an organization.
 */
export async function getOrganizationUsers(organizationId: string) {
  await requireOperator();

  try {
    const members = await prisma.member.findMany({
      where: { organizationId },
      include: {
        user: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    return members.map(m => ({
      memberId: m.id,
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role as 'owner' | 'admin' | 'member' | 'viewer',
      mustChangePassword: m.user.mustChangePassword,
      createdAt: m.createdAt.toISOString()
    }));
  } catch (error) {
    console.error('Error in getOrganizationUsers:', error);
    throw new Error('Erro ao buscar usuários da organização.');
  }
}

/**
 * Creates a new user or links an existing user to an organization.
 */
export async function createOrganizationUser(
  organizationId: string,
  data: {
    name: string;
    email: string;
    role: 'owner' | 'admin' | 'member' | 'viewer';
    passwordRaw: string;
    mustChange: boolean;
  }
) {
  const { executorId } = await requireOperator();

  try {
    // Basic validations
    if (!data.name.trim()) throw new Error('Nome é obrigatório.');
    if (!data.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      throw new Error('Formato de e-mail inválido.');
    }
    if (!data.passwordRaw || data.passwordRaw.length < 6) {
      throw new Error('A senha temporária deve conter no mínimo 6 caracteres.');
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId }
    });
    if (!org) throw new Error('Organização não encontrada.');
    if (org.archivedAt) throw new Error('A organização está arquivada e não permite novos usuários.');

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      // Check if already a member
      const existingMember = await prisma.member.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId: existingUser.id
          }
        }
      });

      if (existingMember) {
        throw new Error('Este usuário já pertence a esta empresa.');
      }

      // Link user as member
      await prisma.$transaction(async (tx) => {
        await tx.member.create({
          data: {
            organizationId,
            userId: existingUser.id,
            role: data.role
          }
        });

        await tx.auditLog.create({
          data: {
            action: 'ORGANIZATION_USER_CREATED',
            target: existingUser.id,
            organizationId,
            userId: executorId
          }
        });
      });

      return { success: true, userId: existingUser.id, linkedOnly: true };
    }

    // Create new user
    const hashedPassword = await hashPassword(data.passwordRaw);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          emailVerified: true,
          mustChangePassword: data.mustChange,
          accounts: {
            create: {
              providerId: 'credential',
              accountId: data.email,
              password: hashedPassword
            }
          },
          memberships: {
            create: {
              organizationId,
              role: data.role
            }
          }
        }
      });

      await tx.auditLog.create({
        data: {
          action: 'ORGANIZATION_USER_CREATED',
          target: user.id,
          organizationId,
          userId: executorId
        }
      });

      return user;
    });

    return { success: true, userId: result.id, linkedOnly: false };
  } catch (error) {
    console.error('Error in createOrganizationUser:', error);
    const message = error instanceof Error ? error.message : 'Erro ao criar usuário na organização.';
    throw new Error(message);
  }
}

/**
 * Updates a member's role inside the organization.
 */
export async function updateOrganizationUserRole(memberId: string, role: string) {
  const { executorId } = await requireOperator();

  try {
    const member = await prisma.member.findUnique({
      where: { id: memberId }
    });

    if (!member) throw new Error('Vínculo de membro não encontrado.');

    await prisma.$transaction(async (tx) => {
      await tx.member.update({
        where: { id: memberId },
        data: { role }
      });

      await tx.auditLog.create({
        data: {
          action: 'ORGANIZATION_USER_ROLE_UPDATED',
          target: member.userId,
          organizationId: member.organizationId,
          userId: executorId
        }
      });
    });

    return { success: true };
  } catch (error) {
    console.error('Error in updateOrganizationUserRole:', error);
    const message = error instanceof Error ? error.message : 'Erro ao atualizar papel do membro.';
    throw new Error(message);
  }
}

/**
 * Resets an organization user's password and optionally forces password change on next login.
 */
export async function resetOrganizationUserPassword(
  userId: string,
  passwordRaw: string,
  mustChange = true
) {
  const { executorId } = await requireOperator();

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { memberships: true }
    });

    if (!user) throw new Error('Usuário não encontrado.');
    const orgId = user.memberships[0]?.organizationId;
    if (!orgId) throw new Error('Usuário não possui vínculo com nenhuma organização.');

    if (!passwordRaw || passwordRaw.length < 6) {
      throw new Error('A nova senha deve conter no mínimo 6 caracteres.');
    }

    const hashedPassword = await hashPassword(passwordRaw);

    await prisma.$transaction(async (tx) => {
      // 1. Update account credentials
      await tx.account.updateMany({
        where: {
          userId,
          providerId: 'credential'
        },
        data: {
          password: hashedPassword
        }
      });

      // 2. Update user change password flag
      await tx.user.update({
        where: { id: userId },
        data: {
          mustChangePassword: mustChange,
          passwordChangedAt: null
        }
      });

      // 3. Log
      await tx.auditLog.create({
        data: {
          action: 'ORGANIZATION_USER_PASSWORD_RESET',
          target: userId,
          organizationId: orgId,
          userId: executorId
        }
      });
    });

    return { success: true };
  } catch (error) {
    console.error('Error in resetOrganizationUserPassword:', error);
    const message = error instanceof Error ? error.message : 'Erro ao resetar senha do usuário.';
    throw new Error(message);
  }
}

/**
 * Removes a member (link) from an organization.
 */
export async function removeOrganizationMember(memberId: string) {
  const { executorId } = await requireOperator();

  try {
    const member = await prisma.member.findUnique({
      where: { id: memberId }
    });

    if (!member) throw new Error('Membro não encontrado.');

    await prisma.$transaction(async (tx) => {
      await tx.member.delete({
        where: { id: memberId }
      });

      await tx.auditLog.create({
        data: {
          action: 'ORGANIZATION_USER_REMOVED',
          target: member.userId,
          organizationId: member.organizationId,
          userId: executorId
        }
      });
    });

    return { success: true };
  } catch (error) {
    console.error('Error in removeOrganizationMember:', error);
    const message = error instanceof Error ? error.message : 'Erro ao remover membro da organização.';
    throw new Error(message);
  }
}

/**
 * Sets the activeOrganizationId in the operator session record.
 */
export async function setOperatorActiveOrganization(organizationId: string) {
  await requireOperator();
  const session = await getSession();

  if (!session) {
    throw new Error('Sessão não encontrada.');
  }

  try {
    await prisma.session.update({
      where: { id: session.session.id },
      data: { activeOrganizationId: organizationId }
    });

    return { success: true };
  } catch (error) {
    console.error('Error in setOperatorActiveOrganization:', error);
    const message = error instanceof Error ? error.message : 'Erro ao alternar organização ativa do operador.';
    throw new Error(message);
  }
}
