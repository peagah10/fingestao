import React, { useState, useMemo, useEffect } from 'react';
import { CRMLead, KanbanStage, Company } from '../types';
import { Filter, Mail, Phone, Search, Building2, ArrowUpRight, Plus, Trash2, Edit } from 'lucide-react';
import LeadModal from './LeadModal';
import { crmService } from '../services/crmService';

interface LeadsViewProps {
    leads: CRMLead[];
    companyId: string;
    onRefresh: () => void;
    companies?: Company[]; // Optional for lead creation modal in global view
}

const LeadsView: React.FC<LeadsViewProps> = ({ leads, companyId, onRefresh, companies }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentLead, setCurrentLead] = useState<CRMLead | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Default stages for modal dropdown if not passed (LeadsView usually doesn't have stage config yet)
    // Ideally we should pass stages prop too, but for now we use default
    const [stages, setStages] = useState<KanbanStage[]>([
        { id: 'NEW', label: 'Novo Lead', color: 'border-blue-400', bg: 'bg-blue-50', order: 1 },
        { id: 'CONTACTED', label: 'Contato Realizado', color: 'border-indigo-400', bg: 'bg-indigo-50', order: 2 },
        { id: 'DIAGNOSIS', label: 'Diagnóstico', color: 'border-yellow-400', bg: 'bg-yellow-50', order: 3 },
        { id: 'PROPOSAL', label: 'Proposta Enviada', color: 'border-orange-400', bg: 'bg-orange-50', order: 4 },
        { id: 'CLOSED_WON', label: 'Ganhou', color: 'border-green-400', bg: 'bg-green-50', order: 5 },
        { id: 'CLOSED_LOST', label: 'Perdido', color: 'border-red-400', bg: 'bg-red-50', order: 6 }
    ]);

    useEffect(() => {
        const loadStages = async () => {
            const savedStages = await crmService.fetchFunnelStages(companyId);
            if (savedStages.length > 0) {
                const mapped: KanbanStage[] = savedStages.map(s => ({
                    id: s.id,
                    label: s.name,
                    color: s.color || 'border-gray-400',
                    bg: 'bg-gray-50',
                    order: s.order
                }));
                setStages(mapped);
            }
        };
        loadStages();
    }, [companyId]);

    const getStageLabel = (statusId: string) => {
        const stage = stages.find(s => s.id === statusId);
        if (stage) return stage.label;

        // Fallback for old string IDs if somehow missed
        const map: Record<string, string> = {
            'NEW': 'Novo Lead',
            'CONTACTED': 'Contato Realizado',
            'DIAGNOSIS': 'Diagnóstico',
            'PROPOSAL': 'Proposta Enviada',
            'CLOSED_WON': 'Ganhou',
            'CLOSED_LOST': 'Perdido',
            'QUALIFIED': 'Qualificado',
            'NEGOTIATION': 'Negociação'
        };
        return map[statusId] || statusId;
    };

    const handleOpenModal = (lead: CRMLead | null) => {
        setCurrentLead(lead);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza que deseja remover este lead?')) {
            await crmService.deleteLead(id);
            onRefresh();
        }
    };

    const filteredLeads = leads.filter(l =>
        l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.companyName && l.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <LeadModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={onRefresh}
                lead={currentLead}
                companyId={companyId}
                stages={stages}
                companies={companies}
            />

            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Filter className="text-indigo-600" size={28} /> Base de Leads
                    </h2>
                    <p className="text-gray-500 mt-1">Gerencie contatos e potenciais clientes.</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar lead..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                    </div>
                    <button
                        onClick={() => handleOpenModal(null)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm flex items-center gap-2 text-sm whitespace-nowrap"
                    >
                        <Plus size={16} /> Novo Lead
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase">
                        <tr>
                            <th className="px-6 py-4">Nome / Empresa</th>
                            <th className="px-6 py-4">Status / Interesse</th>
                            <th className="px-6 py-4">Contato</th>
                            <th className="px-6 py-4 text-right">Potencial (R$)</th>
                            <th className="px-6 py-4">Data Criação</th>
                            <th className="px-6 py-4 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredLeads.map(lead => (
                            <tr key={lead.id} className="hover:bg-gray-50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div>
                                        <p className="font-bold text-gray-900">{lead.name}</p>
                                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                            <Building2 size={10} /> {lead.companyName || 'N/A'}
                                        </p>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                        <span className={`px - 2 py - 0.5 w - fit rounded text - [10px] font - bold uppercase border bg - gray - 50 text - gray - 700 border - gray - 200`}>
                                            {getStageLabel(lead.status)}
                                        </span>
                                        {lead.serviceInterest && (
                                            <span className="text-[10px] text-gray-500 font-medium">
                                                {lead.serviceInterest === 'BOTH' ? 'Consultoria + BPO' : (lead.serviceInterest === 'CONSULTING' ? 'Consultoria' : 'BPO')}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-xs text-gray-600">
                                            <Mail size={12} /> {lead.email}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-600">
                                            <Phone size={12} /> {lead.phone}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right font-medium text-gray-900">
                                    R$ {lead.value.toLocaleString('pt-BR')}
                                </td>
                                <td className="px-6 py-4 text-gray-500 text-xs">
                                    {new Date(lead.createdAt).toLocaleDateString('pt-BR')}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => handleOpenModal(lead)}
                                            className="text-gray-400 hover:text-indigo-600 p-1 rounded transition-colors"
                                            title="Editar"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(lead.id)}
                                            className="text-gray-400 hover:text-red-600 p-1 rounded transition-colors"
                                            title="Excluir"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default LeadsView;
