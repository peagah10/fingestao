
import React, { useState, useEffect } from 'react';
import { X, Check, DollarSign, Calendar, TrendingUp, TrendingDown, Wallet, AlertOctagon, Calculator } from 'lucide-react';
import { Transaction, FinancialAccount } from '../types';

interface LongTermPayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { transactionId: string; date: string; amount: number; accountId: string; interest: number; discount: number }) => void;
  transaction: Transaction;
  accounts: FinancialAccount[];
}

const LongTermPayModal: React.FC<LongTermPayModalProps> = ({ isOpen, onClose, onConfirm, transaction, accounts }) => {
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  
  // Values
  const [interest, setInterest] = useState<string>('');
  const [discount, setDiscount] = useState<string>('');
  
  // Validation
  const [balanceError, setBalanceError] = useState(false);

  useEffect(() => {
    if (isOpen && transaction) {
      setPayDate(new Date().toISOString().split('T')[0]);
      setInterest('');
      setDiscount('');
      
      // Default to first active account with balance
      const defaultAcc = accounts.find(a => a.status === 'ACTIVE' && a.balance > transaction.amount);
      if (defaultAcc) setSelectedAccount(defaultAcc.id);
      else if (accounts.length > 0) setSelectedAccount(accounts[0].id);
    }
  }, [isOpen, transaction, accounts]);

  // Derived Calculations
  const originalAmount = transaction.amount;
  const interestVal = parseFloat(interest) || 0;
  const discountVal = parseFloat(discount) || 0;
  const totalToPay = originalAmount + interestVal - discountVal;

  // Validation Logic
  const discountExceedsAmount = discountVal > originalAmount;

  // Account Balance Logic
  const currentAccount = accounts.find(a => a.id === selectedAccount);
  const currentBalance = currentAccount ? currentAccount.balance : 0;
  // Note: If discount makes total negative (unlikely with above check, but possible), treat as 0 cost to balance
  const effectiveCost = totalToPay > 0 ? totalToPay : 0; 
  const hasInsufficientBalance = selectedAccount ? (effectiveCost > currentBalance) : false;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;
    if (hasInsufficientBalance) return;
    if (discountExceedsAmount) return;

    onConfirm({
        transactionId: transaction.id,
        date: payDate,
        amount: totalToPay, // Total effective payment
        accountId: selectedAccount,
        interest: interestVal,
        discount: discountVal
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-indigo-600 text-white">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <DollarSign size={20} /> Baixar Parcela
          </h3>
          <button onClick={onClose} className="text-indigo-200 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Reference Card */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm">
              <p className="text-gray-500 mb-1 text-xs uppercase font-bold">Referência</p>
              <p className="font-semibold text-gray-800 line-clamp-1">{transaction.description}</p>
              <div className="flex justify-between mt-2 pt-2 border-t border-gray-200">
                  <span className="text-gray-600">Vencimento Original:</span>
                  <span className="font-medium text-gray-800">{new Date(transaction.date).toLocaleDateString('pt-BR')}</span>
              </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             {/* Date */}
             <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Data Pagamento</label>
                <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="date"
                        required
                        value={payDate}
                        onChange={(e) => setPayDate(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white text-black"
                    />
                </div>
             </div>
             
             {/* Original Value (Read Only) */}
             <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valor Original</label>
                <div className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-600 font-bold text-sm text-right">
                    R$ {originalAmount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                </div>
             </div>
          </div>

          {/* Adjustments */}
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-xs font-bold text-red-600 uppercase mb-1 flex items-center gap-1">
                    <TrendingUp size={12}/> Juros / Multa
                </label>
                <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={interest}
                    onChange={(e) => setInterest(e.target.value)}
                    className="w-full px-3 py-2 border border-red-200 focus:border-red-500 rounded-lg focus:ring-2 focus:ring-red-200 outline-none text-red-700 font-medium text-right bg-white"
                />
             </div>
             <div>
                <label className="block text-xs font-bold text-green-600 uppercase mb-1 flex items-center gap-1">
                    <TrendingDown size={12}/> Desconto
                </label>
                <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={originalAmount}
                    placeholder="0,00"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg outline-none font-medium text-right transition-all bg-white ${
                        discountExceedsAmount 
                        ? 'border-red-500 focus:ring-red-200 text-red-600' 
                        : 'border-green-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 text-green-700'
                    }`}
                />
                {discountExceedsAmount && (
                    <p className="text-[10px] text-red-500 mt-1 font-bold text-right">
                        Excede valor original
                    </p>
                )}
             </div>
          </div>

          <hr className="border-gray-100" />

          {/* Account Selection */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Conta de Saída</label>
            <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-black"
            >
                <option value="">Selecione a conta...</option>
                {accounts.map(acc => (
                    <option key={acc.id} value={acc.id} disabled={acc.status !== 'ACTIVE'}>
                        {acc.name} ({acc.type === 'BANK' ? acc.bankName : 'Caixa'})
                    </option>
                ))}
            </select>
            
            {/* Balance Feedback */}
            {selectedAccount && (
                <div className={`flex justify-between items-center mt-2 px-3 py-2 rounded-lg text-xs border ${
                    hasInsufficientBalance ? 'bg-red-50 border-red-200 text-red-700' : 'bg-blue-50 border-blue-100 text-blue-700'
                }`}>
                    <span className="flex items-center gap-1 font-semibold"><Wallet size={12}/> Saldo Disponível:</span>
                    <span className="font-bold text-sm">R$ {currentBalance.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                </div>
            )}
          </div>

          {/* Total Summary */}
          <div className="flex justify-between items-center bg-gray-800 text-white p-4 rounded-xl shadow-inner">
              <div className="flex items-center gap-2">
                  <Calculator size={20} className="text-gray-400"/>
                  <span className="text-sm font-medium text-gray-300">Total a Pagar</span>
              </div>
              <div className="text-xl font-bold">
                  R$ {totalToPay.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
              </div>
          </div>

          {/* Validation Errors */}
          {hasInsufficientBalance && (
              <div className="flex items-start gap-2 text-red-600 text-xs bg-red-50 p-3 rounded-lg border border-red-100 animate-pulse">
                  <AlertOctagon size={16} className="mt-0.5 flex-shrink-0"/>
                  <span>
                      <b>Saldo Insuficiente!</b> Não é possível realizar a baixa. Verifique o saldo da conta selecionada ou escolha outra conta.
                  </span>
              </div>
          )}

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={hasInsufficientBalance || !selectedAccount || discountExceedsAmount}
              className={`flex-1 py-3 text-white font-medium rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all ${
                  hasInsufficientBalance || !selectedAccount || discountExceedsAmount
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-green-600 hover:bg-green-700 hover:shadow-md'
              }`}
            >
              <Check size={18} /> Confirmar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LongTermPayModal;
