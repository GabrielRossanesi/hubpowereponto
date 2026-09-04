'use server';

import prisma from '../../lib/prisma';
import { getActiveOrganizationId, validateTenantAccess, getSession } from '../../lib/tenant';
import { isDatabaseDataMode } from '../../lib/data-mode';
import { checkRateLimit, getClientIp } from '../../lib/rate-limit';
import crypto from 'crypto';
import type { Publication, PublicApprovalPublication } from '../../types';
import { Publication as PrismaPublication } from '@prisma/client';
import { measureServerTiming } from '../../lib/performance';
import { getCurrentDatabaseTenantContext } from '../../lib/tenant-context-actions';

// Colunas seguras para servir na rota pública de aprovação (sem login).
// Mantém a lista explícita para nunca vazar organizationId, clientId,
// clientName, responsibleUser, metadados de arquivo, archivedBy, etc.
const PUBLIC_APPROVAL_SELECT = {
  id: true,
  companyName: true,
  caption: true,
  scheduledDate: true,
  status: true,
  approvalToken: true,
  clientComments: true,
  platform: true,
  postType: true,
  images: true,
  imageUrl: true,
  channels: true,
  archivedAt: true,
  createdAt: true,
} as const;

type PublicApprovalRow = Pick<
  PrismaPublication,
  'id' | 'companyName' | 'caption' | 'scheduledDate' | 'status' | 'approvalToken'
  | 'clientComments' | 'platform' | 'postType' | 'images' | 'imageUrl' | 'channels'
  | 'archivedAt' | 'createdAt'
>;

function parseJsonStringArray(value: PrismaPublication['images']): string[] {
  if (!value) return [];
  try {
    if (typeof value === 'string') return JSON.parse(value) as string[];
    if (Array.isArray(value)) return value as string[];
  } catch (e) {
    console.error('Error parsing JSON array:', e);
  }
  return [];
}

function computeApprovalExpiry(dbPub: Pick<PrismaPublication, 'approvalToken' | 'createdAt'>): string {
  let expiresAt = new Date(new Date(dbPub.createdAt).getTime() + 24 * 60 * 60 * 1000).toISOString();
  if (dbPub.approvalToken && dbPub.approvalToken.startsWith('approval_')) {
    const parts = dbPub.approvalToken.split('_');
    if (parts.length >= 2) {
      const rawPart = parts[1];
      let timestamp = parseInt(rawPart, 36);
      const minTimestamp = 1577836800000; // 2020-01-01
      const maxTimestamp = 4102444800000; // 2100-01-01
      if (isNaN(timestamp) || timestamp < minTimestamp || timestamp > maxTimestamp) {
        timestamp = parseInt(rawPart, 10);
      }
      if (!isNaN(timestamp) && timestamp >= minTimestamp && timestamp <= maxTimestamp) {
        expiresAt = new Date(timestamp + 24 * 60 * 60 * 1000).toISOString();
      }
    }
  }
  return expiresAt;
}

// Mapeia uma linha (com colunas restritas) para o DTO público. Só recebe o que
// já foi selecionado com PUBLIC_APPROVAL_SELECT, então não há risco de vazar
// campos internos por engano.
function mapRowToPublicApproval(dbPub: PublicApprovalRow): PublicApprovalPublication {
  let imagesArr = parseJsonStringArray(dbPub.images);
  if (imagesArr.length === 0 && dbPub.imageUrl) {
    imagesArr = [dbPub.imageUrl];
  }

  let channelsArr = parseJsonStringArray(dbPub.channels);
  if (channelsArr.length === 0 && dbPub.platform) {
    channelsArr = [dbPub.platform];
  }

  return {
    id: dbPub.id,
    companyName: dbPub.companyName || '',
    caption: dbPub.caption || '',
    scheduledDate: dbPub.scheduledDate || '',
    status: (dbPub.status || 'pending_approval') as PublicApprovalPublication['status'],
    approvalToken: dbPub.approvalToken,
    approvalLink: `/a/${dbPub.approvalToken}`,
    approvalLinkStatus: dbPub.status === 'approved'
      ? 'approved'
      : (dbPub.status === 'changes_requested' ? 'changes_requested' : 'active'),
    approvalLinkExpiresAt: computeApprovalExpiry(dbPub),
    clientComments: dbPub.clientComments || undefined,
    platform: (dbPub.platform || 'instagram') as PublicApprovalPublication['platform'],
    postType: (dbPub.postType || 'single_image') as 'single_image' | 'carousel',
    images: imagesArr,
    imageUrl: dbPub.imageUrl || '',
    channels: channelsArr,
    archivedAt: dbPub.archivedAt ? dbPub.archivedAt.toISOString() : undefined,
  };
}

