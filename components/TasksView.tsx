import React, { useState, useMemo, useEffect } from 'react';
import { crmService } from '../services/crmService';
import { Task, User, UserRole, KanbanStage, CRMLead, Company } from '../types';
import { ListTodo, Plus, CheckCircle2, Calendar, Building2, Filter, X, Search, Clock, ChevronLeft, ChevronRight, Settings, Trash2, Link, Edit2, AlertTriangle, Briefcase, FileText } from 'lucide-react';
import TaskModal from './TaskModal';

interface TasksViewProps {
    currentUser: User;
    companyId?: string; // Specific context (optional)
    tasks: Task[];
    leads: CRMLead[];
    companies: Company[];
    users: User[]; // For assignment
    onUpdate: () => void;
}

const TasksView: React.FC<TasksViewProps> = ({ currentUser, companyId, tasks, leads, companies, users, onUpdate }) => {
    // State
    const [filterType, setFilterType] = useState<'ALL' | 'CRM' | 'BPO' | 'GENERAL'>('ALL');
    const [filterUser, setFilterUser] = useState<'ALL' | 'ME'>('ME'); // Default to ME for focus
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'DONE'>('PENDING'); // Default to PENDING

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    // Derived State: Smart Sort & Filter
    const filteredAndSortedTasks = useMemo(() => {
        let result = tasks.filter(t => {
            // Context Filter (if companyId provided, usually strict)
            if (companyId && t.linkedCompanyId !== companyId && t.linkedCompanyId !== undefined) {
                // Relaxed check: if task is CRM type, it doesn't have linkedCompanyId in same way?
                // Actually CRM tasks linked to leads might implicitly belong to company. 
                // For now, if companyId is set, filtering is handled by parent, but we double check.
            }

            // Type Filter
            if (filterType !== 'ALL' && (t.type || 'GENERAL') !== filterType) return false;

            // User Filter
            if (filterUser === 'ME' && t.assignedToId !== currentUser.id) return false;

            // Status Filter
            if (filterStatus === 'PENDING' && t.status === 'DONE') return false;
            if (filterStatus === 'DONE' && t.status !== 'DONE') return false;

            return true;
        });

        // Smart Sort: Overdue > Today > Upcoming > No Date
        // We can group them in rendering, but let's sort first.
        result.sort((a, b) => {
            if (a.status === 'DONE' && b.status !== 'DONE') return 1;
            if (a.status !== 'DONE' && b.status === 'DONE') return -1;

            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });

        return result;
    }, [tasks, filterType, filterUser, filterStatus, currentUser, companyId]);

    // Grouping for Smart View
    const groups = useMemo(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const overdue: Task[] = [];
        const today: Task[] = [];
        const upcoming: Task[] = []; // Next 7 days
        const future: Task[] = []; // Beyond 7 days or No Date
        const completed: Task[] = [];

        filteredAndSortedTasks.forEach(t => {
            if (t.status === 'DONE') {
                completed.push(t);
                return;
            }

            if (!t.dueDate) {
                future.push(t);
                return;
            }

            const d = new Date(t.dueDate);
            d.setHours(0, 0, 0, 0);
            const diffDays = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

            if (diffDays < 0) overdue.push(t);
            else if (diffDays === 0) today.push(t);
            else if (diffDays <= 7) upcoming.push(t);
            else future.push(t);
        });

        return { overdue, today, upcoming, future, completed };
    }, [filteredAndSortedTasks]);

    // Handlers
    const handleSaveTask = async (taskData: Partial<Task>) => {
        if (taskData.id) {
            await crmService.updateTask(taskData.id, taskData);
        } else {
            await crmService.createTask({
                ...taskData,
                linkedCompanyId: companyId || taskData.linkedCompanyId, // Ensure link if in company context
            });
        }
        onUpdate();
    };

    const toggleTask = async (task: Task) => {
        const newStatus = task.status === 'DONE' ? 'TODO' : 'DONE';
        // Optimistic update locally could be added here
        await crmService.updateTask(task.id, { status: newStatus });
        onUpdate();
    };

    const deleteTask = async (id: string) => {
        if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
            await crmService.deleteTask(id);
            onUpdate();
        }
    };

    const openNewTask = () => {
        setEditingTask(null);
        setIsModalOpen(true);
    };

    const openEditTask = (task: Task) => {
        setEditingTask(task);
        setIsModalOpen(true);
    };

    // Helper Components
    const TaskCard = ({ task }: { task: Task }) => {
        const isLate = task.dueDate && new Date(task.dueDate) < new Date(new Date().setHours(0, 0, 0, 0)) && task.status !== 'DONE';
        const typeLabel = task.type === 'CRM' ? 'CRM' : (task.type === 'BPO' ? 'BPO' : 'Geral');
        const typeColor = task.type === 'CRM' ? 'text-blue-600 bg-blue-50 border-blue-100' : (task.type === 'BPO' ? 'text-indigo-600 bg-indigo-50 border-indigo-100' : 'text-gray-600 bg-gray-50 border-gray-100');
        const assignee = users.find(u => u.id === task.assignedToId);

        return (
            <div className={`group flex items-start gap-3 p-3 bg-white border border-gray-100 rounded-lg hover:shadow-md transition-all ${task.status === 'DONE' ? 'opacity-50' : ''}`}>
                <button
                    onClick={() => toggleTask(task)}
                    className={`mt-1 shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${task.status === 'DONE' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-indigo-500 text-transparent'}`}
                >
                    <CheckCircle2 size={14} fill="currentColor" className={task.status === 'DONE' ? 'text-white' : 'text-transparent'} />
                </button>

                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEditTask(task)}>
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${typeColor}`}>
                            {typeLabel}
                        </span>
                        {isLate && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
                                <AlertTriangle size={10} /> Atrasado
                            </span>
                        )}
                        {task.priority === 'HIGH' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-100">
                                Alta Prioridade
                            </span>
                        )}
                    </div>

                    <h4 className={`text-sm font-semibold text-gray-900 mb-0.5 ${task.status === 'DONE' ? 'line-through' : ''}`}>{task.title}</h4>

                    {/* Context Line */}
                    {(task.linkedLeadId || task.relatedClientId) && (
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                            {task.linkedLeadId && (
                                <span className="flex items-center gap-1 text-blue-600 font-medium">
                                    <Link size={10} /> {leads.find(l => l.id === task.linkedLeadId)?.companyName || 'Lead'}
                                </span>
                            )}
                            {task.relatedClientId && (
                                <span className="flex items-center gap-1 text-indigo-600 font-medium">
                                    <Building2 size={10} /> {companies.find(c => c.id === task.relatedClientId)?.name || 'Cliente'}
                                </span>
                            )}
                        </div>
                    )}

                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-2">
                        <div className={`flex items-center gap-1 ${isLate ? 'text-red-500 font-medium' : ''}`}>
                            <Calendar size={12} /> {task.dueDate ? new Date(task.dueDate).toLocaleDateString('pt-BR') : 'Sem data'}
                        </div>
                        {assignee && (
                            <div className="flex items-center gap-1" title={assignee.name}>
                                <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-[8px] font-bold text-gray-600">
                                    {assignee.name.charAt(0)}
                                </div>
                                <span className="max-w-[80px] truncate">{assignee.name.split(' ')[0]}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                    <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col space-y-4">
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <CheckCircle2 className="text-indigo-600" size={24} />
                        Central de Tarefas
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">Organize suas atividades de CRM, BPO e demandas internas.</p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button onClick={() => setFilterUser('ME')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${filterUser === 'ME' ? 'bg-white shadow text-indigo-700' : 'text-gray-500'}`}>Minhas</button>
                        <button onClick={() => setFilterUser('ALL')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${filterUser === 'ALL' ? 'bg-white shadow text-indigo-700' : 'text-gray-500'}`}>Todas</button>
                    </div>

                    <div className="h-8 w-px bg-gray-300 mx-1"></div>

                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as any)}
                        className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2 font-medium"
                    >
                        <option value="ALL">Todos os Tipos</option>
                        <option value="CRM">CRM (Leads)</option>
                        <option value="BPO">BPO (Clientes)</option>
                        <option value="GENERAL">Avulsas</option>
                    </select>

                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                        className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2 font-medium"
                    >
                        <option value="PENDING">Pendentes</option>
                        <option value="DONE">Concluídas</option>
                        <option value="ALL">Todas</option>
                    </select>

                    <button
                        onClick={openNewTask}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-sm transition-colors"
                    >
                        <Plus size={16} /> Nova Tarefa
                    </button>
                </div>
            </div>

            {/* Smart Task List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pb-10">

                {filterStatus !== 'DONE' && (
                    <>
                        {/* 1. Overdue Section */}
                        {groups.overdue.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-bold text-red-700 flex items-center gap-2 px-1">
                                    <AlertTriangle size={16} /> Atrasadas ({groups.overdue.length})
                                </h3>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                    {groups.overdue.map(t => <TaskCard key={t.id} task={t} />)}
                                </div>
                            </div>
                        )}

                        {/* 2. Today Section */}
                        {groups.today.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-bold text-orange-700 flex items-center gap-2 px-1">
                                    <Clock size={16} /> Para Hoje ({groups.today.length})
                                </h3>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                    {groups.today.map(t => <TaskCard key={t.id} task={t} />)}
                                </div>
                            </div>
                        )}

                        {/* 3. Upcoming Section */}
                        {groups.upcoming.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-bold text-indigo-700 flex items-center gap-2 px-1">
                                    <Calendar size={16} /> Próximos 7 Dias ({groups.upcoming.length})
                                </h3>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                    {groups.upcoming.map(t => <TaskCard key={t.id} task={t} />)}
                                </div>
                            </div>
                        )}

                        {/* 4. Future/No Date */}
                        {groups.future.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-bold text-gray-600 flex items-center gap-2 px-1">
                                    <FileText size={16} /> Futuras / Sem Data ({groups.future.length})
                                </h3>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                    {groups.future.map(t => <TaskCard key={t.id} task={t} />)}
                                </div>
                            </div>
                        )}

                        {filteredAndSortedTasks.length === 0 && (
                            <div className="flex flex-col items-center justify-center p-12 text-gray-400">
                                <CheckCircle2 size={48} className="mb-2 opacity-20" />
                                <p className="text-sm">Nenhuma tarefa encontrada.</p>
                            </div>
                        )}
                    </>
                )}

                {/* 5. Completed */}
                {(filterStatus === 'DONE' || filterStatus === 'ALL') && groups.completed.length > 0 && (
                    <div className="space-y-2 pt-4 border-t border-gray-100">
                        <h3 className="text-sm font-bold text-green-700 flex items-center gap-2 px-1">
                            <CheckCircle2 size={16} /> Concluídas ({groups.completed.length})
                        </h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            {groups.completed.map(t => <TaskCard key={t.id} task={t} />)}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            <TaskModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveTask}
                initialTask={editingTask}
                leads={leads}
                companies={companies}
                users={users}
                currentUser={currentUser}
                defaultType={filterType !== 'ALL' ? filterType : 'GENERAL'}
            />
        </div>
    );
};

export default TasksView;
