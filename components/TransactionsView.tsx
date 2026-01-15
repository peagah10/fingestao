
import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, TransactionType, User, UserRole, Company, FinancialAccount, FinancialCategory, CostCenter } from '../types';
import { transactionService } from '../services/transactionService';
import TransactionModal from './TransactionModal';
import ImportTransactionsModal from './ImportTransactionsModal';
import * as XLSX from 'xlsx';
import {
  PlusCircle,
  Search,
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  Infinity
} from 'lucide-react';

interface TransactionsViewProps {
  company: Company;
  transactions: Transaction[];
  currentUser: User;
  onRefresh: () => void;
  viewParams?: any;
  onClearParams?: () => void;
  // New props from App.tsx
  categories: FinancialCategory[];
  accounts: FinancialAccount[];
  costCenters: CostCenter[];
}

type PeriodType = 'WEEK' | 'MONTH' | 'SEMESTER' | 'YEAR' | 'ALL';
type StatusFilterType = 'ALL' | 'PAID' | 'PENDING';

const PAYMENT_METHODS_PT: Record<string, string> = {
  'PIX': 'Pix',
  'BOLETO': 'Boleto',
  'CREDIT_CARD': 'Cartão de Crédito',
  'DEBIT_CARD': 'Cartão de Débito',
  'CASH': 'Dinheiro',
  'TRANSFER': 'Transferência',
  'OTHER': 'Outro'
};

