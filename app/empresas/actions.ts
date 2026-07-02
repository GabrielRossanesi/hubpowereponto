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
        status: org.isActive ? ('active' as const) : ('suspended' as const),
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
