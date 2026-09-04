import { cache } from 'react';
import { headers } from 'next/headers';
import prisma from './prisma';
import { auth } from './auth';
import { isDatabaseDataMode } from './data-mode';
import { measureServerTiming } from './performance';

// Structure of returned session from helpers
export interface TenantSession {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    platformRole?: string | null;
  };
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
    activeOrganizationId?: string | null;
  };
}

export interface TenantMembership {
  id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  organizationId: string;
  userId: string;
  /**
   * true quando o acesso NÃO veio de um Member real, mas do bypass de operador
   * de plataforma (simulação). Callers de telas de tenant devem tratar isso como
   * "operador simulando" — nunca como membership genuína — e marcar o AuditLog.
   */
  viaOperatorBypass?: boolean;
}

const isDatabaseMode = isDatabaseDataMode;

/**
 * Gets the active session from Better Auth (or a mock session in sandbox mode).
 */
export const getSession = cache(async (): Promise<TenantSession | null> => {
  if (!isDatabaseMode) {
    // Sandbox mode mock session (Operator by default to allow demo navigations)
    return {
      user: {
        id: 'user_sandbox_id',
        name: 'Ana Silva',
        email: 'ana.silva@powerponto.com.br',
        platformRole: 'operator', // Allows access to /empresas in sandbox demo
      },
      session: {
        id: 'session_sandbox_id',
        userId: 'user_sandbox_id',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        activeOrganizationId: 'org_hub_power', // Mock org
      },
    };
  }

  try {
    const sessionData = await measureServerTiming('auth/session', async () =>
      auth.api.getSession({
        headers: await headers(),
      }),
    );

    if (!sessionData) return null;

    const tenantSession: TenantSession = {
      user: {
        id: sessionData.user.id,
        name: sessionData.user.name,
        email: sessionData.user.email,
        image: sessionData.user.image,
        platformRole: (sessionData.user as Record<string, unknown>).platformRole as string | null,
      },
      session: {
        id: sessionData.session.id,
        userId: sessionData.session.userId,
        expiresAt: sessionData.session.expiresAt,
        activeOrganizationId: (sessionData.session as Record<string, unknown>).activeOrganizationId as string | null,
      },
    };

    try {
      await getOrResolveActiveOrganizationId(tenantSession);
    } catch (err) {
      console.warn('Could not auto-resolve active organization for session:', err instanceof Error ? err.message : err);
    }

    return tenantSession;
  } catch (error) {
    console.error('Error fetching Better Auth session:', error);
    return null;
  }
});

/**
 * Validates that the logged-in user belongs to the requested organization.
 * Throws an error or returns membership if successful.
 */
export const validateTenantAccess = cache(async (organizationId: string): Promise<TenantMembership> => {
  const session = await getSession();
  
  if (!session) {
    throw new Error('Unauthorized: Session not found.');
  }

  if (!isDatabaseMode) {
    // Sandbox mode bypass
    return {
      id: 'membership_sandbox_id',
      role: 'owner',
      organizationId,
      userId: session.user.id,
    };
  }

  // Database validation
  const member = await prisma.member.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId: session.user.id,
      },
    },
    select: {
      id: true,
      role: true,
      organizationId: true,
      userId: true,
      organization: {
        select: { isActive: true, archivedAt: true },
      },
    },
  });

  if (!member) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { platformRole: true },
    });

    const isPlatformOperator = user?.platformRole === 'operator' || user?.platformRole === 'platform_admin';
    if (!isPlatformOperator) {
      throw new Error('Forbidden: User is not a member of this organization.');
    }

    // Operador de plataforma acessando um tenant do qual NÃO é membro: simulação.
    // Marcado com viaOperatorBypass para o AuditLog distinguir de ação de membro real.
    return {
      id: 'membership_operator_bypass_id',
      role: 'owner',
      organizationId,
      userId: session.user.id,
      viaOperatorBypass: true,
    };
  }

  if (member.organization.archivedAt) {
    throw new Error('Sua organização está arquivada. Entre em contato com o suporte.');
  }

  if (!member.organization.isActive) {
    throw new Error('Sua organização está suspensa. Entre em contato com o suporte.');
  }

  return {
    id: member.id,
    role: member.role as TenantMembership['role'],
    organizationId: member.organizationId,
    userId: member.userId,
  };
});

export const isOperator = cache(async (): Promise<boolean> => {
  const session = await getSession();
  if (!session) return false;

  if (!isDatabaseMode) return true; // operator in sandbox mode

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { platformRole: true },
  });

  return user?.platformRole === 'operator' || user?.platformRole === 'platform_admin';
});