// Prefixa a ação de auditoria quando ela foi executada por um operador de
// plataforma simulando o tenant (bypass), para não se confundir com ação de
// um membro real da organização.
function auditAction(base: string, membership?: { viaOperatorBypass?: boolean }): string {
  return membership?.viaOperatorBypass ? `[SIMULACAO_OPERADOR] ${base}` : base;
}

// Resolve um userId (FK obrigatória do AuditLog) para ancorar uma ação vinda do
// LINK PÚBLICO (cliente externo, sem conta). Prioriza o responsável real da
// publicação; só cai para o primeiro membro se não resolver. A ação em si é
// sempre marcada como externa (ver PUBLIC_APPROVAL_* abaixo), então nunca fica
// atribuída silenciosamente a um membro arbitrário como se fosse ele o autor.
// NOTA: o ideal a longo prazo é userId nullable + um usuário "system" dedicado
// (exige migration); ver task.md.
async function resolvePublicAuditUserId(organizationId: string, responsibleUser?: string | null): Promise<string | null> {
  if (responsibleUser) {
    const responsible = await prisma.user.findFirst({
      where: { name: responsibleUser, memberships: { some: { organizationId } } },
      select: { id: true },
    });
    if (responsible) return responsible.id;
  }
  const firstMember = await prisma.member.findFirst({
    where: { organizationId },
    select: { userId: true },
  });
  return firstMember?.userId ?? null;
}

function generateShortToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let randomCode = '';
  const bytes = crypto.randomBytes(12);
  for (let i = 0; i < 12; i++) {
    randomCode += chars[bytes[i] % chars.length];
  }
  return `approval_${Date.now().toString(36)}_${randomCode}`;
}