const TransactionsView: React.FC<TransactionsViewProps> = ({
  company, transactions, currentUser, onRefresh, viewParams, onClearParams,
  categories, accounts, costCenters
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [defaultModalType, setDefaultModalType] = useState<TransactionType>(TransactionType.INCOME);

  // Filters State
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Date Navigation State
  const [periodType, setPeriodType] = useState<PeriodType>('MONTH');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Data now comes from props
  // const categories = ...
  // const accounts = ...
  // const costCenters = ...

  // Allow full access for privileged roles
  const canEdit = [UserRole.ADMIN, UserRole.BPO, UserRole.CONSULTANT, UserRole.SUPER_ADMIN].includes(currentUser.role) ||
    (currentUser.permissions && currentUser.permissions.includes('EDIT_TRANSACTIONS'));

  // Handle incoming params from other views (e.g. Dashboard buttons or AI)
  useEffect(() => {
    if (viewParams && viewParams.openModal) {
      if (viewParams.prefillData) {
        // Construct a partial transaction object to act as draft/template
        // We cast this to Transaction loosely, TransactionModal handles partials well if id is missing
        const draft: any = {
          ...viewParams.prefillData,
          payments: [],
          date: new Date().toISOString().split('T')[0],
          status: 'PAID' // Default
        };
        setEditingTransaction(draft);
        setDefaultModalType(viewParams.prefillData.type || TransactionType.INCOME);
      } else {
        setEditingTransaction(null);
        setDefaultModalType(viewParams.defaultType || TransactionType.INCOME);
      }
      setIsModalOpen(true);

      if (onClearParams) onClearParams();
    }
  }, [viewParams]);

  // --- Date Logic Helpers ---

  const getDateRange = (date: Date, type: PeriodType): { start: Date, end: Date } => {
    const start = new Date(date);
    const end = new Date(date);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (type === 'WEEK') {
      const day = start.getDay(); // 0 (Sun) to 6 (Sat)
      const diff = start.getDate() - day; // adjust when day is sunday
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
    if (periodType === 'ALL') return; // No navigation for ALL

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
    if (periodType === 'ALL') return 'Todo o Período';

    const { start, end } = getDateRange(currentDate, periodType);
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long' };

    if (periodType === 'WEEK') {
      return `${start.toLocaleDateString('pt-BR', { day: 'numeric', month: 'numeric' })} a ${end.toLocaleDateString('pt-BR', { day: 'numeric', month: 'numeric', year: 'numeric' })}`;
    } else if (periodType === 'MONTH') {
      return start.toLocaleDateString('pt-BR', options);
    } else if (periodType === 'SEMESTER') {
      const semester = start.getMonth() < 6 ? '1º Semestre' : '2º Semestre';
      return `${semester} de ${start.getFullYear()}`;
    } else {
      return start.getFullYear().toString();
    }
  };

  // --- Filtering Logic ---

  const { start: periodStart, end: periodEnd } = useMemo(() => getDateRange(currentDate, periodType), [currentDate, periodType]);

  const filteredTransactions = transactions.filter(t => {
    // 1. Text Search
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase());

    // 2. Type Filter
    const matchesType = typeFilter === 'ALL' || t.type === typeFilter;

    // 3. Status Filter
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;

    // 4. Date Filter (Competence)
    // We append T00:00:00 to ensure we aren't fighting timezone shifts on simple date strings "YYYY-MM-DD"
    let matchesDate = true;
    if (periodType !== 'ALL') {
      const tDateParts = t.date.split('-');
      if (tDateParts.length === 3) {
        const tDate = new Date(parseInt(tDateParts[0]), parseInt(tDateParts[1]) - 1, parseInt(tDateParts[2]));
        matchesDate = tDate >= periodStart && tDate <= periodEnd;
      } else {
        matchesDate = false; // Invalid date format
      }
    }

    return matchesSearch && matchesType && matchesStatus && matchesDate;
  });

  const handleOpenAddModal = (type: TransactionType) => {
    setEditingTransaction(null);
    setDefaultModalType(type);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (t: Transaction) => {
    if (!canEdit) return;
    setEditingTransaction(t);
    setDefaultModalType(t.type);
    setIsModalOpen(true);
  };

  const handleSaveTransaction = async (data: any) => {
    let success = false;
    if (data.id) {
      success = await transactionService.updateTransaction(data.id, data);
    } else {
      const newTx = await transactionService.createTransaction({ ...data, companyId: company.id, createdBy: currentUser.id });
      success = !!newTx;
    }
    if (success) {
      setIsModalOpen(false); // Close modal only on success
      onRefresh();
    }
  };

  const handleBatchImport = async (importedData: any[]) => {
    // Process each row
    for (const row of importedData) {
      // If the row has a resolved accountId from the import logic, use it. 
      // Otherwise fallback to default.
      let targetAccountId = row.accountId;

      if (!targetAccountId && accounts.length > 0) {
        targetAccountId = accounts[0].id;
      }

      await transactionService.createTransaction({
        companyId: company.id,
        description: row.description,
        amount: row.amount,
        type: row.type,
        category: row.category,
        date: row.date,
        status: row.status,
        // payments: row.payments, // TODO: Add payments support in service
        accountId: targetAccountId,
        costCenterId: row.costCenterId
      });
    }
    onRefresh();
    alert(`${importedData.length} lançamentos importados com sucesso!`);
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // --- 1. Prepare Validation Data (Hidden Sheet) ---
    // This allows the exported file to have dropdowns if the user wants to edit and re-import
    const typesList = ['Receita', 'Despesa'];
    const statusesList = ['Realizado', 'Pendente'];
    const methodsList = ['Pix', 'Boleto', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro', 'Transferência', 'Outro'];

    const categoryNames = categories.filter(c => c.active).map(c => c.name);
    const accountNames = accounts.filter(a => a.status === 'ACTIVE').map(a => a.name);
    const costCenterNames = costCenters.filter(c => c.status === 'ACTIVE').map(c => c.name);

    const maxLength = Math.max(typesList.length, statusesList.length, methodsList.length, categoryNames.length, accountNames.length, costCenterNames.length);
    const dataRows = [];

    dataRows.push(['_Types', '_Status', '_Methods', '_Categories', '_Accounts', '_CostCenters']);

    for (let i = 0; i < maxLength; i++) {
      dataRows.push([
        typesList[i] || '',
        statusesList[i] || '',
        methodsList[i] || '',
        categoryNames[i] || '',
        accountNames[i] || '',
        costCenterNames[i] || ''
      ]);
    }

    const dataWS = XLSX.utils.aoa_to_sheet(dataRows);
    XLSX.utils.book_append_sheet(wb, dataWS, "Dados");

    // --- 2. Prepare Main Data ---
    const exportData = filteredTransactions.map(t => {
      const costCenter = costCenters.find(cc => cc.id === t.costCenterId)?.name || '-';
      const account = accounts.find(a => a.id === t.accountId)?.name || '-';
      const paymentMethods = t.payments.map(p => PAYMENT_METHODS_PT[p.method] || p.method).join(', ');

      return {
        'Data': new Date(t.date).toLocaleDateString('pt-BR'),
        'Descrição': t.description,
        'Categoria': t.category,
        'Centro de Custo': costCenter,
        'Conta': account,
        'Tipo': t.type === TransactionType.INCOME ? 'Receita' : 'Despesa',
        'Valor': t.amount,
        'Status': t.status === 'PAID' ? 'Realizado' : (t.status === 'PENDING' ? 'Pendente' : 'Parcial'),
        'Forma Pagamento': paymentMethods,
        'Obs': t.observation || ''
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);

    // --- 3. Apply Validation to WS ---
    if (!ws['!dataValidation']) ws['!dataValidation'] = [];

    const rangeLimit = (exportData.length + 100).toString();

    // Helper to add validation
    const addVal = (col: string, sourceCol: string, count: number) => {
      if (count > 0) {
        ws['!dataValidation'].push({
          sqref: `${col}2:${col}${rangeLimit}`,
          type: 'list',
          operator: 'equal',
          formula1: `'Dados'!$${sourceCol}$2:$${sourceCol}$${count + 1}`,
          showDropDown: true
        });
      }
    };

    // Columns Mapping based on JSON key order:
    // A: Data, B: Desc, C: Categoria, D: CC, E: Conta, F: Tipo, G: Valor, H: Status, I: Forma, J: Obs
    addVal('C', 'D', categoryNames.length); // Categoria -> Col D in Dados
    addVal('D', 'F', costCenterNames.length); // CC -> Col F in Dados
    addVal('E', 'E', accountNames.length); // Conta -> Col E in Dados
    addVal('F', 'A', typesList.length); // Tipo -> Col A in Dados
    addVal('H', 'B', statusesList.length); // Status -> Col B in Dados
    addVal('I', 'C', methodsList.length); // Forma -> Col C in Dados

    // Auto-width columns
    const wscols = [
      { wch: 12 }, // Data
      { wch: 30 }, // Desc
      { wch: 25 }, // Cat
      { wch: 20 }, // CC
      { wch: 20 }, // Conta
      { wch: 12 }, // Tipo
      { wch: 15 }, // Valor
      { wch: 15 }, // Status
      { wch: 20 }, // Forma Pag
      { wch: 20 }  // Obs
    ];
    ws['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, "Extrato");

    // Hide Data Sheet
    if (!wb.Workbook) wb.Workbook = { Sheets: [] };
    if (!wb.Workbook.Sheets) wb.Workbook.Sheets = [];
    wb.Workbook.Sheets[0] = { Hidden: 1 }; // Hide "Dados"

    // 4. Trigger Download
    XLSX.writeFile(wb, `FinGestao_Extrato_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getCostCenterName = (id?: string) => {
    if (!id) return null;
    return costCenters.find(cc => cc.id === id)?.name;
  };

  return (
    <div className="space-y-6">
      {isModalOpen && (
        <TransactionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveTransaction}
          categories={categories}
          accounts={accounts}
          costCenters={costCenters}
          transactions={transactions}
          initialData={editingTransaction}
          defaultType={defaultModalType}
        />
      )}

      {isImportModalOpen && (
        <ImportTransactionsModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImport={handleBatchImport}
          categories={categories}
          accounts={accounts} // Passing Accounts
          costCenters={costCenters} // Passing Cost Centers
        />
      )}

      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestão de Lançamentos</h2>
          <p className="text-gray-500">Gerencie todas as entradas e saídas de caixa.</p>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2">
            {/* Import Button */}
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2.5 rounded-lg font-medium transition-all shadow-sm mr-2"
            >
              <FileSpreadsheet size={18} className="mr-2 text-green-600" /> Importação
            </button>

            <button
              onClick={() => handleOpenAddModal(TransactionType.INCOME)}
              className="flex items-center bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-medium transition-all shadow-sm"
            >
              <TrendingUp size={18} className="mr-2" /> Nova Receita
            </button>
            <button
              onClick={() => handleOpenAddModal(TransactionType.EXPENSE)}
              className="flex items-center bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg font-medium transition-all shadow-sm"
            >
              <TrendingDown size={18} className="mr-2" /> Nova Despesa
            </button>
          </div>
        )}
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
            <Calendar size={18} className="text-indigo-600" />
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

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col xl:flex-row gap-4 justify-between items-center">
        {/* Search */}
        <div className="flex items-center gap-2 w-full xl:w-auto flex-1">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por descrição ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
          {/* Status Filter */}
          <div className="flex items-center bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${statusFilter === 'ALL' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Todos
            </button>
            <button
              onClick={() => setStatusFilter('PAID')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap flex items-center justify-center gap-1 ${statusFilter === 'PAID' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <CheckCircle2 size={14} /> Recebido/Pago
            </button>
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap flex items-center justify-center gap-1 ${statusFilter === 'PENDING' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Clock size={14} /> Pendente
            </button>
          </div>

          <div className="w-px h-8 bg-gray-300 hidden sm:block"></div>

          {/* Type Filter */}
          <div className="flex items-center bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-all ${typeFilter === 'ALL' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Todos
            </button>
            <button
              onClick={() => setTypeFilter('INCOME')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-all ${typeFilter === 'INCOME' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Receitas
            </button>
            <button
              onClick={() => setTypeFilter('EXPENSE')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-all ${typeFilter === 'EXPENSE' ? 'bg-white shadow-sm text-red-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Despesas
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Descrição</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4">C. Custo</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4 text-right">Valor</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                    {new Date(t.date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">{t.description}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {t.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs">
                    {getCostCenterName(t.costCenterId) || '-'}
                  </td>
                  <td className="px-6 py-4">
                    {t.type === TransactionType.INCOME ? (
                      <span className="flex items-center text-emerald-600 text-xs font-bold uppercase gap-1">
                        <TrendingUp size={14} /> Receita
                      </span>
                    ) : (
                      <span className="flex items-center text-red-600 text-xs font-bold uppercase gap-1">
                        <TrendingDown size={14} /> Despesa
                      </span>
                    )}
                  </td>
                  <td className={`px-6 py-4 text-right font-medium text-base ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                    {t.type === TransactionType.INCOME ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${t.status === 'PAID' ? 'bg-green-100 text-green-800' :
                        t.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-orange-100 text-orange-800'
                      }`}>
                      {t.status === 'PAID'
                        ? (t.type === TransactionType.INCOME ? 'Recebido' : 'Pago')
                        : t.status === 'PENDING' ? 'Pendente' : 'Parcial'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleOpenEditModal(t)}
                      className={`transition-colors ${canEdit ? 'text-gray-400 hover:text-indigo-600' : 'text-gray-200 cursor-not-allowed'}`}
                    >
                      <Edit2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <Filter size={32} className="text-gray-300 mb-2" />
                      <p>Nenhum lançamento encontrado para o período e filtros selecionados.</p>
                      <p className="text-xs text-gray-400 mt-1">Tente mudar o período para "Geral" para ver todo o histórico.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-between items-center text-xs text-gray-500">
          <span>Mostrando {filteredTransactions.length} registros</span>
          <button
            onClick={handleExportExcel}
            className="flex items-center hover:text-indigo-600 transition-colors"
          >
            <Download size={14} className="mr-1" /> Exportar Excel
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionsView;