/**
 * Valida acesso de OPERADOR DE PLATAFORMA (painel /empresas e afins).
 *
 * Use este helper — e não `validateTenantAccess` — quando a ação é legitimamente
 * cross-tenant (administração da plataforma). Assim o bypass de operador fica
 * restrito ao seu lugar próprio e as telas normais de tenant não dependem dele.
 * Lança erro se a sessão não for de um operador/platform_admin.
 */
export const validatePlatformOperatorAccess = cache(async (): Promise<TenantSession> => {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized: Session not found.');
  }

  if (!isDatabaseMode) {
    // Sandbox: operador por padrão (demo).
    return session;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { platformRole: true },
  });

  const isPlatformOperator = user?.platformRole === 'operator' || user?.platformRole === 'platform_admin';
  if (!isPlatformOperator) {
    throw new Error('Forbidden: Ação restrita a operadores da plataforma.');
  }

  return session;
});

/**
 * Resolves the active organization ID for the user's session, setting it automatically if missing.
 * Memoizado por request (chave = objeto de sessão, estável via getSession cacheado),
 * evitando repetir as queries de resolução Vercel -> Railway na mesma renderização.
 */
export const getOrResolveActiveOrganizationId = cache(async (session: TenantSession): Promise<string> => {
  if (!isDatabaseMode) {
    return 'org_hub_power';
  }

  const userId = session.user.id;
  const currentActiveId = session.session.activeOrganizationId;

  // 1. If we already have an active org ID in the session, verify if it's still valid (not archived)
  if (currentActiveId) {
    const org = await measureServerTiming('organization/active-validation', () =>
      prisma.organization.findUnique({
        where: { id: currentActiveId },
        select: { id: true, isActive: true, archivedAt: true },
      }),
    );

    if (org && !org.archivedAt) {
      if (!org.isActive) {
        throw new Error('Sua organização está suspensa. Entre em contato com o suporte.');
      }
      return org.id;
    }
  }

  // 2. If it's missing or invalid/archived, find the first active, non-archived membership
  const memberships = await measureServerTiming('organization/membership-resolution', () =>
    prisma.member.findMany({
      where: {
        userId,
        organization: {
          archivedAt: null,
        },
      },
      select: {
        organizationId: true,
        organization: {
          select: { isActive: true },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    }),
  );

  // Filter out any suspended ones if we can, but if they are all suspended we will throw the suspended error
  const activeMemberships = memberships.filter(m => m.organization.isActive);
  
  if (activeMemberships.length > 0) {
    const resolvedOrgId = activeMemberships[0].organizationId;

    // Persist in session
    await prisma.session.update({
      where: { id: session.session.id },
      data: { activeOrganizationId: resolvedOrgId },
    });

    // Mutate the session object in-memory so the caller gets the updated value
    session.session.activeOrganizationId = resolvedOrgId;
    return resolvedOrgId;
  }

  // If we only have suspended memberships
  if (memberships.length > 0) {
    throw new Error('Sua organização está suspensa. Entre em contato com o suporte.');
  }

  // If no membership at all, check if user is operator
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { platformRole: true },
  });

  const isOperatorUser = user?.platformRole === 'operator' || user?.platformRole === 'platform_admin';
  if (isOperatorUser) {
    // For operators, if they don't have an active organization, we can default to the admin org
    const adminOrg = await prisma.organization.findFirst({
      where: { slug: 'nv-hub-admin', archivedAt: null },
      select: { id: true },
    });
    if (adminOrg) {
      await prisma.session.update({
        where: { id: session.session.id },
        data: { activeOrganizationId: adminOrg.id },
      });
      session.session.activeOrganizationId = adminOrg.id;
      return adminOrg.id;
    }
  }

  throw new Error('Usuário não está vinculado a nenhuma organização ativa.');
});

/**
 * Resolves the active organization ID from the session, auto-setting it if missing.
 * Throws an Error if no valid active organization is found.
 * Memoizado por request: chamadas sem argumento (caso comum nas actions) colapsam
 * numa única resolução; a resolução em si também é memoizada pela sessão.
 */
export const getActiveOrganizationId = cache(async (providedSession?: TenantSession | null): Promise<string> => {
  if (!isDatabaseMode) {
    return 'org_hub_power';
  }

  const session = providedSession || (await getSession());
  if (!session) {
    throw new Error('Não autorizado: Sessão não encontrada.');
  }

  return getOrResolveActiveOrganizationId(session);
});
