'use client';

// Wrapper de modo SANDBOX (demo). Só é renderizado quando o modo de dados é
// explicitamente 'sandbox' — o Server Component em page.tsx nunca importa este
// arquivo em produção, então o store Zustand/localStorage não é carregado no
// bundle de produção.

import { useStore, useTenantStore } from '../../lib/store';
import PublicacoesView, {
  PublicationFormPayload,
  PublicationActionResult,
} from './PublicacoesView';
import type { Publication } from '../../types';

export default function PublicacoesSandboxClient() {
  const {
    publications,
    clients,
    teamMembers,
    addPublication,
    updatePublication,
    regeneratePublicationApprovalLink,
  } = useTenantStore();

  const onCreate = async (payload: PublicationFormPayload): Promise<PublicationActionResult> => {
    const created = addPublication({
      clientId: payload.clientId,
      clientName: payload.clientName,
      companyName: payload.companyName,
      imageUrl: payload.imageUrl,
      images: payload.images,
      postType: payload.postType as 'single_image' | 'carousel',
      caption: payload.caption,
      scheduledDate: payload.scheduledDate,
      status: 'pending_approval',
      approvalLink: '',
      responsibleUser: payload.responsibleUser,
      platform: (payload.platform || 'instagram') as Publication['platform'],
      channels: payload.channels,
      imageSource: (payload.imageSource || 'external_url') as Publication['imageSource'],
      imageFileName: payload.imageFileName,
      imageSize: payload.imageSize,
      imageMimeType: payload.imageMimeType,
    });
    return { success: true, data: created };
  };

  const onUpdate = async (id: string, payload: PublicationFormPayload): Promise<PublicationActionResult> => {
    updatePublication(id, {
      clientId: payload.clientId,
      clientName: payload.clientName,
      companyName: payload.companyName,
      imageUrl: payload.imageUrl,
      images: payload.images,
      postType: payload.postType as 'single_image' | 'carousel',
      caption: payload.caption,
      scheduledDate: payload.scheduledDate,
      responsibleUser: payload.responsibleUser,
      platform: (payload.platform || 'instagram') as Publication['platform'],
      channels: payload.channels,
      imageSource: (payload.imageSource || 'external_url') as Publication['imageSource'],
      imageFileName: payload.imageFileName,
      imageSize: payload.imageSize,
      imageMimeType: payload.imageMimeType,
    });
    const updated = useStore.getState().publications.find((p: Publication) => p.id === id);
    return { success: true, data: updated };
  };

  const onArchive = async (id: string) => {
    updatePublication(id, {
      status: 'archived',
      archivedAt: new Date().toISOString(),
      archivedBy: 'system_operator',
    });
    return { success: true };
  };

  const onRestore = async (id: string) => {
    updatePublication(id, {
      status: 'pending_approval',
      archivedAt: undefined,
      archivedBy: undefined,
    });
    return { success: true };
  };

  const onRegenerateLink = async (id: string): Promise<PublicationActionResult> => {
    regeneratePublicationApprovalLink(id);
    const updated = useStore.getState().publications.find((p: Publication) => p.id === id);
    return { success: true, data: updated };
  };

  return (
    <PublicacoesView
      initialPublications={publications}
      clients={clients}
      members={teamMembers}
      onCreate={onCreate}
      onUpdate={onUpdate}
      onArchive={onArchive}
      onRestore={onRestore}
      onRegenerateLink={onRegenerateLink}
    />
  );
}
