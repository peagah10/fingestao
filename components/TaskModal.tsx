import React, { useState, useEffect } from 'react';
import { Task, CRMLead, Company, User } from '../types';
import { X, Calendar, CheckSquare, Building, User as UserIcon } from 'lucide-react';

interface TaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (task: Partial<Task>) => void;
    initialTask?: Task | null;
    leads: CRMLead[];
    companies?: Company[];
    users: User[];
    currentUser: User;
    defaultType?: 'CRM' | 'BPO' | 'GENERAL';
}

const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onSave, initialTask, leads, companies = [], users, currentUser, defaultType }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
    const [assignedToId, setAssignedToId] = useState(currentUser.id);

    // Smart Fields
    const [type, setType] = useState<'CRM' | 'BPO' | 'GENERAL'>('GENERAL');
    const [linkedLeadId, setLinkedLeadId] = useState<string>('');
    const [relatedClientId, setRelatedClientId] = useState<string>('');
    const [recurrenceRule, setRecurrenceRule] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            if (initialTask) {
                setTitle(initialTask.title);
                setDescription(initialTask.description || '');
                setDueDate(initialTask.dueDate ? initialTask.dueDate.split('T')[0] : '');
                setPriority(initialTask.priority);
                setAssignedToId(initialTask.assignedToId);
                setType(initialTask.type || 'GENERAL');
                setLinkedLeadId(initialTask.linkedLeadId || '');
                setRelatedClientId(initialTask.relatedClientId || '');
                setRecurrenceRule(initialTask.recurrence?.rule || '');
            } else {
                // Reset for new task
                setTitle('');
                setDescription('');
                setDueDate(new Date().toISOString().split('T')[0]); // Default to today
                setPriority('MEDIUM');
                setAssignedToId(currentUser.id);
                setType(defaultType || 'GENERAL');
                setLinkedLeadId('');
                setRelatedClientId('');
                setRecurrenceRule('');
            }
        }
    }, [isOpen, initialTask, currentUser, defaultType]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const taskData: Partial<Task> = {
            title,
            description,
            dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
            priority,
            assignedToId,
            status: initialTask ? initialTask.status : 'TODO',
            type,
            linkedLeadId: type === 'CRM' ? linkedLeadId : undefined,
            relatedClientId: type === 'BPO' ? relatedClientId : undefined,
            recurrence: recurrenceRule ? { rule: recurrenceRule } : undefined
        };

        // If editing, preserve ID
        if (initialTask) {
            taskData.id = initialTask.id;
        }

        onSave(taskData);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2 text-lg">
                        <CheckSquare className="text-indigo-600" size={24} />
                        {initialTask ? 'Editar Tarefa' : 'Nova Tarefa'}
                    </h3>
                    <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">

                    {/* Task Type Selector */}
                    <div className="grid grid-cols-3 gap-2 bg-gray-100 p-1 rounded-lg">
                        <button
                            type="button"
                            onClick={() => setType('GENERAL')}
                            className={`py-1.5 text-xs font-bold rounded-md transition-all ${type === 'GENERAL' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Avulsa
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('CRM')}
                            className={`py-1.5 text-xs font-bold rounded-md transition-all ${type === 'CRM' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            CRM (Lead)
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('BPO')}
                            className={`py-1.5 text-xs font-bold rounded-md transition-all ${type === 'BPO' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            BPO (Cliente)
                        </button>
                    </div>

                    {/* Dynamic Context Fields */}
                    {type === 'CRM' && (
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Vincular a Lead</label>
                            <select
                                value={linkedLeadId}
                                onChange={(e) => setLinkedLeadId(e.target.value)}
                                className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-blue-50 focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">Selecione um Lead...</option>
                                {leads.map(lead => (
                                    <option key={lead.id} value={lead.id}>{lead.companyName} ({lead.name})</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {type === 'BPO' && (
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Vincular a Cliente</label>
                            <select
                                value={relatedClientId}
                                onChange={(e) => setRelatedClientId(e.target.value)}
                                className="w-full px-3 py-2 border border-indigo-200 rounded-lg text-sm bg-indigo-50 focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="">Selecione um Cliente...</option>
                                {companies.map(company => (
                                    <option key={company.id} value={company.id}>{company.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Core Fields */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">O que precisa ser feito?</label>
                        <input
                            type="text"
                            required
                            placeholder="Título da tarefa..."
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Detalhes (Opcional)</label>
                        <textarea
                            rows={2}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Vencimento</label>
                            <input
                                type="date"
                                required
                                value={dueDate}
                                onChange={e => setDueDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Prioridade</label>
                            <select
                                value={priority}
                                onChange={e => setPriority(e.target.value as any)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                            >
                                <option value="LOW">Baixa</option>
                                <option value="MEDIUM">Média</option>
                                <option value="HIGH">Alta</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Responsável</label>
                            <div className="relative">
                                <UserIcon size={14} className="absolute left-3 top-3 text-gray-400" />
                                <select
                                    value={assignedToId}
                                    onChange={e => setAssignedToId(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                >
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {type === 'BPO' && (
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Recorrência</label>
                                <select
                                    value={recurrenceRule}
                                    onChange={e => setRecurrenceRule(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                >
                                    <option value="">Não recorrente</option>
                                    <option value="WEEKLY">Semanal</option>
                                    <option value="MONTHLY">Mensal</option>
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="pt-2">
                        <button type="submit" className="w-full py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors text-sm shadow-md">
                            {initialTask ? 'Salvar Alterações' : 'Criar Tarefa'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TaskModal;
