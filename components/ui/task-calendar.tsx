'use client';

import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  User, 
  Check, 
  AlertTriangle,
  Calendar as CalendarIcon,
  Briefcase
} from 'lucide-react';
import { TeamTask, TaskPriority, TaskStatus } from '../../types';
import { useTenantStore } from '../../lib/store';
import Modal from './modal';
import Button from './button';
import StatusBadge from './status-badge';
import Input from './input';
import Textarea from './textarea';
import Select from './select';
import DatePicker from './date-picker';

interface TaskCalendarProps {
  tasks: TeamTask[];
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  clients?: { id: string; companyName: string }[];
  teamMembers?: { id: string; name: string }[];
  updateTask?: (taskId: string, updates: Partial<TeamTask>) => void;
  addTaskNote?: (taskId: string, content: string) => void;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEKDAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function TaskCalendar(props: TaskCalendarProps) {
  const { tasks } = props;
  // Store actions & data
  const store = useTenantStore();
  const clients = props.clients || store.clients;
  const teamMembers = props.teamMembers || store.teamMembers;
  const updateTask = props.updateTask || store.updateTask;
  const addTaskNote = props.addTaskNote || store.addTaskNote;
  const updateTaskStatus = props.updateTaskStatus || store.updateTaskStatus;

  // Navigation states
  const [currentDate, setCurrentDate] = useState(() => new Date());
  
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Main Modal State
  const [isMainModalOpen, setIsMainModalOpen] = useState(false);
  const [modalView, setModalView] = useState<'day-tasks' | 'task-detail' | 'task-edit'>('day-tasks');
  const [activeDateStr, setActiveDateStr] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  // Notes state
  const [noteContent, setNoteContent] = useState('');

  // Edit Form States
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editClientId, setEditClientId] = useState('');
  const [editResponsible, setEditResponsible] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editPriority, setEditPriority] = useState<TaskPriority>('medium');
  const [editStatus, setEditStatus] = useState<TaskStatus>('pending');

  // Helper to format date to YYYY-MM-DD local string
  const getLocalDateString = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const r = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${r}`;
  };

  const todayStr = useMemo(() => getLocalDateString(new Date()), []);

  // Find active selected task details dynamically from tasks list to stay reactive
  const activeTask = useMemo(() => {
    if (!activeTaskId) return null;
    return tasks.find(t => t.id === activeTaskId) || null;
  }, [activeTaskId, tasks]);

  // Tasks for selected day (respects filters since 'tasks' prop is already filtered)
  const dayTasks = useMemo(() => {
    if (!activeDateStr) return [];
    return tasks.filter(t => t.dueDate.split('T')[0] === activeDateStr);
  }, [activeDateStr, tasks]);

  // Navigate to previous month
  const prevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  // Navigate to next month
  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  // Navigate to today
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Generate grid days for the current month view (6 weeks = 42 days)
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sunday, 1 = Monday
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days: Array<{
      date: Date;
      isCurrentMonth: boolean;
      isToday: boolean;
      dayNumber: number;
      dateString: string;
    }> = [];

    // Prev month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const date = new Date(currentYear, currentMonth - 1, dayNum);
      const dateString = getLocalDateString(date);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: dateString === todayStr,
        dayNumber: dayNum,
        dateString,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentYear, currentMonth, i);
      const dateString = getLocalDateString(date);
      days.push({
        date,
        isCurrentMonth: true,
        isToday: dateString === todayStr,
        dayNumber: i,
        dateString,
      });
    }

    // Next month padding days to make it exactly 42 cells (6 rows)
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      const date = new Date(currentYear, currentMonth + 1, i);
      const dateString = getLocalDateString(date);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: dateString === todayStr,
        dayNumber: i,
        dateString,
      });
    }

    return days;
  }, [currentMonth, currentYear, todayStr]);

  // Group tasks by dueDate
  const tasksByDate = useMemo(() => {
    const groups: Record<string, TeamTask[]> = {};
    tasks.forEach(task => {
      const dateStr = task.dueDate.split('T')[0];
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(task);
    });
    return groups;
  }, [tasks]);

  // Tasks belonging strictly to the currently viewed month (for mobile view)
  const mobileFilteredTasks = useMemo(() => {
    return tasks
      .filter(task => {
        const taskDate = new Date(task.dueDate);
        return taskDate.getMonth() === currentMonth && taskDate.getFullYear() === currentYear;
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [tasks, currentMonth, currentYear]);

  // Group mobile tasks by date
  const mobileGroupedTasks = useMemo(() => {
    const groups: Array<{ dateString: string; date: Date; items: TeamTask[] }> = [];
    mobileFilteredTasks.forEach(task => {
      const dateStr = task.dueDate.split('T')[0];
      const existing = groups.find(g => g.dateString === dateStr);
      if (existing) {
        existing.items.push(task);
      } else {
        groups.push({
          dateString: dateStr,
          date: new Date(task.dueDate),
          items: [task]
        });
      }
    });
    return groups;
  }, [mobileFilteredTasks]);

  // Initials generator
  const getInitials = (name: string) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Helper to format pt-BR date readable string
  const formatFriendlyDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-');
      const date = new Date(Number(y), Number(m) - 1, Number(d));
      const daysOfWeek = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
      return `${date.getDate()} de ${MONTH_NAMES[date.getMonth()]} (${daysOfWeek[date.getDay()]})`;
    } catch {
      return dateStr;
    }
  };

  // Styling helper for task cards inside grid
  const getTaskStyle = (task: TeamTask) => {
    const isCompleted = task.status === 'completed';
    const isOverdue = !isCompleted && (task.status === 'overdue' || new Date(task.dueDate) < new Date(new Date().setHours(0,0,0,0)));

    if (isCompleted) {
      return 'border-l-4 border-success bg-success/5 text-success-foreground/75 opacity-75 line-through decoration-success/30';
    }
    if (isOverdue) {
      return 'border-l-4 border-danger bg-danger/5 text-foreground hover:bg-danger/10';
    }
    
    switch (task.priority) {
      case 'urgent':
        return 'border-l-4 border-danger bg-danger/5 text-foreground hover:bg-danger/10';
      case 'high':
        return 'border-l-4 border-warning bg-warning/5 text-foreground hover:bg-warning/10';
      case 'medium':
        return 'border-l-4 border-info bg-info/5 text-foreground hover:bg-info/10';
      case 'low':
      default:
        return 'border-l-4 border-secondary text-muted-foreground hover:bg-muted/10';
    }
  };

  const handleOpenDayModal = (e: React.MouseEvent, dateStr: string) => {
    e.stopPropagation();
    setActiveDateStr(dateStr);
    setModalView('day-tasks');
    setIsMainModalOpen(true);
  };

  const handleOpenTaskDetails = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setActiveDateStr(task.dueDate.split('T')[0]);
    }
    setActiveTaskId(taskId);
    setModalView('task-detail');
    setIsMainModalOpen(true);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim() || !activeTaskId) return;
    addTaskNote(activeTaskId, noteContent.trim());
    setNoteContent('');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTaskId || !editTitle.trim() || !editClientId || !editDueDate) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }

    const client = clients.find(c => c.id === editClientId);
    if (!client) return;

    updateTask(activeTaskId, {
      title: editTitle.trim(),
      clientId: editClientId,
      clientName: client.companyName,
      responsibleUser: editResponsible,
      dueDate: editDueDate,
      priority: editPriority,
      status: editStatus,
      description: editDesc.trim()
    });

    setModalView('task-detail');
  };

  return (
    <div className="space-y-4">
      {/* Calendar Navigation Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border/80 shadow-sm">
        <div className="flex items-center gap-1.5">
          <CalendarIcon className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold text-foreground tracking-tight select-none">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={goToToday}
            className="text-xs h-8 border-border/60 hover:bg-muted/40"
          >
            Hoje
          </Button>
          <div className="flex items-center rounded-lg border border-border/60 overflow-hidden bg-background">
            <button 
              onClick={prevMonth}
              className="p-2 hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors cursor-pointer border-r border-border/60"
              title="Mês anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button 
              onClick={nextMonth}
              className="p-2 hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Próximo mês"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Monthly Grid View */}
      <div className="hidden md:block bg-card rounded-xl border border-border/80 shadow-sm overflow-hidden">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-border/80 bg-muted/20">
          {WEEKDAY_NAMES.map(day => (
            <div 
              key={day} 
              className="py-2.5 text-center text-xs font-semibold text-muted-foreground tracking-wider uppercase select-none"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days Cells Grid */}
        <div className="grid grid-cols-7 auto-rows-[120px] divide-x divide-y divide-border/60">
          {calendarDays.map((day, idx) => {
            const dayTasks = tasksByDate[day.dateString] || [];
            const hasMoreTasks = dayTasks.length > 2;
            const visibleTasks = dayTasks.slice(0, 2);

            return (
              <div 
                key={`${day.dateString}-${idx}`}
                onClick={(e) => handleOpenDayModal(e, day.dateString)}
                className={`p-1.5 flex flex-col justify-between transition-colors group relative cursor-pointer hover:bg-muted/5 ${
                  day.isCurrentMonth ? 'bg-card' : 'bg-muted/10'
                } ${day.isToday ? 'bg-primary/[0.02]' : ''}`}
              >
                {/* Day Number Row */}
                <div className="flex justify-between items-center mb-1">
                  <span 
                    className={`text-xs font-bold flex items-center justify-center h-6 w-6 rounded-full transition-colors select-none ${
                      day.isToday 
                        ? 'bg-primary text-primary-foreground shadow-sm' 
                        : day.isCurrentMonth 
                          ? 'text-foreground/90' 
                          : 'text-muted-foreground/50'
                    }`}
                  >
                    {day.dayNumber}
                  </span>
                  
                  {dayTasks.length > 0 && (
                    <span className="text-[10px] text-muted-foreground font-semibold px-1 bg-muted/40 rounded border border-border/20 group-hover:bg-muted/60 transition-colors">
                      {dayTasks.length} {dayTasks.length === 1 ? 'tarefa' : 'tarefas'}
                    </span>
                  )}
                </div>

                {/* Day Tasks List */}
                <div className="flex-1 flex flex-col gap-1 overflow-y-hidden justify-start">
                  {visibleTasks.map(task => {
                    return (
                      <button
                        key={task.id}
                        onClick={(e) => handleOpenTaskDetails(e, task.id)}
                        className={`w-full text-left p-1 rounded text-[10px] leading-snug font-medium transition-all flex items-center justify-between gap-1 shadow-sm border border-border/30 hover:border-primary/40 cursor-pointer ${getTaskStyle(task)}`}
                      >
                        <span className="truncate flex-1 font-semibold" title={task.title}>
                          {task.title}
                        </span>
                        <span 
                          className="shrink-0 text-[8px] px-1 py-0.5 rounded bg-foreground/5 text-muted-foreground font-bold"
                          title={`Responsável: ${task.responsibleUser}`}
                        >
                          {getInitials(task.responsibleUser)}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Plus More indicator */}
                {hasMoreTasks && (
                  <div
                    className="w-full text-center mt-1 text-[9px] font-bold text-primary hover:text-primary/80 transition-colors py-0.5 bg-primary/5 hover:bg-primary/10 rounded border border-primary/10"
                  >
                    + {dayTasks.length - 2} mais
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tablet & Mobile Agenda View (Grouped by Date) */}
      <div className="block md:hidden bg-card rounded-xl border border-border/80 shadow-sm overflow-hidden p-4">
        {mobileGroupedTasks.length === 0 ? (
          <div className="py-12 text-center">
            <CalendarIcon className="mx-auto h-8 w-8 text-muted-foreground/50 mb-3" />
            <p className="text-xs text-muted-foreground font-medium">
              Nenhuma tarefa localizada neste mês.
            </p>
            <p className="text-[10px] text-muted-foreground/70 mt-1">
              Use os botões no topo para navegar ou alterne para a visualização em Lista.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {mobileGroupedTasks.map(group => {
              const isGroupToday = group.dateString === todayStr;

              return (
                <div key={group.dateString} className="space-y-2">
                  {/* Sticky/Section Date Header */}
                  <div 
                    onClick={(e) => handleOpenDayModal(e, group.dateString)}
                    className="flex items-center justify-between border-b border-border/40 pb-1.5 sticky top-0 bg-card z-10 cursor-pointer hover:text-primary transition-colors group/header"
                  >
                    <span className={`text-xs font-bold group-hover/header:underline ${isGroupToday ? 'text-primary' : 'text-foreground'}`}>
                      {formatFriendlyDate(group.dateString)}
                    </span>
                    {isGroupToday ? (
                      <span className="text-[9px] bg-primary/15 text-primary border border-primary/20 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        Hoje
                      </span>
                    ) : (
                      <span className="text-[9px] text-muted-foreground font-medium bg-muted/40 rounded border border-border/20 px-1 hover:bg-muted/60 transition-colors">
                        Ver dia
                      </span>
                    )}
                  </div>

                  {/* Tasks in Date Group */}
                  <div className="space-y-2">
                    {group.items.map(task => {
                      const isCompleted = task.status === 'completed';
                      const isOverdue = !isCompleted && (task.status === 'overdue' || new Date(task.dueDate) < new Date(new Date().setHours(0,0,0,0)));

                      return (
                        <div
                          key={task.id}
                          onClick={(e) => handleOpenTaskDetails(e, task.id)}
                          className={`p-3 rounded-lg border border-border/60 hover:border-primary/40 transition-colors shadow-sm flex flex-col gap-2.5 active:scale-[0.99] cursor-pointer ${
                            isCompleted ? 'bg-success/[0.02]' : isOverdue ? 'bg-danger/[0.02]' : 'bg-muted/10'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h4 className={`text-xs font-bold leading-snug text-foreground ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                                {task.title}
                              </h4>
                              <p className="text-[10px] text-primary font-semibold mt-0.5 flex items-center gap-1">
                                <Briefcase className="h-3 w-3" /> {task.clientName}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <StatusBadge type="priority" status={task.priority} />
                              <StatusBadge type="task" status={task.status} />
                            </div>
                          </div>

                          {task.description && (
                            <p className="text-[11px] text-muted-foreground bg-muted/20 p-2 rounded border border-border/30 line-clamp-2">
                              {task.description}
                            </p>
                          )}

                          <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-border/10">
                            <span className="text-muted-foreground font-medium flex items-center gap-1">
                              <User className="h-3 w-3" /> {task.responsibleUser}
                            </span>
                            {isOverdue && (
                              <span className="text-danger font-bold flex items-center gap-1">
                                <AlertTriangle className="h-3.5 w-3.5" /> Atrasada
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Unified Modal representing the flow: Day Tasks -> Detail -> Edit */}
      <Modal
        isOpen={isMainModalOpen}
        onClose={() => {
          setIsMainModalOpen(false);
          setActiveTaskId(null);
          setActiveDateStr(null);
        }}
        title={
          modalView === 'day-tasks'
            ? activeDateStr ? `Tarefas: ${formatFriendlyDate(activeDateStr)}` : 'Tarefas do dia'
            : modalView === 'task-detail'
              ? 'Detalhes da Tarefa'
              : 'Editar Tarefa'
        }
        description={
          modalView === 'day-tasks'
            ? 'Lista completa de atividades para esta data.'
            : modalView === 'task-detail'
              ? 'Visualização completa de informações operacionais.'
              : 'Altere os campos da tarefa abaixo.'
        }
        size="md"
      >
        {/* Navigation Breadcrumb */}
        {modalView !== 'day-tasks' && activeDateStr && (
          <button
            type="button"
            onClick={() => {
              if (modalView === 'task-edit') {
                setModalView('task-detail');
              } else {
                setModalView('day-tasks');
              }
            }}
            className="mb-4 text-xs font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1 cursor-pointer select-none"
          >
            <ChevronLeft className="h-4 w-4" /> 
            {modalView === 'task-edit' ? 'Voltar para detalhes' : 'Voltar para a lista do dia'}
          </button>
        )}

        {/* View 1: Day's Tasks List */}
        {modalView === 'day-tasks' && (
          <div className="space-y-3 pt-1">
            {dayTasks.length === 0 ? (
              <div className="py-8 text-center bg-muted/10 rounded-lg border border-dashed border-border/60">
                <Clock className="mx-auto h-6 w-6 text-muted-foreground/45 mb-2" />
                <p className="text-xs text-muted-foreground font-medium">Nenhuma tarefa para este dia.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1 modal-scrollbar">
                {dayTasks.map(task => {
                  const isCompleted = task.status === 'completed';
                  const isOverdue = !isCompleted && (task.status === 'overdue' || new Date(task.dueDate) < new Date(new Date().setHours(0,0,0,0)));

                  return (
                    <div 
                      key={task.id}
                      onClick={() => {
                        setActiveTaskId(task.id);
                        setModalView('task-detail');
                      }}
                      className="p-3 rounded-lg border border-border bg-muted/10 hover:border-primary/40 hover:bg-muted/20 transition-all flex items-center justify-between gap-4 cursor-pointer"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <h4 className={`text-xs font-bold truncate text-foreground ${isCompleted ? 'line-through text-muted-foreground/70' : ''}`}>
                          {task.title}
                        </h4>
                        <div className="flex items-center gap-2 flex-wrap text-[10px]">
                          <span className="text-primary font-semibold flex items-center gap-0.5">
                            <Briefcase className="h-3 w-3" /> {task.clientName}
                          </span>
                          <span className="text-muted-foreground flex items-center gap-0.5 border-l border-border/40 pl-2">
                            <User className="h-3 w-3 text-muted-foreground/70" /> {task.responsibleUser}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge type="priority" status={task.priority} />
                        <StatusBadge type="task" status={task.status} />
                        {isOverdue && (
                          <span className="text-[10px] bg-danger/10 text-danger border border-danger/20 font-bold px-1.5 py-0.5 rounded">
                            Atrasada
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex justify-end pt-3 border-t border-border/10">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setIsMainModalOpen(false);
                  setActiveTaskId(null);
                  setActiveDateStr(null);
                }}
              >
                Fechar
              </Button>
            </div>
          </div>
        )}

        {/* View 2: Detailed Task Details */}
        {modalView === 'task-detail' && activeTask && (
          <div className="space-y-4 pt-1">
            <div>
              <span className="text-[10px] text-primary font-bold uppercase tracking-wider block mb-0.5">
                Título
              </span>
              <h3 className="text-sm font-bold text-foreground leading-snug">
                {activeTask.title}
              </h3>
            </div>

            <div>
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block mb-1">
                Descrição / Orientações
              </span>
              <p className="text-xs text-foreground bg-muted/40 p-3 rounded-lg border border-border/40 whitespace-pre-wrap leading-relaxed">
                {activeTask.description || 'Nenhuma descrição adicionada.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-b border-border/20 py-3.5 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground block font-medium">Cliente Vinculado</span>
                <span className="font-semibold text-foreground flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5 text-primary/80" /> {activeTask.clientName}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground block font-medium">Responsável na Equipe</span>
                <span className="font-semibold text-foreground flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-primary/80" /> {activeTask.responsibleUser}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground block font-medium">Prazo de Entrega</span>
                <span className="font-semibold text-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-primary/80" /> {new Date(activeTask.dueDate).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground block font-medium">Nível de Prioridade</span>
                <div className="pt-0.5">
                  <StatusBadge type="priority" status={activeTask.priority} />
                </div>
              </div>
              <div className="space-y-1 col-span-1 sm:col-span-2">
                <span className="text-[10px] text-muted-foreground block font-medium">Status Atual</span>
                <div className="flex items-center gap-2 pt-0.5">
                  <StatusBadge type="task" status={activeTask.status} />
                  {activeTask.status !== 'completed' && new Date(activeTask.dueDate) < new Date(new Date().setHours(0,0,0,0)) && (
                    <span className="text-[9px] bg-danger/10 text-danger border border-danger/20 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-0.5">
                      <AlertTriangle className="h-3 w-3" /> Atrasada
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Notes/Comments Section */}
            <div className="border-t border-border/20 pt-4">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                Observações ({activeTask.notes?.length || 0})
              </h4>
              
              <div className="space-y-3 max-h-48 overflow-y-auto pr-1 mb-4 modal-scrollbar">
                {!activeTask.notes || activeTask.notes.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-1">Nenhuma observação adicionada.</p>
                ) : (
                  [...activeTask.notes].sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map((note) => (
                    <div key={note.id} className="bg-muted/30 p-2.5 rounded-lg border border-border/40 text-xs">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-primary">{note.authorName}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(note.createdAt).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-foreground whitespace-pre-wrap leading-relaxed">{note.content}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAddNote} className="space-y-2">
                <Textarea
                  placeholder="Escreva uma observação..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={2}
                  className="text-xs"
                  required
                />
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    size="sm"
                    className="text-xs h-8"
                  >
                    Adicionar Observação
                  </Button>
                </div>
              </form>
            </div>

            {/* Quick Actions Footer */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center pt-4 border-t border-border/10 gap-3">
              <div className="flex flex-wrap gap-2">
                {activeTask.status !== 'completed' ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      updateTaskStatus(activeTask.id, 'completed');
                    }}
                    className="text-xs h-9 border-success/30 hover:bg-success/5 text-success hover:border-success/60 flex items-center gap-1.5 justify-center"
                  >
                    <Check className="h-4 w-4" /> Marcar como Concluída
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      updateTaskStatus(activeTask.id, 'pending');
                    }}
                    className="text-xs h-9 border-warning/30 hover:bg-warning/5 text-warning hover:border-warning/60 flex items-center gap-1.5 justify-center"
                  >
                    Reabrir Tarefa
                  </Button>
                )}
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Populate edit form states
                    setEditTitle(activeTask.title);
                    setEditDesc(activeTask.description || '');
                    setEditClientId(activeTask.clientId);
                    setEditResponsible(activeTask.responsibleUser);
                    setEditDueDate(activeTask.dueDate.split('T')[0]);
                    setEditPriority(activeTask.priority);
                    setEditStatus(activeTask.status);
                    setModalView('task-edit');
                  }}
                  className="text-xs h-9 border-border/60 hover:bg-muted/40 justify-center"
                >
                  Editar Tarefa
                </Button>
              </div>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => {
                  if (activeDateStr) {
                    setModalView('day-tasks');
                  } else {
                    setIsMainModalOpen(false);
                    setActiveTaskId(null);
                    setActiveDateStr(null);
                  }
                }}
                className="h-9 justify-center"
              >
                Fechar
              </Button>
            </div>
          </div>
        )}

        {/* View 3: Edit Task Form */}
        {modalView === 'task-edit' && activeTask && (
          <form onSubmit={handleSaveEdit} className="space-y-4 pt-1">
            <Input
              label="Título da Tarefa"
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              required
              className="text-xs"
            />

            <Select
              label="Cliente Vinculado"
              options={clients.map(c => ({ value: c.id, label: c.companyName }))}
              value={editClientId}
              onChange={(e) => setEditClientId(e.target.value)}
              required
              className="text-xs"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Responsável"
                options={teamMembers.map(m => ({ value: m.name, label: m.name }))}
                value={editResponsible}
                onChange={(e) => setEditResponsible(e.target.value)}
                className="text-xs"
              />
              <DatePicker
                label="Prazo"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                required
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Prioridade"
                options={[
                  { value: 'low', label: 'Baixa' },
                  { value: 'medium', label: 'Média' },
                  { value: 'high', label: 'Alta' },
                  { value: 'urgent', label: 'Urgente' }
                ]}
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
                className="text-xs"
              />
              <Select
                label="Status"
                options={[
                  { value: 'pending', label: 'Pendente' },
                  { value: 'in_progress', label: 'Em Andamento' },
                  { value: 'in_review', label: 'Em Revisão' },
                  { value: 'completed', label: 'Concluído' }
                ]}
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as TaskStatus)}
                className="text-xs"
              />
            </div>

            <Textarea
              label="Descrição / Orientações"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              rows={3}
              className="text-xs"
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-border/10">
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => setModalView('task-detail')}
                className="h-9"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                size="sm"
                className="h-9"
              >
                Salvar Alterações
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
