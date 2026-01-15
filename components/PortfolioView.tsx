import React, { useState, useEffect } from 'react';
import { Company, User, PlanType } from '../types';
import { companyService } from '../services/companyService';
import { Building2, Search, ExternalLink, Plus, X, Pencil, Trash2, MapPin, Image as ImageIcon, Loader2, Upload } from 'lucide-react';

interface PortfolioViewProps {
    currentUser: User;
    onSelectCompany: (id: string) => void;
}

const PortfolioView: React.FC<PortfolioViewProps> = ({ currentUser, onSelectCompany }) => {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal States
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form States
    const [formData, setFormData] = useState<Partial<Company>>({
        name: '',
        cnpj: '',
        address: '',
        logo: ''
    });
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

    // File Upload
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, logo: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    useEffect(() => {
        loadCompanies();
    }, [currentUser]); // Reload if user changes, though unlikely in SPA session

    const loadCompanies = async () => {
        setLoading(true);
        const data = await companyService.fetchCompanies();
        if (data) {
            setCompanies(data);
        }
        setLoading(false);
    };

    const filtered = companies.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.cnpj.includes(searchTerm)
    );

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const resetForm = () => {
        setFormData({ name: '', cnpj: '', address: '', logo: '' });
        setSelectedCompany(null);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.cnpj) return;

        setSubmitting(true);
        const { data, error } = await companyService.createCompany({
            ...formData,
            primaryColor: 'indigo', // Default
            active: true,
            plan: PlanType.FREE
        });

        if (data) {
            setCompanies(prev => [data, ...prev]);
            setIsCreateModalOpen(false);
            resetForm();
        } else {
            alert('Erro ao criar empresa: ' + error);
        }
        setSubmitting(false);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCompany || !formData.name || !formData.cnpj) return;

        setSubmitting(true);
        const success = await companyService.updateCompany(selectedCompany.id, formData);

        if (success) {
            setCompanies(prev => prev.map(c => c.id === selectedCompany.id ? { ...c, ...formData } : c));
            setIsEditModalOpen(false);
            resetForm();
        } else {
            alert('Erro ao atualizar empresa');
        }
        setSubmitting(false);
    };

    const handleDelete = async () => {
        if (!selectedCompany) return;

        setSubmitting(true);
        const success = await companyService.deleteCompany(selectedCompany.id);

        if (success) {
            setCompanies(prev => prev.filter(c => c.id !== selectedCompany.id));
            setIsDeleteModalOpen(false);
            resetForm();
        } else {
            alert('Erro ao excluir empresa');
        }
        setSubmitting(false);
    };

    const openEditModal = (company: Company) => {
        setSelectedCompany(company);
        setFormData({
            name: company.name,
            cnpj: company.cnpj,
            address: company.address || '',
            logo: company.logo || ''
        });
        setIsEditModalOpen(true);
    };

    const openDeleteModal = (company: Company) => {
        setSelectedCompany(company);
        setIsDeleteModalOpen(true);
    };

    // Import State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importToken, setImportToken] = useState('');

    const handleImport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!importToken) return;

        setSubmitting(true);
        const result = await companyService.importCompany(importToken);
        setSubmitting(false);

        if (result.success) {
            alert(result.message);
            setIsImportModalOpen(false);
            setImportToken('');
            loadCompanies(); // Refresh list
        } else {
            alert('Erro: ' + result.message);
        }
    };

    return (
        <div className="space-y-6">

            {/* Import Modal */}
            {isImportModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <ExternalLink size={24} className="text-gray-700" />
                                Importar Empresa
                            </h3>
                            <button onClick={() => setIsImportModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleImport} className="p-6 space-y-4">
                            <p className="text-sm text-gray-500">
                                Insira o <b>Token de Acesso</b> gerado pelo administrador da empresa em <i>Configurações &gt; Dados Cadastrais</i>.
                            </p>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Token da Empresa</label>
                                <input
                                    type="text"
                                    required
                                    value={importToken}
                                    onChange={(e) => setImportToken(e.target.value)}
                                    placeholder="sk_..."
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                                />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsImportModalOpen(false)} className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50">Cancelar</button>
                                <button type="submit" disabled={submitting} className="flex-1 py-2.5 bg-gray-900 text-white font-medium rounded-lg hover:bg-black shadow-sm flex items-center justify-center gap-2">
                                    {submitting ? <Loader2 className="animate-spin" size={18} /> : 'Importar Acesso'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}


            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Building2 size={24} className="text-indigo-600" />
                                Novo Cliente
                            </h3>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Razão Social / Nome</label>
                                <input name="name" type="text" required value={formData.name} onChange={handleInputChange} placeholder="Ex: Empresa X Ltda" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">CNPJ</label>
                                <input name="cnpj" type="text" required value={formData.cnpj} onChange={handleInputChange} placeholder="00.000.000/0001-00" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Endereço</label>
                                <div className="relative">
                                    <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input name="address" type="text" value={formData.address} onChange={handleInputChange} placeholder="Rua, Número, Cidade - UF" className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Logo da Empresa</label>
                                <div className="flex items-center gap-4">
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-16 h-16 rounded-lg bg-gray-50 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-indigo-400 relative group overflow-hidden"
                                    >
                                        {formData.logo ? (
                                            <img src={formData.logo} alt="Logo" className="w-full h-full object-contain" />
                                        ) : (
                                            <ImageIcon size={20} className="text-gray-400 group-hover:text-indigo-500" />
                                        )}
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Upload size={16} className="text-white" />
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs text-gray-500 mb-2">Recomendado: Imagem PNG ou JPG, fundo transparente.</p>
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline"
                                        >
                                            Escolher Imagem
                                        </button>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleLogoUpload}
                                            accept="image/*"
                                            className="hidden"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50">Cancelar</button>
                                <button type="submit" disabled={submitting} className="flex-1 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-sm flex items-center justify-center gap-2">
                                    {submitting ? <Loader2 className="animate-spin" size={18} /> : <><Plus size={18} /> Cadastrar</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Pencil size={24} className="text-orange-600" />
                                Editar Cliente
                            </h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdate} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Razão Social / Nome</label>
                                <input name="name" type="text" required value={formData.name} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">CNPJ</label>
                                <input name="cnpj" type="text" required value={formData.cnpj} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Endereço</label>
                                <div className="relative">
                                    <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input name="address" type="text" value={formData.address} onChange={handleInputChange} className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Logo da Empresa</label>
                                <div className="flex items-center gap-4">
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-16 h-16 rounded-lg bg-gray-50 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-indigo-400 relative group overflow-hidden"
                                    >
                                        {formData.logo ? (
                                            <img src={formData.logo} alt="Logo" className="w-full h-full object-contain" />
                                        ) : (
                                            <ImageIcon size={20} className="text-gray-400 group-hover:text-indigo-500" />
                                        )}
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Upload size={16} className="text-white" />
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs text-gray-500 mb-2">Recomendado: Imagem PNG ou JPG, fundo transparente.</p>
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline"
                                        >
                                            Escolher Imagem
                                        </button>
                                        {/* Input is already rendered in the Create modal if it shares the component structure or we can render another one here. 
                                            Since `fileInputRef` is unique to the component instance, and modals are conditional, we might have issues if both potential inputs mount. 
                                            However, `PortfolioView` conditionally renders modals: `{isCreateModalOpen && ...}` so only one exists at a time. 
                                            Wait, `fileInputRef` is attached to an element. If the element is unmounted (modal closed), ref becomes null. 
                                            So we must re-render the input inside this modal too.
                                        */}
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleLogoUpload}
                                            accept="image/*"
                                            className="hidden"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50">Cancelar</button>
                                <button type="submit" disabled={submitting} className="flex-1 py-2.5 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 shadow-sm flex items-center justify-center gap-2">
                                    {submitting ? <Loader2 className="animate-spin" size={18} /> : 'Salvar Alterações'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {isDeleteModalOpen && selectedCompany && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Excluir Empresa?</h3>
                            <p className="text-gray-500 mb-6">
                                Tem certeza que deseja excluir <b>{selectedCompany.name}</b>? Esta ação não pode ser desfeita.
                            </p>
                            <div className="flex gap-3">
                                <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50">Cancelar</button>
                                <button onClick={handleDelete} disabled={submitting} className="flex-1 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 shadow-sm flex items-center justify-center gap-2">
                                    {submitting ? <Loader2 className="animate-spin" size={18} /> : 'Sim, Excluir'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Building2 className="text-indigo-600" size={28} /> Carteira de Empresas
                    </h2>
                    <p className="text-gray-500 mt-1">Gerencie e acesse os ambientes dos seus clientes.</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar empresa..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black bg-white"
                        />
                    </div>
                    <button
                        onClick={() => { resetForm(); setIsCreateModalOpen(true); }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium shadow-sm flex items-center gap-2 transition-colors whitespace-nowrap"
                    >
                        <Plus size={18} /> Novo Cliente
                    </button>
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2.5 rounded-lg font-medium shadow-sm flex items-center gap-2 transition-colors whitespace-nowrap"
                    >
                        <ExternalLink size={18} /> Importar
                    </button>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <Loader2 className="animate-spin text-indigo-600" size={48} />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map(comp => (
                        <div key={comp.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all group flex flex-col relative h-full">

                            {/* Actions (Hover) */}
                            <div className="absolute top-6 right-24 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <button
                                    onClick={(e) => { e.stopPropagation(); openEditModal(comp); }}
                                    className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-md transition-colors"
                                    title="Editar"
                                >
                                    <Pencil size={16} />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); openDeleteModal(comp); }}
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                    title="Excluir"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            {/* Badge */}
                            <div className={`absolute top-6 right-6 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${comp.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {comp.active ? 'Ativa' : 'Inativa'}
                            </div>

                            {/* Logo */}
                            <div className="h-16 w-16 rounded-full border border-gray-100 flex items-center justify-center overflow-hidden bg-white mb-4 shadow-sm">
                                {comp.logo ? (
                                    <img src={comp.logo} alt={comp.name} className="h-full w-full object-cover" />
                                ) : (
                                    <Building2 className="text-gray-300" size={32} />
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 mb-6">
                                <h3 className="font-bold text-gray-900 text-xl mb-1 line-clamp-1" title={comp.name}>{comp.name}</h3>
                                <p className="text-gray-500 text-sm mb-4">{comp.cnpj}</p>

                                {comp.address && (
                                    <div className="flex items-start gap-2 text-xs text-gray-400">
                                        <MapPin size={14} className="mt-0.5 shrink-0" />
                                        <span className="line-clamp-2">{comp.address}</span>
                                    </div>
                                )}
                            </div>

                            {/* Footer Button */}
                            <button
                                onClick={() => onSelectCompany(comp.id)}
                                className="w-full py-2.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2 transition-all mt-auto"
                            >
                                Acessar Ambiente <ExternalLink size={16} />
                            </button>
                        </div>
                    ))}

                    {filtered.length === 0 && (
                        <div className="col-span-full py-16 text-center border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
                            <Building2 size={48} className="mx-auto mb-4 text-gray-300" />
                            <p className="text-gray-500 font-medium">Nenhuma empresa encontrada.</p>
                            <button onClick={() => { resetForm(); setIsCreateModalOpen(true); }} className="mt-4 text-indigo-600 font-bold hover:underline">
                                Cadastrar primeiro cliente
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PortfolioView;