// Helper to map DB Publication to frontend Publication shape
function mapDbPubToPub(dbPub: PrismaPublication): Publication {
  let imagesArr: string[] = [];
  if (dbPub.images) {
    try {
      if (typeof dbPub.images === 'string') {
        imagesArr = JSON.parse(dbPub.images);
      } else if (Array.isArray(dbPub.images)) {
        imagesArr = dbPub.images as string[];
      }
    } catch (e) {
      console.error('Error parsing images JSON:', e);
    }
  }
  if (imagesArr.length === 0 && dbPub.imageUrl) {
    imagesArr = [dbPub.imageUrl];
  }

  let channelsArr: string[] = [];
  if (dbPub.channels) {
    try {
      if (typeof dbPub.channels === 'string') {
        channelsArr = JSON.parse(dbPub.channels);
      } else if (Array.isArray(dbPub.channels)) {
        channelsArr = dbPub.channels as string[];
      }
    } catch (e) {
      console.error('Error parsing channels JSON:', e);
    }
  }
  // Fallback to platform if channels is empty
  if (channelsArr.length === 0 && dbPub.platform) {
    channelsArr = [dbPub.platform];
  }

  const approvalLink = `/a/${dbPub.approvalToken}`;

  // Consider it expired after 24h
  let expiresAt = new Date(new Date(dbPub.createdAt).getTime() + 24 * 60 * 60 * 1000).toISOString();

  // Try to parse the creation timestamp encoded in the token (format: approval_TIMESTAMP_RANDOM)
  if (dbPub.approvalToken && dbPub.approvalToken.startsWith('approval_')) {
    const parts = dbPub.approvalToken.split('_');
    if (parts.length >= 2) {
      const rawPart = parts[1];
      let timestamp = parseInt(rawPart, 36);
      
      const minTimestamp = 1577836800000; // 2020-01-01
      const maxTimestamp = 4102444800000; // 2100-01-01
      
      if (isNaN(timestamp) || timestamp < minTimestamp || timestamp > maxTimestamp) {
        // Fallback to base10 (old format)
        timestamp = parseInt(rawPart, 10);
      }

      if (!isNaN(timestamp) && timestamp >= minTimestamp && timestamp <= maxTimestamp) {
        expiresAt = new Date(timestamp + 24 * 60 * 60 * 1000).toISOString();
      }
    }
  }

  return {
    id: dbPub.id,
    organizationId: dbPub.organizationId,
    clientId: dbPub.clientId || '',
    clientName: dbPub.clientName || '',
    companyName: dbPub.companyName || '',
    imageUrl: dbPub.imageUrl || '',
    images: imagesArr,
    postType: (dbPub.postType || 'single_image') as 'single_image' | 'carousel',
    caption: dbPub.caption || '',
    scheduledDate: dbPub.scheduledDate || '',
    status: (dbPub.status || 'pending_approval') as 'pending_approval' | 'approved' | 'changes_requested' | 'archived',
    approvalToken: dbPub.approvalToken,
    approvalLink,
    approvalLinkStatus: dbPub.status === 'approved' ? 'approved' : (dbPub.status === 'changes_requested' ? 'changes_requested' : 'active'),
    approvalLinkExpiresAt: expiresAt,
    clientComments: dbPub.clientComments || undefined,
    responsibleUser: dbPub.responsibleUser || '',
    platform: (dbPub.platform || 'instagram') as 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'google_business' | 'other',
    imageSource: (dbPub.imageSource || 'external_url') as 'upload' | 'external_url',
    imageFileName: dbPub.imageFileName || undefined,
    imageSize: dbPub.imageSize || undefined,
    imageMimeType: dbPub.imageMimeType || undefined,
    createdAt: dbPub.createdAt.toISOString(),
    archivedAt: dbPub.archivedAt ? dbPub.archivedAt.toISOString() : undefined,
    archivedBy: dbPub.archivedBy || undefined,
    channels: channelsArr,
  };
}

