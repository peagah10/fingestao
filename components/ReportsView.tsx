
import React, { useState, useMemo, useEffect } from 'react';
import { Company, Transaction, TransactionType, FinancialCategory, AccountPlanItem, DRETemplate, DRELineItem } from '../types';
import { transactionService } from '../services/transactionService';
import {
    getAccountsByCompany,
    getAssetsByCompany,
    getLongTermItems,
    getTransactionsByLongTermId,
    getCostCentersByCompany,
    getGoalsByCompany
} from '../services/mockData';
import {
    BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ComposedChart
} from 'recharts';
import {
    FileText,
    BarChart3,
    Calendar,
    Filter,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Activity,
    Scale,
    Percent,
    Printer,
    FileSpreadsheet,
    Wallet,
    Search,
    ChevronLeft,
    ChevronRight,
    Infinity,
    CheckCircle2,
    Clock,
    Info,
    EyeOff,
    Download,
    FileBox,
    Tags,
    Landmark,
    PieChart,
    HardDrive,
    Target,
    File,
    List
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportsViewProps {
    company: Company;
    transactions: Transaction[];
    categories: FinancialCategory[];
    accounts: AccountPlanItem[];
}

type ReportTab = 'CASH_FLOW' | 'DRE' | 'INDICES' | 'EXPORT';
type ViewMode = 'CHART' | 'TABLE';
type PeriodType = 'WEEK' | 'MONTH' | 'SEMESTER' | 'YEAR' | 'ALL';
type StatusFilterType = 'ALL' | 'PAID' | 'PENDING';

const ReportsView: React.FC<ReportsViewProps> = ({ company, transactions, categories, accounts }) => {
    const [activeTab, setActiveTab] = useState<ReportTab>('CASH_FLOW');
    const [viewMode, setViewMode] = useState<ViewMode>('CHART');

    // Navigation & Filter State
    const [periodType, setPeriodType] = useState<PeriodType>('SEMESTER');
    const [currentDate, setCurrentDate] = useState(new Date());

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilterType>('ALL'); // Cash vs Accrual Basis selector for DRE essentially
    const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');

    // Export Specific State
    const [exportPeriodType, setExportPeriodType] = useState<PeriodType>('MONTH');
    const [exportNavDate, setExportNavDate] = useState(new Date());
    const [exportStartDate, setExportStartDate] = useState(() => {
        const date = new Date();
        date.setDate(1); // First day of month
        return date.toISOString().split('T')[0];
    });
    const [exportEndDate, setExportEndDate] = useState(() => {
        const date = new Date();
        return date.toISOString().split('T')[0];
    });

    // DRE State
    // DRE State
    const [selectedDRETemplateId, setSelectedDRETemplateId] = useState<string>('');
    const [dreTemplates, setDreTemplates] = useState<DRETemplate[]>([]);
    const [dreLines, setDreLines] = useState<DRELineItem[]>([]);

    useEffect(() => {
        transactionService.fetchDRETemplates(company.id).then(templates => {
            if (templates) {
                setDreTemplates(templates);
                if (!selectedDRETemplateId && templates.length > 0) {
                    const defaultTpl = templates.find(t => t.isSystemDefault) || templates[0];
                    setSelectedDRETemplateId(defaultTpl.id);
                }
            }
        });
    }, [company.id]);

    useEffect(() => {
        if (selectedDRETemplateId) {
            transactionService.fetchDRELines(selectedDRETemplateId).then(lines => {
                if (lines) setDreLines(lines);
            });
        } else {
            setDreLines([]);
        }
    }, [selectedDRETemplateId]);

    // --- DATE LOGIC ---
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

    // Sync Export Dates with Selector
    useEffect(() => {
        const { start, end } = getDateRange(exportNavDate, exportPeriodType);
        const toLocalISO = (date: Date) => {
            const offset = date.getTimezoneOffset() * 60000;
            return new Date(date.getTime() - offset).toISOString().split('T')[0];
        };
        setExportStartDate(toLocalISO(start));
        setExportEndDate(toLocalISO(end));
    }, [exportPeriodType, exportNavDate]);

    const navigateExportPeriod = (direction: 'prev' | 'next') => {
        if (exportPeriodType === 'ALL') return;
        const newDate = new Date(exportNavDate);
        const amount = direction === 'next' ? 1 : -1;
        if (exportPeriodType === 'WEEK') newDate.setDate(newDate.getDate() + (amount * 7));
        else if (exportPeriodType === 'MONTH') newDate.setMonth(newDate.getMonth() + amount);
        else if (exportPeriodType === 'SEMESTER') newDate.setMonth(newDate.getMonth() + (amount * 6));
        else if (exportPeriodType === 'YEAR') newDate.setFullYear(newDate.getFullYear() + amount);
        setExportNavDate(newDate);
    };

    const getExportPeriodLabel = () => {
        if (exportPeriodType === 'ALL') return 'Todo o Histórico';
        const { start } = getDateRange(exportNavDate, exportPeriodType);
        if (exportPeriodType === 'WEEK') return `Semana de ${start.getDate()}`;
        if (exportPeriodType === 'MONTH') return start.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        if (exportPeriodType === 'SEMESTER') return `${start.getMonth() < 6 ? '1º' : '2º'} Sem. ${start.getFullYear()}`;
        return start.getFullYear().toString();
    };

    const handleTabChange = (tab: ReportTab) => {
        setActiveTab(tab);
        if (tab === 'DRE' || tab === 'INDICES' || tab === 'EXPORT') {
            setSearchTerm('');
            setTypeFilter('ALL');
            if (tab === 'INDICES') setStatusFilter('ALL');
        }
    };

    const navigatePeriod = (direction: 'prev' | 'next') => {
        if (periodType === 'ALL') return;
        const newDate = new Date(currentDate);
        const amount = direction === 'next' ? 1 : -1;
        if (periodType === 'WEEK') newDate.setDate(newDate.getDate() + (amount * 7));
        else if (periodType === 'MONTH') newDate.setMonth(newDate.getMonth() + amount);
        else if (periodType === 'SEMESTER') newDate.setMonth(newDate.getMonth() + (amount * 6));
        else if (periodType === 'YEAR') newDate.setFullYear(newDate.getFullYear() + amount);
        setCurrentDate(newDate);
    };

    const getPeriodLabel = () => {
        if (periodType === 'ALL') return 'Todo o Período';
        const { start } = getDateRange(currentDate, periodType);
        if (periodType === 'WEEK') return `Semana de ${start.getDate()}`;
        if (periodType === 'MONTH') return start.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        if (periodType === 'SEMESTER') return `${start.getMonth() < 6 ? '1º' : '2º'} Sem. ${start.getFullYear()}`;
        return start.getFullYear().toString();
    };

    const { start: periodStart, end: periodEnd } = useMemo(() => getDateRange(currentDate, periodType), [currentDate, periodType]);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const parts = t.date.split('-');
            const tDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            const dateMatch = tDate >= periodStart && tDate <= periodEnd;
            const searchMatch = !searchTerm || t.description.toLowerCase().includes(searchTerm.toLowerCase()) || t.category.toLowerCase().includes(searchTerm.toLowerCase());
            const typeMatch = typeFilter === 'ALL' || t.type === typeFilter;
            let statusMatch = true;
            if (statusFilter === 'PAID') statusMatch = t.status === 'PAID';
            if (statusFilter === 'PENDING') statusMatch = t.status !== 'PAID';
            return dateMatch && searchMatch && typeMatch && statusMatch;
        });
    }, [transactions, periodStart, periodEnd, searchTerm, statusFilter, typeFilter]);

    const cashFlowData = useMemo(() => {
        const granularity = (periodType === 'WEEK' || periodType === 'MONTH') ? 'day' : 'month';
        const dataMap = new Map<string, { income: number; expense: number; balance: number; accumulated: number; label: string; sortDate: number; }>();

        let currentIter = new Date(periodStart);
        while (currentIter <= periodEnd) {
            let key = '';
            let label = '';
            if (granularity === 'month') {
                key = `${currentIter.getFullYear()}-${currentIter.getMonth()}`;
                label = currentIter.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
            } else {
                key = `${currentIter.getFullYear()}-${currentIter.getMonth()}-${currentIter.getDate()}`;
                label = currentIter.toLocaleDateString('pt-BR', { day: 'numeric', month: 'numeric' });
            }
            dataMap.set(key, { income: 0, expense: 0, balance: 0, accumulated: 0, label, sortDate: currentIter.getTime() });
            if (granularity === 'month') currentIter.setMonth(currentIter.getMonth() + 1);
            else currentIter.setDate(currentIter.getDate() + 1);
        }

        let runningAccumulated = 0;
        filteredTransactions.forEach(t => {
            const parts = t.date.split('-');
            const tDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            let key = '';
            if (granularity === 'month') key = `${tDate.getFullYear()}-${tDate.getMonth()}`;
            else key = `${tDate.getFullYear()}-${tDate.getMonth()}-${tDate.getDate()}`;

            const entry = dataMap.get(key);
            if (entry) {
                if (t.type === TransactionType.INCOME) entry.income += t.amount;
                else entry.expense += t.amount;
            }
        });

        const sortedData = Array.from(dataMap.values()).sort((a, b) => a.sortDate - b.sortDate);
        sortedData.forEach(d => {
            d.balance = d.income - d.expense;
            runningAccumulated += d.balance;
            d.accumulated = runningAccumulated;
        });
        return sortedData;
    }, [filteredTransactions, periodStart, periodEnd, periodType]);

    const dreData = useMemo(() => {
        if (!selectedDRETemplateId) return [];
        const lines = dreLines;
        const calculatedLines = lines.map(line => {
            let value = 0;
            if (line.mappings && line.mappings.length > 0) {
                filteredTransactions.forEach(t => {
                    const matches = line.mappings.some(m => {
                        if (m.type === 'CATEGORY') {
                            const cat = categories.find(c => c.id === m.itemId);
                            return cat && cat.name === t.category;
                        } else if (m.type === 'ACCOUNT') {
                            const cat = categories.find(c => c.name === t.category);
                            return cat && cat.linkedAccountPlanId === m.itemId;
                        }
                        return false;
                    });
                    if (matches) value += t.amount;
                });
            }
            return { ...line, value };
        });

        let revenue = 0, deduction = 0, costs = 0, expenses = 0;
        calculatedLines.forEach(l => {
            if (l.type === 'REVENUE') revenue += l.value;
            if (l.type === 'DEDUCTION') deduction += l.value;
            if (l.type === 'COST') costs += l.value;
            if (l.type === 'EXPENSE' || l.type === 'TAX') expenses += l.value;
        });

        return calculatedLines.map(l => {
            if (l.type === 'SUBTOTAL') {
                if (l.name.toLowerCase().includes('líquida')) return { ...l, value: revenue - deduction };
                if (l.name.toLowerCase().includes('margem') || l.name.toLowerCase().includes('bruto')) return { ...l, value: (revenue - deduction) - costs };
            }
            if (l.type === 'RESULT') {
                return { ...l, value: (revenue - deduction - costs) - expenses };
            }
            return l;
        });
    }, [filteredTransactions, selectedDRETemplateId, categories]);

    const exportTransactions = useMemo(() => {
        const start = new Date(exportStartDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(exportEndDate);
        end.setHours(23, 59, 59, 999);

        return transactions.filter(t => {
            const parts = t.date.split('-');
            const tDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            return tDate >= start && tDate <= end;
        });
    }, [transactions, exportStartDate, exportEndDate]);

    const handleExportExcel = () => {
        const ws = XLSX.utils.json_to_sheet(exportTransactions.map(t => ({
            Data: t.date,
            Descrição: t.description,
            Categoria: t.category,
            Tipo: t.type === 'INCOME' ? 'Receita' : 'Despesa',
            Valor: t.amount,
            Status: t.status
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Lançamentos");
        XLSX.writeFile(wb, `Extrato_${exportStartDate}_${exportEndDate}.xlsx`);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <FileText className="text-indigo-600" size={28} /> Relatórios Gerenciais
                    </h2>
                    <p className="text-gray-500 mt-1">Análises detalhadas para tomada de decisão.</p>
                </div>
            </div>

            {/* TABS */}
            <div className="flex border-b border-gray-200 overflow-x-auto">
                <button onClick={() => handleTabChange('CASH_FLOW')} className={`px-6 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'CASH_FLOW' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    <Activity size={16} /> Fluxo de Caixa
                </button>
                <button onClick={() => handleTabChange('DRE')} className={`px-6 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'DRE' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    <FileSpreadsheet size={16} /> DRE
                </button>
                <button onClick={() => handleTabChange('INDICES')} className={`px-6 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'INDICES' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    <Scale size={16} /> Índices
                </button>
                <button onClick={() => handleTabChange('EXPORT')} className={`px-6 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'EXPORT' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    <Download size={16} /> Exportação
                </button>
            </div>

            {activeTab === 'CASH_FLOW' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    {/* Controls */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center bg-gray-100 rounded-lg p-1">
                            {['WEEK', 'MONTH', 'SEMESTER', 'YEAR'].map((t) => (
                                <button key={t} onClick={() => setPeriodType(t as PeriodType)} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${periodType === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}>{t === 'WEEK' ? 'Semana' : t === 'MONTH' ? 'Mês' : t === 'SEMESTER' ? 'Semestre' : 'Ano'}</button>
                            ))}
                        </div>
                        <div className="flex items-center gap-4">
                            <button onClick={() => navigatePeriod('prev')} className="p-2 rounded-full hover:bg-gray-100 text-gray-600"><ChevronLeft size={20} /></button>
                            <div className="flex items-center gap-2 min-w-[180px] justify-center text-gray-800 font-bold capitalize"><Calendar size={18} className="text-indigo-600" />{getPeriodLabel()}</div>
                            <button onClick={() => navigatePeriod('next')} className="p-2 rounded-full hover:bg-gray-100 text-gray-600"><ChevronRight size={20} /></button>
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-96">
                        <h3 className="font-bold text-gray-800 mb-4">Evolução do Saldo</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={cashFlowData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="label" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="income" name="Entradas" fill="#10b981" barSize={20} />
                                <Bar dataKey="expense" name="Saídas" fill="#ef4444" barSize={20} />
                                <Area type="monotone" dataKey="accumulated" name="Saldo Acumulado" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.1} strokeWidth={3} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {activeTab === 'DRE' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-gray-700 font-bold uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-3 text-left">Demonstrativo</th>
                                    <th className="px-6 py-3 text-right">Valor</th>
                                    <th className="px-6 py-3 text-right">A.V. %</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {dreData.map((line, idx) => {
                                    const revenue = dreData.find(l => l.type === 'REVENUE')?.value || 1;
                                    const percent = (line.value / revenue) * 100;
                                    const isResult = ['RESULT', 'SUBTOTAL'].includes(line.type);

                                    return (
                                        <tr key={idx} className={`hover:bg-gray-50 ${isResult ? 'bg-gray-50 font-bold' : ''}`}>
                                            <td className="px-6 py-3">{line.name}</td>
                                            <td className={`px-6 py-3 text-right ${line.value < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                                R$ {line.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-3 text-right text-gray-500">
                                                {percent.toFixed(1)}%
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'EXPORT' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="font-bold text-gray-800 mb-4">Exportação de Dados</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Período</label>
                                <div className="flex gap-2 items-center bg-gray-50 p-2 rounded-lg border border-gray-200">
                                    <button onClick={() => navigateExportPeriod('prev')}><ChevronLeft size={16} /></button>
                                    <span className="flex-1 text-center font-bold text-sm">{getExportPeriodLabel()}</span>
                                    <button onClick={() => navigateExportPeriod('next')}><ChevronRight size={16} /></button>
                                </div>
                            </div>
                            <div className="flex items-end">
                                <button onClick={handleExportExcel} className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors">
                                    <FileSpreadsheet size={18} /> Baixar Excel
                                </button>
                            </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm text-gray-600">
                            <p>Registros encontrados: <b>{exportTransactions.length}</b></p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportsView;
