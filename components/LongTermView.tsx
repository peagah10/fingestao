
import React, { useState, useMemo } from 'react';
import { Company, User, LongTermItem, Transaction } from '../types';
import { 
  getLongTermItems, addLongTermItem, updateLongTermItem, deleteLongTermItem, 
  getTransactionsByLongTermId, settleLongTermInstallment, getCategoriesByCompany, 
  getAccountsByCompany, getTransactionsByCompany 
} from '../services/mockData';
import LongTermModal from './LongTermModal';
import LongTermDetailsModal from './LongTermDetailsModal';
import { 
  CalendarRange, 
  Plus, 
  Search, 
  Briefcase, 
  PieChart, 
  Trash2,
  MoreHorizontal,
  DollarSign,
  AlertCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Infinity
} from 'lucide-react';

interface LongTermViewProps {
  company: Company;
  currentUser: User;
  onRefresh: () => void;
}

type PeriodType = 'WEEK' | 'MONTH' | 'SEMESTER' | 'YEAR' | 'ALL';

const LongTermView: React.FC<LongTermViewProps> = ({ company, currentUser, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'PAID'>('ALL');

  // Date Navigation State
  const [periodType, setPeriodType] = useState<PeriodType>('ALL');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LongTermItem | null>(null);
  
  const [detailsItem, setDetailsItem] = useState<LongTermItem | null>(null);
  const [detailsTransactions, setDetailsTransactions] = useState<Transaction[]>([]);

  // Data
  const items = getLongTermItems(company.id);
  const categories = getCategoriesByCompany(company.id);
  const accounts = getAccountsByCompany(company.id);
  
  // --- Date Logic Helpers ---
  const getDateRange = (date: Date, type: PeriodType): { start: Date, end: Date } => {
    const start = new Date(date);
    const end = new Date(date);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (type === 'WEEK') {
        const day = start.getDay(); 
        const diff = start.getDate() - day; 
        start.setDate(diff);
        end.setDate(diff + 6);
    } else if (type === 'MONTH') {
        start.setDate(1);
        end.setMonth(end.getMonth() + 1, 0);
    } else if (type === 'SEMESTER') {
        const currentMonth = start.getMonth();
        const startMonth = currentMonth < 6 ? 0 : 6;
        start.setMonth(startMonth, 1);
        end.setMonth(startMonth + 6, 0);
    } else if (type === 'YEAR') {
        start.setMonth(0, 1);
        end.setMonth(11, 31);
    } else if (type === 'ALL') {
        return { 
            start: new Date('2000-01-01'), 
            end: new Date('2100-12-31') 
        };
    }
    return { start, end };
  };

  const navigatePeriod = (direction: 'prev' | 'next') => {
    if (periodType === 'ALL') return;

    const newDate = new Date(currentDate);
    const amount = direction === 'next' ? 1 : -1;

    if (periodType === 'WEEK') {
        newDate.setDate(newDate.getDate() + (amount * 7));
    } else if (periodType === 'MONTH') {
        newDate.setMonth(newDate.getMonth() + amount);
    } else if (periodType === 'SEMESTER') {
        newDate.setMonth(newDate.getMonth() + (amount * 6));
    } else if (periodType === 'YEAR') {
        newDate.setFullYear(newDate.getFullYear() + amount);
    }
    setCurrentDate(newDate);
  };

  const getPeriodLabel = () => {
    if (periodType === 'ALL') return 'Todo o Histórico';

    const { start, end } = getDateRange(currentDate, periodType);
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long' };
    
    if (periodType === 'WEEK') {
        return `${start.toLocaleDateString('pt-BR', { day: 'numeric', month: 'numeric' })} a ${end.toLocaleDateString('pt-BR', { day: 'numeric', month: 'numeric', year: 'numeric' })}`;
    } else if (periodType === 'MONTH') {
        const str = start.toLocaleDateString('pt-BR', options);
        return str.charAt(0).toUpperCase() + str.slice(1);
    } else if (periodType === 'SEMESTER') {
        const semester = start.getMonth() < 6 ? '1º Semestre' : '2º Semestre';
        return `${semester} de ${start.getFullYear()}`;
    } else {
        return start.getFullYear().toString();
    }
  };

  // Handlers
  const handleOpenAdd = () => {
      setEditingItem(null);
      setIsAddModalOpen(true);
  };

  const handleSave = (data: any) => {
    if (editingItem) {
        updateLongTermItem(
            editingItem.id, 
            data, 
            currentUser, 
            data.autoGenerate, 
            data.customTransactions,
            data.categoryName
        );
    } else {
        addLongTermItem(
            { 
                companyId: company.id, 
                title: data.title, 
                type: data.type, 
                totalValue: data.totalValue,
                acquisitionDate: data.acquisitionDate,
                validityEndDate: data.validityEndDate,
                installmentsCount: data.installmentsCount,
                provider: data.provider,
                status: 'ACTIVE'
            },
            currentUser,
            data.autoGenerate,
            data.customTransactions,
            data.categoryName
        );
    }
    onRefresh();
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Tem certeza que deseja excluir este contrato e todos os seus lançamentos?')) {
        deleteLongTermItem(id);
        onRefresh();
    }
  };

  const handleOpenDetails = (item: LongTermItem) => {
    const txs = getTransactionsByLongTermId(item.id);
    setDetailsItem(item);
    setDetailsTransactions(txs);
  };

  const handleSettleInstallment = (data: { transactionId: string; date: string; amount: number; accountId: string; interest: number; discount: number }) => {
      const result = settleLongTermInstallment(
          data.transactionId,
          data.date,
          data.amount,
          currentUser,
          data.accountId,
          data.interest,
          data.discount
      );

      if (result.success) {
          // Refresh local details view
          if (detailsItem) {
              const updatedTxs = getTransactionsByLongTermId(detailsItem.id);
              setDetailsTransactions(updatedTxs);
          }
          onRefresh();
          return true;
      } else {
          alert(result.message);
          return false;
      }
  };

  // Filter
  const { start: periodStart, end: periodEnd } = useMemo(() => getDateRange(currentDate, periodType), [currentDate, periodType]);

  const filteredItems = items.filter(item => {
      const matchSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (item.provider && item.provider.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatus = filterStatus === 'ALL' || item.status === filterStatus;
      
      let matchDate = true;
      if (periodType !== 'ALL') {
          const itemDate = new Date(item.acquisitionDate);
          // Standardize time for comparison
          itemDate.setHours(0,0,0,0);
          matchDate = itemDate >= periodStart && itemDate <= periodEnd;
      }

      return matchSearch && matchStatus && matchDate;
  });

  const activeTotal = items.filter(i => i.status === 'ACTIVE').reduce((acc, i) => acc + i.totalValue, 0);

  return (
    <div className="space-y-6">
      <LongTermModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSave={handleSave} 
        categories={categories}
        initialData={editingItem}
      />

      {detailsItem && (
          <LongTermDetailsModal 
            isOpen={!!detailsItem}
            onClose={() => setDetailsItem(null)}
            item={detailsItem}
            transactions={detailsTransactions}
            accounts={accounts}
            onSettle={handleSettleInstallment}
          />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarRange className="text-indigo-600" size={28} /> Gestão de Longo Prazo
          </h2>
          <p className="text-gray-500 mt-1">Controle de empréstimos, financiamentos e contratos recorrentes.</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium transition-all shadow-sm flex items-center gap-2"
        >
          <Plus size={18} /> Novo Contrato
        </button>
      </div>

      {/* Date Navigation Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center bg-gray-100 rounded-lg p-1 overflow-x-auto">
             <button onClick={() => setPeriodType('WEEK')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${periodType === 'WEEK' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}>Semana</button>
             <button onClick={() => setPeriodType('MONTH')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${periodType === 'MONTH' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}>Mês</button>
             <button onClick={() => setPeriodType('SEMESTER')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${periodType === 'SEMESTER' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}>Semestre</button>
             <button onClick={() => setPeriodType('YEAR')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${periodType === 'YEAR' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}>Ano</button>
             <button onClick={() => setPeriodType('ALL')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 ${periodType === 'ALL' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-900'}`}>
                <Infinity size={14} /> Geral
             </button>
          </div>

          <div className="flex items-center gap-4">
              <button 
                onClick={() => navigatePeriod('prev')} 
                disabled={periodType === 'ALL'}
                className={`p-2 rounded-full text-gray-600 ${periodType === 'ALL' ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-100'}`}
              >
                  <ChevronLeft size={20} />
              </button>
              <div className="flex items-center gap-2 min-w-[180px] justify-center text-gray-800 font-bold capitalize">
                  <Calendar size={18} className="text-indigo-600"/>
                  {getPeriodLabel()}
              </div>
              <button 
                onClick={() => navigatePeriod('next')} 
                disabled={periodType === 'ALL'}
                className={`p-2 rounded-full text-gray-600 ${periodType === 'ALL' ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-100'}`}
              >
                  <ChevronRight size={20} />
              </button>
          </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Briefcase size={24}/></div>
              <div>
                  <p className="text-sm font-medium text-gray-500">Contratos Ativos</p>
                  <p className="text-2xl font-bold text-gray-900">{items.filter(i => i.status === 'ACTIVE').length}</p>
              </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><DollarSign size={24}/></div>
              <div>
                  <p className="text-sm font-medium text-gray-500">Volume Contratado</p>
                  <p className="text-2xl font-bold text-gray-900">R$ {activeTotal.toLocaleString('pt-BR', { notation: 'compact' })}</p>
              </div>
          </div>
           <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><PieChart size={24}/></div>
              <div>
                  <p className="text-sm font-medium text-gray-500">Parcelas Pendentes</p>
                  <p className="text-2xl font-bold text-gray-900">
                      {getTransactionsByCompany(company.id).filter(t => t.linkedLongTermItemId && t.status !== 'PAID').length}
                  </p>
              </div>
          </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative flex-1 w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Buscar contrato..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black bg-white"
            />
        </div>

        <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
              onClick={() => setFilterStatus('ALL')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filterStatus === 'ALL' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Todos
            </button>
            <button 
              onClick={() => setFilterStatus('ACTIVE')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filterStatus === 'ACTIVE' ? 'bg-white shadow text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Ativos
            </button>
            <button 
              onClick={() => setFilterStatus('PAID')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filterStatus === 'PAID' ? 'bg-white shadow text-gray-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Quitados
            </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map(item => {
              const txs = getTransactionsByLongTermId(item.id);
              const paidAmount = txs.filter(t => t.status === 'PAID').reduce((acc, t) => acc + t.amount, 0);
              const totalAmount = item.totalValue;
              const progress = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

              return (
                  <div 
                    key={item.id} 
                    onClick={() => handleOpenDetails(item)}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all group"
                  >
                      <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${item.type === 'LOAN' ? 'bg-orange-50 text-orange-600' : item.type === 'FINANCING' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                                  <Briefcase size={20}/>
                              </div>
                              <div>
                                  <h3 className="font-bold text-gray-900 line-clamp-1">{item.title}</h3>
                                  <p className="text-xs text-gray-500">{item.provider}</p>
                              </div>
                          </div>
                          {item.status === 'PAID' ? (
                               <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded">QUITADO</span>
                          ) : (
                               <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded">ATIVO</span>
                          )}
                      </div>

                      <div className="space-y-3 mb-6">
                          <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Valor Total</span>
                              <span className="font-bold text-gray-900">R$ {item.totalValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Pago</span>
                              <span className="font-bold text-emerald-600">R$ {paidAmount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                          </div>
                          
                          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                              <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
                          </div>
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                          <div className="text-xs text-gray-400">
                              {item.installmentsCount} Parcelas
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setEditingItem(item); setIsAddModalOpen(true); }}
                                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                              >
                                  <MoreHorizontal size={16}/>
                              </button>
                              <button 
                                onClick={(e) => handleDelete(item.id, e)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                              >
                                  <Trash2 size={16}/>
                              </button>
                          </div>
                      </div>
                  </div>
              );
          })}

          {filteredItems.length === 0 && (
              <div className="col-span-full py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
                  <Filter size={48} className="text-gray-300 mx-auto mb-4"/>
                  <p className="text-gray-500 font-medium">Nenhum contrato encontrado neste período.</p>
                  <button 
                      onClick={handleOpenAdd}
                      className="mt-4 text-indigo-600 font-bold text-sm hover:underline"
                  >
                      Adicionar Novo
                  </button>
              </div>
          )}
      </div>
    </div>
  );
};

export default LongTermView;
