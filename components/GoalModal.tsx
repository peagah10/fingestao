
// ... existing imports ...
import React, { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, BookOpen, Tags, Target, CalendarRange, DollarSign, Layers } from 'lucide-react';
import { Goal, FinancialCategory, AccountPlanItem, TransactionType } from '../types';

interface GoalModalProps {
// ... existing ...
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: Goal | null;
  categories: FinancialCategory[];
  accountPlan: AccountPlanItem[];
}

const GoalModal: React.FC<GoalModalProps> = ({ isOpen, onClose, onSave, initialData, categories, accountPlan }) => {
  const [name, setName] = useState('');
  const [period, setPeriod] = useState('MONTHLY');
  const [targetAmount, setTargetAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Linking State
  const [linkedEntityType, setLinkedEntityType] = useState<'CATEGORY' | 'ACCOUNT_PLAN'>('CATEGORY');
  const [linkedEntityId, setLinkedEntityId] = useState('');

  // Derived state for display
  const [inferredType, setInferredType] = useState<'REVENUE' | 'EXPENSE_REDUCTION'>('REVENUE');

  // Helper to format DD/MM/YYYY to YYYY-MM-DD for input[type="date"]
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return '';
    const parts = dateString.split('/');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return dateString;
  };

  useEffect(() => {
    if (isOpen && initialData) {
      setName(initialData.name);
      setPeriod(initialData.period);
      setTargetAmount(initialData.targetAmount.toString());
      setStartDate(formatDateForInput(initialData.startDate));
      setEndDate(formatDateForInput(initialData.endDate));
      
      // Handle legacy data or new data
      if (initialData.linkedEntityType === 'TOTAL') {
          setLinkedEntityType('CATEGORY');
      } else {
          setLinkedEntityType(initialData.linkedEntityType as 'CATEGORY' | 'ACCOUNT_PLAN');
      }
      setLinkedEntityId(initialData.linkedEntityId || '');

    } else if (isOpen && !initialData) {
      // Reset
      setName('');
      setPeriod('MONTHLY');
      setTargetAmount('');
      const today = new Date();
      setStartDate(today.toISOString().split('T')[0]);
      
      // Default End date + 1 month
      const nextMonth = new Date(today);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      setEndDate(nextMonth.toISOString().split('T')[0]);

      setLinkedEntityType('CATEGORY');
      setLinkedEntityId('');
    }
  }, [isOpen, initialData]);

  // Effect to infer type based on selection
  useEffect(() => {
    if (linkedEntityType === 'CATEGORY' && linkedEntityId) {
        const cat = categories.find(c => c.id === linkedEntityId);
        if (cat) {
            setInferredType(cat.type === TransactionType.INCOME ? 'REVENUE' : 'EXPENSE_REDUCTION');
            if (!initialData && !name) setName(`Meta: ${cat.name}`);
        }
    } else if (linkedEntityType === 'ACCOUNT_PLAN' && linkedEntityId) {
        const acc = accountPlan.find(a => a.id === linkedEntityId);
        if (acc) {
            if (acc.type === 'REVENUE') setInferredType('REVENUE');
            else setInferredType('EXPENSE_REDUCTION');
            if (!initialData && !name) setName(`Meta: ${acc.name}`);
        }
    }
  }, [linkedEntityType, linkedEntityId, categories, accountPlan, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !targetAmount || !startDate || !linkedEntityId) return;

    onSave({
      name,
      type: inferredType,
      period,
      targetAmount: parseFloat(targetAmount),
      startDate,
      endDate,
      linkedEntityType,
      linkedEntityId
    });

    onClose();
  };

  const isRevenue = inferredType === 'REVENUE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[95vh]">
        
        {/* Header Style matching TransactionModal */}
        <div className={`flex justify-between items-center p-6 border-b transition-colors duration-300 ${isRevenue ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
          <div>
              <h3 className={`text-lg font-bold flex items-center gap-2 ${isRevenue ? 'text-emerald-700' : 'text-red-700'}`}>
                {isRevenue ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                {initialData ? 'Editar Meta' : 'Nova Meta Financeira'}
              </h3>
              <p className="text-xs text-gray-500 mt-1 opacity-80">
                 {isRevenue ? 'Defina objetivos de entrada de caixa.' : 'Estabeleça tetos de gastos para controle.'}
              </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
          
          {/* Target Amount Section - Prominent */}
          <div>
             <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Valor Alvo da Meta (R$)</label>
             <div className="relative">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Target size={20} className={isRevenue ? "text-emerald-500" : "text-red-500"} />
                 </div>
                 <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    placeholder="0,00"
                    className={`w-full pl-10 pr-4 py-3 text-xl font-bold border rounded-lg outline-none transition-all bg-white ${
                       isRevenue ? 'focus:ring-emerald-500 text-emerald-700 border-gray-300' : 'focus:ring-red-500 text-red-700 border-gray-300'
                    }`}
                 />
             </div>
          </div>

          {/* Name Field */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Nome da Meta</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Faturamento Q1, Teto Marketing..."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-gray-900 placeholder-gray-400 bg-white"
            />
          </div>

          {/* Link Section Styled as Card */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
             <label className="block text-xs font-bold text-gray-700 uppercase flex items-center gap-2">
                <Layers size={14}/> Vincular Meta a:
             </label>
             
             <div className="flex p-1 bg-white border border-gray-200 rounded-lg">
                <button 
                  type="button"
                  onClick={() => { setLinkedEntityType('CATEGORY'); setLinkedEntityId(''); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-md transition-all ${
                      linkedEntityType === 'CATEGORY' 
                      ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                    <Tags size={14}/> Categoria
                </button>
                <div className="w-px bg-gray-200 my-1"></div>
                <button 
                   type="button"
                   onClick={() => { setLinkedEntityType('ACCOUNT_PLAN'); setLinkedEntityId(''); }}
                   className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-md transition-all ${
                      linkedEntityType === 'ACCOUNT_PLAN' 
                      ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                    <BookOpen size={14}/> Plano de Contas
                </button>
             </div>

             <select
                value={linkedEntityId}
                onChange={(e) => setLinkedEntityId(e.target.value)}
                required
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-black"
             >
                <option value="">Selecione o item para monitorar...</option>
                {linkedEntityType === 'CATEGORY' ? (
                    <>
                        <optgroup label="Receitas">
                            {categories.filter(c => c.type === TransactionType.INCOME).map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </optgroup>
                        <optgroup label="Despesas">
                             {categories.filter(c => c.type === TransactionType.EXPENSE).map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </optgroup>
                    </>
                ) : (
                     accountPlan.map(acc => (
                         <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                     ))
                )}
             </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Início</label>
              <div className="relative">
                  <CalendarRange className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white text-black"
                  />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Fim</label>
              <div className="relative">
                  <CalendarRange className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white text-black"
                  />
              </div>
            </div>
          </div>
          
          <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Periodicidade de Análise</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-black"
              >
                <option value="MONTHLY">Mensal (Renova a cada mês)</option>
                <option value="QUARTERLY">Trimestral (Acumulado do trimestre)</option>
                <option value="YEARLY">Anual (Acumulado do ano)</option>
              </select>
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
              type="button"
              className={`flex-1 py-3 text-white font-medium rounded-lg transition-colors shadow-lg flex justify-center items-center gap-2 ${
                isRevenue ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
               {initialData ? 'Atualizar Meta' : 'Criar Meta'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default GoalModal;
