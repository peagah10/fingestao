
import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, Briefcase, FileText, Hash, ArrowRight, ArrowLeft, Check, AlertTriangle, PieChart, Layers } from 'lucide-react';
import { LongTermType, FinancialCategory, TransactionType, LongTermItem } from '../types';

interface LongTermModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  categories: FinancialCategory[]; 
  initialData?: LongTermItem | null; // Added support for editing
}

interface InstallmentPreview {
    id: number;
    date: string;
    amount: number;
}

const LongTermModal: React.FC<LongTermModalProps> = ({ isOpen, onClose, onSave, categories, initialData }) => {
  const [step, setStep] = useState(1);
  
  // Step 1 State
  const [type, setType] = useState<LongTermType>('LOAN');
  const [title, setTitle] = useState('');
  const [provider, setProvider] = useState('');
  const [totalValue, setTotalValue] = useState('');
  const [acquisitionDate, setAcquisitionDate] = useState(new Date().toISOString().split('T')[0]);
  const [validityEndDate, setValidityEndDate] = useState('');
  const [installmentsCount, setInstallmentsCount] = useState('12');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [autoGenerate, setAutoGenerate] = useState(true);

  // Step 2 State
  const [installments, setInstallments] = useState<InstallmentPreview[]>([]);

  // Filter expense categories for selection
  const expenseCategories = categories.filter(c => c.type === TransactionType.EXPENSE && c.active);

  useEffect(() => {
      if (isOpen) {
          setStep(1);
          if (initialData) {
              // Edit Mode
              setType(initialData.type);
              setTitle(initialData.title);
              setProvider(initialData.provider || '');
              setTotalValue(initialData.totalValue.toString());
              setAcquisitionDate(initialData.acquisitionDate);
              setValidityEndDate(initialData.validityEndDate || '');
              setInstallmentsCount(initialData.installmentsCount.toString());
              // We don't have category stored in LongTermItem explicitly in mock, default empty or guess
              setSelectedCategory(''); 
              setAutoGenerate(true); // Default to true to allow regeneration
          } else {
              // Create Mode
              setType('LOAN');
              setTitle('');
              setProvider('');
              setTotalValue('');
              setAcquisitionDate(new Date().toISOString().split('T')[0]);
              setValidityEndDate('');
              setInstallmentsCount('12');
              setSelectedCategory('');
              setAutoGenerate(true);
          }
          setInstallments([]);
      }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  // Generate installments based on basic config
  const generatePreview = () => {
      const count = parseInt(installmentsCount) || 1;
      const total = parseFloat(totalValue) || 0;
      const baseAmount = Math.floor((total / count) * 100) / 100;
      const remainder = total - (baseAmount * count);
      
      const newInstallments: InstallmentPreview[] = [];
      const startDate = new Date(acquisitionDate);

      for (let i = 0; i < count; i++) {
          const pDate = new Date(startDate);
          pDate.setMonth(startDate.getMonth() + i);
          
          // Add remainder to first installment
          const val = i === 0 ? baseAmount + remainder : baseAmount;

          newInstallments.push({
              id: i,
              date: pDate.toISOString().split('T')[0],
              amount: parseFloat(val.toFixed(2))
          });
      }
      setInstallments(newInstallments);
  };

  const handleNext = () => {
      if (!title || !totalValue || (!initialData && !selectedCategory)) {
          // If editing, category is optional if not regenerating, but let's enforce if autoGenerate is on
          if (autoGenerate && !selectedCategory && !initialData) {
             alert('Selecione uma categoria para gerar os lançamentos.');
             return;
          }
          if (!title || !totalValue) {
             alert('Preencha os campos obrigatórios.');
             return;
          }
      }
      
      if (autoGenerate) {
          generatePreview();
          setStep(2);
      } else {
          handleFinalSave();
      }
  };

  const handleInstallmentChange = (id: number, field: 'date' | 'amount', value: any) => {
      const newValue = field === 'amount' ? parseFloat(value) : value;
      
      const updatedInstallments = installments.map(inst => {
          if (inst.id === id) {
              return { ...inst, [field]: newValue };
          }
          return inst;
      });
      
      setInstallments(updatedInstallments);

      // Auto-update total value when installment amounts change
      if (field === 'amount') {
          const newTotal = updatedInstallments.reduce((acc, i) => acc + (isNaN(i.amount) ? 0 : i.amount), 0);
          setTotalValue(newTotal.toFixed(2));
      }
  };

  const handleFinalSave = () => {
    onSave({
      id: initialData?.id,
      type,
      title,
      provider,
      totalValue: parseFloat(totalValue),
      acquisitionDate,
      validityEndDate: type === 'LICENSE' ? validityEndDate : undefined,
      installmentsCount: parseInt(installmentsCount) || 1,
      autoGenerate, // This tells the parent whether to regenerate transactions
      customTransactions: autoGenerate ? installments.map(i => ({ date: i.date, amount: i.amount })) : undefined,
      categoryName: selectedCategory
    });
    
    onClose();
  };

  // Calculations for Step 2
  // Note: totalAllocated should equal parseFloat(totalValue) now, but we keep calculation for display sync
  const totalAllocated = installments.reduce((acc, i) => acc + (i.amount || 0), 0);
  const diffVal = (parseFloat(totalValue) || 0) - totalAllocated;
  // Floating point fix
  const difference = Math.abs(diffVal) < 0.01 ? 0 : diffVal;
  const isBalanced = Math.abs(difference) < 0.01;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
        
        {/* Header Visual */}
        <div className="bg-indigo-600 p-6 text-white flex justify-between items-start">
           <div>
             <h3 className="text-xl font-bold flex items-center gap-2">
               {step === 1 ? <Briefcase size={22}/> : <PieChart size={22}/>}
               {step === 1 ? (initialData ? 'Editar Contrato' : 'Contrato de Longo Prazo') : 'Simulação de Pagamentos'}
             </h3>
             <p className="text-indigo-100 text-sm mt-1">
               {step === 1 ? 'Configure os detalhes do contrato para controle.' : 'Confira e ajuste as parcelas geradas.'}
             </p>
           </div>
           <button onClick={onClose} className="text-indigo-200 hover:text-white transition-colors bg-white/10 p-1.5 rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* STEP 1: CONFIGURATION */}
        {step === 1 && (
            <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
                
                {/* Type Selector Cards */}
                <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'LOAN', label: 'Empréstimo', desc: 'Entrada de capital' },
                      { id: 'FINANCING', label: 'Financiamento', desc: 'Aquisição de bens' },
                      { id: 'LICENSE', label: 'Licença/Software', desc: 'Uso contínuo' }
                    ].map(opt => (
                        <button 
                          key={opt.id}
                          type="button"
                          onClick={() => setType(opt.id as LongTermType)}
                          className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                            type === opt.id 
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                            : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                           <span className="font-bold text-sm">{opt.label}</span>
                           <span className="text-[10px] opacity-80">{opt.desc}</span>
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Título do Contrato *</label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                            <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder={type === 'LICENSE' ? 'Ex: Licença Adobe Cloud' : 'Ex: Capital de Giro'} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Valor Total (R$) *</label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                            <input type="number" required step="0.01" value={totalValue} onChange={(e) => setTotalValue(e.target.value)} className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-gray-900" placeholder="0.00" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">{type === 'LICENSE' ? 'Meses de Vigência' : 'Nº de Parcelas'}</label>
                        <div className="relative">
                            <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                            <input type="number" min="1" value={installmentsCount} onChange={(e) => setInstallmentsCount(e.target.value)} className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Início / Aquisição</label>
                        <input type="date" required value={acquisitionDate} onChange={(e) => setAcquisitionDate(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-gray-700" />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Categoria Contábil {autoGenerate && '*'}</label>
                        <div className="relative">
                            <Layers className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                            <select 
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                            >
                                <option value="">{initialData ? 'Manter Atual' : 'Selecione...'}</option>
                                {expenseCategories.map(cat => (
                                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Instituição / Fornecedor</label>
                        <input type="text" value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="Ex: Banco Itaú, AWS, Google..." className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                    </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                    <div className="mt-0.5">
                        <input id="auto_gen" type="checkbox" checked={autoGenerate} onChange={(e) => setAutoGenerate(e.target.checked)} className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                    </div>
                    <div>
                        <label htmlFor="auto_gen" className="block text-sm font-bold text-blue-900 cursor-pointer">
                            {initialData ? 'Regenerar lançamentos financeiros?' : 'Gerar lançamentos financeiros automaticamente'}
                        </label>
                        <p className="text-xs text-blue-700 mt-1">
                            {initialData 
                                ? 'Se marcado, apagará lançamentos futuros antigos e criará novos baseados nestes dados.' 
                                : `Ao marcar esta opção, o sistema criará as ${installmentsCount} despesas futuras no módulo de Lançamentos.`}
                        </p>
                    </div>
                </div>
            </div>
        )}

        {/* STEP 2: CUSTOMIZATION */}
        {step === 2 && (
            <div className="flex-1 overflow-hidden flex flex-col bg-gray-50">
                <div className="bg-white px-6 py-4 border-b border-gray-200 shadow-sm z-10 flex justify-between items-center">
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">Total do Contrato</p>
                        <p className="text-xl font-bold text-indigo-900">R$ {parseFloat(totalValue).toLocaleString('pt-BR', {minimumFractionDigits:2})}</p>
                    </div>
                    <div className={`text-right ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                        <p className="text-xs uppercase font-bold flex items-center justify-end gap-1">
                           {!isBalanced && <AlertTriangle size={12}/>} Diferença
                        </p>
                        <p className="text-xl font-bold">R$ {difference.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-bold">
                                <tr>
                                    <th className="px-4 py-3 text-left w-20">#</th>
                                    <th className="px-4 py-3 text-left">Vencimento Previsto</th>
                                    <th className="px-4 py-3 text-right">Valor da Parcela</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {installments.map((inst, index) => (
                                    <tr key={inst.id} className="hover:bg-indigo-50 transition-colors">
                                        <td className="px-4 py-3 text-gray-500 font-mono">{index + 1}</td>
                                        <td className="px-4 py-3">
                                            <input 
                                                type="date" 
                                                value={inst.date} 
                                                onChange={(e) => handleInstallmentChange(inst.id, 'date', e.target.value)} 
                                                className="bg-transparent border-b border-dashed border-gray-300 hover:border-indigo-400 focus:border-indigo-600 outline-none text-gray-800 font-medium w-full max-w-[140px]"
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="relative inline-block w-full max-w-[120px]">
                                                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 text-xs">R$</span>
                                                <input 
                                                    type="number" 
                                                    step="0.01" 
                                                    value={inst.amount} 
                                                    onChange={(e) => handleInstallmentChange(inst.id, 'amount', e.target.value)} 
                                                    className="w-full text-right bg-transparent border-b border-dashed border-gray-300 hover:border-indigo-400 focus:border-indigo-600 outline-none font-bold text-gray-800 pl-6"
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

        {/* FOOTER ACTIONS */}
        <div className="p-5 border-t border-gray-200 flex gap-3 bg-white">
            {step === 2 && (
                <button type="button" onClick={() => setStep(1)} className="px-5 py-2.5 border border-gray-300 text-gray-600 font-medium rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors">
                    <ArrowLeft size={18}/> Voltar
                </button>
            )}
            
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-300 text-gray-600 font-medium rounded-lg hover:bg-gray-50 transition-colors">
                Cancelar
            </button>
            
            {step === 1 ? (
                <button type="button" onClick={handleNext} className="flex-1 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-md flex items-center justify-center gap-2">
                    {autoGenerate ? 'Continuar' : (initialData ? 'Salvar Edição' : 'Salvar')} <ArrowRight size={18} className={autoGenerate ? '' : 'hidden'}/>
                </button>
            ) : (
                <button type="button" onClick={handleFinalSave} disabled={!isBalanced} className={`flex-1 py-2.5 text-white font-medium rounded-lg transition-colors shadow-md flex items-center justify-center gap-2 ${!isBalanced ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}>
                    <Check size={18}/> {initialData ? 'Confirmar Edição' : 'Confirmar Contrato'}
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default LongTermModal;
