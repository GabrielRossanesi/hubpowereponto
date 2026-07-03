'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Check, AlertTriangle, CheckSquare, Clock, UserCheck, LayoutList, Calendar } from 'lucide-react';
import { useTenantStore } from '../../lib/store';
import TaskCalendar from '../../components/ui/task-calendar';
import { useMounted } from '../../hooks/useMounted';
import { PageHeader as UIHeader } from '../../components/ui/page-header';
import Button from '../../components/ui/button';
import Input from '../../components/ui/input';
import Textarea from '../../components/ui/textarea';
import Select from '../../components/ui/select';
import Modal from '../../components/ui/modal';
import Card, { CardContent } from '../../components/ui/card';
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import StatusBadge from '../../components/ui/status-badge';
import EmptyState from '../../components/ui/empty-state';
import DatePicker from '../../components/ui/date-picker';
import { TaskPriority, TaskStatus, TeamTask } from '../../types';
import { isDatabaseDataMode } from '../../lib/data-mode';
import { getClients } from '../clientes/actions';
import {
  getTasks,
  createTask,
  updateTask,
  completeTask,
  reopenTask,
  archiveTask,
  restoreTask,
  addTaskNote,
  getOrganizationMembers
} from './actions';

export default function TarefasPage() {
  const mounted = useMounted();
  const isDatabaseMode = isDatabaseDataMode;

  // Sandbox Store
  const sandboxStore = useTenantStore();

  // Database States
  const [dbTasks, setDbTasks] = useState<TeamTask[]>([]);
  const [dbClients, setDbClients] = useState<{ id: string; companyName: string }[]>([]);
  const [dbMembers, setDbMembers] = useState<{ id: string; name: string; role: string }[]>([]);
  const [isLoading, setIsLoading] = useState(isDatabaseMode);

  // Common UI States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [respFilter, setRespFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nv_hub_tasks_view');
      if (saved === 'list' || saved === 'calendar') {
        return saved;
      }
    }
    return 'list';
  });

  // Form States
  const [taskTitle, setTaskTitle] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [taskResp, setTaskResp] = useState('Ana Silva');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('medium');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskDesc, setTaskDesc] = useState('');

  const handleSetViewMode = (mode: 'list' | 'calendar') => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nv_hub_tasks_view', mode);
    }
  };

  // Load all tasks, active clients and members for database mode
  const loadAllData = useCallback(async () => {
    if (!isDatabaseMode) return;
    try {
      const [tasksFetched, clientsFetched, membersFetched] = await Promise.all([
        getTasks(true), // Fetch all tasks including archived for local tab filtering
        getClients(false), // Fetch active clients (excluding archived)
        getOrganizationMembers()
      ]);
      setDbTasks(tasksFetched);
      setDbClients(clientsFetched);
      setDbMembers(membersFetched);
    } catch (err) {
      console.error('Erro ao carregar dados de tarefas:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isDatabaseMode]);

  // Initial fetch using an inline helper to prevent ESLint warnings
  useEffect(() => {
    let active = true;
    if (isDatabaseMode) {
      const fetchInitial = async () => {
        try {
          const [tasksFetched, clientsFetched, membersFetched] = await Promise.all([
            getTasks(true),
            getClients(false),
            getOrganizationMembers()
          ]);
          if (active) {
            setDbTasks(tasksFetched);
            setDbClients(clientsFetched);
            setDbMembers(membersFetched);
            setIsLoading(false);
          }
        } catch (err) {
          console.error('Erro ao carregar tarefas inicialmente:', err);
          if (active) setIsLoading(false);
        }
      };
      fetchInitial();
    }
    return () => {
      active = false;
    };
  }, [isDatabaseMode]);

  if (!mounted || (isDatabaseMode && isLoading && dbTasks.length === 0)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
      </div>
    );
  }

  // Active models mapping based on mode
  const activeTasks = isDatabaseMode ? dbTasks : sandboxStore.tasks;
  const activeClients = isDatabaseMode ? dbClients : sandboxStore.clients;
  const activeTeamMembers = isDatabaseMode ? dbMembers : sandboxStore.teamMembers;

  // Filter tasks
  const filteredTasks = activeTasks.filter((t) => {
    const matchesSearch = 
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesStatus = statusFilter === 'all'
      ? t.status !== 'archived'
      : t.status === statusFilter;

    const matchesResp = respFilter === 'all' || t.responsibleUser === respFilter;
    
    return matchesSearch && matchesStatus && matchesResp;
  });

  // Handlers for Task Actions (Database & Sandbox unified)
  const handleUpdateTaskStatus = async (taskId: string, status: TaskStatus) => {
    if (isDatabaseMode) {
      setIsLoading(true);
      try {
        if (status === 'completed') {
          await completeTask(taskId);
        } else {
          const t = activeTasks.find(x => x.id === taskId);
          if (t && t.status === 'completed') {
            await reopenTask(taskId);
          }
          await updateTask(taskId, { status });
        }
        await loadAllData();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Erro ao atualizar tarefa.');
      } finally {
        setIsLoading(false);
      }
    } else {
      sandboxStore.updateTaskStatus(taskId, status);
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<TeamTask>) => {
    if (isDatabaseMode) {
      setIsLoading(true);
      try {
        await updateTask(taskId, {
          title: updates.title,
          description: updates.description,
          clientId: updates.clientId || undefined,
          responsibleUser: updates.responsibleUser || undefined,
          dueDate: updates.dueDate || undefined,
          priority: updates.priority,
          status: updates.status,
        });
        await loadAllData();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Erro ao salvar alterações da tarefa.');
      } finally {
        setIsLoading(false);
      }
    } else {
      sandboxStore.updateTask(taskId, updates);
    }
  };

  const handleArchiveTask = async (taskId: string) => {
    if (!window.confirm('Tem certeza que deseja arquivar esta tarefa?')) return;
    setIsLoading(true);
    try {
      await archiveTask(taskId);
      await loadAllData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao arquivar tarefa.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreTask = async (taskId: string) => {
    setIsLoading(true);
    try {
      await restoreTask(taskId);
      await loadAllData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao restaurar tarefa.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTaskNote = async (taskId: string, content: string) => {
    if (isDatabaseMode) {
      setIsLoading(true);
      try {
        await addTaskNote(taskId, content);
        await loadAllData();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Erro ao adicionar observação.');
      } finally {
        setIsLoading(false);
      }
    } else {
      sandboxStore.addTaskNote(taskId, content);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!taskTitle.trim() || !taskPriority) {
      alert('Preencha os campos obrigatórios.');
      return;
    }

    if (isDatabaseMode) {
      setIsLoading(true);
      try {
        await createTask({
          title: taskTitle,
          clientId: selectedClientId || undefined,
          responsibleUser: taskResp || undefined,
          dueDate: taskDueDate || undefined,
          priority: taskPriority,
          description: taskDesc || undefined,
          status: 'pending'
        });
        
        await loadAllData();
        
        // Reset states
        setTaskTitle('');
        setSelectedClientId('');
        setTaskResp('Ana Silva');
        setTaskPriority('medium');
        setTaskDueDate('');
        setTaskDesc('');
        setIsModalOpen(false);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Erro ao criar tarefa.');
      } finally {
        setIsLoading(false);
      }
    } else {
      const client = activeClients.find(c => c.id === selectedClientId);
      if (!taskTitle || !client || !taskDueDate) {
        alert('Preencha todos os campos obrigatórios no modo sandbox.');
        return;
      }
      
      const result = sandboxStore.addTask({
        title: taskTitle,
        clientId: client.id,
        clientName: client.companyName,
        responsibleUser: taskResp,
        dueDate: taskDueDate,
        status: 'pending',
        priority: taskPriority,
        description: taskDesc
      });

      if (!result) {
        alert('Limite do Plano Atingido! Faça o upgrade do seu plano nas Configurações para continuar.');
        return;
      }

      setTaskTitle('');
      setSelectedClientId('');
      setTaskResp('Ana Silva');
      setTaskPriority('medium');
      setTaskDueDate('');
      setTaskDesc('');
      setIsModalOpen(false);
    }
  };

  // Calculations
  const totalTasks = activeTasks.filter(t => t.status !== 'archived').length;
  const completedTasks = activeTasks.filter(t => t.status === 'completed').length;
  const percentCompleted = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const overdueTasks = activeTasks.filter(
    t => t.status === 'overdue' || 
    (t.status !== 'completed' && t.status !== 'archived' && t.status !== 'cancelled' && t.dueDate && new Date(t.dueDate) < new Date())
  ).length;

  // Leaderboard statistics mapping
  const teamStats = activeTeamMembers.map((m) => {
    const memberTasks = activeTasks.filter(t => t.responsibleUser === m.name && t.status !== 'archived');
    const completed = memberTasks.filter(t => t.status === 'completed').length;
    const total = memberTasks.length;
    return {
      name: m.name,
      role: m.role,
      completed,
      total,
      percent: total ? Math.round((completed / total) * 100) : 0
    };
  });

  const clientOptions = activeClients.map(c => ({ value: c.id, label: c.companyName }));
  const teamOptions = activeTeamMembers.map(m => ({ value: m.name, label: m.name }));
  
  const priorityOptions = [
    { value: 'low', label: 'Baixa' },
    { value: 'medium', label: 'Média' },
    { value: 'high', label: 'Alta' },
    { value: 'urgent', label: 'Urgente' }
  ];

  const statusFiltersList = isDatabaseMode
    ? ['all', 'pending', 'in_progress', 'in_review', 'completed', 'cancelled', 'archived']
    : ['all', 'pending', 'in_progress', 'completed'];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <UIHeader 
        title="Tarefas da Equipe" 
        description={isDatabaseMode ? "Acompanhe o cronograma operacional e colabore em tarefas reais salvas no PostgreSQL." : "Acompanhe o cronograma operacional, kanban de atividades e produtividade individual."}
        actions={
          <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Nova Tarefa
          </Button>
        }
      />

      {/* Metrics Row Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-4">
          <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0">
            <CheckSquare className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground block font-medium">Total de Tarefas</span>
            <strong className="text-xl font-bold text-foreground">{totalTasks}</strong>
          </div>
        </Card>
        
        <Card className="p-4 flex items-center gap-4">
          <div className="h-10 w-10 bg-success/10 rounded-full flex items-center justify-center text-success shrink-0">
            <Check className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground block font-medium">Concluídas</span>
            <strong className="text-xl font-bold text-foreground">{completedTasks}</strong>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4">
          <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground block font-medium">Progresso Geral</span>
            <strong className="text-xl font-bold text-foreground">{percentCompleted}%</strong>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4">
          <div className="h-10 w-10 bg-danger/10 rounded-full flex items-center justify-center text-danger shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground block font-medium">Atrasadas / Pendentes</span>
            <strong className="text-xl font-bold text-foreground">{overdueTasks}</strong>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Sidebar Leaders & Filter */}
        <div className="space-y-6 lg:col-span-1">
          {/* View Toggle */}
          <Card className="p-1.5 flex gap-1">
            <button
              onClick={() => handleSetViewMode('list')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                viewMode === 'list' 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutList className="h-3.5 w-3.5" /> Lista
            </button>
            <button
              onClick={() => handleSetViewMode('calendar')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                viewMode === 'calendar' 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" /> Calendário
            </button>
          </Card>

          {/* Responsible Filter */}
          <Card className="p-4 space-y-3">
            <h3 className="text-xs font-bold text-muted-foreground tracking-wider uppercase">Filtro por Equipe</h3>
            <div className="space-y-1">
              <button
                onClick={() => setRespFilter('all')}
                className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  respFilter === 'all' 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                }`}
              >
                Todos os Membros
              </button>
              {activeTeamMembers.map((m) => (
                <button
                  key={m.id || m.name}
                  onClick={() => setRespFilter(m.name)}
                  className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-between cursor-pointer ${
                    respFilter === m.name 
                      ? 'bg-primary/10 text-primary' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                  }`}
                >
                  <span>{m.name}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Team Leaderboard stats */}
          <Card className="p-4 space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground tracking-wider uppercase">Produtividade</h3>
            <div className="space-y-3">
              {teamStats.map((item) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-foreground">{item.name}</span>
                    <span className="text-muted-foreground">{item.completed}/{item.total}</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-500" 
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Tasks Container */}
        <div className="lg:col-span-3 space-y-4">
          {/* Filters Row */}
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-card p-4 rounded-xl border border-border/80 shadow-sm">
            {/* Search */}
            <div className="relative w-full md:w-72 flex items-center">
              <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar tarefa, cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 w-full pl-9 pr-3 rounded-lg border border-border bg-background text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary transition-all placeholder:text-muted-foreground/75"
              />
            </div>

            {/* Status Tabs */}
            <div className="flex gap-1 overflow-x-auto w-full md:w-auto">
              {statusFiltersList.map((statusKey) => (
                <button
                  key={statusKey}
                  onClick={() => setStatusFilter(statusKey)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer shrink-0 ${
                    statusFilter === statusKey
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-background text-muted-foreground border-border hover:text-foreground hover:bg-muted/10'
                  }`}
                >
                  {statusKey === 'all' && 'Todas'}
                  {statusKey === 'pending' && 'Pendentes'}
                  {statusKey === 'in_progress' && 'Em Andamento'}
                  {statusKey === 'in_review' && 'Em Revisão'}
                  {statusKey === 'completed' && 'Concluídas'}
                  {statusKey === 'cancelled' && 'Canceladas'}
                  {statusKey === 'archived' && 'Arquivadas'}
                </button>
              ))}
            </div>
          </div>

          {/* Tasks List or Calendar */}
          {viewMode === 'calendar' ? (
            <TaskCalendar 
              tasks={filteredTasks} 
              updateTaskStatus={handleUpdateTaskStatus} 
              clients={activeClients}
              teamMembers={activeTeamMembers}
              updateTask={handleUpdateTask}
              addTaskNote={handleAddTaskNote}
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                {filteredTasks.length === 0 ? (
                  <div className="p-12">
                    <EmptyState 
                      title="Nenhuma tarefa localizada" 
                      description="Não existem tarefas correspondentes à busca."
                      actionLabel="Criar Tarefa"
                      onAction={() => setIsModalOpen(true)}
                    />
                  </div>
                ) : (
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Título da Tarefa</TableHead>
                            <TableHead>Responsável</TableHead>
                            <TableHead>Prazo</TableHead>
                            <TableHead>Prioridade</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ação</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredTasks.map((task) => (
                            <TableRow key={task.id}>
                              <TableCell>
                                <div className="font-semibold text-foreground" title={task.description || task.title}>{task.title}</div>
                                <div className="text-xs text-primary font-medium mt-0.5">{task.clientName || 'Sem cliente'}</div>
                              </TableCell>
                              <TableCell className="text-xs text-foreground font-medium">{task.responsibleUser || 'Não atribuído'}</TableCell>
                              <TableCell className="text-xs text-muted-foreground py-4.5">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" /> 
                                  {task.dueDate ? new Date(task.dueDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Sem prazo'}
                                </div>
                              </TableCell>
                              <TableCell><StatusBadge type="priority" status={task.priority} /></TableCell>
                              <TableCell><StatusBadge type="task" status={task.status} /></TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1.5 items-center">
                                  {task.status !== 'completed' && task.status !== 'archived' && (
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={() => handleUpdateTaskStatus(task.id, 'completed')}
                                      className="h-8 text-xs gap-1 border-success/30 hover:bg-success/5 text-success-foreground"
                                    >
                                      <Check className="h-3.5 w-3.5 text-success" /> Concluir
                                    </Button>
                                  )}
                                  {task.status === 'completed' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleUpdateTaskStatus(task.id, 'pending')}
                                      className="h-8 text-xs gap-1 border-warning/30 hover:bg-warning/5 text-warning-foreground"
                                    >
                                      Reabrir
                                    </Button>
                                  )}
                                  {isDatabaseMode && (
                                    <>
                                      {task.status === 'archived' ? (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleRestoreTask(task.id)}
                                          className="h-8 text-xs gap-1 border-success/30 hover:bg-success/5 text-success-foreground"
                                        >
                                          Restaurar
                                        </Button>
                                      ) : (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleArchiveTask(task.id)}
                                          className="h-8 text-xs gap-1 border-danger/30 hover:bg-danger/5 text-danger-foreground"
                                        >
                                          Arquivar
                                        </Button>
                                      )}
                                    </>
                                  )}
                                  {!isDatabaseMode && task.status === 'completed' && (
                                    <span className="text-xs font-semibold text-success flex items-center gap-1 justify-end">
                                      <Check className="h-3.5 w-3.5" /> Concluída
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile Card List View */}
                    <div className="block md:hidden divide-y divide-border/40">
                      {filteredTasks.map((task) => (
                        <div key={task.id} className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-semibold text-foreground text-sm leading-snug">{task.title}</div>
                              <div className="text-[11px] text-primary font-medium mt-0.5">{task.clientName || 'Sem cliente'}</div>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <StatusBadge type="task" status={task.status} />
                              <StatusBadge type="priority" status={task.priority} />
                            </div>
                          </div>

                          {task.description && (
                            <p className="text-xs text-muted-foreground bg-muted/20 p-2.5 rounded-lg border border-border/40 leading-relaxed">
                              {task.description}
                            </p>
                          )}

                          <div className="flex items-center justify-between text-xs py-1.5 border-t border-border/10">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" /> {task.dueDate ? new Date(task.dueDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Sem prazo'}
                            </div>
                            <span className="font-medium text-foreground">Resp: {task.responsibleUser || 'N/A'}</span>
                          </div>

                          <div className="flex gap-2 pt-1">
                            {task.status !== 'completed' && task.status !== 'archived' && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleUpdateTaskStatus(task.id, 'completed')}
                                className="h-9 flex-1 justify-center text-xs gap-1.5 border-success/30 hover:bg-success/5 text-success-foreground"
                              >
                                <Check className="h-3.5 w-3.5 text-success" /> Concluir
                              </Button>
                            )}
                            {task.status === 'completed' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUpdateTaskStatus(task.id, 'pending')}
                                className="h-9 flex-1 justify-center text-xs gap-1.5 border-warning/30 hover:bg-warning/5 text-warning-foreground"
                              >
                                Reabrir
                              </Button>
                            )}
                            {isDatabaseMode && (
                              <>
                                {task.status === 'archived' ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRestoreTask(task.id)}
                                    className="h-9 px-3 border-success/30 text-success hover:bg-success/5"
                                  >
                                    Restaurar
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleArchiveTask(task.id)}
                                    className="h-9 px-3 border-danger/30 text-danger hover:bg-danger/5"
                                  >
                                    Arquivar
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Creation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Cadastrar Nova Tarefa"
        description={isDatabaseMode ? "Preencha os detalhes e atribua a um colaborador." : "Preencha os dados da tarefa para a equipe."}
      >
        <form onSubmit={handleCreateTask} className="space-y-4 pt-2">
          {(!isDatabaseMode && !sandboxStore.checkLimit('tasks')) && (
            <div className="p-3 bg-danger/10 border border-danger/20 text-danger text-xs font-semibold rounded-lg">
              Aviso: O limite de tarefas do seu plano foi atingido. Faça o upgrade nas Configurações para continuar.
            </div>
          )}
          <Input
            label="Título da Tarefa"
            type="text"
            placeholder="Ex: Agendar posts de lançamento de Junho"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            required
          />

          <Select
            label="Selecione o Cliente Vinculado"
            options={[
              ...(isDatabaseMode ? [{ value: '', label: 'Sem cliente (Opcional)' }] : []),
              ...clientOptions
            ]}
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            required={!isDatabaseMode}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Responsável na Equipe"
              options={teamOptions}
              value={taskResp}
              onChange={(e) => setTaskResp(e.target.value)}
            />
            <Select
              label="Prioridade"
              options={priorityOptions}
              value={taskPriority}
              onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
            />
          </div>

          <DatePicker
            label={isDatabaseMode ? "Prazo de Entrega (Opcional)" : "Prazo de Entrega"}
            value={taskDueDate}
            onChange={(e) => setTaskDueDate(e.target.value)}
            required={!isDatabaseMode}
          />

          <Textarea
            label="Descrição Detalhada / Instruções"
            placeholder="Forneça instruções adicionais sobre o que deve ser feito..."
            value={taskDesc}
            onChange={(e) => setTaskDesc(e.target.value)}
            rows={4}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-border/20">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Gravar Tarefa
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
