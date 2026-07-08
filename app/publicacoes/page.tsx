// Server Component: resolve o modo de dados e busca os dados iniciais no servidor
// (modo database) num único passo de render, eliminando o waterfall de fetch
// client-side que causava o delay de 1-2s e o flash de estado vazio.

import { isDatabaseDataMode } from '../../lib/data-mode';
import { getClients, getTenantMembers } from '../clientes/actions';
import { getRealPublications } from './actions';
import PublicacoesPageClient from './PublicacoesPageClient';
import PublicacoesSandboxClient from './PublicacoesSandboxClient';

export default async function PublicacoesPage() {
  if (!isDatabaseDataMode) {
    // Demo: dados vêm do store Zustand no cliente.
    return <PublicacoesSandboxClient />;
  }

  // Produção: uma única resolução de sessão/tenant (memoizada) alimenta as três
  // buscas em paralelo, entregues como props prontas ao componente cliente.
  const [clients, members, publications] = await Promise.all([
    getClients(false),
    getTenantMembers(),
    getRealPublications(),
  ]);

  return (
    <PublicacoesPageClient
      initialClients={clients}
      initialMembers={members}
      initialPublications={publications}
    />
  );
}