export async function getRealPublications(): Promise<Publication[]> {
  if (!isDatabaseDataMode) return [];

  try {
    const tenantContext = await getCurrentDatabaseTenantContext();
    if (!tenantContext) throw new Error('Unauthorized tenant context.');
    if (tenantContext.features.publications === false) {
      throw new Error('Publications module is disabled for this organization.');
    }
    const activeOrgId = tenantContext.organization.id;

    const dbPubs = await measureServerTiming('publications/query', () =>
      prisma.publication.findMany({
        where: {
          organizationId: activeOrgId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    );

    return dbPubs.map(mapDbPubToPub);
  } catch (err) {
    console.error('Error fetching real publications:', err);
    return [];
  }
}

export async function createRealPublication(data: {
  clientId: string;
  clientName: string;
  companyName: string;
  imageUrl: string;
  images: string[];
  postType: string;
  caption: string;
  scheduledDate: string;
  responsibleUser: string;
  platform: string;
  channels: string[];
  imageSource?: string;
  imageFileName?: string;
  imageSize?: number;
  imageMimeType?: string;
}): Promise<{ success: boolean; data?: Publication; error?: string }> {
  if (!isDatabaseDataMode) {
    return { success: false, error: 'Database mode not active.' };
  }

  try {
    const activeOrgId = await getActiveOrganizationId();
    const membership = await validateTenantAccess(activeOrgId);

    const token = generateShortToken();

    const firstPlatform = data.platform || (data.channels && data.channels.length > 0 ? data.channels[0] : 'instagram');
    const finalChannels = data.channels && data.channels.length > 0 ? data.channels : [firstPlatform];

    const dbPub = await prisma.publication.create({
      data: {
        organizationId: activeOrgId,
        clientId: data.clientId,
        clientName: data.clientName,
        companyName: data.companyName,
        imageUrl: data.imageUrl,
        images: data.images, // JSON array
        postType: data.postType,
        caption: data.caption,
        scheduledDate: data.scheduledDate,
        status: 'pending_approval',
        approvalToken: token,
        responsibleUser: data.responsibleUser,
        platform: firstPlatform,
        channels: finalChannels,
        imageSource: data.imageSource || 'external_url',
        imageFileName: data.imageFileName,
        imageSize: data.imageSize,
        imageMimeType: data.imageMimeType,
      },
    });

    // Write audit log
    const session = await getSession();
    const userId = session?.user?.id || '';
    if (userId) {
      await prisma.auditLog.create({
        data: {
          organizationId: activeOrgId,
          action: auditAction(`PUBLICATION_CREATED: ${data.companyName} (${data.platform})`, membership),
          userId: userId,
          target: dbPub.id,
        },
      });
    }

    return { success: true, data: mapDbPubToPub(dbPub) };
  } catch (err: unknown) {
    console.error('Error creating real publication:', err);
    const errMsg = err instanceof Error ? err.message : 'Erro ao criar publicação.';
    return { success: false, error: errMsg };
  }
}

export async function getPublicationByApprovalToken(token: string): Promise<PublicApprovalPublication | null> {
  // Rota pública, sem sessão: gate é exclusivamente o token não-adivinhável.
  if (!token) return null;

  // Rate limit por IP: alto o bastante para não atrapalhar reload/countdown do
  // cliente legítimo, mas corta varredura automatizada. Excedido -> null (some).
  const ip = await getClientIp();
  const readLimit = checkRateLimit(`pub_read:${ip}`, 60, 60_000);
  if (!readLimit.allowed) {
    console.warn(`Rate limit exceeded (public read) for ip=${ip}`);
    return null;
  }

  try {
    const dbPub = await prisma.publication.findUnique({
      where: {
        approvalToken: token,
      },
      // select explícito -> só campos seguros chegam ao browser do cliente externo.
      select: PUBLIC_APPROVAL_SELECT,
    });

    if (!dbPub) return null;
    return mapRowToPublicApproval(dbPub);
  } catch (err) {
    console.error('Error fetching public publication by token:', err);
    return null;
  }
}

export async function approvePublicationByTokenAction(token: string): Promise<{ success: boolean; error?: string }> {
  // Rate limit mais estrito nas mutações públicas.
  const ip = await getClientIp();
  const limit = checkRateLimit(`pub_mutate:${ip}`, 10, 60_000);
  if (!limit.allowed) {
    return { success: false, error: `Muitas tentativas. Aguarde ${limit.retryAfterSec}s e tente novamente.` };
  }

  try {
    const dbPub = await prisma.publication.findUnique({
      where: {
        approvalToken: token,
      },
    });

    if (!dbPub) {
      return { success: false, error: 'Publicação não encontrada.' };
    }

    await prisma.publication.update({
      where: {
        approvalToken: token,
      },
      data: {
        status: 'approved',
      },
    });

    // Write audit log — ação do CLIENTE EXTERNO via link público de aprovação.
    const auditUserId = await resolvePublicAuditUserId(dbPub.organizationId, dbPub.responsibleUser);
    if (auditUserId) {
      await prisma.auditLog.create({
        data: {
          organizationId: dbPub.organizationId,
          action: `[CLIENTE_EXTERNO/LINK_PUBLICO] PUBLICATION_APPROVED: ${dbPub.companyName}`,
          userId: auditUserId,
          target: dbPub.id,
        },
      });
    }

    return { success: true };
  } catch (err: unknown) {
    console.error('Error approving publication:', err);
    const errMsg = err instanceof Error ? err.message : 'Erro ao aprovar publicação.';
    return { success: false, error: errMsg };
  }
}

export async function requestPublicationChangesByTokenAction(token: string, feedback: string): Promise<{ success: boolean; error?: string }> {
  // Rate limit mais estrito nas mutações públicas.
  const ip = await getClientIp();
  const limit = checkRateLimit(`pub_mutate:${ip}`, 10, 60_000);
  if (!limit.allowed) {
    return { success: false, error: `Muitas tentativas. Aguarde ${limit.retryAfterSec}s e tente novamente.` };
  }

  try {
    const dbPub = await prisma.publication.findUnique({
      where: {
        approvalToken: token,
      },
    });

    if (!dbPub) {
      return { success: false, error: 'Publicação não encontrada.' };
    }

    await prisma.publication.update({
      where: {
        approvalToken: token,
      },
      data: {
        status: 'changes_requested',
        clientComments: feedback,
      },
    });

    // Write audit log — ação do CLIENTE EXTERNO via link público de aprovação.
    const auditUserId = await resolvePublicAuditUserId(dbPub.organizationId, dbPub.responsibleUser);
    if (auditUserId) {
      await prisma.auditLog.create({
        data: {
          organizationId: dbPub.organizationId,
          action: `[CLIENTE_EXTERNO/LINK_PUBLICO] PUBLICATION_CHANGES_REQUESTED: ${feedback.substring(0, 100)}`,
          userId: auditUserId,
          target: dbPub.id,
        },
      });
    }

    return { success: true };
  } catch (err: unknown) {
    console.error('Error requesting changes:', err);
    const errMsg = err instanceof Error ? err.message : 'Erro ao registrar alterações.';
    return { success: false, error: errMsg };
  }
}

export async function archivePublication(publicationId: string): Promise<{ success: boolean; error?: string }> {
  if (!isDatabaseDataMode) {
    return { success: false, error: 'Database mode not active.' };
  }

  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Não autorizado: Sessão não encontrada.' };
    }

    const activeOrgId = await getActiveOrganizationId(session);
    const membership = await validateTenantAccess(activeOrgId);

    const dbPub = await prisma.publication.findUnique({
      where: { id: publicationId }
    });

    if (!dbPub) {
      return { success: false, error: 'Publicação não encontrada.' };
    }

    if (dbPub.organizationId !== activeOrgId) {
      return { success: false, error: 'Não autorizado: Publicação pertence a outro inquilino.' };
    }

    await prisma.publication.update({
      where: { id: publicationId },
      data: {
        status: 'archived',
        archivedAt: new Date(),
        archivedBy: session.user.id
      }
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        organizationId: activeOrgId,
        action: auditAction(`PUBLICATION_ARCHIVED: ${dbPub.companyName}`, membership),
        userId: session.user.id,
        target: dbPub.id
      }
    });

    return { success: true };
  } catch (err: unknown) {
    console.error('Error archiving publication:', err);
    const errMsg = err instanceof Error ? err.message : 'Erro ao arquivar publicação.';
    return { success: false, error: errMsg };
  }
}

