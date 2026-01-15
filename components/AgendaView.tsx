
import React, { useState, useMemo, useEffect } from 'react';
import { Company, Task, Transaction, TransactionType, User, KanbanStage } from '../types';
import { TASKS, addTask, getTransactionsByCompany, TASK_STAGES } from '../services/mockData';
import TasksView from './TasksView';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Settings,
  Trash2,
  GripVertical,
  X
} from 'lucide-react';

interface AgendaViewProps {
  company: Company;
  currentUser: User;
  onRefresh: () => void;
  onNavigate: (view: string, params?: any) => void;
}

type PeriodType = 'WEEK' | 'MONTH' | 'SEMESTER' | 'YEAR'; 
type SelectionScope = 'DAY' | 'MONTH' | 'YEAR';

const AgendaView: React.FC<AgendaViewProps> = ({ company, currentUser, onRefresh, onNavigate }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [periodType, setPeriodType] = useState<PeriodType>('WEEK');
  const [selectionScope, setSelectionScope] = useState<SelectionScope>('DAY');
  const [activeStageId, setActiveStageId] = useState<string>('ALL');

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  
  // Config Modal State
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configStages, setConfigStages] = useState<KanbanStage[]>(TASK_STAGES);
  const [newStageName, setNewStageName] = useState('');

  // New Task State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskDate, setNewTaskDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTaskTime, setNewTaskTime] = useState('09:00'); 
  const [newTaskStage, setNewTaskStage] = useState('TODO');

  // Reset selection scope when period type changes
  useEffect(() => {
      if (periodType === 'WEEK' || periodType === 'MONTH') {
          setSelectionScope('DAY');
          setSelectedDate(new Date()); // Reset to today or current view focus
      } else if (periodType === 'YEAR') {
          setSelectionScope('YEAR');
          const now = new Date();
          now.setMonth(0, 1); // Start of year
          setSelectedDate(now);
      } else {
          // SEMESTER
          setSelectionScope('MONTH');
          const now = new Date();
          now.setDate(1);
          setSelectedDate(now);
      }
  }, [periodType]);

  // --- DATA FETCHING & AGGREGATION ---
  const companyTasks = TASKS.filter(t => t.linkedCompanyId === company.id);
  const companyTransactions = getTransactionsByCompany(company.id);

  // Consolidated list of obligations (Tasks + Expenses)
  const obligations = useMemo(() => {
      const items: any[] = [];

      // Process Tasks
      companyTasks.forEach(task => {
          items.push({
              id: task.id,
              type: 'TASK',
              date: task.dueDate, // YYYY-MM-DD
              title: task.title,
              description: task.description,
              status: task.status, // Preserve actual status
              original: task
          });
      });

      // Process Pending Transactions (Expenses)
      companyTransactions
        .filter(t => t.type === TransactionType.EXPENSE && t.status !== 'PAID')
        .forEach(tx => {
            const isLate = new Date(tx.date) < new Date();
            items.push({
                id: tx.id,
                type: 'DEBT',
                date: tx.date,
                title: tx.description,
                description: `Valor: R$ ${tx.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
                status: 'TODO', // Map PENDING expenses to TODO stage for visual consistency in Kanban/Group
                amount: tx.amount,
                original: tx
            });
        });

      return items.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [companyTasks, companyTransactions]);

  // --- FILTER TASKS FOR RIGHT COLUMN ---
  const tasksForRightColumn = useMemo(() => {
      return obligations
        .filter(o => {
            const itemDate = new Date(o.date);
            // Fix timezone offset for comparison
            const adjustedItemDate = new Date(itemDate.valueOf() + itemDate.getTimezoneOffset() * 60 * 1000);
            
            if (selectionScope === 'DAY') {
                return adjustedItemDate.toDateString() === selectedDate.toDateString();
            } else if (selectionScope === 'MONTH') {
                return adjustedItemDate.getMonth() === selectedDate.getMonth() && 
                       adjustedItemDate.getFullYear() === selectedDate.getFullYear();
            } else if (selectionScope === 'YEAR') {
                return adjustedItemDate.getFullYear() === selectedDate.getFullYear();
            }
            return true;
        })
        .map(o => {
            // Map mixed items to Task Interface for the View
            const mappedTask: Task = {
                id: o.id,
                title: o.title,
                description: o.description,
                dueDate: o.date,
                status: o.status,
                priority: 'MEDIUM',
                linkedCompanyId: company.id,
                assignedToId: currentUser.id
            };
            return mappedTask;
        });
  }, [obligations, selectedDate, selectionScope, company.id, currentUser.id]);

  // Compute stage counts for tabs (based on selected period tasks)
  const stageCounts = useMemo(() => {
      const counts: Record<string, number> = {};
      configStages.forEach(s => counts[s.id] = 0);
      
      tasksForRightColumn.forEach(t => {
          counts[t.status] = (counts[t.status] || 0) + 1;
      });
      return counts;
  }, [tasksForRightColumn, configStages]);

  // Filter based on active tab
  const filteredTasks = useMemo(() => {
      if (activeStageId === 'ALL') return tasksForRightColumn;
      return tasksForRightColumn.filter(t => t.status === activeStageId);
  }, [tasksForRightColumn, activeStageId]);


  // --- DATE NAVIGATION LOGIC ---
  const navigatePeriod = (direction: 'prev' | 'next') => {
      const newDate = new Date(currentDate);
      const amount = direction === 'next' ? 1 : -1;

      if (periodType === 'WEEK') {
          newDate.setDate(newDate.getDate() + (amount * 7));
      } else if (periodType === 'MONTH') {
          newDate.setMonth(newDate.getMonth() + amount);
      } else if (periodType === 'SEMESTER') {
          newDate.setMonth(newDate.getMonth() + (amount * 6));
      } else if (periodType === 'YEAR') {
          // Jump 12 years (the size of the grid)
          newDate.setFullYear(newDate.getFullYear() + (amount * 12));
      }
      setCurrentDate(newDate);
  };

  const goToToday = () => {
      const today = new Date();
      setCurrentDate(today);
      setSelectedDate(today);
      
      // Reset scope based on current period type to ensure focus is correct
      if (periodType === 'WEEK' || periodType === 'MONTH') {
          setSelectionScope('DAY');
      } else if (periodType === 'SEMESTER') {
          setSelectionScope('MONTH');
      } else if (periodType === 'YEAR') {
          setSelectionScope('YEAR');
      }
  };

  const getPeriodLabel = () => {
      const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long' };
      
      if (periodType === 'WEEK') {
          // Calculate start/end of current week view
          const start = new Date(currentDate);
          start.setDate(currentDate.getDate() - currentDate.getDay()); // Sunday
          const end = new Date(start);
          end.setDate(start.getDate() + 6);
          return `${start.toLocaleDateString('pt-BR', { day: 'numeric', month: 'numeric' })} a ${end.toLocaleDateString('pt-BR', { day: 'numeric', month: 'numeric', year: 'numeric' })}`;
      } else if (periodType === 'MONTH') {
          const str = currentDate.toLocaleDateString('pt-BR', options);
          return str.charAt(0).toUpperCase() + str.slice(1);
      } else if (periodType === 'SEMESTER') {
          const semester = currentDate.getMonth() < 6 ? '1º Semestre' : '2º Semestre';
          return `${semester} de ${currentDate.getFullYear()}`;
      } else if (periodType === 'YEAR') {
          // Show Range of 12 years centered/starting
          const startYear = currentDate.getFullYear() - 6;
          const endYear = currentDate.getFullYear() + 5;
          return `${startYear} - ${endYear}`;
      }
      return '';
  };

  // --- STATUS HELPERS ---
  const getDayStatus = (date: Date) => {
      const dateStr = date.toISOString().split('T')[0];
      const items = obligations.filter(o => o.date === dateStr);
      if (items.length === 0) return null;
      
      const hasLate = items.some(i => i.status === 'LATE');
      if (hasLate) return 'LATE';
      
      const allDone = items.every(i => i.status === 'DONE' || i.status === 'PAID');
      if (allDone) return 'DONE';
      
      return 'PENDING';
  };

  const getMonthStatus = (year: number, month: number) => {
      const items = obligations.filter(o => {
          const d = new Date(o.date);
          const adj = new Date(d.valueOf() + d.getTimezoneOffset() * 60 * 1000);
          return adj.getFullYear() === year && adj.getMonth() === month;
      });

      if (items.length === 0) return null;
      if (items.some(i => i.status === 'LATE')) return 'LATE';
      if (items.every(i => i.status === 'DONE' || i.status === 'PAID')) return 'DONE';
      return 'PENDING';
  };

  const getYearStatus = (year: number) => {
      const items = obligations.filter(o => {
          const d = new Date(o.date);
          const adj = new Date(d.valueOf() + d.getTimezoneOffset() * 60 * 1000);
          return adj.getFullYear() === year;
      });

      if (items.length === 0) return null;
      if (items.some(i => i.status === 'LATE')) return 'LATE';
      if (items.every(i => i.status === 'DONE' || i.status === 'PAID')) return 'DONE';
      return 'PENDING';
  };

  // --- CALENDAR RENDERERS ---

  const renderCalendar = () => {
      // 1. WEEK VIEW
      if (periodType === 'WEEK') {
          const startOfWeek = new Date(currentDate);
          startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
          const days = [];
          for (let i=0; i<7; i++) {
              const d = new Date(startOfWeek);
              d.setDate(startOfWeek.getDate() + i);
              days.push(d);
          }

          return (
              <div className="grid grid-cols-7 gap-2">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                      <div key={day} className="text-center text-xs font-bold text-gray-400 uppercase mb-2">{day}</div>
                  ))}
                  {days.map((date, idx) => {
                      const isSelected = date.toDateString() === selectedDate.toDateString();
                      const isToday = date.toDateString() === new Date().toDateString();
                      const status = getDayStatus(date);
                      
                      return (
                          <button 
                              key={idx}
                              onClick={() => { setSelectedDate(date); setSelectionScope('DAY'); }}
                              className={`
                                  relative p-4 rounded-xl flex flex-col items-center justify-center transition-all h-24
                                  ${isSelected ? 'bg-indigo-600 text-white shadow-lg scale-105' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}
                                  ${isToday && !isSelected ? 'border-2 border-indigo-600' : ''}
                              `}
                          >
                              <span className="text-lg font-bold">{date.getDate()}</span>
                              {status && (
                                  <div className={`mt-2 w-2 h-2 rounded-full ${status === 'LATE' ? 'bg-red-500' : (status === 'DONE' ? 'bg-green-400' : 'bg-orange-400')} ${isSelected ? 'ring-2 ring-white' : ''}`}></div>
                              )}
                          </button>
                      );
                  })}
              </div>
          );
      }

      // 2. MONTH VIEW
      if (periodType === 'MONTH') {
          const year = currentDate.getFullYear();
          const month = currentDate.getMonth();
          const firstDay = new Date(year, month, 1);
          const lastDay = new Date(year, month + 1, 0);
          const days = [];
          
          for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
          for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));

          return (
              <div>
                  <div className="grid grid-cols-7 mb-2">
                      {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                          <div key={d} className="text-center text-xs font-bold text-gray-400 uppercase">{d}</div>
                      ))}
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                      {days.map((date, idx) => {
                          if (!date) return <div key={idx} className="h-16"></div>;
                          
                          const isSelected = date.toDateString() === selectedDate.toDateString();
                          const isToday = date.toDateString() === new Date().toDateString();
                          const status = getDayStatus(date);

                          return (
                              <button 
                                  key={idx}
                                  onClick={() => { setSelectedDate(date); setSelectionScope('DAY'); }}
                                  className={`
                                      relative h-16 rounded-lg flex flex-col items-center justify-center transition-all
                                      ${isSelected ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-gray-50 text-gray-700'}
                                      ${isToday && !isSelected ? 'text-indigo-600 font-bold bg-indigo-50' : ''}
                                  `}
                              >
                                  <span className="text-sm">{date.getDate()}</span>
                                  {status && (
                                      <div className={`mt-1 w-1.5 h-1.5 rounded-full ${status === 'LATE' ? 'bg-red-500' : (status === 'DONE' ? 'bg-green-500' : 'bg-orange-400')} ${isSelected ? 'ring-1 ring-white' : ''}`}></div>
                                  )}
                              </button>
                          );
                      })}
                  </div>
              </div>
          );
      }

      // 3. SEMESTER VIEW
      if (periodType === 'SEMESTER') {
          const year = currentDate.getFullYear();
          const months = [];
          const startMonth = currentDate.getMonth() < 6 ? 0 : 6;
          for (let i = 0; i < 6; i++) months.push(new Date(year, startMonth + i, 1));

          return (
              <div className="grid grid-cols-3 gap-4">
                  {months.map((mDate, idx) => {
                      const isSelected = selectionScope === 'MONTH' && mDate.getMonth() === selectedDate.getMonth() && mDate.getFullYear() === selectedDate.getFullYear();
                      const isCurrentMonth = new Date().getMonth() === mDate.getMonth() && new Date().getFullYear() === mDate.getFullYear();
                      const status = getMonthStatus(mDate.getFullYear(), mDate.getMonth());

                      return (
                          <button
                              key={idx}
                              onClick={() => { setSelectedDate(mDate); setSelectionScope('MONTH'); }}
                              className={`
                                  p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all h-24
                                  ${isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-gray-50'}
                                  ${isCurrentMonth && !isSelected ? 'ring-2 ring-indigo-100 bg-indigo-50/50' : ''}
                              `}
                          >
                              <span className="font-bold capitalize">{mDate.toLocaleDateString('pt-BR', { month: 'long' })}</span>
                              {status && (
                                  <div className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${isSelected ? 'bg-white/20' : 'bg-black/10'}`}>
                                      <div className={`w-2 h-2 rounded-full ${status === 'LATE' ? 'bg-red-500' : (status === 'DONE' ? 'bg-green-400' : 'bg-orange-400')}`}></div>
                                      {status === 'LATE' ? 'Pendências' : (status === 'DONE' ? 'Concluído' : 'Aberto')}
                                  </div>
                              )}
                          </button>
                      );
                  })}
              </div>
          );
      }

      // 4. YEAR VIEW
      if (periodType === 'YEAR') {
          const startYear = currentDate.getFullYear() - 6;
          const years = [];
          for(let i = 0; i < 12; i++) {
              years.push(startYear + i);
          }

          return (
              <div className="grid grid-cols-3 gap-4">
                  {years.map((year, idx) => {
                      const isSelected = selectionScope === 'YEAR' && selectedDate.getFullYear() === year;
                      const isCurrentYear = new Date().getFullYear() === year;
                      const status = getYearStatus(year);

                      return (
                          <button
                              key={idx}
                              onClick={() => { 
                                  const d = new Date();
                                  d.setFullYear(year);
                                  d.setMonth(0, 1);
                                  setSelectedDate(d); 
                                  setSelectionScope('YEAR'); 
                              }}
                              className={`
                                  p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all h-24
                                  ${isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-gray-50'}
                                  ${isCurrentYear && !isSelected ? 'ring-2 ring-indigo-100 bg-indigo-50/50' : ''}
                              `}
                          >
                              <span className="font-bold text-lg">{year}</span>
                              {status && (
                                  <div className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${isSelected ? 'bg-white/20' : 'bg-black/10'}`}>
                                      <div className={`w-2 h-2 rounded-full ${status === 'LATE' ? 'bg-red-500' : (status === 'DONE' ? 'bg-green-400' : 'bg-orange-400')}`}></div>
                                      {status === 'LATE' ? 'Pendências' : (status === 'DONE' ? 'Concluído' : 'Aberto')}
                                  </div>
                              )}
                          </button>
                      );
                  })}
              </div>
          );
      }
  };

  // --- CONFIG HANDLERS ---
  const handleAddStage = () => {
      if (!newStageName) return;
      const newId = newStageName.toUpperCase().replace(/\s+/g, '_');
      setConfigStages([...configStages, {
          id: newId,
          label: newStageName,
          color: 'border-gray-400',
          bg: 'bg-gray-50',
          order: configStages.length + 1
      }]);
      setNewStageName('');
  };

  const handleDeleteStage = (id: string) => {
      if (['TODO', 'DONE'].includes(id)) {
          alert('Não é possível remover os status padrão do sistema.');
          return;
      }
      setConfigStages(configStages.filter(s => s.id !== id));
  };

  // --- HANDLER FOR NEW TASK ---
  const handleCreateTask = (e: React.FormEvent) => {
      e.preventDefault();
      const titleWithTime = `${newTaskTime} - ${newTaskTitle}`;
      addTask({
          title: titleWithTime,
          description: newTaskDesc,
          dueDate: newTaskDate,
          status: newTaskStage, 
          priority: 'MEDIUM',
          linkedCompanyId: company.id,
          assignedToId: currentUser.id
      }, currentUser);

      setIsTaskModalOpen(false);
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskStage('TODO');
      onRefresh(); 
  };

  // Right Column Header Title
  const getRightColumnTitle = () => {
      if (selectionScope === 'YEAR') {
          return `Obrigações de ${selectedDate.getFullYear()}`;
      }
      
      const options: Intl.DateTimeFormatOptions = selectionScope === 'MONTH' 
        ? { month: 'long', year: 'numeric' }
        : { weekday: 'long', day: 'numeric', month: 'long' };
      
      return selectedDate.toLocaleDateString('pt-BR', options);
  };

  return (
    <div className="flex flex-col gap-8 h-full">
        
        {/* CONFIG MODAL */}
        {isConfigOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <Settings size={20} className="text-indigo-600"/> Configurar Agenda
                        </h3>
                        <button onClick={() => setIsConfigOpen(false)}><X size={20} className="text-gray-400"/></button>
                    </div>
                    <div className="p-6">
                        <h4 className="text-sm font-bold text-gray-800 mb-2">Estágios e Status</h4>
                        <p className="text-xs text-gray-500 mb-4">Gerencie as etapas do seu fluxo de trabalho.</p>
                        
                        <div className="space-y-2 mb-4 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                            {configStages.map((stage, idx) => (
                                <div key={stage.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="flex items-center gap-3">
                                        <GripVertical size={14} className="text-gray-400 cursor-move"/>
                                        <span className="font-bold text-sm text-gray-700">{stage.label}</span>
                                    </div>
                                    {!['TODO', 'DONE', 'IN_PROGRESS'].includes(stage.id) && (
                                        <button onClick={() => handleDeleteStage(stage.id)} className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"><Trash2 size={16}/></button>
                                    )}
                                </div>
                            ))}
                        </div>
                        
                        <div className="flex gap-2 mb-6">
                            <input 
                                type="text" 
                                value={newStageName} 
                                onChange={e => setNewStageName(e.target.value)} 
                                placeholder="Novo status (ex: Aguardando Aprov.)"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white text-black"
                            />
                            <button onClick={handleAddStage} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors">
                                Adicionar
                            </button>
                        </div>
                    </div>
                    <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                        <button onClick={() => setIsConfigOpen(false)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">Concluir</button>
                    </div>
                </div>
            </div>
        )}

        {/* TASK MODAL */}
        {isTaskModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <Plus size={20} className="text-indigo-600"/> Agendar Obrigação
                        </h3>
                        <button onClick={() => setIsTaskModalOpen(false)}><X size={20} className="text-gray-400"/></button>
                    </div>
                    <form onSubmit={handleCreateTask} className="p-4 space-y-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Título</label>
                            <input type="text" required value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="Ex: Pagar Fornecedor X" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-black" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Data</label>
                                <input type="date" required value={newTaskDate} onChange={e => setNewTaskDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-black" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Horário</label>
                                <input type="time" required value={newTaskTime} onChange={e => setNewTaskTime(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-black" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Etapa / Status Inicial</label>
                            <select value={newTaskStage} onChange={e => setNewTaskStage(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-black">
                                {configStages.map(stage => (
                                    <option key={stage.id} value={stage.id}>{stage.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Descrição</label>
                            <textarea rows={3} value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-sm bg-white text-black"></textarea>
                        </div>
                        <button type="submit" className="w-full py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors text-sm mt-2">Salvar na Agenda</button>
                    </form>
                </div>
            </div>
        )}

        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Calendar className="text-indigo-600" size={28} /> Agenda Financeira
                </h2>
                <p className="text-gray-500 mt-1">Visualize suas obrigações e pagamentos previstos.</p>
            </div>
            
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => setIsConfigOpen(true)}
                    className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium shadow-sm flex items-center gap-2 text-sm transition-colors"
                >
                    <Settings size={16}/> Configurar
                </button>
                <button 
                    onClick={() => {
                        setNewTaskDate(selectedDate.toISOString().split('T')[0]); 
                        setIsTaskModalOpen(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm flex items-center gap-2 text-sm transition-colors"
                >
                    <Plus size={16}/> Adicionar
                </button>
            </div>
        </div>

        {/* PERIOD SELECTOR BAR - Styled to match screenshot */}
        <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
            
            {/* Custom Segmented Control */}
            <div className="flex items-center bg-gray-100 p-1.5 rounded-xl w-fit overflow-x-auto">
                <button 
                    onClick={goToToday}
                    className="px-4 py-1.5 text-sm font-semibold text-indigo-600 hover:bg-white/50 rounded-lg transition-all"
                >
                    Hoje
                </button>
                <div className="w-px h-5 bg-gray-300 mx-2"></div>
                {(['WEEK', 'MONTH', 'SEMESTER', 'YEAR'] as PeriodType[]).map((type) => (
                    <button
                        key={type}
                        onClick={() => setPeriodType(type)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                            periodType === type 
                            ? 'bg-white text-gray-900 shadow-sm' 
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {type === 'WEEK' && 'Semana'}
                        {type === 'MONTH' && 'Mês'}
                        {type === 'SEMESTER' && 'Semestre'}
                        {type === 'YEAR' && 'Ano'}
                    </button>
                ))}
            </div>

            <div className="flex items-center gap-4 px-2">
                <button 
                    onClick={() => navigatePeriod('prev')} 
                    className={`p-2 rounded-full text-gray-600 hover:bg-gray-100`}
                >
                    <ChevronLeft size={18}/>
                </button>
                <div className="flex items-center gap-2 min-w-[150px] justify-center text-gray-800 font-bold text-sm capitalize">
                    <Calendar size={16} className="text-indigo-600"/>
                    {getPeriodLabel()}
                </div>
                <button 
                    onClick={() => navigatePeriod('next')} 
                    className={`p-2 rounded-full text-gray-600 hover:bg-gray-100`}
                >
                    <ChevronRight size={18}/>
                </button>
            </div>
        </div>

        {/* CALENDAR & TASKS LIST SPLIT */}
        <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
            
            {/* LEFT: CALENDAR */}
            <div className="w-full lg:w-2/5 bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-full overflow-y-auto custom-scrollbar">
                <div className="flex justify-end gap-2 mb-4 text-[10px] text-gray-500">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Atrasado</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400"></span> Pendente</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Concluído</span>
                </div>
                
                {renderCalendar()}
            </div>

            {/* RIGHT: TASKS VIEW (Dynamic List) */}
            <div className="w-full lg:w-3/5 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-gray-800 capitalize flex items-center gap-2">
                                {getRightColumnTitle()}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                                {selectionScope === 'MONTH' ? 'Visualizando tarefas do mês' : (selectionScope === 'YEAR' ? 'Visualizando tarefas do ano' : 'Tarefas diárias')}
                            </p>
                        </div>
                    </div>

                    {/* Stage Tabs - Styled as requested */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
                        <button
                            onClick={() => setActiveStageId('ALL')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all border ${
                                activeStageId === 'ALL' 
                                ? 'bg-white border-indigo-600 text-indigo-600 ring-1 ring-indigo-600 shadow-sm' 
                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            Todos ({tasksForRightColumn.length})
                        </button>
                        {configStages.map(stage => (
                            <button
                                key={stage.id}
                                onClick={() => setActiveStageId(stage.id)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all border flex items-center gap-2 ${
                                    activeStageId === stage.id 
                                    ? 'bg-white border-indigo-600 text-indigo-600 ring-1 ring-indigo-600 shadow-sm' 
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <div className={`w-2 h-2 rounded-full ${['DONE', 'PAID'].includes(stage.id) ? 'bg-green-500' : (stage.id === 'TODO' ? 'bg-gray-400' : 'bg-blue-500')}`}></div>
                                {stage.label} 
                                <span className="bg-gray-100 px-2 py-0.5 rounded text-xs text-gray-600 ml-1 border border-gray-200">
                                    {stageCounts[stage.id] || 0}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex-1 overflow-hidden p-2">
                    <TasksView 
                        companyId={company.id}
                        currentUser={currentUser}
                        tasks={filteredTasks}
                        onUpdate={onRefresh}
                        isEmbedded={true}
                        stages={configStages}
                        groupByStage={false}
                    />
                </div>
            </div>
        </div>
    </div>
  );
};

export default AgendaView;
