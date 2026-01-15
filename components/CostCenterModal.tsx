
// ... existing imports ...
import React, { useState, useEffect } from 'react';
import { X, CalendarClock, PieChart, AlignLeft, Hash, DollarSign } from 'lucide-react';
import { CostCenter, CostCenterPeriod } from '../types';

interface CostCenterModalProps {
// ... existing ...
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; code: string; description: string; budget: number; period: CostCenterPeriod }) => void;
  initialData?: CostCenter | null;
}

const CostCenterModal: React.FC<CostCenterModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [period, setPeriod] = useState<CostCenterPeriod>('MONTHLY');

  useEffect(() => {
    if (isOpen && initialData) {
      setName(initialData.name);
      setCode(initialData.code);
      setDescription(initialData.description);
      setBudget(initialData.budget?.toString() || '');
      setPeriod(initialData.period);
    } else if (isOpen && !initialData) {
      // Reset logic for create mode
      setName('');
      setCode('');
      setDescription('');
      setBudget('');
      setPeriod('MONTHLY');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    
    onSave({ 
      name, 
      code, 
      description, 
      budget: parseFloat(budget || '0'),
      period
    });
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[95vh]">
        
        {/* Header - Indigo Theme for Structure */}
        <div className="flex justify-between items-center p-6 border-b bg-indigo-50 border-indigo-100">
          <div>
            <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                <PieChart size={24} className="text-indigo-600"/>
                {initialData ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}
            </h3>
            <p className="text-xs text-gray-500 mt-1 opacity-80">
               Organize suas despesas por departamentos ou projetos.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
          
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Nome do Centro *</label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Marketing, Produção, TI..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-gray-400 font-medium bg-white text-black"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Código (Opcional)</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <Hash size={16} />
                    </div>
                    <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Ex: CC-01"
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white text-black"
                    />
                </div>
            </div>
            <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Renovação</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <CalendarClock size={16} />
                    </div>
                    <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value as CostCenterPeriod)}
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm text-black"
                    >
                    <option value="MONTHLY">Mensal</option>
                    <option value="QUARTERLY">Trimestral</option>
                    <option value="YEARLY">Anual</option>
                    <option value="WEEKLY">Semanal</option>
                    <option value="SEMIANNUAL">Semestral</option>
                    </select>
                </div>
            </div>
          </div>

          {/* Budget Section Styled like Transaction Value */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
             <label className="block text-xs font-bold text-gray-700 mb-2 flex items-center gap-1">
                <DollarSign size={14}/> Orçamento Previsto (R$)
             </label>
             <input
               type="number"
               step="0.01"
               value={budget}
               onChange={(e) => setBudget(e.target.value)}
               placeholder="0,00"
               className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-bold text-gray-800 text-lg text-right bg-white"
             />
             <p className="text-[10px] text-gray-500 mt-2 text-right">
                 Valor renovado automaticamente conforme a periodicidade.
             </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Descrição</label>
            <div className="relative">
                <div className="absolute top-3 left-3 pointer-events-none text-gray-400">
                    <AlignLeft size={16} />
                </div>
                <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o objetivo deste centro de custo..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-gray-400 resize-none text-sm bg-white text-black"
                />
            </div>
          </div>

        </form>

        <div className="p-6 pt-0 flex gap-3 bg-white border-t border-gray-50 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              type="submit"
              className="flex-1 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-lg"
            >
              {initialData ? 'Salvar Alterações' : 'Cadastrar Centro'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default CostCenterModal;