export async function restorePublication(publicationId: string): Promise<{ success: boolean; error?: string }> {
  if (!isDatabaseDataMode) {
    return { success: false, error: 'Database mode not active.' };
  }

  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Não autorizado: Sessão não encontrada.' };
    }

    const activeOrgId = await getActiveOrganizationId(session);
    const membership = await validateTenantAccess(activeOrgId);

    const dbPub = await prisma.publication.findUnique({
      where: { id: publicationId }
    });

    if (!dbPub) {
      return { success: false, error: 'Publicação não encontrada.' };
    }

    if (dbPub.organizationId !== activeOrgId) {
      return { success: false, error: 'Não autorizado: Publicação pertence a outro inquilino.' };
    }

    await prisma.publication.update({
      where: { id: publicationId },
      data: {
        status: 'pending_approval',
        archivedAt: null,
        archivedBy: null
      }
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        organizationId: activeOrgId,
        action: auditAction(`PUBLICATION_RESTORED: ${dbPub.companyName}`, membership),
        userId: session.user.id,
        target: dbPub.id
      }
    });

    return { success: true };
  } catch (err: unknown) {
    console.error('Error restoring publication:', err);
    const errMsg = err instanceof Error ? err.message : 'Erro ao restaurar publicação.';
    return { success: false, error: errMsg };
  }
}

