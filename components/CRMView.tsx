
import React, { useState, useMemo, useEffect } from 'react';
import { crmService } from '../services/crmService';
import { KanbanStage, CRMLead, Task, Company, User, PlanType } from '../types';
import { Handshake, Plus, ChevronRight, ChevronLeft, Trash2, Calendar, Phone, Mail, Settings, X, GripVertical, ListTodo, ArrowRight } from 'lucide-react';
import LeadModal from './LeadModal';
import CompanyModal from './CompanyModal';
import { companyService } from '../services/companyService';

type PeriodType = 'WEEK' | 'MONTH' | 'SEMESTER' | 'YEAR' | 'ALL';

// Updated Default Stages as per Specification
const LEAD_STAGES: KanbanStage[] = [
    { id: 'NEW', label: 'Lead Recebido', color: 'border-blue-400', bg: 'bg-blue-50', order: 1 },
    { id: 'QUALIFICATION', label: 'Qualificação Inicial', color: 'border-indigo-400', bg: 'bg-indigo-50', order: 2 },
    { id: 'MEETING', label: 'Reunião / Diagnóstico', color: 'border-purple-400', bg: 'bg-purple-50', order: 3 },
    { id: 'PROPOSAL_DRAFT', label: 'Proposta em Elaboração', color: 'border-yellow-400', bg: 'bg-yellow-50', order: 4 },
    { id: 'PROPOSAL_SENT', label: 'Proposta Enviada', color: 'border-orange-400', bg: 'bg-orange-50', order: 5 },
    { id: 'CLOSED_WON', label: 'Ganhou', color: 'border-green-400', bg: 'bg-green-50', order: 6 },
    { id: 'CLOSED_LOST', label: 'Perdeu / Arquivado', color: 'border-red-400', bg: 'bg-red-50', order: 7 }
];

interface CRMViewProps {
    company: Company;
    leads: CRMLead[];
    tasks: Task[];
    currentUser: User;
    onRefresh: () => void;
    companies?: Company[]; // Optional because it might not be passed in operational mode? 
    // Actually App.tsx passes it in both (check operationalProps)
}

