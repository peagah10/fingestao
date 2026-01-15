
import React, { useState, useEffect } from 'react';
import { X, Check, Plus, Trash2, CreditCard, ShieldCheck } from 'lucide-react';
import { SystemPlan, UserRole } from '../types';
import { ROLE_LABELS } from '../constants';

interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<SystemPlan>) => void;
  initialData?: SystemPlan | null;
}

const PlanModal: React.FC<PlanModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [active, setActive] = useState(true);
  const [recommended, setRecommended] = useState(false);
  
  // Features List
  const [features, setFeatures] = useState<string[]>([]);
  const [newFeature, setNewFeature] = useState('');

  // Target Roles (Multi-select)
  const [targetRoles, setTargetRoles] = useState<UserRole[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setDescription(initialData.description);
        setPrice(initialData.price.toString());
        setBillingCycle(initialData.billingCycle);
        setActive(initialData.active);
        setRecommended(initialData.recommended || false);
        setFeatures(initialData.features || []);
        setTargetRoles(initialData.targetRoles || []);
      } else {
        setName('');
        setDescription('');
        setPrice('');
        setBillingCycle('MONTHLY');
        setActive(true);
        setRecommended(false);
        setFeatures(['']);
        setTargetRoles([UserRole.ADMIN]);
      }
    }
  }, [isOpen, initialData]);

  const handleAddFeature = () => {
    if (newFeature.trim()) {
      setFeatures([...features, newFeature.trim()]);
      setNewFeature('');
    }
  };

  const handleRemoveFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const toggleRole = (role: UserRole) => {
    if (targetRoles.includes(role)) {
      setTargetRoles(targetRoles.filter(r => r !== role));
    } else {
      setTargetRoles([...targetRoles, role]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) return;

    onSave({
      id: initialData?.id,
      name,
      description,
      price: parseFloat(price),
      billingCycle,
      features: features.filter(f => f.trim() !== ''),
      targetRoles,
      active,
      recommended
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
        
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard size={24} className="text-indigo-600"/> 
            {initialData ? 'Editar Plano' : 'Novo Plano'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <form id="planForm" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nome do Plano</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Profissional, Enterprise..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
               </div>
               
               <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Preço (R$)</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
               </div>

               <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Ciclo de Cobrança</label>
                  <select
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value as any)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  >
                    <option value="MONTHLY">Mensal</option>
                    <option value="YEARLY">Anual</option>
                  </select>
               </div>

               <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Descrição Curta</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Uma breve descrição dos benefícios..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
               </div>
            </div>

            {/* Target Roles */}
            <div>
               <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                 <ShieldCheck size={16} /> Perfis de Acesso Permitidos
               </label>
               <div className="flex flex-wrap gap-2">
                  {[UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE].map(role => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRole(role)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                        targetRoles.includes(role)
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {ROLE_LABELS[role]}
                    </button>
                  ))}
               </div>
               <p className="text-xs text-gray-500 mt-1">Selecione quem poderá visualizar e contratar este plano.</p>
            </div>

            {/* Features */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
               <label className="block text-sm font-bold text-gray-700 mb-3">Funcionalidades Inclusas</label>
               
               <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFeature())}
                    placeholder="Adicionar funcionalidade (ex: Suporte 24h)..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <button 
                    type="button" 
                    onClick={handleAddFeature}
                    className="bg-gray-900 text-white p-2 rounded-lg hover:bg-black transition-colors"
                  >
                    <Plus size={20}/>
                  </button>
               </div>

               <ul className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                  {features.map((feat, idx) => (
                    <li key={idx} className="flex justify-between items-center bg-white px-3 py-2 rounded border border-gray-200 text-sm">
                       <span>{feat}</span>
                       <button 
                         type="button" 
                         onClick={() => handleRemoveFeature(idx)}
                         className="text-gray-400 hover:text-red-500"
                       >
                         <Trash2 size={16}/>
                       </button>
                    </li>
                  ))}
                  {features.length === 0 && <li className="text-gray-400 text-sm italic text-center py-2">Nenhuma funcionalidade adicionada.</li>}
               </ul>
            </div>

            {/* Toggles */}
            <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"/>
                    <span className="text-sm font-medium text-gray-700">Plano Ativo</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={recommended} onChange={e => setRecommended(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"/>
                    <span className="text-sm font-medium text-gray-700">Recomendado (Destaque)</span>
                </label>
            </div>

          </form>
        </div>

        <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-3 justify-end">
           <button type="button" onClick={onClose} className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors">
             Cancelar
           </button>
           <button type="submit" form="planForm" className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2">
             <Check size={18}/> Salvar Plano
           </button>
        </div>
      </div>
    </div>
  );
};

export default PlanModal;
