
import React, { useState } from 'react';
import { User, SystemPlan, UserRole } from '../types';
import { getSystemPlans, addSystemPlan, updateSystemPlan, deleteSystemPlan } from '../services/mockData';
import PlanModal from './PlanModal';
import { Plus, Edit2, Trash2, CheckCircle2, Star, Shield, LayoutGrid, List, Briefcase, Users } from 'lucide-react';
import { ROLE_LABELS } from '../constants';

interface PlansManagementProps {
  currentUser: User;
  onRefresh: () => void;
}

const PlansManagement: React.FC<PlansManagementProps> = ({ currentUser, onRefresh }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SystemPlan | null>(null);
  
  const plans = getSystemPlans();

  // All plans target ADMIN role by default in the new simplified structure
  const companyPlans = plans; 

  const handleOpenAdd = () => {
    setEditingPlan(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (plan: SystemPlan) => {
    setEditingPlan(plan);
    setIsModalOpen(true);
  };

  const handleSave = (data: Partial<SystemPlan>) => {
    if (editingPlan) {
        updateSystemPlan(editingPlan.id, data, currentUser);
    } else {
        addSystemPlan(data, currentUser);
    }
    onRefresh();
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este plano? Isso não afetará assinaturas ativas imediatamente, mas impedirá novas.')) {
        deleteSystemPlan(id, currentUser);
        onRefresh();
    }
  };

  const renderPlanCard = (plan: SystemPlan) => (
    <div key={plan.id} className={`relative bg-white rounded-xl shadow-sm border flex flex-col transition-all hover:shadow-md ${plan.active ? 'border-gray-200' : 'border-gray-100 bg-gray-50 opacity-80'}`}>
        {plan.recommended && (
            <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg flex items-center gap-1 shadow-sm z-10">
                <Star size={10} fill="white" /> RECOMENDADO
            </div>
        )}
        
        <div className="p-6 border-b border-gray-100 flex-1">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                    <div className="flex gap-2 mt-1 flex-wrap">
                        {plan.targetRoles.map(role => (
                            <span key={role} className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-semibold border border-indigo-100">
                                {ROLE_LABELS[role]}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
            
            <p className="text-sm text-gray-500 mb-6 min-h-[40px]">{plan.description}</p>
            
            <div className="mb-6">
                {plan.price === 0 ? (
                    <span className="text-3xl font-bold text-gray-900">Grátis</span>
                ) : (
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-gray-900">R$ {plan.price.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                        <span className="text-sm text-gray-500">/{plan.billingCycle === 'MONTHLY' ? 'mês' : 'ano'}</span>
                    </div>
                )}
            </div>

            <ul className="space-y-3 mb-6">
                {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                        <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                    </li>
                ))}
            </ul>
        </div>

        <div className="p-4 bg-gray-50 rounded-b-xl flex gap-3">
            <button 
                onClick={() => handleOpenEdit(plan)}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors shadow-sm"
            >
                <Edit2 size={16} /> Editar
            </button>
            <button 
                onClick={() => handleDelete(plan.id)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
                <Trash2 size={20} />
            </button>
        </div>
    </div>
  );

  return (
    <div className="space-y-10">
      <PlanModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        initialData={editingPlan}
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Planos e Preços</h2>
          <p className="text-gray-500 mt-1">Gerencie o portfólio de produtos do Fingestão SaaS.</p>
        </div>
        <button 
            onClick={handleOpenAdd}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-medium transition-all shadow-sm flex items-center gap-2"
        >
            <Plus size={18} /> Novo Plano
        </button>
      </div>

      <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <Briefcase size={20} />
              </div>
              <div>
                  <h3 className="text-lg font-bold text-gray-800">Planos Disponíveis</h3>
                  <p className="text-sm text-gray-500">Ofertas para clientes finais.</p>
              </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {companyPlans.map(renderPlanCard)}
              {companyPlans.length === 0 && <div className="text-gray-400 italic text-sm p-4">Nenhum plano cadastrado.</div>}
          </div>
      </div>
    </div>
  );
};

export default PlansManagement;
