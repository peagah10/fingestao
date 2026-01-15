
import React, { useState } from 'react';
import { X, Plus, Edit2, Trash2, Tags, BookOpen } from 'lucide-react';
import { AssetCategory, AccountPlanItem } from '../types';

interface AssetCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: AssetCategory[];
  accountPlan: AccountPlanItem[];
  onCreate: (data: { name: string; linkedAccountPlanId: string }) => void;
  onEdit: (id: string, data: { name: string; linkedAccountPlanId: string }) => void;
  onDelete: (id: string) => void;
}

const AssetCategoryModal: React.FC<AssetCategoryModalProps> = ({ 
  isOpen, 
  onClose, 
  categories, 
  accountPlan,
  onCreate,
  onEdit,
  onDelete 
}) => {
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newAccountPlanId, setNewAccountPlanId] = useState('');

  if (!isOpen) return null;

  // Filter only ASSET accounts from plan
  const assetAccounts = accountPlan.filter(a => a.type === 'ASSET' && a.status === 'ACTIVE');

  const handleStartEdit = (cat: AssetCategory) => {
      setIsEditing(cat.id);
      setNewName(cat.name);
      setNewAccountPlanId(cat.linkedAccountPlanId || '');
  };

  const handleCancelEdit = () => {
      setIsEditing(null);
      setNewName('');
      setNewAccountPlanId('');
  };

  const handleSave = () => {
      if (!newName) return;
      
      if (isEditing) {
          onEdit(isEditing, { name: newName, linkedAccountPlanId: newAccountPlanId });
      } else {
          onCreate({ name: newName, linkedAccountPlanId: newAccountPlanId });
      }
      handleCancelEdit();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
             <Tags size={24} className="text-indigo-600"/> Categorias de Ativos
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
           {/* Add/Edit Form */}
           <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
               <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase">
                   {isEditing ? 'Editar Categoria' : 'Nova Categoria'}
               </h4>
               <div className="space-y-3">
                   <div>
                       <label className="block text-xs font-semibold text-gray-500 mb-1">Nome</label>
                       <input 
                           type="text" 
                           value={newName}
                           onChange={(e) => setNewName(e.target.value)}
                           placeholder="Ex: Máquinas, Veículos..."
                           className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-black"
                       />
                   </div>
                   <div>
                       <label className="block text-xs font-semibold text-gray-500 mb-1">Conta Contábil (Imobilizado)</label>
                       <select 
                           value={newAccountPlanId}
                           onChange={(e) => setNewAccountPlanId(e.target.value)}
                           className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-black"
                       >
                           <option value="">Selecione...</option>
                           {assetAccounts.map(acc => (
                               <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                           ))}
                       </select>
                   </div>
                   <div className="flex gap-2 pt-2">
                       <button 
                           onClick={handleSave}
                           disabled={!newName}
                           className={`flex-1 py-2 rounded-lg text-white font-medium text-sm transition-colors ${!newName ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                       >
                           {isEditing ? 'Atualizar' : 'Adicionar'}
                       </button>
                       {isEditing && (
                           <button onClick={handleCancelEdit} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-white text-gray-600">
                               Cancelar
                           </button>
                       )}
                   </div>
               </div>
           </div>

           {/* List */}
           <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                {categories.map(cat => (
                    <div key={cat.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 group hover:border-indigo-200 transition-colors shadow-sm">
                        <div>
                            <span className="text-sm font-bold text-gray-800 block">{cat.name}</span>
                            {cat.linkedAccountPlanId && (
                                <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                    <BookOpen size={10}/> 
                                    {accountPlan.find(a => a.id === cat.linkedAccountPlanId)?.name || 'Conta desconhecida'}
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleStartEdit(cat)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"><Edit2 size={16}/></button>
                            <button onClick={() => onDelete(cat.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                        </div>
                    </div>
                ))}
                {categories.length === 0 && (
                    <p className="text-center text-gray-400 text-sm italic py-4">Nenhuma categoria cadastrada.</p>
                )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default AssetCategoryModal;
