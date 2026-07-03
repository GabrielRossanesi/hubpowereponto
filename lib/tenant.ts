import { headers } from 'next/headers';
import prisma from './prisma';
import { auth } from './auth';
import { isDatabaseDataMode } from './data-mode';

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
}

const isDatabaseMode = isDatabaseDataMode;

/**
 * Gets the active session from Better Auth (or a mock session in sandbox mode).
 */
export async function getSession(): Promise<TenantSession | null> {
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
    const sessionData = await auth.api.getSession({
      headers: await headers(),
    });

    if (!sessionData) return null;

    return {
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
  } catch (error) {
    console.error('Error fetching Better Auth session:', error);
    return null;
  }
}

/**
 * Validates that the logged-in user belongs to the requested organization.
 * Throws an error or returns membership if successful.
 */
export async function validateTenantAccess(organizationId: string): Promise<TenantMembership> {
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
  });

  if (!member) {
    throw new Error('Forbidden: User is not a member of this organization.');
  }

  return {
    id: member.id,
    role: member.role as TenantMembership['role'],
    organizationId: member.organizationId,
    userId: member.userId,
  };
}

export async function isOperator(): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;

  if (!isDatabaseMode) return true; // operator in sandbox mode

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { platformRole: true },
  });

  return user?.platformRole === 'operator' || user?.platformRole === 'platform_admin';
}
