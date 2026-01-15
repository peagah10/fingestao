
// ... existing imports ...
import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType, FinancialCategory, FinancialAccount, CostCenter, PaymentMethod, TransactionPayment, RecurrenceConfig } from '../types';
import { X, Check, Wallet, Target, AlertCircle, TrendingUp, TrendingDown, Plus, Trash2, Split, AlertTriangle, CalendarRange, RefreshCw, Wand2, Calculator, Eraser } from 'lucide-react';

interface TransactionModalProps {
// ... existing interface ...
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  categories: FinancialCategory[];
  accounts: FinancialAccount[];
  costCenters: CostCenter[];
  transactions: Transaction[]; 
  initialData?: Transaction | null;
  defaultType?: TransactionType;
  isPersonal?: boolean;
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  PIX: 'Pix',
  CREDIT_CARD: 'Cartão de Crédito',
  DEBIT_CARD: 'Cartão de Débito',
  BOLETO: 'Boleto',
  CASH: 'Dinheiro',
  TRANSFER: 'Transferência',
  OTHER: 'Outro'
};

const TransactionModal: React.FC<TransactionModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  categories, 
  accounts, 
  costCenters, 
  transactions,
  initialData,
  defaultType = TransactionType.INCOME,
  isPersonal = false
}) => {
  // ... existing state and effects ...
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(''); 
  const [type, setType] = useState<TransactionType>(defaultType);
  const [category, setCategory] = useState('');
  const [accountId, setAccountId] = useState('');
  const [costCenterId, setCostCenterId] = useState('');
  const [competenceDate, setCompetenceDate] = useState(new Date().toISOString().split('T')[0]);
  const [documentNumber, setDocumentNumber] = useState('');

  // Recurrence
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFreq, setRecurrenceFreq] = useState<'MONTHLY'>('MONTHLY');
  
  // Payment Logic State
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  
  // Generator Tools
  const [installmentCount, setInstallmentCount] = useState<number | ''>(''); 
  const [installmentMethod, setInstallmentMethod] = useState<PaymentMethod>('CREDIT_CARD');
  
  // Single Payment State
  const [singleMethod, setSingleMethod] = useState<PaymentMethod>('PIX');
  const [singleDate, setSingleDate] = useState(new Date().toISOString().split('T')[0]);
  const [singleStatus, setSingleStatus] = useState<'PENDING' | 'PAID'>('PAID');

  // Multiple Payments State
  const [paymentsList, setPaymentsList] = useState<TransactionPayment[]>([]);

  // Filter active categories
  const availableCategories = categories.filter(c => c.type === type && c.active);
  const activeAccounts = accounts.filter(a => a.status === 'ACTIVE');
  const activeCostCenters = costCenters.filter(c => c.status === 'ACTIVE');
  const isExpense = type === TransactionType.EXPENSE;
  
  // Calculations
  const currentAmountValue = parseFloat(amount) || 0;
  const splitTotalAmount = paymentsList.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  // Precision fix for floating point math
  const difference = Math.round((currentAmountValue - splitTotalAmount) * 100) / 100;
  const isBalanced = Math.abs(difference) < 0.01;

  // Initialize form
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // Edit Mode
        setDescription(initialData.description);
        setType(initialData.type);
        setCategory(initialData.category);
        setAccountId(initialData.accountId || '');
        setCostCenterId(initialData.costCenterId || '');
        setAmount(initialData.amount.toString());
        setCompetenceDate(initialData.date);
        setDocumentNumber(initialData.documentNumber || '');
        
        setIsRecurring(!!initialData.recurrence);
        
        const hasMultiplePayments = initialData.payments && initialData.payments.length > 1;
        setIsSplitPayment(hasMultiplePayments);

        if (hasMultiplePayments) {
            setPaymentsList(initialData.payments);
        } else if (initialData.payments && initialData.payments.length === 1) {
            const p = initialData.payments[0];
            setSingleMethod(p.method);
            setSingleDate(p.date);
            setSingleStatus(p.status);
            setPaymentsList(initialData.payments);
        } else {
            setPaymentsList([]);
        }

      } else {
        // Create Mode
        setDescription('');
        setAmount('');
        setIsSplitPayment(false);
        setType(defaultType);
        setCostCenterId(''); 
        setDocumentNumber('');
        setCompetenceDate(new Date().toISOString().split('T')[0]);
        setIsRecurring(false);

        // Single Defaults
        setSingleMethod('PIX');
        setSingleDate(new Date().toISOString().split('T')[0]);
        setSingleStatus('PAID');
        
        // Account Default
        if (!isPersonal) {
           const validAccs = accounts.filter(a => a.status === 'ACTIVE');
           if (validAccs.length > 0) setAccountId(validAccs[0].id);
           else setAccountId('');
        } else {
           setAccountId('personal'); // Dummy ID for personal mode validation
        }
        
        const validCats = categories.filter(c => c.type === defaultType && c.active);
        if (validCats.length > 0) setCategory(validCats[0].name);
        else setCategory('');

        setPaymentsList([]);
        setInstallmentCount('');
        setInstallmentMethod('CREDIT_CARD');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialData, isPersonal]); 

  // --- Handlers ---

  const handleToggleSplit = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setIsSplitPayment(checked);

    if (checked) {
       // Switching TO Split Mode: Init list with current single config if empty
       if (paymentsList.length === 0) {
           const initialVal = parseFloat(amount) || 0;
           setPaymentsList([{
               id: Math.random().toString(36).substr(2, 9),
               method: singleMethod,
               amount: initialVal,
               date: singleDate, // Default to same date
               status: singleStatus
           }]);
       }
    } else {
      setInstallmentCount(''); // Reset generator tool
    }
  };

  const generateInstallments = () => {
    const count = Number(installmentCount);
    if (!count || count < 1) return;
    const hasManualEntries = paymentsList.length > 0;
    const valueToSplit = (hasManualEntries && difference > 0) ? difference : parseFloat(amount);
    
    if (valueToSplit <= 0) return;

    const baseAmount = Math.floor((valueToSplit / count) * 100) / 100;
    const remainder = valueToSplit - (baseAmount * count);
    
    const newPayments: TransactionPayment[] = [];
    const startDate = new Date(competenceDate);
    if (hasManualEntries) {
        startDate.setMonth(startDate.getMonth() + 1);
    }

    for (let i = 0; i < count; i++) {
        const pDate = new Date(startDate);
        pDate.setMonth(startDate.getMonth() + i);
        
        const val = i === 0 ? baseAmount + remainder : baseAmount;

        newPayments.push({
            id: Math.random().toString(36).substr(2, 9),
            method: installmentMethod,
            amount: parseFloat(val.toFixed(2)),
            date: pDate.toISOString().split('T')[0],
            status: 'PENDING',
            installmentNumber: i + 1,
            totalInstallments: count
        });
    }

    if (hasManualEntries) {
        setPaymentsList([...paymentsList, ...newPayments]);
    } else {
        setPaymentsList(newPayments);
    }
  };

  const handleClearPayments = () => {
      setPaymentsList([]);
  };

  const handleAddPaymentRow = () => {
    const suggestAmount = difference > 0 ? difference : 0;
    setPaymentsList([...paymentsList, {
      id: Math.random().toString(36).substr(2, 9),
      method: singleMethod, 
      amount: parseFloat(suggestAmount.toFixed(2)),
      date: new Date().toISOString().split('T')[0],
      status: 'PENDING'
    }]);
  };

  const handleRemovePaymentRow = (id: string) => {
    setPaymentsList(paymentsList.filter(p => p.id !== id));
  };

  const handleUpdatePaymentRow = (id: string, field: keyof TransactionPayment, value: any) => {
    setPaymentsList(paymentsList.map(p => {
      if (p.id === id) {
        return { ...p, [field]: value };
      }
      return p;
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !category) return;
    // Account ID only required if NOT Personal
    if (!isPersonal && !accountId) return;

    if (currentAmountValue <= 0) return; 

    let finalPayments: TransactionPayment[] = [];
    let overallStatus: 'PENDING' | 'PAID' | 'PARTIAL' = 'PAID';

    if (isSplitPayment) {
        if (!isBalanced) return; // Prevent imbalance
        if (paymentsList.length === 0) return;

        finalPayments = paymentsList;
        const allPaid = paymentsList.every(p => p.status === 'PAID');
        const allPending = paymentsList.every(p => p.status === 'PENDING');
        overallStatus = allPaid ? 'PAID' : (allPending ? 'PENDING' : 'PARTIAL');
    } else {
        finalPayments = [{
            id: initialData?.payments?.[0]?.id || Math.random().toString(36).substr(2, 9),
            method: singleMethod,
            amount: currentAmountValue,
            date: singleDate,
            status: singleStatus,
            installmentNumber: 1,
            totalInstallments: 1
        }];
        overallStatus = singleStatus;
    }
    
    // Recurrence Object
    let recurrenceConfig: RecurrenceConfig | undefined = undefined;
    if (isRecurring) {
        recurrenceConfig = {
            frequency: recurrenceFreq,
            interval: 1,
            infinite: true
        };
    }

    onSave({
      id: initialData?.id,
      description,
      amount: currentAmountValue,
      type,
      category,
      accountId: isPersonal ? 'personal' : accountId, // Dummy ID if personal
      costCenterId: (!isPersonal && isExpense) ? (costCenterId || undefined) : undefined,
      payments: finalPayments,
      status: overallStatus,
      date: competenceDate, 
      recurrence: recurrenceConfig,
      documentNumber: documentNumber || undefined
    });
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[95vh]">
        
        {/* Header */}
        <div className={`flex justify-between items-center p-6 border-b transition-colors duration-300 ${isExpense ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
          <div>
            <h3 className={`text-lg font-bold flex items-center gap-2 ${isExpense ? 'text-red-700' : 'text-emerald-700'}`}>
                {isExpense ? <TrendingDown size={24} /> : <TrendingUp size={24} />}
                {isPersonal ? (initialData ? 'Editar (Pessoal)' : (isExpense ? 'Nova Despesa (Pessoal)' : 'Nova Receita (Pessoal)')) : (initialData ? 'Editar Lançamento' : (isExpense ? 'Nova Despesa' : 'Nova Receita'))}
            </h3>
            <p className="text-xs text-gray-500 mt-1 opacity-80">
               {isPersonal ? 'Registro pessoal do sócio (Não afeta caixa da empresa).' : 'Preencha os dados de competência e caixa para relatórios precisos.'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
          
          {/* Top Section: Value & Description */}
          <div className="flex flex-col-reverse md:flex-row gap-4">
             <div className="flex-1">
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Descrição</label>
                <input
                    type="text"
                    required
                    autoFocus
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={isExpense ? "Ex: Supermercado" : "Ex: Recebimento Aluguel"}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-black bg-white font-medium placeholder-gray-400"
                />
             </div>
             <div className="w-full md:w-48">
               <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Valor (R$)</label>
               <input
                   type="number"
                   required
                   min="0.01"
                   step="0.01"
                   value={amount}
                   onChange={(e) => setAmount(e.target.value)}
                   placeholder="0,00"
                   className={`w-full px-4 py-3 text-xl font-bold border rounded-lg outline-none transition-all text-right bg-white ${
                       isExpense ? 'focus:ring-red-500 text-red-700' : 'focus:ring-emerald-500 text-emerald-700'
                   }`}
               />
             </div>
          </div>

          {/* Middle Section: Classification */}
          <div className={`grid ${isPersonal ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'} gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100`}>
             <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Categoria</label>
                <select 
                    value={category} 
                    onChange={(e) => setCategory(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md outline-none bg-white text-black focus:border-indigo-500"
                >
                    {availableCategories.length === 0 ? <option value="">Sem categorias</option> : availableCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
             </div>
             
             {!isPersonal && (
               <>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Conta (Saída/Entrada)</label>
                  <select 
                      value={accountId} 
                      onChange={(e) => setAccountId(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md outline-none bg-white text-black focus:border-indigo-500"
                    >
                      <option value="">Selecione...</option>
                      {activeAccounts.map((acc) => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                  </select>
                </div>

                {isExpense && (
                  <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Centro de Custo</label>
                      <select 
                          value={costCenterId} 
                          onChange={(e) => setCostCenterId(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md outline-none bg-white text-black focus:border-indigo-500"
                        >
                          <option value="">Geral</option>
                          {activeCostCenters.map((cc) => <option key={cc.id} value={cc.id}>{cc.name}</option>)}
                      </select>
                  </div>
                )}
               </>
             )}
          </div>

          {/* Date & Recurrence Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
             <div className="relative">
                <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                   <CalendarRange size={14}/> Data
                </label>
                <input 
                  type="date"
                  required
                  value={competenceDate}
                  onChange={(e) => setCompetenceDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md outline-none focus:border-indigo-500 bg-white text-black"
                />
             </div>

             {!isPersonal && (
               <div className="flex items-center gap-3 pb-3">
                  <div className="flex items-center h-5">
                    <input
                      id="recurrence"
                      type="checkbox"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label htmlFor="recurrence" className="text-sm font-medium text-gray-700 select-none flex items-center gap-2 cursor-pointer">
                        <RefreshCw size={14} className={isRecurring ? "text-indigo-600" : "text-gray-400"}/> 
                        Repetir lançamento?
                    </label>
                  </div>
               </div>
             )}
          </div>

          <hr className="border-gray-100" />

          {/* Payment Section (Simplified for Personal) */}
          <div>
             <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                   <Wallet size={16}/> Dados do Pagamento
                </h4>
                
                {!isPersonal && (
                  <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-600 flex items-center gap-1 cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={isSplitPayment}
                          onChange={handleToggleSplit}
                          className="rounded text-indigo-600 focus:ring-0 w-3.5 h-3.5"
                        />
                        Parcelado / Múltiplo
                      </label>
                  </div>
                )}
             </div>

             {/* Single Payment Mode */}
             {!isSplitPayment && (
                <div className="grid grid-cols-3 gap-3 animate-in fade-in duration-300">
                    <div className="col-span-1">
                       <label className="text-xs font-semibold text-gray-500 mb-1 block">Forma</label>
                       <select
                         value={singleMethod}
                         onChange={(e) => setSingleMethod(e.target.value as PaymentMethod)}
                         className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg outline-none bg-white text-black"
                       >
                         {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                       </select>
                    </div>
                    <div className="col-span-1">
                       <label className="text-xs font-semibold text-gray-500 mb-1 block">Data Pagamento/Venc.</label>
                       <input 
                         type="date"
                         value={singleDate}
                         onChange={(e) => setSingleDate(e.target.value)}
                         className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg outline-none bg-white text-black"
                       />
                    </div>
                    <div className="col-span-1">
                       <label className="text-xs font-semibold text-gray-500 mb-1 block">Status</label>
                       <select
                         value={singleStatus}
                         onChange={(e) => setSingleStatus(e.target.value as any)}
                         className={`w-full text-sm px-3 py-2 border border-gray-300 rounded-lg outline-none font-medium ${singleStatus === 'PAID' ? 'text-green-700 bg-green-50' : 'text-orange-700 bg-orange-50'}`}
                       >
                         <option value="PAID">{type === TransactionType.INCOME ? 'Recebido' : 'Pago'}</option>
                         <option value="PENDING">Pendente</option>
                       </select>
                    </div>
                </div>
             )}

             {/* Split / Installment Mode (Hidden for Personal) */}
             {isSplitPayment && !isPersonal && (
               <div className="space-y-4 animate-in fade-in duration-300 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <div className="flex flex-col sm:flex-row gap-2 items-end mb-4 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                      <div className="flex-1 w-full">
                        <label className="text-xs font-bold text-gray-500 mb-1 flex items-center gap-1">
                          <Wand2 size={12}/> Gerador (Entrada + Parcelas)
                        </label>
                        <div className="flex gap-2">
                           <input 
                              type="number" 
                              placeholder="Qtd." 
                              className="w-16 text-sm border-b border-gray-300 focus:border-indigo-500 outline-none py-1 text-center bg-white text-black"
                              value={installmentCount}
                              onChange={(e) => setInstallmentCount(e.target.value === '' ? '' : Number(e.target.value))}
                            />
                            <select
                              value={installmentMethod}
                              onChange={(e) => setInstallmentMethod(e.target.value as PaymentMethod)}
                              className="flex-1 text-xs border-b border-gray-300 outline-none bg-transparent"
                            >
                              {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                            </select>
                        </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                          <button 
                            type="button"
                            onClick={generateInstallments}
                            disabled={!installmentCount || Number(installmentCount) < 1}
                            className={`flex-1 sm:flex-none px-3 py-1.5 rounded text-xs font-bold transition-colors disabled:opacity-50 whitespace-nowrap ${
                                paymentsList.length > 0 && difference > 0 
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                                : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                            }`}
                          >
                            {(paymentsList.length > 0 && difference > 0) ? 'Gerar do Saldo' : 'Gerar Parcelas'}
                          </button>
                           <button
                              type="button" 
                              onClick={handleClearPayments}
                              className="px-2 py-1.5 rounded text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-red-500 transition-colors"
                            >
                              <Eraser size={14}/>
                            </button>
                      </div>
                  </div>
                   {/* Simplified list render for split */}
                   <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                        {paymentsList.map((p, index) => (
                        <div key={p.id} className="flex items-center gap-2 bg-white p-2 rounded border border-gray-200 shadow-sm text-sm">
                            <span className="w-8 text-center text-gray-400 text-xs">{p.installmentNumber ? `${p.installmentNumber}x` : `${index + 1}`}</span>
                            <div className="flex-1">
                              <select value={p.method} onChange={(e) => handleUpdatePaymentRow(p.id, 'method', e.target.value)} className="w-full text-xs border-none outline-none bg-transparent font-medium text-gray-700">
                                {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                              </select>
                            </div>
                            <div className="w-24 relative">
                               <input type="number" value={p.amount} onChange={(e) => handleUpdatePaymentRow(p.id, 'amount', parseFloat(e.target.value))} className="w-full pl-2 py-1 border-b border-transparent hover:border-gray-300 focus:border-indigo-500 outline-none text-right font-medium bg-transparent text-black"/>
                            </div>
                            <div className="w-28"><input type="date" value={p.date} onChange={(e) => handleUpdatePaymentRow(p.id, 'date', e.target.value)} className="w-full text-xs text-gray-600 outline-none bg-transparent"/></div>
                            <button type="button" onClick={() => handleRemovePaymentRow(p.id)} className="w-6 text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
                        </div>
                      ))}
                   </div>
                   <div className="flex justify-end items-center pt-2">
                     <div className={`text-xs font-bold ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>Total: R$ {splitTotalAmount.toFixed(2)}</div>
                   </div>
               </div>
             )}
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
              disabled={isSplitPayment && !isBalanced}
              className={`flex-1 py-3 text-white font-medium rounded-lg transition-colors shadow-lg flex justify-center items-center gap-2 ${
                isExpense ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
              } ${isSplitPayment && !isBalanced ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                {initialData ? 'Salvar Alterações' : 'Confirmar'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionModal;
