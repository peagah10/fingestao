
import React, { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Check } from 'lucide-react';
import { FinancialCategory, TransactionType, AccountPlanItem } from '../types';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: FinancialCategory | null;
  accountPlanOptions: AccountPlanItem[];
}

const COLORS = [
  '#10b981', '#059669', '#047857', '#0f766e', '#0891b2', 
  '#ef4444', '#dc2626', '#b91c1c', '#c2410c', '#8b5cf6', 
  '#7c3aed', '#6d28d9', '#db2777', '#be185d', '#4f46e5',
  '#4338ca', '#6366f1', '#374151', '#4b5563', '#334155'
];

const CategoryModal: React.FC<CategoryModalProps> = ({ isOpen, onClose, onSave, initialData, accountPlanOptions }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [linkedAccountPlanId, setLinkedAccountPlanId] = useState<string>('');
  const [color, setColor] = useState(COLORS[0]);
  const [active, setActive] = useState(true);

  // If accountPlanOptions is empty, we assume it's personal mode or no plan available
  const isCompanyMode = accountPlanOptions.length > 0;

  useEffect(() => {
    if (isOpen && initialData) {
      setName(initialData.name);
      setType(initialData.type);
      setLinkedAccountPlanId(initialData.linkedAccountPlanId || '');
      setColor(initialData.color || COLORS[0]);
      setActive(initialData.active);
    } else if (isOpen) {
      setName('');
      setType(TransactionType.EXPENSE);
      setLinkedAccountPlanId('');
      setColor(COLORS[0]);
      setActive(true);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    onSave({
      name,
      type,
      linkedAccountPlanId: linkedAccountPlanId || null,
      color,
      active
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-900">
            {initialData ? 'Editar Categoria' : 'Nova Categoria'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">Nome da Categoria *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isCompanyMode ? "Ex: Alimentação, Vendas..." : "Ex: Mercado, Lazer, Salário..."}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">Tipo *</label>
            <div className="relative">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TransactionType)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white appearance-none"
              >
                <option value={TransactionType.EXPENSE}>Despesa</option>
                <option value={TransactionType.INCOME}>Receita</option>
              </select>
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                 {type === TransactionType.INCOME ? (
                   <TrendingUp size={16} className="text-emerald-500" />
                 ) : (
                   <TrendingDown size={16} className="text-red-500" />
                 )}
              </div>
            </div>
          </div>

          {isCompanyMode && (
            <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Conta Contábil</label>
                <select
                value={linkedAccountPlanId}
                onChange={(e) => setLinkedAccountPlanId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
                >
                <option value="">Nenhuma</option>
                {accountPlanOptions.sort((a,b) => a.code.localeCompare(b.code)).map(item => (
                    <option key={item.id} value={item.id}>
                    {item.code} {item.name}
                    </option>
                ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Vincule a uma conta do plano de contas para lançamentos contábeis</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">Cor</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all flex items-center justify-center ${
                    color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check size={14} className="text-white" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
             <label className="font-semibold text-gray-800 text-sm">Categoria Ativa</label>
             <button
               type="button"
               onClick={() => setActive(!active)}
               className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                 active ? 'bg-gray-900' : 'bg-gray-200'
               }`}
             >
               <span
                 className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                   active ? 'translate-x-6' : 'translate-x-1'
                 }`}
               />
             </button>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              {initialData ? 'Salvar Alterações' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryModal;
