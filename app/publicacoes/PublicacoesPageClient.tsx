'use client';

// Wrapper de modo DATABASE. NÃO importa o store Zustand — evita hidratação/
// localStorage desnecessários em produção. Os dados iniciais chegam prontos do
// Server Component (page.tsx), então não há fetch client-side no mount nem
// flash de "Nenhuma publicação encontrada".

import PublicacoesView, { PublicationFormPayload } from './PublicacoesView';
import {
  createRealPublication,
  updatePublicationAction,
  archivePublication,
  restorePublication,
  regeneratePublicationApprovalLinkAction,
} from './actions';
import type { Client, Publication } from '../../types';

interface PublicacoesPageClientProps {
  initialClients: Client[];
  initialMembers: { name: string }[];
  initialPublications: Publication[];
}

export default function PublicacoesPageClient({
  initialClients,
  initialMembers,
  initialPublications,
}: PublicacoesPageClientProps) {
  return (
    <PublicacoesView
      initialPublications={initialPublications}
      clients={initialClients}
      members={initialMembers}
      onCreate={(payload: PublicationFormPayload) => createRealPublication(payload)}
      onUpdate={(id: string, payload: PublicationFormPayload) => updatePublicationAction(id, payload)}
      onArchive={(id: string) => archivePublication(id)}
      onRestore={(id: string) => restorePublication(id)}
      onRegenerateLink={(id: string) => regeneratePublicationApprovalLinkAction(id)}
    />
  );
}
