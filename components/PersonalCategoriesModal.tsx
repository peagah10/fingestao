
import React from 'react';
import { X, Plus, Edit2, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { FinancialCategory, TransactionType } from '../types';

interface PersonalCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: FinancialCategory[];
  onEdit: (category: FinancialCategory) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
}

const PersonalCategoriesModal: React.FC<PersonalCategoriesModalProps> = ({ 
  isOpen, 
  onClose, 
  categories, 
  onEdit, 
  onDelete, 
  onCreate 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-900">Categorias Pessoais</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
           <button 
             onClick={onCreate}
             className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all shadow-sm mb-6"
           >
             <Plus size={20} /> Nova Categoria
           </button>

           <div className="space-y-6">
              {/* Income Section */}
              <div>
                 <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <TrendingUp size={16} className="text-emerald-500" /> Receitas
                 </h4>
                 <div className="space-y-2">
                    {categories.filter(c => c.type === TransactionType.INCOME).map(cat => (
                        <div key={cat.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 group hover:border-gray-200 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color || '#cbd5e1' }}></div>
                                <span className="text-sm font-semibold text-gray-700">{cat.name}</span>
                            </div>
                            <div className="flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => onEdit(cat)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"><Edit2 size={16}/></button>
                                {!cat.isSystemDefault && (
                                    <button onClick={() => onDelete(cat.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                )}
                            </div>
                        </div>
                    ))}
                 </div>
              </div>

              {/* Expense Section */}
              <div>
                 <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <TrendingDown size={16} className="text-red-500" /> Despesas
                 </h4>
                 <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                    {categories.filter(c => c.type === TransactionType.EXPENSE).map(cat => (
                        <div key={cat.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 group hover:border-gray-200 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color || '#cbd5e1' }}></div>
                                <span className="text-sm font-semibold text-gray-700">{cat.name}</span>
                            </div>
                            <div className="flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => onEdit(cat)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"><Edit2 size={16}/></button>
                                {!cat.isSystemDefault && (
                                    <button onClick={() => onDelete(cat.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                )}
                            </div>
                        </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalCategoriesModal;
