
import React, { useState, useMemo } from 'react';
import { Company, Transaction, TransactionType, UserRole, User } from '../types';
import { analyzeFinancials } from '../services/geminiService';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Bot,
  Loader2,
  ArrowRight,
  LayoutDashboard,
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface FinancialDashboardProps {
  company: Company;
  transactions: Transaction[];
  role: UserRole;
  currentUser: User;
  onRefresh: () => void;
  onNavigate: (view: string, params?: any) => void;
}

type PeriodType = 'WEEK' | 'MONTH' | 'SEMESTER' | 'YEAR';

const FinancialDashboard: React.FC<FinancialDashboardProps> = ({ company, transactions, role, currentUser, onRefresh, onNavigate }) => {
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);

  // Date Navigation State
  const [periodType, setPeriodType] = useState<PeriodType>('MONTH');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Allow BPO/Consultant/Admin full edit access
  const canEdit = [UserRole.ADMIN, UserRole.BPO, UserRole.CONSULTANT, UserRole.SUPER_ADMIN].includes(role) ||
    (currentUser.permissions && currentUser.permissions.includes('EDIT_TRANSACTIONS'));

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

  // --- Filtering & Calculations ---

  const { start: periodStart, end: periodEnd } = useMemo(() => getDateRange(currentDate, periodType), [currentDate, periodType]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Parse date 'YYYY-MM-DD' correctly
      const tDateParts = t.date.split('-');
      const tDate = new Date(parseInt(tDateParts[0]), parseInt(tDateParts[1]) - 1, parseInt(tDateParts[2]));
      return tDate >= periodStart && tDate <= periodEnd;
    });
  }, [transactions, periodStart, periodEnd]);

  // Financial Calculations based on FILTERED data
  const totalIncome = filteredTransactions
    .filter((t) => t.type === TransactionType.INCOME)
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalExpense = filteredTransactions
    .filter((t) => t.type === TransactionType.EXPENSE)
    .reduce((acc, curr) => acc + curr.amount, 0);

  const balance = totalIncome - totalExpense;

  // Chart Data based on FILTERED data
  const chartData = [
    { name: 'Entradas', value: totalIncome },
    { name: 'Saídas', value: totalExpense },
  ];

  // Only show last 5 transactions from the filtered list
  const recentTransactions = filteredTransactions.slice(0, 5);

  const handleAiAnalysis = async () => {
    setLoadingAi(true);
    setAiInsight(null);
    // Use filtered transactions for AI context relevance
    const result = await analyzeFinancials(filteredTransactions, company.name);
    setAiInsight(result);
    setLoadingAi(false);
  };

  const handleOpenAdd = (type: TransactionType) => {
    onNavigate('transactions', { openModal: true, defaultType: type });
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <LayoutDashboard className="text-indigo-600" size={28} /> Dashboard Financeiro
          </h2>
          <p className="text-gray-500 mt-1">Visão geral da saúde financeira da empresa.</p>
        </div>

        {canEdit && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleOpenAdd(TransactionType.INCOME)}
              className="flex items-center bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-medium transition-all shadow-sm"
            >
              <TrendingUp size={18} className="mr-2" /> Nova Receita
            </button>
            <button
              onClick={() => handleOpenAdd(TransactionType.EXPENSE)}
              className="flex items-center bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg font-medium transition-all shadow-sm"
            >
              <TrendingDown size={18} className="mr-2" /> Nova Despesa
            </button>
          </div>
        )}
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
            <Calendar size={18} className="text-indigo-600" />
            {getPeriodLabel()}
          </div>
          <button onClick={() => navigatePeriod('next')} className="p-2 rounded-full hover:bg-gray-100 text-gray-600">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Receita do Período</h3>
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <TrendingUp size={20} />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Despesas do Período</h3>
            <div className="p-2 bg-red-100 text-red-600 rounded-lg">
              <TrendingDown size={20} />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Resultado Líquido</h3>
            <div className={`p-2 rounded-lg ${balance >= 0 ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
              <DollarSign size={20} />
            </div>
          </div>
          <p className={`text-2xl font-bold ${balance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
            R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transactions Table */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-semibold text-gray-800">Últimas Movimentações (Filtradas)</h3>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                <tr>
                  <th className="px-6 py-3">Data</th>
                  <th className="px-6 py-3">Descrição</th>
                  <th className="px-6 py-3">Categoria</th>
                  <th className="px-6 py-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((t) => (
                  <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50 last:border-0">
                    <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                      {new Date(t.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900 truncate max-w-[200px]">{t.description}</td>
                    <td className="px-6 py-4 text-gray-500">{t.category}</td>
                    <td className={`px-6 py-4 text-right font-medium ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                      {t.type === TransactionType.INCOME ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
                {recentTransactions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      Nenhum lançamento no período selecionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-t border-gray-100 bg-gray-50">
            <button
              onClick={() => onNavigate('transactions')}
              className="w-full text-center text-sm text-indigo-600 font-medium hover:text-indigo-800 transition-colors flex justify-center items-center gap-1"
            >
              Ver Extrato Completo <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* AI & Chart Section */}
        <div className="space-y-6">
          {/* AI Advisor */}
          <div className="bg-gradient-to-br from-indigo-900 to-indigo-700 text-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/10 rounded-lg">
                <Bot size={24} className="text-indigo-200" />
              </div>
              <h3 className="font-semibold text-lg">FinAI Advisor</h3>
            </div>

            {!aiInsight ? (
              <div className="text-center py-6">
                <p className="text-indigo-200 text-sm mb-4">
                  Use IA para analisar o fluxo de caixa deste período e encontrar oportunidades.
                </p>
                <button
                  onClick={handleAiAnalysis}
                  disabled={loadingAi || filteredTransactions.length === 0}
                  className={`w-full bg-white text-indigo-900 font-medium py-2 px-4 rounded-lg hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 ${filteredTransactions.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {loadingAi ? <Loader2 className="animate-spin" size={18} /> : null}
                  {loadingAi ? 'Analisando...' : 'Gerar Diagnóstico'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-white/10 rounded-lg p-4 text-sm text-indigo-50 leading-relaxed max-h-60 overflow-y-auto custom-scrollbar">
                  <div className="markdown-prose" dangerouslySetInnerHTML={{ __html: aiInsight.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') }} />
                </div>
                <button
                  onClick={() => setAiInsight(null)}
                  className="text-xs text-indigo-300 hover:text-white underline"
                >
                  Nova Análise
                </button>
              </div>
            )}
          </div>

          {/* Mini Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-64">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Visão Rápida (Período)</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialDashboard;
