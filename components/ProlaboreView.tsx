import React, { useState } from 'react';
import { Company, User, Transaction, TransactionType, FinancialCategory } from '../types';
import { 
  getPersonalTransactions, addPersonalTransaction, updatePersonalTransaction, 
  getPersonalCategories, addPersonalCategory, updatePersonalCategory, deletePersonalCategory,
  deletePersonalTransaction
} from '../services/mockData';
import TransactionModal from './TransactionModal';
import PersonalCategoriesModal from './PersonalCategoriesModal';
import { 
  Wallet, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  DollarSign, 
  Filter, 
  Tags,
  Trash2,
  Edit2
} from 'lucide-react';

interface ProlaboreViewProps {
  company: Company;
  transactions: Transaction[]; // Company Transactions (unused here but passed by parent)
  currentUser: User;
  onRefresh: () => void;
}

const ProlaboreView: React.FC<ProlaboreViewProps> = ({ company, currentUser, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');

  // Modals
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [defaultType, setDefaultType] = useState<TransactionType>(TransactionType.EXPENSE);

  // Data
  const personalTransactions = getPersonalTransactions(company.id);
  const personalCategories = getPersonalCategories(company.id);

  // --- Handlers: Transactions ---
  const handleOpenAddTx = (type: TransactionType) => {
    setEditingTransaction(null);
    setDefaultType(type);
    setIsTxModalOpen(true);
  };

  const handleOpenEditTx = (t: Transaction) => {
    setEditingTransaction(t);
    setDefaultType(t.type);
    setIsTxModalOpen(true);
  };

  const handleSaveTransaction = (data: any) => {
    if (data.id) {
      updatePersonalTransaction(data.id, data);
    } else {
      addPersonalTransaction({ ...data, companyId: company.id, createdBy: currentUser.id });
    }
    onRefresh();
  };

  const handleDeleteTransaction = (id: string) => {
      if (confirm('Tem certeza que deseja excluir este lançamento pessoal?')) {
          deletePersonalTransaction(id);
          onRefresh();
      }
  };

  // --- Handlers: Categories ---
  // Note: PersonalCategoriesModal uses specific callbacks
  const handleCreateCategory = () => {
     // For simplicity in this view, we might prompt user or reuse a simpler modal. 
     // But PersonalCategoriesModal assumes we pass data. 
     // We'll prompt for name for simplicity or we can expand the modal logic.
     const name = prompt("Nome da nova categoria:");
     if (name) {
         addPersonalCategory({ 
             companyId: company.id, 
             name, 
             type: TransactionType.EXPENSE, 
             active: true, 
             isSystemDefault: false 
         });
         onRefresh();
     }
  };

  const handleEditCategory = (cat: FinancialCategory) => {
      const newName = prompt("Editar nome da categoria:", cat.name);
      if (newName) {
          updatePersonalCategory(cat.id, { name: newName });
          onRefresh();
      }
  };

  const handleDeleteCategory = (id: string) => {
      if (confirm('Excluir categoria pessoal?')) {
          deletePersonalCategory(id);
          onRefresh();
      }
  };

  // --- Filtering & Totals ---
  const filtered = personalTransactions.filter(t => {
      const matchSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = typeFilter === 'ALL' || t.type === typeFilter;
      return matchSearch && matchType;
  });

  const totalIncome = personalTransactions.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = personalTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + t.amount, 0);
  const balance = totalIncome - totalExpense;

  return (
    <div className="space-y-6">
      {isTxModalOpen && (
        <TransactionModal 
            isOpen={isTxModalOpen}
            onClose={() => setIsTxModalOpen(false)}
            onSave={handleSaveTransaction}
            categories={personalCategories}
            accounts={[]} // No accounts for personal
            costCenters={[]} // No CC for personal
            transactions={personalTransactions}
            initialData={editingTransaction}
            defaultType={defaultType}
            isPersonal={true}
        />
      )}

      {isCatModalOpen && (
          <PersonalCategoriesModal 
             isOpen={isCatModalOpen}
             onClose={() => setIsCatModalOpen(false)}
             categories={personalCategories}
             onCreate={handleCreateCategory}
             onEdit={handleEditCategory}
             onDelete={handleDeleteCategory}
          />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wallet className="text-indigo-600" size={28} /> Gestão de Prolabore
          </h2>
          <p className="text-gray-500 mt-1">Controle suas finanças pessoais separadas da empresa.</p>
        </div>
        
        <div className="flex gap-2">
            <button 
              onClick={() => setIsCatModalOpen(true)}
              className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2.5 rounded-lg font-medium transition-all shadow-sm flex items-center gap-2"
            >
              <Tags size={18} /> Categorias
            </button>
            <button 
              onClick={() => handleOpenAddTx(TransactionType.EXPENSE)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium transition-all shadow-sm flex items-center gap-2"
            >
              <Plus size={18} /> Novo Lançamento
            </button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Entradas (Salário/Retiradas)</p>
                <p className="text-2xl font-bold text-emerald-600">R$ {totalIncome.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-full text-emerald-600"><TrendingUp size={24}/></div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Saídas Pessoais</p>
                <p className="text-2xl font-bold text-red-600">R$ {totalExpense.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-full text-red-600"><TrendingDown size={24}/></div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Saldo do Período</p>
                <p className={`text-2xl font-bold ${balance >= 0 ? 'text-gray-900' : 'text-red-500'}`}>R$ {balance.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
            </div>
            <div className="p-3 bg-indigo-50 rounded-full text-indigo-600"><DollarSign size={24}/></div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative flex-1 w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Buscar por descrição ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black bg-white"
            />
        </div>

        <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
              onClick={() => setTypeFilter('ALL')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${typeFilter === 'ALL' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Todos
            </button>
            <button 
              onClick={() => setTypeFilter('INCOME')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${typeFilter === 'INCOME' ? 'bg-white shadow text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Receitas
            </button>
            <button 
              onClick={() => setTypeFilter('EXPENSE')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${typeFilter === 'EXPENSE' ? 'bg-white shadow text-red-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Despesas
            </button>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {filtered.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                  <Filter size={48} className="mx-auto mb-4 text-gray-300"/>
                  <p>Nenhum lançamento encontrado.</p>
              </div>
          ) : (
             <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                     <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs border-b border-gray-200">
                         <tr>
                             <th className="px-6 py-3">Data</th>
                             <th className="px-6 py-3">Descrição</th>
                             <th className="px-6 py-3">Categoria</th>
                             <th className="px-6 py-3 text-right">Valor</th>
                             <th className="px-6 py-3 text-center">Ações</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                         {filtered.map(t => (
                             <tr key={t.id} className="hover:bg-gray-50">
                                 <td className="px-6 py-3 text-gray-600">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                                 <td className="px-6 py-3 font-medium text-gray-900">{t.description}</td>
                                 <td className="px-6 py-3"><span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">{t.category}</span></td>
                                 <td className={`px-6 py-3 text-right font-bold ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-red-600'}`}>
                                     {t.type === TransactionType.INCOME ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                 </td>
                                 <td className="px-6 py-3 text-center">
                                     <div className="flex items-center justify-center gap-2">
                                         <button onClick={() => handleOpenEditTx(t)} className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded"><Edit2 size={16}/></button>
                                         <button onClick={() => handleDeleteTransaction(t.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded"><Trash2 size={16}/></button>
                                     </div>
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
          )}
      </div>
    </div>
  );
};

export default ProlaboreView;