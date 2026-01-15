
// ... existing imports ...
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { FinancialAccount } from '../types';

interface AccountModalProps {
// ... existing ...
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: FinancialAccount | null;
}

const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('BANK');
  const [internalCode, setInternalCode] = useState('');
  const [balance, setBalance] = useState('');
  
  // Bank specific fields
  const [bankName, setBankName] = useState('');
  const [agency, setAgency] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  // Populate form when initialData changes or modal opens
  useEffect(() => {
    if (isOpen && initialData) {
      setName(initialData.name);
      setType(initialData.type);
      setInternalCode(initialData.internalCode || '');
      setBalance(initialData.balance.toString());
      setBankName(initialData.bankName || '');
      setAgency(initialData.agency || '');
      setAccountNumber(initialData.accountNumber || '');
    } else if (isOpen && !initialData) {
      // Reset
      setName('');
      setType('BANK');
      setInternalCode('');
      setBalance('');
      setBankName('');
      setAgency('');
      setAccountNumber('');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !type) return;

    onSave({
      name,
      type,
      internalCode,
      balance: parseFloat(balance || '0'),
      bankName: type === 'BANK' ? bankName : undefined,
      agency: type === 'BANK' ? agency : undefined,
      accountNumber: type === 'BANK' ? accountNumber : undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-6 pb-4">
          <h3 className="text-xl font-bold text-gray-900">
            {initialData ? 'Editar Conta' : 'Nova Conta Financeira'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 pt-0 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-semibold text-gray-800 mb-1">Nome da Conta *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Caixa Principal, Banco XPTO"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-gray-400 bg-white text-black"
              />
            </div>
             <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-semibold text-gray-800 mb-1">Tipo *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-black"
              >
                <option value="BANK">Banco</option>
                <option value="CASH">Caixa</option>
                <option value="DIGITAL_WALLET">Carteira Digital</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Código Interno</label>
              <input
                type="text"
                value={internalCode}
                onChange={(e) => setInternalCode(e.target.value)}
                placeholder="Ex: BANK-001, CASH-001"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-gray-400 bg-white text-black"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Saldo Inicial (R$)</label>
              <input
                type="number"
                step="0.01"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-gray-400 bg-white text-black"
              />
            </div>
          </div>

          {type === 'BANK' && (
            <div className="pt-2 border-t border-gray-100 mt-2">
              <h4 className="text-sm font-bold text-gray-700 mb-3">Informações Bancárias</h4>
              <div className="space-y-4">
                <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">Nome do Banco</label>
                    <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Ex: Banco do Brasil, Itaú, Nubank"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-gray-400 bg-white text-black"
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-1">Agência</label>
                        <input
                        type="text"
                        value={agency}
                        onChange={(e) => setAgency(e.target.value)}
                        placeholder="0000"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-gray-400 bg-white text-black"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-1">Número da Conta</label>
                        <input
                        type="text"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="00000-0"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-gray-400 bg-white text-black"
                        />
                    </div>
                </div>
              </div>
            </div>
          )}

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
              {initialData ? 'Atualizar' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccountModal;