const CRMView: React.FC<CRMViewProps> = ({ company, leads, currentUser, onRefresh, companies }) => {
    // Stage Management
    const [localStages, setLocalStages] = useState<KanbanStage[]>(LEAD_STAGES);
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [newStageName, setNewStageName] = useState('');

    // Lead Management
    const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
    const [currentLead, setCurrentLead] = useState<CRMLead | null>(null);
    const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

    // Task Management
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [selectedLeadForTask, setSelectedLeadForTask] = useState<CRMLead | null>(null);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDate, setNewTaskDate] = useState(new Date().toISOString().split('T')[0]);
    const [newTaskPriority, setNewTaskPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');

    // Lead Conversion Management
    const [isConverterOpen, setIsConverterOpen] = useState(false);
    const [leadToConvert, setLeadToConvert] = useState<CRMLead | null>(null);
    const [clientInitialData, setClientInitialData] = useState<Partial<Company> | null>(null);

    // Date Filter Context
    const [periodType, setPeriodType] = useState<PeriodType>('ALL');
    const [currentDate, setCurrentDate] = useState(new Date());

    // --- Date Logic ---
    const getDateRange = (date: Date, type: PeriodType): { start: Date, end: Date } => {
        const start = new Date(date);
        const end = new Date(date);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        if (type === 'WEEK') {
            const day = start.getDay(); // 0 (Sun) to 6 (Sat)
            const diff = start.getDate() - day; // adjust when day is sunday
            start.setDate(diff);
            end.setDate(diff + 6);
        } else if (type === 'MONTH') {
            start.setDate(1);
            end.setMonth(end.getMonth() + 1, 0);
        } else if (type === 'SEMESTER') {
            const currentMonth = start.getMonth();
            const startMonth = currentMonth < 6 ? 0 : 6;
            start.setMonth(startMonth, 1);
            end.setMonth(startMonth + 6, 0);
        } else if (type === 'YEAR') {
            start.setMonth(0, 1);
            end.setMonth(11, 31);
        } else if (type === 'ALL') {
            return { start: new Date('2000-01-01'), end: new Date('2100-12-31') };
        }

        return { start, end };
    };

    const navigatePeriod = (direction: 'prev' | 'next') => {
        if (periodType === 'ALL') return;

        const newDate = new Date(currentDate);
        const amount = direction === 'next' ? 1 : -1;

        if (periodType === 'WEEK') newDate.setDate(newDate.getDate() + (amount * 7));
        else if (periodType === 'MONTH') newDate.setMonth(newDate.getMonth() + amount);
        else if (periodType === 'SEMESTER') newDate.setMonth(newDate.getMonth() + (amount * 6));
        else if (periodType === 'YEAR') newDate.setFullYear(newDate.getFullYear() + amount);

        setCurrentDate(newDate);
    };

    const getPeriodLabel = () => {
        if (periodType === 'ALL') return 'Todo o Período';
        const { start, end } = getDateRange(currentDate, periodType);
        if (periodType === 'WEEK') return `${start.toLocaleDateString('pt-BR', { day: 'numeric', month: 'numeric' })} a ${end.toLocaleDateString('pt-BR', { day: 'numeric', month: 'numeric' })}`;
        if (periodType === 'MONTH') return start.toLocaleDateString('pt-BR', { year: 'numeric', month: 'long' });
        if (periodType === 'SEMESTER') return `${start.getMonth() < 6 ? '1º' : '2º'} Sem. ${start.getFullYear()}`;
        return start.getFullYear().toString();
    };

    // --- Loading & Init Stages ---
    useEffect(() => {
        const loadAndInitStages = async () => {
            const savedStages = await crmService.fetchFunnelStages(company.id);

            if (savedStages.length > 0) {
                // Use saved stages
                const mapped: KanbanStage[] = savedStages.map(s => ({
                    id: s.id,
                    label: s.name,
                    color: s.color || 'border-gray-400',
                    bg: 'bg-gray-50',
                    order: s.order
                }));
                setLocalStages(mapped);
            } else {
                // Initialize Defaults in DB
                try {
                    console.log('Initializing Default CRM Stages...');
                    const newStages: KanbanStage[] = [];

                    for (const defaultStage of LEAD_STAGES) {
                        const created = await crmService.createFunnelStage({
                            companyId: company.id,
                            name: defaultStage.label,
                            order: defaultStage.order,
                            color: defaultStage.color
                        });

                        if (created) {
                            newStages.push({
                                id: created.id,
                                label: created.name,
                                color: created.color || 'border-gray-400',
                                bg: 'bg-gray-50',
                                order: created.order
                            });

                            // Migration: Find leads with old string ID (e.g. 'NEW') and update to new UUID
                            // We do this by checking client-side leads for simplicity in this context
                            const leadsToMigrate = leads.filter(l => l.status === defaultStage.id).map(l => l.id);
                            if (leadsToMigrate.length > 0) {
                                await crmService.batchUpdateLeadsStatus(leadsToMigrate, created.id);
                            }
                        }
                    }

                    if (newStages.length > 0) {
                        setLocalStages(newStages);
                        onRefresh(); // Refresh leads to get new status UUIDs
                    } else {
                        // Fallback just in case
                        setLocalStages(LEAD_STAGES);
                    }
                } catch (err) {
                    console.error('Error initializing stages:', err);
                    setLocalStages(LEAD_STAGES);
                }
            }
        };

        loadAndInitStages();
    }, [company.id, leads.length]); // depend on leads.length to ensure we have leads loaded for migration check? 
    // Actually leads dep often causes loops if we modify them. 
    // Better: Only run on mount or company change. Migration check might miss if leads not loaded?
    // CRMView props usually pass loaded leads.

    // --- Config Handlers ---
    const handleAddStage = async () => {
        if (!newStageName) return;

        // Optimistic update? No, safer to wait for DB ID.
        const created = await crmService.createFunnelStage({
            companyId: company.id,
            name: newStageName,
            order: localStages.length + 1,
            color: 'border-gray-400'
        });

        if (created) {
            setLocalStages([...localStages, {
                id: created.id,
                label: created.name,
                color: created.color || 'border-gray-400',
                bg: 'bg-gray-50',
                order: created.order
            }]);
            setNewStageName('');
        }
    };

    const handleDeleteStage = async (id: string) => {
        if (confirm('Tem certeza? Leads nesta etapa ficarão órfãos se não movidos.')) {
            await crmService.deleteFunnelStage(id);
            setLocalStages(localStages.filter(s => s.id !== id));
        }
    };


    // --- Kanban Logic ---
    const handleDragStart = (e: React.DragEvent, leadId: string) => {
        e.dataTransfer.setData('leadId', leadId);
        setDraggedLeadId(leadId);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = async (e: React.DragEvent, newStageId: string) => {
        e.preventDefault();
        const leadId = e.dataTransfer.getData('leadId');
        setDraggedLeadId(null);

        if (!leadId) return;

        const lead = leads.find(l => l.id === leadId);
        if (!lead || lead.status === newStageId) return;

        // Update UI optimistically
        // (Handled by parent refreshing usually, but we could local update)

        // Check for Conversion if moved to CLOSED_WON
        if (newStageId === 'CLOSED_WON' || newStageId === 'WON') {
            const confirmConversion = window.confirm(`Parabéns! O lead "${lead.companyName}" foi ganho. \nDeseja cadastrá-lo como um Cliente Ativo agora?`);
            if (confirmConversion) {
                handleOpenConversionModal(lead);
            }
        }

        // Check for Loss Reason if moved to CLOSED_LOST
        let lossReason = undefined;
        if (newStageId === 'CLOSED_LOST' || newStageId === 'LOST') {
            const reason = window.prompt('Qual o motivo da perda? (Ex: Preço, Concorrência, Sem Fit)');
            if (reason) {
                lossReason = reason;
            } else {
                // User cancelled or empty, maybe we shouldn't move? Or just move without reason?
                // Requirement: "exigir motivo simples".
                // If null (cancel), abort move.
                if (reason === null) return;
                // If empty string but confirmed, we can allow or set default.
                lossReason = 'Não informado';
            }
        }

        await crmService.updateLead(leadId, { status: newStageId, lossReason: lossReason });
        onRefresh();
    };

    // --- Conversion Logic ---
    const handleOpenConversionModal = (lead: CRMLead) => {
        setLeadToConvert(lead);
        setClientInitialData({
            name: lead.companyName || lead.name,
            // Map service interest to service type
            serviceType: lead.serviceInterest === 'CONSULTING' ? 'CONSULTING' : (lead.serviceInterest === 'BPO' ? 'BPO' : (lead.serviceInterest === 'BOTH' ? 'BOTH' : undefined)),
            primaryColor: 'indigo',
            plan: PlanType.PREMIUM,
            active: true
        });
        setIsConverterOpen(true);
    };

    const handleSaveClient = async (data: Partial<Company>) => {
        if (!data.name || !data.cnpj) return;

        try {
            await companyService.createCompany({
                name: data.name,
                cnpj: data.cnpj,
                plan: data.plan || PlanType.FREE,
                active: true,
                primaryColor: data.primaryColor,
                logo: data.logo,
                serviceType: data.serviceType // Needs to be supported by createCompany in backend
            });

            // Should we mark lead as converted? Maybe add a flag or note?
            if (leadToConvert) {
                await crmService.updateLead(leadToConvert.id, {
                    notes: (leadToConvert.notes || '') + '\n[CONVERTIDO EM CLIENTE]'
                });
            }

            alert('Cliente cadastrado com sucesso!');
            setIsConverterOpen(false);
            onRefresh(); // Refresh context
        } catch (error) {
            console.error('Error converting client:', error);
            alert('Erro ao criar cliente. Verifique se o CNPJ é único.');
        }
    };


    // --- CRUD Handlers ---
    const handleOpenLeadModal = (lead: CRMLead | null) => {
        setCurrentLead(lead);
        setIsLeadModalOpen(true);
    };

    const handleSaveLead = () => {
        onRefresh();
    };

    const deleteLead = async (id: string) => {
        if (confirm('Remover este lead?')) {
            await crmService.deleteLead(id);
            onRefresh();
        }
    };

    const openTaskModal = (lead: CRMLead) => {
        setSelectedLeadForTask(lead);
        setNewTaskTitle('');
        setIsTaskModalOpen(true);
    };

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedLeadForTask) return;

        await crmService.createTask({
            title: newTaskTitle,
            dueDate: newTaskDate,
            priority: newTaskPriority,
            status: 'TODO',
            linkedLeadId: selectedLeadForTask.id,
            linkedCompanyId: company.id,
            assignedToId: currentUser.id
        });

        setIsTaskModalOpen(false);
        onRefresh(); // Should refresh tasks list
    };




    // --- Filtering ---
    const filteredLeads = useMemo(() => {
        const { start, end } = getDateRange(currentDate, periodType);
        return leads.filter(lead => {
            // Date filter applies to Creation Date
            if (periodType !== 'ALL') {
                const d = new Date(lead.createdAt);
                if (d < start || d > end) return false;
            }
            return true;
        });
    }, [leads, periodType, currentDate]);


    return (
        <div className="h-full flex flex-col">
            {/* LEAD MODAL */}
            <LeadModal
                isOpen={isLeadModalOpen}
                onClose={() => setIsLeadModalOpen(false)}
                onSave={handleSaveLead}
                lead={currentLead}
                companyId={company.id}
                stages={localStages}
                companies={companies}
            />

            {/* CONVERSION MODAL (Reuse CompanyModal) */}
            <CompanyModal
                isOpen={isConverterOpen}
                onClose={() => setIsConverterOpen(false)}
                onSave={handleSaveClient}
                initialData={clientInitialData as any}
            // We cast because initialData is Partial<Company> but Modal expects Company | null. 
            // Ideally CompanyModal should accept Partial or we map it properly.
            // Assuming CompanyModal handles missing IDs for create mode.
            />

            {/* TASK CREATION MODAL */}
            {
                isTaskModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
                                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                    <ListTodo size={20} className="text-indigo-600" /> Nova Tarefa
                                </h3>
                                <button onClick={() => setIsTaskModalOpen(false)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
                            </div>
                            <form onSubmit={handleCreateTask} className="p-4 space-y-3">
                                <div className="text-xs text-gray-500 mb-2">
                                    Vinculado a: <b>{selectedLeadForTask?.companyName}</b>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">O que precisa ser feito?</label>
                                    <input
                                        type="text"
                                        required
                                        value={newTaskTitle}
                                        onChange={e => setNewTaskTitle(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Vencimento</label>
                                        <input
                                            type="date"
                                            required
                                            value={newTaskDate}
                                            onChange={e => setNewTaskDate(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Prioridade</label>
                                        <select
                                            value={newTaskPriority}
                                            onChange={e => setNewTaskPriority(e.target.value as any)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                        >
                                            <option value="LOW">Baixa</option>
                                            <option value="MEDIUM">Média</option>
                                            <option value="HIGH">Alta</option>
                                        </select>
                                    </div>
                                </div>
                                <button type="submit" className="w-full py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors text-sm mt-2">
                                    Agendar Tarefa
                                </button>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* CONFIG MODAL */}
            {
                isConfigOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="flex justify-between items-center p-6 border-b border-gray-100">
                                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <Settings size={20} className="text-indigo-600" /> Configurar Etapas
                                </h3>
                                <button onClick={() => setIsConfigOpen(false)}><X size={20} className="text-gray-400" /></button>
                            </div>
                            <div className="p-6">
                                <div className="space-y-2 mb-4">
                                    {localStages.map((stage, idx) => (
                                        <div key={stage.id} className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-200">
                                            <span className="font-bold text-sm text-gray-700">{idx + 1}. {stage.label}</span>
                                            <button onClick={() => handleDeleteStage(stage.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={14} /></button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newStageName}
                                        onChange={e => setNewStageName(e.target.value)}
                                        placeholder="Nome da nova etapa..."
                                        className="flex-1 px-3 py-2 border rounded text-sm outline-none focus:border-indigo-500"
                                    />
                                    <button onClick={handleAddStage} className="bg-indigo-600 text-white px-3 py-2 rounded text-sm font-bold hover:bg-indigo-700">Adicionar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* HEADER & CONTROLS */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Handshake className="text-indigo-600" size={28} /> CRM & Pipeline
                    </h2>
                    <p className="text-gray-500 mt-1">Acompanhe suas oportunidades de venda e conversão.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                    {/* Date Selector */}
                    <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                        <button onClick={() => navigatePeriod('prev')} disabled={periodType === 'ALL'} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30"><ChevronLeft size={16} /></button>
                        <div className="px-3 text-xs font-bold text-gray-700 min-w-[140px] text-center">{getPeriodLabel()}</div>
                        <button onClick={() => navigatePeriod('next')} disabled={periodType === 'ALL'} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30"><ChevronRight size={16} /></button>
                        <div className="w-px h-4 bg-gray-300 mx-2"></div>
                        <select
                            value={periodType}
                            onChange={(e) => setPeriodType(e.target.value as PeriodType)}
                            className="text-xs bg-transparent outline-none font-medium text-indigo-600 cursor-pointer"
                        >
                            <option value="WEEK">Semana</option>
                            <option value="MONTH">Mês</option>
                            <option value="SEMESTER">Semestre</option>
                            <option value="YEAR">Ano</option>
                            <option value="ALL">Geral</option>
                        </select>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsConfigOpen(true)}
                            className="bg-white border border-gray-300 text-gray-600 px-3 py-2 rounded-lg font-medium shadow-sm flex items-center gap-2 hover:bg-gray-50 text-sm"
                        >
                            <Settings size={16} /> Etapas
                        </button>
                        <button
                            onClick={() => handleOpenLeadModal(null)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm flex items-center gap-2 text-sm whitespace-nowrap"
                        >
                            <Plus size={16} /> Novo Deal
                        </button>
                    </div>
                </div>
            </div>

            {/* KANBAN BOARD */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
                <div className="flex h-full gap-4 min-w-[1600px]">
                    {localStages.map((stage, stageIdx) => {
                        const stageLeads = filteredLeads.filter(l => l.status === stage.id);
                        const totalValue = stageLeads.reduce((acc, l) => acc + l.value, 0);

                        return (
                            <div
                                key={stage.id}
                                className="flex-1 flex flex-col min-w-[280px] max-w-[350px] bg-gray-100 rounded-xl border border-gray-200 shadow-sm transition-colors"
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, stage.id)}
                            >
                                <div className={`p-4 border-t-4 ${stage.color} bg-white rounded-t-xl border-b border-gray-100`}>
                                    <div className="flex justify-between items-center mb-1">
                                        <h4 className="font-bold text-gray-800 text-sm uppercase tracking-wide">{stage.label}</h4>
                                        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full font-bold">{stageLeads.length}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 font-medium">Total: <span className="text-gray-900 font-bold">R$ {totalValue.toLocaleString('pt-BR', { notation: 'compact' })}</span></p>
                                </div>

                                <div className="p-3 flex-1 overflow-y-auto custom-scrollbar space-y-3 bg-gray-50/50">
                                    {stageLeads.map(lead => (
                                        <div
                                            key={lead.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, lead.id)}
                                            onClick={() => handleOpenLeadModal(lead)}
                                            className={`bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all group relative cursor-grab active:cursor-grabbing ${draggedLeadId === lead.id ? 'opacity-50 ring-2 ring-indigo-400' : ''}`}
                                        >

                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <GripVertical size={14} className="text-gray-300 cursor-grab" />
                                                    <h5 className="font-bold text-gray-900 text-sm line-clamp-1">{lead.companyName}</h5>
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); deleteLead(lead.id); }}
                                                    className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>

                                            <p className="text-xs text-gray-600 mb-3 font-medium pl-6">{lead.name}</p>

                                            {/* Lead Tags & Details */}
                                            <div className="space-y-2 mb-3 pl-6">
                                                <div className="flex flex-wrap gap-1">
                                                    {lead.serviceInterest && (
                                                        <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100 text-[10px] font-bold">
                                                            {lead.serviceInterest === 'BOTH' ? 'Consultoria + BPO' : (lead.serviceInterest === 'CONSULTING' ? 'Consultoria' : 'BPO')}
                                                        </span>
                                                    )}
                                                    {lead.segment && (
                                                        <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200 text-[10px]">
                                                            {lead.segment}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Pain Point Highlight */}
                                                {lead.pain && (
                                                    <p className="text-[10px] text-gray-500 italic border-l-2 border-red-200 pl-2 py-0.5">
                                                        "{lead.pain.length > 50 ? lead.pain.substring(0, 50) + '...' : lead.pain}"
                                                    </p>
                                                )}

                                                {/* Next Action Indicator */}
                                                {lead.nextAction && (
                                                    <div className={`text-[10px] px-2 py-1.5 rounded-lg border flex flex-col ${!lead.nextActionDate ? 'bg-gray-50 border-gray-200 text-gray-600' :
                                                            new Date(lead.nextActionDate) < new Date(new Date().setHours(0, 0, 0, 0)) ? 'bg-red-50 border-red-200 text-red-700' :
                                                                new Date(lead.nextActionDate).toDateString() === new Date().toDateString() ? 'bg-orange-50 border-orange-200 text-orange-700' :
                                                                    'bg-green-50 border-green-200 text-green-700'
                                                        }`}>
                                                        <span className="font-bold flex items-center gap-1">
                                                            <ArrowRight size={10} /> Próximo Passo
                                                        </span>
                                                        <span className="font-medium mt-0.5">{lead.nextAction}</span>
                                                        {lead.nextActionDate && (
                                                            <span className="opacity-80 mt-0.5">{new Date(lead.nextActionDate).toLocaleDateString()}</span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Leads without next action warning */}
                                                {!lead.nextAction && lead.status !== 'CLOSED_LOST' && lead.status !== 'CLOSED_WON' && (
                                                    <div className="text-[10px] text-red-400 flex items-center gap-1 font-medium bg-red-50 px-2 py-1 rounded">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></span> Sem ação definida
                                                    </div>
                                                )}


                                                <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-2">
                                                    <Calendar size={10} /> {new Date(lead.createdAt).toLocaleDateString('pt-BR')}
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center pt-3 border-t border-gray-50 pl-2">
                                                <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded">R$ {lead.value.toLocaleString('pt-BR')}</span>

                                                <div className="flex items-center gap-2">
                                                    {/* Quick Conversion Button if Won */}
                                                    {(lead.status === 'CLOSED_WON' || lead.status === 'WON') && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleOpenConversionModal(lead); }}
                                                            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                                                            title="Converter em Cliente"
                                                        >
                                                            <ArrowRight size={14} />
                                                        </button>
                                                    )}
                                                    {/* Add Task Button */}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); openTaskModal(lead); }}
                                                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                        title="Criar Tarefa"
                                                    >
                                                        <ListTodo size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => handleOpenLeadModal(null)}
                                        className="w-full py-2 border-2 border-dashed border-gray-300 text-gray-400 rounded-lg hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50 transition-colors text-sm font-bold flex items-center justify-center gap-1 mt-2"
                                    >
                                        <Plus size={16} /> Adicionar Lead
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div >
    );
};

export default CRMView;