export async function updatePublicationAction(
  publicationId: string,
  data: {
    clientId: string;
    clientName: string;
    companyName: string;
    imageUrl: string;
    images: string[];
    postType: string;
    caption: string;
    scheduledDate: string;
    responsibleUser: string;
    platform: string;
    channels: string[];
    imageSource?: string;
    imageFileName?: string;
    imageSize?: number;
    imageMimeType?: string;
  }
): Promise<{ success: boolean; data?: Publication; error?: string }> {
  if (!isDatabaseDataMode) {
    return { success: false, error: 'Database mode not active.' };
  }

  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Não autorizado: Sessão não encontrada.' };
    }

    const activeOrgId = await getActiveOrganizationId(session);
    const membership = await validateTenantAccess(activeOrgId);

    const dbPub = await prisma.publication.findUnique({
      where: { id: publicationId }
    });

    if (!dbPub) {
      return { success: false, error: 'Publicação não encontrada.' };
    }

    if (dbPub.organizationId !== activeOrgId) {
      return { success: false, error: 'Não autorizado: Publicação pertence a outro inquilino.' };
    }

    // Validate that the clientId (if changed) belongs to the organization
    const client = await prisma.client.findFirst({
      where: { id: data.clientId, organizationId: activeOrgId }
    });
    if (!client) {
      return { success: false, error: 'Não autorizado: Cliente não pertence a este inquilino.' };
    }

    const firstPlatform = data.platform || (data.channels && data.channels.length > 0 ? data.channels[0] : 'instagram');
    const finalChannels = data.channels && data.channels.length > 0 ? data.channels : [firstPlatform];

    // Determine status reset behavior
    let statusUpdate = dbPub.status;
    let commentsUpdate = dbPub.clientComments;

    if (dbPub.status === 'approved' || dbPub.status === 'changes_requested') {
      statusUpdate = 'pending_approval';
      commentsUpdate = null;
    }

    const updatedDbPub = await prisma.publication.update({
      where: { id: publicationId },
      data: {
        clientId: data.clientId,
        clientName: data.clientName,
        companyName: data.companyName,
        imageUrl: data.imageUrl,
        images: data.images,
        postType: data.postType,
        caption: data.caption,
        scheduledDate: data.scheduledDate,
        responsibleUser: data.responsibleUser,
        platform: firstPlatform,
        channels: finalChannels,
        status: statusUpdate,
        clientComments: commentsUpdate,
        imageSource: data.imageSource || 'external_url',
        imageFileName: data.imageFileName,
        imageSize: data.imageSize,
        imageMimeType: data.imageMimeType,
      }
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        organizationId: activeOrgId,
        action: auditAction(`PUBLICATION_UPDATED: ${data.companyName}`, membership),
        userId: session.user.id,
        target: updatedDbPub.id
      }
    });

    return { success: true, data: mapDbPubToPub(updatedDbPub) };
  } catch (err: unknown) {
    console.error('Error updating publication:', err);
    const errMsg = err instanceof Error ? err.message : 'Erro ao atualizar publicação.';
    return { success: false, error: errMsg };
  }
}

export async function regeneratePublicationApprovalLinkAction(
  publicationId: string
): Promise<{ success: boolean; data?: Publication; error?: string }> {
  if (!isDatabaseDataMode) {
    return { success: false, error: 'Database mode not active.' };
  }

  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Não autorizado: Sessão não encontrada.' };
    }

    const activeOrgId = await getActiveOrganizationId(session);
    const membership = await validateTenantAccess(activeOrgId);

    const dbPub = await prisma.publication.findUnique({
      where: { id: publicationId }
    });

    if (!dbPub) {
      return { success: false, error: 'Publicação não encontrada.' };
    }

    if (dbPub.organizationId !== activeOrgId) {
      return { success: false, error: 'Não autorizado: Publicação pertence a outro inquilino.' };
    }

    const token = generateShortToken();

    const updatedDbPub = await prisma.publication.update({
      where: { id: publicationId },
      data: {
        approvalToken: token,
      }
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        organizationId: activeOrgId,
        action: auditAction(`PUBLICATION_APPROVAL_LINK_REGENERATED: ${updatedDbPub.companyName}`, membership),
        userId: session.user.id,
        target: updatedDbPub.id
      }
    });

    return { success: true, data: mapDbPubToPub(updatedDbPub) };
  } catch (err: unknown) {
    console.error('Error regenerating publication approval link:', err);
    const errMsg = err instanceof Error ? err.message : 'Erro ao regenerar link.';
    return { success: false, error: errMsg };
  }
}

