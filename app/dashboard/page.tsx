import { isDatabaseDataMode } from '../../lib/data-mode';
import { measureServerTiming } from '../../lib/performance';
import { getClients } from '../clientes/actions';
import { getTasks } from '../tarefas/actions';
import DashboardPageClient from './DashboardPageClient';

export default async function DashboardPage() {
  if (!isDatabaseDataMode) {
    return <DashboardPageClient initialClients={[]} initialTasks={[]} />;
  }

  const [clients, tasks] = await measureServerTiming('dashboard/data-total', () =>
    Promise.all([
      getClients(),
      getTasks(false, false),
    ]),
  );

  return <DashboardPageClient initialClients={clients} initialTasks={tasks} />;
}
