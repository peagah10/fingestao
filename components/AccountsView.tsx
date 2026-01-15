import React, { useState } from 'react';
import { Company, FinancialAccount } from '../types';
import { transactionService } from '../services/transactionService';
import AccountModal from './AccountModal';
import {
  Wallet,
  Landmark,
  Banknote,
  Smartphone,
  Plus,
  Search,
  Edit2,
  Trash2,
  LayoutGrid,
  List,
  ArrowRightLeft
} from 'lucide-react';

interface AccountsViewProps {
  company: Company;
  accounts: FinancialAccount[];
  onRefresh: () => void;
}

const AccountsView: React.FC<AccountsViewProps> = ({ company, accounts, onRefresh }) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<FinancialAccount | null>(null);

  // Computed
  const filteredAccounts = accounts.filter(acc =>
    acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (acc.bankName && acc.bankName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalBalance = filteredAccounts.reduce((sum, acc) => sum + acc.balance, 0);

  // Handlers
  const handleOpenAddModal = () => {
    setSelectedAccount(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (account: FinancialAccount) => {
    setSelectedAccount(account);
    setIsModalOpen(true);
  };

  const handleSave = async (data: any) => {
    try {
      if (selectedAccount) {
        // Edit
        await transactionService.updateAccount(selectedAccount.id, {
          ...data,
          companyId: company.id
        });
      } else {
        // Create
        await transactionService.createAccount({
          ...data,
          companyId: company.id,
          status: 'ACTIVE'
        });
      }
      onRefresh();
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving account", error);
      alert("Erro ao salvar conta.");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta conta? O histórico de lançamentos pode ser afetado.')) {
      await transactionService.deleteAccount(id);
      onRefresh();
    }
  };

  const handleToggleStatus = async (account: FinancialAccount) => {
    const newStatus = account.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await transactionService.updateAccount(account.id, { status: newStatus });
    onRefresh();
  };

  const getIconByType = (type: string) => {
    switch (type) {
      case 'BANK': return <Landmark size={20} />;
      case 'CASH': return <Banknote size={20} />;
      case 'DIGITAL_WALLET': return <Smartphone size={20} />;
      case 'INVESTMENT': return <ArrowRightLeft size={20} />; // Placeholder
      case 'CREDIT_CARD': return <Wallet size={20} />;
      default: return <Wallet size={20} />;
    }
  };

  const getBadgeStyle = (type: string) => {
    switch (type) {
      case 'BANK': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'CASH': return 'bg-green-50 text-green-700 border-green-200';
      case 'DIGITAL_WALLET': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'INVESTMENT': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'BANK': return 'Conta Corrente';
      case 'CASH': return 'Caixa Físico';
      case 'DIGITAL_WALLET': return 'Carteira Digital';
      case 'INVESTMENT': return 'Investimento';
      case 'CREDIT_CARD': return 'Cartão de Crédito';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wallet className="text-indigo-600" size={28} /> Contas Bancárias
          </h2>
          <p className="text-gray-500 mt-1">Gerencie suas contas, caixas e carteiras.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar contas..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 w-full lg:w-64"
            />
          </div>

          <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <List size={18} />
            </button>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm flex items-center gap-2 text-sm transition-colors whitespace-nowrap"
          >
            <Plus size={18} /> Nova Conta
          </button>
        </div>
      </div>

      {/* TOTAL BALANCE CARD */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-6 text-white shadow-lg">
        <p className="text-gray-400 text-sm font-medium mb-1">Saldo Total Consolidado</p>
        <h3 className="text-3xl font-bold">R$ {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          Considerando contas ativas
        </p>
      </div>

      {/* CONTENT - GRID */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAccounts.map(account => (
            <div key={account.id} className={`bg-white rounded-xl border transition-all hover:shadow-md group relative overflow-hidden ${account.status === 'INACTIVE' ? 'opacity-75 border-dashed border-gray-300' : 'border-gray-200 shadow-sm'}`}>
              <div className={`h-1.5 w-full ${account.balance >= 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getBadgeStyle(account.type)}`}>
                    {getIconByType(account.type)}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleOpenEditModal(account)}
                      className="text-gray-400 hover:text-indigo-600 p-1.5 rounded hover:bg-indigo-50 transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(account.id)}
                      className="text-gray-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <h4 className="font-bold text-gray-900 text-base mb-1">{account.name}</h4>
                <p className="text-xs text-gray-500 mb-4">{getTypeName(account.type)}</p>

                <div className="flex flex-col gap-1 mb-4 text-xs text-gray-600">
                  {account.bankName && <span className="flex items-center gap-1.5"><Landmark size={12} /> {account.bankName}</span>}
                  {account.agency && <span>Ag: {account.agency} • CC: {account.accountNumber}</span>}
                </div>

                <div className="pt-4 border-t border-gray-50 flex justify-between items-center">
                  <span className={`text-lg font-bold ${account.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    R$ {account.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>

                  <button
                    onClick={() => handleToggleStatus(account)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${account.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-300'}`}
                  >
                    {account.status === 'ACTIVE' ? 'ATIVA' : 'INATIVA'}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Add Card */}
          <button
            onClick={handleOpenAddModal}
            className="flex flex-col items-center justify-center h-full min-h-[220px] bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 group-hover:text-indigo-600 group-hover:border-indigo-200 mb-3 shadow-sm transition-colors">
              <Plus size={24} />
            </div>
            <span className="font-bold text-gray-500 group-hover:text-indigo-700">Adicionar Conta</span>
          </button>
        </div>
      )}

      {/* CONTENT - LIST */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-bold">Conta</th>
                <th className="px-6 py-4 font-bold">Tipo</th>
                <th className="px-6 py-4 font-bold">Instituição</th>
                <th className="px-6 py-4 font-bold">Saldo</th>
                <th className="px-6 py-4 font-bold text-center">Status</th>
                <th className="px-6 py-4 font-bold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAccounts.map(account => (
                <tr key={account.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getBadgeStyle(account.type)}`}>
                        {getIconByType(account.type)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{account.name}</p>
                        {(account.agency || account.accountNumber) && (
                          <p className="text-xs text-gray-500">{account.agency} / {account.accountNumber}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{getTypeName(account.type)}</td>
                  <td className="px-6 py-4 text-gray-900 font-medium">{account.bankName || '-'}</td>
                  <td className={`px-6 py-4 font-bold ${account.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    R$ {account.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleToggleStatus(account)}
                      className={`text-[10px] font-bold px-2 py-1 rounded-full ${account.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                    >
                      {account.status === 'ACTIVE' ? 'Ativa' : 'Inativa'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEditModal(account)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(account.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL */}
      {isModalOpen && (
        <AccountModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          initialData={selectedAccount || undefined}
        />
      )}
    </div>
  );
};

export default AccountsView;
