import React, { useState, useEffect } from 'react';
import { X, Save, User, Building2, Phone, Mail, DollarSign, FileText, CheckCircle2 } from 'lucide-react';
import { CRMLead, KanbanStage, Company } from '../types';
import { crmService } from '../services/crmService';

interface LeadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    lead?: CRMLead | null; // If provided, edit mode
    companyId: string;
    stages: KanbanStage[];
    companies?: Company[]; // List of available companies for selection
}

const LeadModal: React.FC<LeadModalProps> = ({ isOpen, onClose, onSave, lead, companyId, stages, companies = [] }) => {
    const [name, setName] = useState('');
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [companyName, setCompanyName] = useState(''); // Text input for company name (details)
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [value, setValue] = useState<number>(0);
    const [status, setStatus] = useState('NEW');
    const [notes, setNotes] = useState('');
    const [serviceInterest, setServiceInterest] = useState<'CONSULTING' | 'BPO' | 'BOTH' | ''>('');
    const [source, setSource] = useState('');
    const [segment, setSegment] = useState('');
    const [revenue, setRevenue] = useState(0);
    const [pain, setPain] = useState('');
    const [nextAction, setNextAction] = useState('');
    const [nextActionDate, setNextActionDate] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (lead) {
            setName(lead.name);
            setCompanyName(lead.companyName || '');
            setEmail(lead.email || '');
            setPhone(lead.phone || '');
            setValue(lead.value || 0);
            setStatus(lead.status || 'NEW');
            setNotes(lead.notes || '');
            setSelectedCompanyId(lead.companyId);
            setServiceInterest(lead.serviceInterest || '');
            setSource(lead.source || '');
            setSegment(lead.segment || '');
            setRevenue(lead.revenue || 0);
            setPain(lead.pain || '');
            setNextAction(lead.nextAction || '');
            setNextActionDate(lead.nextActionDate || '');
        } else {
            // Reset for new lead
            setName('');
            setCompanyName('');
            setEmail('');
            setPhone('');
            setValue(0);
            setStatus('NEW');
            setNotes('');
            setServiceInterest('');
            setSource('');
            setSegment('');
            setRevenue(0);
            setPain('');
            setNextAction('');
            setNextActionDate('');
            // If companyId is specific (not GLOBAL), pre-select it
            setSelectedCompanyId(companyId !== 'GLOBAL' ? companyId : '');
        }
    }, [lead, isOpen, companyId]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedCompanyId) {
            alert('Por favor, selecione uma empresa.');
            return;
        }

        setLoading(true);

        try {
            const leadData: Partial<CRMLead> = {
                name,
                companyName,
                email,
                phone,
                value,
                status,
                notes,
                companyId: selectedCompanyId,
                serviceInterest: serviceInterest as any,
                source,
                segment,
                revenue,
                pain,
                nextAction,
                nextActionDate: nextActionDate || undefined
            };

            if (lead) {
                await crmService.updateLead(lead.id, leadData);
            } else {
                await crmService.createLead(leadData);
            }
            onSave();
            onClose();
        } catch (error) {
            console.error('Error saving lead:', error);
            alert('Erro ao salvar lead.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50 shrink-0">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <User className="text-indigo-600" size={24} />
                        {lead ? 'Editar Lead' : 'Novo Lead'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        {/* Company Selection */}
                        {(companyId === 'GLOBAL' || (companies && companies.length > 0 && !lead)) && (
                            <div className="col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Vincular à Empresa <span className="text-red-500">*</span>
                                </label>
                                <select
                                    required
                                    value={selectedCompanyId}
                                    onChange={e => setSelectedCompanyId(e.target.value)}
                                    disabled={!!lead || companyId !== 'GLOBAL'}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                                >
                                    <option value="">Selecione uma empresa...</option>
                                    {companies?.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Basic Info */}
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Nome do Contato <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                                placeholder="João Silva"
                            />
                        </div>

                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Empresa (Cliente)</label>
                            <input
                                type="text"
                                value={companyName}
                                onChange={e => setCompanyName(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                                placeholder="Empresa Ltda"
                            />
                        </div>

                        {/* Enrichment Fields */}
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Segmento</label>
                            <input
                                type="text"
                                value={segment}
                                onChange={e => setSegment(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                                placeholder="Ex: Varejo, Tecnologia..."
                            />
                        </div>

                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Faturamento (Est.)</label>
                            <input
                                type="number"
                                value={revenue}
                                onChange={e => setRevenue(Number(e.target.value))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                                placeholder="0,00"
                            />
                        </div>

                        {/* Qualification */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Interesse</label>
                            <select
                                value={serviceInterest}
                                onChange={e => setServiceInterest(e.target.value as any)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                            >
                                <option value="">Selecione...</option>
                                <option value="CONSULTING">Consultoria Financeira</option>
                                <option value="BPO">BPO Financeiro</option>
                                <option value="BOTH">Ambos</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Origem</label>
                            <input
                                type="text"
                                value={source}
                                onChange={e => setSource(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                                placeholder="Ex: Indicação"
                            />
                        </div>

                        {/* Pain Points */}
                        <div className="col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Dor Principal (Pain Point)</label>
                            <textarea
                                value={pain}
                                onChange={e => setPain(e.target.value)}
                                rows={2}
                                className="w-full px-4 py-2 border border-blue-100 bg-blue-50/50 rounded-lg text-sm border-dashed"
                                placeholder="Qual o principal problema que o cliente quer resolver?"
                            ></textarea>
                        </div>

                        {/* Next Action */}
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Próximo Passo</label>
                            <input
                                type="text"
                                value={nextAction}
                                onChange={e => setNextAction(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                                placeholder="Ex: Enviar proposta, Ligar..."
                            />
                        </div>

                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Data Próx. Passo</label>
                            <input
                                type="date"
                                value={nextActionDate ? new Date(nextActionDate).toISOString().split('T')[0] : ''}
                                onChange={e => setNextActionDate(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                        </div>


                        {/* Contact Info */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Telefone</label>
                            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Etapa</label>
                            <select value={status} onChange={e => setStatus(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                                {stages.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Valor do Deal (R$)</label>
                            <input type="number" value={value} onChange={e => setValue(Number(e.target.value))} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
                        </div>

                        {/* Notes */}
                        <div className="col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Notas Gerais</label>
                            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Anotações gerais..."></textarea>
                        </div>
                    </div>
                </form>

                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition-colors text-sm"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2 text-sm disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        <Save size={18} />
                        {loading ? 'Salvando...' : 'Salvar Lead'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LeadModal;
