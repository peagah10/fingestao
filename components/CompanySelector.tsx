
import React, { useState } from 'react';
import { Company, PlanType } from '../types';
import { Building2, ArrowRight, Lock, Plus, Edit2, Trash2, Settings, MapPin } from 'lucide-react';
import CompanyModal from './CompanyModal';
import { companyService } from '../services/companyService';

interface CompanySelectorProps {
  companies: Company[];
  onSelect: (companyId: string) => void;
  onRefresh?: () => void;
}

// Temporary currentUser mock retrieval (Ideally passed as prop, but adapting to existing signature)
// We will modify the App to pass user if needed, but for now we'll assume a global context or pass it down.
// However, looking at App.tsx, CompanySelector only receives companies and onSelect.
// To support full CRUD properly with logs, we'd need the user. 
// For this implementation, we will mock the user in the update function call or assume current session.
// Update: To keep it clean without changing App.tsx props interface massively, we'll use a placeholder user for logs or
// rely on the backend (mock) to handle it if possible. 
// Actually, let's just implement the UI logic and call the mock services. The mock service for createCompany expects a user.
// We will access the global USERS array to find the current user or simulate. 
import { USERS } from '../services/mockData';

const CompanySelector: React.FC<CompanySelectorProps> = ({ companies, onSelect, onRefresh }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  // Local state to force re-render on CRUD operations since props come from parent
  // In a real app, parent should manage state or use context. 
  // We will trigger a refresh by calling a dummy state update or rely on parent re-render if App.tsx updates.
  // Since App.tsx passes filtered companies from global COMPANIES, we need to ensure App re-renders.
  // The App.tsx has a `dataVersion` but CompanySelector doesn't have a callback to update it.
  // We will simply rely on the fact that `companies` prop is a filtered view of the global array. 
  // If we modify the global array, React might not know. 
  // We will add a local refresh toggle to force update if needed, but optimally App.tsx should handle this.
  // For now, let's assume App.tsx re-renders or we might need to reload.
  // Better approach: We can't easily force App.tsx to re-render from here without a callback.
  // *Correction*: App.tsx passes `myCompanies`. If we modify `COMPANIES` global, `App` won't know.
  // However, the user asked for this feature *here*. 
  // We will implement the UI. In a real React app, `onRefresh` prop would be standard. 
  // I will add a simple `window.location.reload()` equivalent or assume the user accepts a manual refresh for this prototype, 
  // OR strictly, I can't modify App.tsx signature in this specific Change block without modifying App.tsx again.
  // I will implement the logic and assume immediate feedback via local state for perceived speed.

  const handleCreate = () => {
    setEditingCompany(null);
    setIsModalOpen(true);
  };

  const handleEdit = (e: React.MouseEvent, company: Company) => {
    e.stopPropagation();
    setEditingCompany(company);
    setIsModalOpen(true);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Tem certeza que deseja excluir esta empresa? Todos os dados serão perdidos.')) {
      await companyService.deleteCompany(id);
      if (onRefresh) onRefresh();
    }
  };

  const handleSave = async (data: Partial<Company>) => {
    let success = false;
    let errorMessage = '';
    if (editingCompany) {
      success = await companyService.updateCompany(editingCompany.id, data);
    } else {
      const { data: newCompany, error } = await companyService.createCompany(data);
      success = !!newCompany;
      if (error) errorMessage = error;
    }

    if (success) {
      setIsModalOpen(false);
      if (onRefresh) onRefresh();
    } else {
      alert(`Erro ao salvar empresa: ${errorMessage || 'Verifique os dados ou a conexão.'}`);
    }
  };

  // Map color names to Tailwind classes for borders/backgrounds
  const getColorClass = (color?: string) => {
    const c = color || 'indigo';
    return `border-${c}-500`;
  };

  const getBgClass = (color?: string) => {
    const c = color || 'indigo';
    return `bg-${c}-50 text-${c}-600 group-hover:bg-${c}-100`;
  };

  return (
    <div className="max-w-6xl mx-auto">
      <CompanyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        initialData={editingCompany}
      />

      <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Bem-vindo ao FinGestão</h2>
          <p className="mt-2 text-gray-600">Selecione ou gerencie suas empresas para acessar o painel.</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold shadow-lg transition-all transform hover:-translate-y-0.5"
        >
          <Plus size={20} /> Nova Empresa
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        {/* Render Companies */}
        {companies.map((company) => (
          <div
            key={company.id}
            className={`bg-white rounded-xl shadow-sm border border-gray-200 border-l-4 p-6 hover:shadow-md transition-all group flex flex-col relative h-full ${!company.active ? 'opacity-75 grayscale-[0.5]' : ''}`}
            style={{ borderLeftColor: `var(--color-${company.primaryColor || 'indigo'}-500, ${company.primaryColor || '#6366f1'})` }}
          >
            {/* Action Menu (Top Right - Hover) */}
            <div className="absolute top-6 right-24 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <button
                onClick={(e) => handleEdit(e, company)}
                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title="Editar"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={(e) => handleDelete(e, company.id)}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Excluir"
              >
                <Trash2 size={16} />
              </button>
            </div>

            {/* Badges (Top Right) */}
            <div className="absolute top-6 right-6 flex gap-2">
              {/* Plan Badge */}
              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${company.plan === PlanType.PREMIUM
                ? 'bg-amber-100 text-amber-800'
                : (company.plan === PlanType.ENTERPRISE ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-600')
                }`}>
                {company.plan}
              </span>
              {/* Status Badge */}
              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${company.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {company.active ? 'Ativa' : 'Inativa'}
              </span>
            </div>

            {/* Logo */}
            <div className="h-16 w-16 rounded-full border border-gray-100 flex items-center justify-center overflow-hidden bg-white mb-4 shadow-sm">
              {company.logo ? (
                <img src={company.logo} alt={company.name} className="h-full w-full object-cover" />
              ) : (
                <Building2 className="text-gray-300" size={32} />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 mb-6">
              <h3 className="font-bold text-gray-900 text-xl mb-1 line-clamp-1" title={company.name}>{company.name}</h3>
              <p className="text-gray-500 text-sm mb-4 font-mono">{company.cnpj}</p>

              {company.address && (
                <div className="flex items-start gap-2 text-xs text-gray-400">
                  <MapPin size={14} className="mt-0.5 shrink-0" />
                  <span className="line-clamp-2">{company.address}</span>
                </div>
              )}
            </div>

            {/* Footer Button */}
            <button
              onClick={() => company.active && onSelect(company.id)}
              disabled={!company.active}
              className={`w-full py-2.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg flex items-center justify-center gap-2 transition-all mt-auto ${company.active ? 'hover:bg-gray-50' : 'cursor-not-allowed opacity-50'}`}
            >
              {company.active ? (
                <>Acessar Ambiente <ArrowRight size={16} /></>
              ) : (
                <>Acesso Bloqueado <Lock size={16} /></>
              )}
            </button>
          </div>
        ))}

        {/* Add New Placeholder Card (Optional, for visual cue) */}
        {companies.length === 0 && (
          <div
            onClick={handleCreate}
            className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-gray-400 hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50 transition-all cursor-pointer min-h-[200px]"
          >
            <Plus size={48} className="mb-2 opacity-50" />
            <span className="font-bold text-lg">Cadastrar Primeira Empresa</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanySelector;
