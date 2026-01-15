
// ... imports ...
import React, { useState, useMemo } from 'react';
import { Company, Goal, Transaction, FinancialCategory, AccountPlanItem, TransactionType } from '../types';
import { getGoalsByCompany, addGoal, updateGoal, deleteGoal, toggleGoalStatus } from '../services/mockData';
import GoalModal from './GoalModal';
import { 
  Target, 
  TrendingUp, 
  TrendingDown,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Search,
  Calendar,
  Filter,
  BarChart3,
  Award,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface GoalsViewProps {
  company: Company;
  transactions: Transaction[];
  categories: FinancialCategory[];
  accountPlan: AccountPlanItem[];
  onRefresh: () => void;
}

type PeriodType = 'WEEK' | 'MONTH' | 'SEMESTER' | 'YEAR';

const GoalsView: React.FC<GoalsViewProps> = ({ company, transactions, categories, accountPlan, onRefresh }) => {
  // ... existing state ...
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  
  const [periodType, setPeriodType] = useState<PeriodType>('MONTH');
  const [currentDate, setCurrentDate] = useState(new Date());

  const goals = getGoalsByCompany(company.id);

  // ... Date Logic ...
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
    }
    return { start, end };
  };

  const navigatePeriod = (direction: 'prev' | 'next') => {
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

  // ... Helpers ...
  const parseDate = (str: string) => {
    if(str.includes('/')) {
        const [d, m, y] = str.split('/');
        return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    }
    return new Date(str);
  };

  const calculateProgress = (goal: Goal): number => {
    const start = parseDate(goal.startDate);
    const end = parseDate(goal.endDate);
    
    const relevantTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate >= start && tDate <= end;
    });

    const getRealizedAmount = (t: Transaction) => {
        if (t.status === 'PAID') return t.amount;
        if (t.status === 'PARTIAL' && t.payments) {
            return t.payments.filter(p => p.status === 'PAID').reduce((s, p) => s + p.amount, 0);
        }
        return 0;
    };

    let total = 0;

    if (goal.linkedEntityType === 'CATEGORY') {
        const linkedCategory = categories.find(c => c.id === goal.linkedEntityId);
        if (linkedCategory) {
            total = relevantTransactions
                .filter(t => t.category === linkedCategory.name && t.type === linkedCategory.type)
                .reduce((acc, t) => acc + getRealizedAmount(t), 0);
        }
    } else if (goal.linkedEntityType === 'ACCOUNT_PLAN') {
         total = relevantTransactions
            .filter(t => {
                const cat = categories.find(c => c.name === t.category);
                return cat && cat.linkedAccountPlanId === goal.linkedEntityId;
            })
            .reduce((acc, t) => acc + getRealizedAmount(t), 0);
    } else if (goal.linkedEntityType === 'TOTAL') {
         total = relevantTransactions
            .filter(t => (goal.type === 'REVENUE' ? t.type === TransactionType.INCOME : t.type === TransactionType.EXPENSE))
            .reduce((acc, t) => acc + getRealizedAmount(t), 0);
    }
    
    return total;
  };

  const getLinkedEntityName = (goal: Goal) => {
    if (goal.linkedEntityType === 'CATEGORY') {
        return categories.find(c => c.id === goal.linkedEntityId)?.name || 'Categoria Removida';
    } else if (goal.linkedEntityType === 'ACCOUNT_PLAN') {
        return accountPlan.find(a => a.id === goal.linkedEntityId)?.name || 'Conta Removida';
    } else if (goal.linkedEntityType === 'TOTAL') {
        return 'Geral';
    }
    return '-';
  };

  // ... Filtering ...
  const { start: periodStart, end: periodEnd } = useMemo(() => getDateRange(currentDate, periodType), [currentDate, periodType]);

  const filteredGoals = useMemo(() => {
    return goals.filter(g => {
        if (statusFilter !== 'ALL' && g.status !== statusFilter) return false;

        const entityName = getLinkedEntityName(g).toLowerCase();
        if (searchTerm && !g.name.toLowerCase().includes(searchTerm.toLowerCase()) && !entityName.includes(searchTerm.toLowerCase())) return false;

        const gStart = parseDate(g.startDate);
        const gEnd = parseDate(g.endDate);
        const overlaps = gStart <= periodEnd && gEnd >= periodStart;
        return overlaps;
    });
  }, [goals, statusFilter, searchTerm, periodStart, periodEnd, categories, accountPlan]);

  const kpis = useMemo(() => {
      const totalGoals = goals.length;
      const activeCount = goals.filter(g => g.status === 'ACTIVE').length;
      const inactiveCount = goals.filter(g => g.status === 'INACTIVE').length;
      
      let completedCount = 0;
      let totalTarget = 0;
      let totalAchieved = 0;

      goals.forEach(g => {
          const progress = calculateProgress(g);
          const percent = (progress / g.targetAmount) * 100;
          
          totalTarget += g.targetAmount;
          totalAchieved += progress;

          if (g.type === 'REVENUE' && percent >= 100) completedCount++;
          if (g.type !== 'REVENUE' && percent <= 100) completedCount++; 
      });

      const successRate = totalGoals > 0 ? (completedCount / totalGoals) * 100 : 0;
      
      return { totalGoals, activeCount, inactiveCount, successRate, totalTarget, totalAchieved };
  }, [goals, transactions]); 

  // ... Handlers ...
  const handleOpenAddModal = () => {
    setEditingGoal(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (goal: Goal) => {
    setEditingGoal(goal);
    setIsModalOpen(true);
  };

  const handleSave = (data: any) => {
    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const parts = dateString.split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return dateString;
    };

    const payload = {
        name: data.name,
        type: data.type,
        period: data.period,
        targetAmount: data.targetAmount,
        startDate: formatDate(data.startDate),
        endDate: formatDate(data.endDate),
        linkedEntityType: data.linkedEntityType,
        linkedEntityId: data.linkedEntityId
    };

    if (editingGoal) {
      updateGoal(editingGoal.id, payload);
    } else {
      addGoal({
        companyId: company.id,
        ...payload,
        currentAmount: 0, 
        status: 'ACTIVE'
      } as any);
    }
    onRefresh();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta meta?')) {
      deleteGoal(id);
      onRefresh();
    }
  };

  const handleToggleStatus = (id: string) => {
    toggleGoalStatus(id);
    onRefresh();
  };

  const getProgressBarColor = (percentage: number, type: string) => {
      if (type === 'REVENUE') {
          if (percentage < 33) return 'bg-red-500';
          if (percentage < 75) return 'bg-yellow-500';
          return 'bg-green-500';
      } else {
          if (percentage < 70) return 'bg-green-500'; 
          if (percentage < 100) return 'bg-yellow-500'; 
          return 'bg-red-500'; 
      }
  };

  return (
    <div className="space-y-6">
      <GoalModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSave} 
        initialData={editingGoal}
        categories={categories}
        accountPlan={accountPlan}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Target className="text-indigo-600" size={28} /> Metas Inteligentes
          </h2>
          <p className="text-gray-500 mt-1">Defina objetivos e acompanhe o sucesso financeiro.</p>
        </div>
        <button 
          onClick={handleOpenAddModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium transition-all shadow-sm flex items-center gap-2"
        >
          <Plus size={18} /> Nova Meta
        </button>
      </div>

      {/* KPIs Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
           <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
             <Target size={24} />
           </div>
           <div>
             <p className="text-sm text-gray-500 font-medium">Total de Metas</p>
             <p className="text-2xl font-bold text-gray-900">{kpis.totalGoals}</p>
           </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
           <div className="p-3 bg-green-50 text-green-600 rounded-lg">
             <CheckCircle2 size={24} />
           </div>
           <div>
             <p className="text-sm text-gray-500 font-medium">Metas Ativas</p>
             <p className="text-2xl font-bold text-gray-900">{kpis.activeCount}</p>
           </div>
        </div>
         <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
           <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
             <BarChart3 size={24} />
           </div>
           <div>
             <p className="text-sm text-gray-500 font-medium">Volume Alvo</p>
             <p className="text-lg font-bold text-gray-900">R$ {kpis.totalTarget.toLocaleString('pt-BR', { notation: 'compact' })}</p>
           </div>
        </div>
         <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
           <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
             <Award size={24} />
           </div>
           <div>
             <p className="text-sm text-gray-500 font-medium">Taxa de Sucesso</p>
             <p className="text-2xl font-bold text-gray-900">{kpis.successRate.toFixed(0)}%</p>
           </div>
        </div>
      </div>

      {/* Date Navigation Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
             <button onClick={() => setPeriodType('WEEK')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${periodType === 'WEEK' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}>Semana</button>
             <button onClick={() => setPeriodType('MONTH')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${periodType === 'MONTH' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}>Mês</button>
             <button onClick={() => setPeriodType('SEMESTER')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${periodType === 'SEMESTER' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}>Semestre</button>
             <button onClick={() => setPeriodType('YEAR')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${periodType === 'YEAR' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}>Ano</button>
          </div>

          <div className="flex items-center gap-4">
              <button onClick={() => navigatePeriod('prev')} className="p-2 rounded-full hover:bg-gray-100 text-gray-600">
                  <ChevronLeft size={20} />
              </button>
              <div className="flex items-center gap-2 min-w-[180px] justify-center text-gray-800 font-bold capitalize">
                  <Calendar size={18} className="text-indigo-600"/>
                  {getPeriodLabel()}
              </div>
              <button onClick={() => navigatePeriod('next')} className="p-2 rounded-full hover:bg-gray-100 text-gray-600">
                  <ChevronRight size={20} />
              </button>
          </div>
      </div>

      {/* Filters & Controls */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col lg:flex-row gap-4 justify-between items-center">
         
         {/* Status Tabs */}
         <div className="flex bg-gray-100 p-1 rounded-lg w-full lg:w-auto">
            <button 
              onClick={() => setStatusFilter('ALL')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${statusFilter === 'ALL' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Todas
            </button>
            <button 
              onClick={() => setStatusFilter('ACTIVE')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${statusFilter === 'ACTIVE' ? 'bg-white shadow text-green-700' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Ativas
            </button>
             <button 
              onClick={() => setStatusFilter('INACTIVE')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${statusFilter === 'INACTIVE' ? 'bg-white shadow text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Inativas
            </button>
         </div>

         {/* Search */}
         <div className="relative flex-1 w-full lg:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input 
               type="text" 
               placeholder="Buscar meta ou categoria..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white text-black"
            />
         </div>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredGoals.map((goal) => {
          const currentAmount = calculateProgress(goal);
          const percentage = goal.targetAmount > 0 ? (currentAmount / goal.targetAmount) * 100 : 0;
          const cappedPercentage = Math.min(percentage, 100);
          
          const isRevenue = goal.type === 'REVENUE';
          const isDanger = !isRevenue && percentage >= 100;

          return (
            <div key={goal.id} className={`border rounded-xl p-6 shadow-sm relative transition-all ${
              goal.status === 'INACTIVE' ? 'bg-gray-50 border-gray-200 opacity-75' : 'bg-white border-gray-200 hover:shadow-md'
            }`}>
              {/* Card Content ... */}
              <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        {goal.name}
                        {goal.status === 'INACTIVE' && <span className="text-[10px] uppercase font-bold bg-gray-200 text-gray-600 px-2 py-0.5 rounded">Inativa</span>}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        Vinculado a: 
                        <span className="font-semibold bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                           {getLinkedEntityName(goal)}
                        </span>
                    </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <span className={`flex items-center gap-1 text-xs font-bold uppercase px-2 py-1 rounded-full ${isRevenue ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {isRevenue ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
                        {isRevenue ? 'Receita' : 'Despesa'}
                    </span>
                </div>
              </div>

              <div className="flex justify-between items-end mb-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Realizado</p>
                  <p className={`text-2xl font-bold ${isRevenue ? 'text-gray-900' : (isDanger ? 'text-red-600' : 'text-gray-900')}`}>
                    R$ {currentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-right">
                   <p className="text-xs text-gray-500 mb-1">Meta</p>
                   <p className="text-xl font-semibold text-gray-600">
                     R$ {goal.targetAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                   </p>
                </div>
              </div>

              <div className="mb-2 relative">
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className={`${isDanger ? 'text-red-600' : 'text-gray-600'}`}>
                      {percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden shadow-inner">
                  <div 
                    className={`h-4 rounded-full transition-all duration-700 ease-out ${getProgressBarColor(percentage, goal.type)}`}
                    style={{ width: `${cappedPercentage}%` }}
                  >
                      <div className="w-full h-full opacity-20 bg-[linear-gradient(45deg,rgba(255,255,255,.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.15)_50%,rgba(255,255,255,.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem]"></div>
                  </div>
                </div>
              </div>

              <div className="mb-6 h-6">
                 {isRevenue && percentage >= 100 && (
                     <p className="text-xs font-bold text-green-600 flex items-center gap-1">
                         <CheckCircle2 size={14}/> Parabéns! Meta alcançada.
                     </p>
                 )}
                 {!isRevenue && percentage >= 100 && (
                     <p className="text-xs font-bold text-red-600 flex items-center gap-1">
                         <AlertTriangle size={14}/> Atenção! Orçamento estourado.
                     </p>
                 )}
                 {!isRevenue && percentage >= 80 && percentage < 100 && (
                     <p className="text-xs font-bold text-yellow-600 flex items-center gap-1">
                         <AlertTriangle size={14}/> Cuidado, próximo do limite.
                     </p>
                 )}
              </div>

              <div className="flex gap-3 border-t border-gray-100 pt-4">
                <button 
                  onClick={() => handleOpenEditModal(goal)}
                  className="flex-1 text-gray-600 hover:text-indigo-600 text-sm font-medium transition-colors"
                >
                  Editar
                </button>
                <div className="w-px bg-gray-200"></div>
                <button 
                  onClick={() => handleToggleStatus(goal.id)}
                  className="flex-1 text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
                >
                  {goal.status === 'ACTIVE' ? 'Pausar/Arquivar' : 'Reativar'}
                </button>
                <div className="w-px bg-gray-200"></div>
                <button 
                  onClick={() => handleDelete(goal.id)}
                  className="flex-1 text-gray-400 hover:text-red-600 text-sm font-medium transition-colors"
                >
                  Excluir
                </button>
              </div>
            </div>
          );
        })}
        
        {filteredGoals.length === 0 && (
            <div className="col-span-1 lg:col-span-2 text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                <Filter size={48} className="text-gray-300 mx-auto mb-4"/>
                <p className="text-gray-500 font-medium">Nenhuma meta encontrada neste período.</p>
                <p className="text-sm text-gray-400">Tente ajustar o período ou os filtros de busca.</p>
                <button 
                    onClick={handleOpenAddModal}
                    className="mt-4 text-indigo-600 font-bold text-sm hover:underline"
                >
                    Criar Nova Meta
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default GoalsView;
