'use server';

import prisma from './prisma';
import { getSession, getOrResolveActiveOrganizationId } from './tenant';
import { isDatabaseDataMode } from './data-mode';
import type { Organization, OrganizationFeatures, PlanType, UserRole } from '../types';

export interface DatabaseTenantContext {
  organization: Organization;
  features: OrganizationFeatures;
  membershipRole: UserRole;
  platformRole?: string | null;
}

function getDefaultFeatures(planId: PlanType): Omit<OrganizationFeatures, 'organizationId'> {
  if (planId === 'starter') {
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
      financial: true,
    };
  }

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
    financial: true,
  };
}

export async function getCurrentDatabaseTenantContext(): Promise<DatabaseTenantContext | null> {
  if (!isDatabaseDataMode) return null;

  const session = await getSession();
  if (!session) return null;

  let preferredOrganizationId: string;
  try {
    preferredOrganizationId = await getOrResolveActiveOrganizationId(session);
  } catch (err) {
    console.error('Error resolving active organization in context:', err);
    return null;
  }

  const [membership, user] = await Promise.all([
    prisma.member.findFirst({
      where: {
        userId: session.user.id,
        organizationId: preferredOrganizationId,
      },
      include: {
        organization: {
          include: {
            features: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { platformRole: true },
    }),
  ]);

  if (!membership) {
    const isPlatformOperator = user?.platformRole === 'operator' || user?.platformRole === 'platform_admin';
    if (isPlatformOperator && preferredOrganizationId) {
      const org = await prisma.organization.findUnique({
        where: { id: preferredOrganizationId },
        include: { features: true },
      });

      if (org) {
        const planId = (org.planId || 'starter') as PlanType;
        const defaultFeatures = getDefaultFeatures(planId);

        return {
          organization: {
            id: org.id,
            name: org.name,
            cnpj: '',
            planId,
            status: org.isActive ? 'active' : 'suspended',
            logoUrl: org.logo || undefined,
            createdAt: org.createdAt.toISOString(),
          },
          features: {
            organizationId: org.id,
            leads: org.features?.leads ?? defaultFeatures.leads,
            clients: org.features?.clients ?? defaultFeatures.clients,
            proposals: org.features?.proposals ?? defaultFeatures.proposals,
            contracts: org.features?.contracts ?? defaultFeatures.contracts,
            charges: org.features?.charges ?? defaultFeatures.charges,
            onboarding: org.features?.onboarding ?? defaultFeatures.onboarding,
            publications: org.features?.publications ?? defaultFeatures.publications,
            tasks: org.features?.tasks ?? defaultFeatures.tasks,
            history: org.features?.history ?? defaultFeatures.history,
            integrations: defaultFeatures.integrations,
            team: org.features?.team ?? defaultFeatures.team,
            publicProposal: defaultFeatures.publicProposal,
            financial: org.features?.financial ?? defaultFeatures.financial,
          },
          membershipRole: 'owner',
          platformRole: user?.platformRole,
        };
      }
    }
    return null;
  }

  const org = membership.organization;
  const planId = (org.planId || 'starter') as PlanType;
  const defaultFeatures = getDefaultFeatures(planId);

  return {
    organization: {
      id: org.id,
      name: org.name,
      cnpj: '',
      planId,
      status: org.isActive ? 'active' : 'suspended',
      logoUrl: org.logo || undefined,
      createdAt: org.createdAt.toISOString(),
    },
    features: {
      organizationId: org.id,
      leads: org.features?.leads ?? defaultFeatures.leads,
      clients: org.features?.clients ?? defaultFeatures.clients,
      proposals: org.features?.proposals ?? defaultFeatures.proposals,
      contracts: org.features?.contracts ?? defaultFeatures.contracts,
      charges: org.features?.charges ?? defaultFeatures.charges,
      onboarding: org.features?.onboarding ?? defaultFeatures.onboarding,
      publications: org.features?.publications ?? defaultFeatures.publications,
      tasks: org.features?.tasks ?? defaultFeatures.tasks,
      history: org.features?.history ?? defaultFeatures.history,
      integrations: defaultFeatures.integrations,
      team: org.features?.team ?? defaultFeatures.team,
      publicProposal: defaultFeatures.publicProposal,
      financial: org.features?.financial ?? defaultFeatures.financial,
    },
    membershipRole: membership.role as UserRole,
    platformRole: user?.platformRole,
  };
}
