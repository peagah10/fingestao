
import React, { useState, useMemo } from 'react';
import { Company, Asset } from '../types';
import { getAssetsByCompany, addAsset, updateAsset, deleteAsset, getAssetCategories, addAssetCategory, updateAssetCategory, deleteAssetCategory, getAccountPlanByCompany } from '../services/mockData';
import AssetModal from './AssetModal';
import AssetCategoryModal from './AssetCategoryModal';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  HardDrive, 
  TrendingDown, 
  DollarSign, 
  Activity, 
  List, 
  LayoutGrid,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Infinity,
  BarChart3,
  Tags
} from 'lucide-react';

interface AssetsViewProps {
  company: Company;
  onRefresh: () => void;
}

type PeriodType = 'WEEK' | 'MONTH' | 'SEMESTER' | 'YEAR' | 'ALL';
type AssetFilterStatus = 'ALL' | 'ACTIVE' | 'SOLD' | 'WRITTEN_OFF';

const AssetsView: React.FC<AssetsViewProps> = ({ company, onRefresh }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'LIST' | 'GRID'>('GRID');
  
  // Date Navigation State
  const [periodType, setPeriodType] = useState<PeriodType>('ALL');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Status Filter State
  const [statusFilter, setStatusFilter] = useState<AssetFilterStatus>('ALL');

  const assets = getAssetsByCompany(company.id);
  const categories = getAssetCategories(company.id);
  const accountPlan = getAccountPlanByCompany(company.id);

  // --- Logic: Calculate Current Value ---
  const calculateAssetMetrics = (asset: Asset) => {
      const today = new Date();
      const acquisition = new Date(asset.acquisitionDate);
      const depreciableAmount = asset.initialValue - asset.residualValue;
      
      // Calculate months passed
      const yearsDiff = today.getFullYear() - acquisition.getFullYear();
      const monthsDiff = today.getMonth() - acquisition.getMonth();
      // Total months passed since acquisition (capped at useful life)
      const totalMonthsPassed = Math.min(Math.max(0, (yearsDiff * 12) + monthsDiff), asset.usefulLifeMonths);
      const yearsPassed = totalMonthsPassed / 12;
      const usefulLifeYears = asset.usefulLifeMonths / 12;

      let accumulatedDepreciation = 0;

      // 1. LINEAR (Straight Line)
      if (asset.depreciationMethod === 'LINEAR') {
          const monthlyDepreciation = depreciableAmount / asset.usefulLifeMonths;
          accumulatedDepreciation = monthlyDepreciation * totalMonthsPassed;
      } 
      // 2. SUM OF YEARS DIGITS (Soma dos Dígitos) - Accelerated
      else if (asset.depreciationMethod === 'SUM_OF_YEARS') {
          const n = Math.ceil(usefulLifeYears); // Round up to handle partial years in sum
          const sumOfDigits = (n * (n + 1)) / 2;
          
          // Calculate for full years passed
          const fullYears = Math.floor(yearsPassed);
          for (let i = 0; i < fullYears; i++) {
              const remainingLifeAtStartOfYear = n - i;
              const fraction = remainingLifeAtStartOfYear / sumOfDigits;
              accumulatedDepreciation += fraction * depreciableAmount;
          }
          
          // Partial year calculation
          const partialYear = yearsPassed - fullYears;
          if (partialYear > 0) {
              const currentYearLife = n - fullYears;
              const fraction = currentYearLife / sumOfDigits;
              accumulatedDepreciation += (fraction * depreciableAmount) * partialYear;
          }
      }
      // 3. DOUBLE DECLINING BALANCE (Saldos Decrescentes - 200%)
      else if (asset.depreciationMethod === 'DECLINING_BALANCE') {
          // Rate is 2 / LifeYears
          const rate = usefulLifeYears > 0 ? (2 / usefulLifeYears) : 0;
          let currentBookValue = asset.initialValue;
          
          // Iterate roughly by month for better precision or by year
          // Let's do monthly approximation: rate per month is roughly rate / 12
          // But strict DDB is annual. Let's do continuous compounding approximation or step-wise.
          // Step-wise is standard.
          
          // Year 1, Year 2...
          const fullYears = Math.floor(yearsPassed);
          for (let i = 0; i < fullYears; i++) {
              const dep = currentBookValue * rate;
              // Ensure we don't go below residual
              if (currentBookValue - dep < asset.residualValue) {
                  accumulatedDepreciation += (currentBookValue - asset.residualValue);
                  currentBookValue = asset.residualValue;
                  break;
              }
              accumulatedDepreciation += dep;
              currentBookValue -= dep;
          }
          
          // Partial year
          const partialYear = yearsPassed - fullYears;
          if (partialYear > 0 && currentBookValue > asset.residualValue) {
              const dep = (currentBookValue * rate) * partialYear;
              if (currentBookValue - dep < asset.residualValue) {
                  accumulatedDepreciation += (currentBookValue - asset.residualValue);
              } else {
                  accumulatedDepreciation += dep;
              }
          }
      }
      // 4. UNITS OF PRODUCTION (Unidades Produzidas)
      else if (asset.depreciationMethod === 'UNITS_OF_PRODUCTION') {
          const totalUnits = asset.usageTotalEstimated || 1;
          const currentUsage = asset.usageCurrent || 0;
          
          // Simple ratio
          const usageRatio = Math.min(1, currentUsage / totalUnits);
          accumulatedDepreciation = usageRatio * depreciableAmount;
      }

      // Cap at depreciable amount (safety check for all methods)
      if (accumulatedDepreciation > depreciableAmount) {
          accumulatedDepreciation = depreciableAmount;
      }

      const currentValue = asset.initialValue - accumulatedDepreciation;
      // Progress calculation varies slightly by method but conceptually is % of value lost
      const progress = depreciableAmount > 0 ? (accumulatedDepreciation / depreciableAmount) * 100 : 0;

      return {
          currentValue,
          accumulatedDepreciation,
          progress: Math.min(100, Math.max(0, progress)),
          monthsRemaining: Math.max(0, asset.usefulLifeMonths - totalMonthsPassed)
      };
  };

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
            start: new Date('1900-01-01'), 
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

  // --- Handlers ---
  const handleOpenAdd = () => {
    setEditingAsset(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setIsModalOpen(true);
  };

  const handleSave = (data: any) => {
    if (editingAsset) {
      updateAsset(editingAsset.id, data);
    } else {
      addAsset({ ...data, companyId: company.id });
    }
    onRefresh();
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este ativo?')) {
      deleteAsset(id);
      onRefresh();
    }
  };

  // --- Category Handlers ---
  const handleCreateCategory = (data: { name: string; linkedAccountPlanId: string }) => {
      addAssetCategory({ ...data, companyId: company.id });
      onRefresh();
  };

  const handleEditCategory = (id: string, data: { name: string; linkedAccountPlanId: string }) => {
      updateAssetCategory(id, data);
      onRefresh();
  };

  const handleDeleteCategory = (id: string) => {
      if (confirm('Excluir categoria de ativo?')) {
          deleteAssetCategory(id);
          onRefresh();
      }
  };

  // --- Filtering ---
  const { start: periodStart, end: periodEnd } = useMemo(() => getDateRange(currentDate, periodType), [currentDate, periodType]);

  const filteredAssets = assets.filter(a => {
      // 1. Text Search
      const categoryName = categories.find(c => c.id === a.categoryId)?.name || '';
      const matchSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) || categoryName.toLowerCase().includes(searchTerm.toLowerCase());
      
      // 2. Date Filter
      let matchDate = true;
      if (periodType !== 'ALL') {
          // Parse string YYYY-MM-DD correctly
          const parts = a.acquisitionDate.split('-');
          const acq = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          matchDate = acq >= periodStart && acq <= periodEnd;
      }

      // 3. Status Filter
      let matchStatus = true;
      if (statusFilter !== 'ALL') {
          matchStatus = a.status === statusFilter;
      }

      return matchSearch && matchDate && matchStatus;
  });

  // --- KPIs Calculation ---
  const activeAssets = assets.filter(a => a.status === 'ACTIVE');
  const totalInvested = activeAssets.reduce((acc, a) => acc + a.initialValue, 0);
  const totalCurrentValue = activeAssets.reduce((acc, a) => acc + calculateAssetMetrics(a).currentValue, 0);
  const totalDepreciation = totalInvested - totalCurrentValue;

  const getStatusBadge = (status: string) => {
      switch(status) {
          case 'ACTIVE': return <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-green-100 text-green-700">Ativo</span>;
          case 'SOLD': return <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-indigo-100 text-indigo-700">Vendido</span>;
          case 'WRITTEN_OFF': return <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-red-100 text-red-700">Baixado</span>;
          default: return null;
      }
  };

  const getMethodBadge = (method: string) => {
      switch(method) {
          case 'LINEAR': return 'Linear';
          case 'SUM_OF_YEARS': return 'Soma Dígitos';
          case 'DECLINING_BALANCE': return 'Saldos Dec.';
          case 'UNITS_OF_PRODUCTION': return 'Unidades';
          default: return 'Linear';
      }
  };

  return (
    <div className="space-y-6">
      <AssetModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSave} 
        initialData={editingAsset}
        companyId={company.id}
      />

      <AssetCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        accountPlan={accountPlan}
        onCreate={handleCreateCategory}
        onEdit={handleEditCategory}
        onDelete={handleDeleteCategory}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <HardDrive className="text-indigo-600" size={28} /> Gestão de Ativos
          </h2>
          <p className="text-gray-500 mt-1">Controle de bens, depreciação e valor patrimonial.</p>
        </div>
        <div className="flex gap-2">
            <button 
              onClick={() => setIsCategoryModalOpen(true)}
              className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2.5 rounded-lg font-medium transition-all shadow-sm flex items-center gap-2"
            >
              <Tags size={18} /> Categorias
            </button>
            <button 
              onClick={handleOpenAdd}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium transition-all shadow-sm flex items-center gap-2"
            >
              <Plus size={18} /> Novo Ativo
            </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
           <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><DollarSign size={24}/></div>
           <div>
             <p className="text-sm font-medium text-gray-500">Total Investido (Ativos)</p>
             <p className="text-2xl font-bold text-gray-900">R$ {totalInvested.toLocaleString('pt-BR', { notation: 'compact' })}</p>
           </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
           <div className="p-3 bg-green-50 text-green-600 rounded-lg"><Activity size={24}/></div>
           <div>
             <p className="text-sm font-medium text-gray-500">Valor Atual (Book Value)</p>
             <p className="text-2xl font-bold text-gray-900">R$ {totalCurrentValue.toLocaleString('pt-BR', { notation: 'compact' })}</p>
           </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
           <div className="p-3 bg-orange-50 text-orange-600 rounded-lg"><TrendingDown size={24}/></div>
           <div>
             <p className="text-sm font-medium text-gray-500">Depreciação Acumulada</p>
             <p className="text-2xl font-bold text-red-600">R$ {totalDepreciation.toLocaleString('pt-BR', { notation: 'compact' })}</p>
           </div>
        </div>
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

      {/* Filters & Controls */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col lg:flex-row gap-4 justify-between items-center">
        
        {/* Status Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-lg w-full lg:w-auto overflow-x-auto">
            <button 
                onClick={() => setStatusFilter('ALL')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${statusFilter === 'ALL' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Todos
            </button>
            <button 
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${statusFilter === 'ACTIVE' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Ativos
            </button>
            <button 
                onClick={() => setStatusFilter('SOLD')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${statusFilter === 'SOLD' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Vendidos
            </button>
            <button 
                onClick={() => setStatusFilter('WRITTEN_OFF')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${statusFilter === 'WRITTEN_OFF' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Baixados/Descartados
            </button>
        </div>

        <div className="flex gap-3 w-full lg:w-auto items-center">
            {/* Search */}
            <div className="relative flex-1 lg:min-w-[300px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input 
                type="text"
                placeholder="Buscar ativo ou categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black bg-white"
                />
            </div>

            {/* View Toggle */}
            <div className="flex bg-gray-100 p-1 rounded-lg">
                <button 
                    onClick={() => setViewMode('LIST')}
                    className={`p-2 rounded-md transition-all ${viewMode === 'LIST' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                    title="Lista"
                >
                    <List size={18} />
                </button>
                <button 
                    onClick={() => setViewMode('GRID')}
                    className={`p-2 rounded-md transition-all ${viewMode === 'GRID' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                    title="Grade"
                >
                    <LayoutGrid size={18} />
                </button>
            </div>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'GRID' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAssets.map(asset => {
                  const metrics = calculateAssetMetrics(asset);
                  const categoryName = categories.find(c => c.id === asset.categoryId)?.name || 'Sem Categoria';
                  
                  return (
                      <div key={asset.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between hover:shadow-md transition-all">
                          <div>
                              <div className="flex justify-between items-start mb-2">
                                  <div>
                                      <h3 className="font-bold text-gray-900 line-clamp-1">{asset.name}</h3>
                                      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide bg-gray-100 px-1.5 py-0.5 rounded">{categoryName}</span>
                                  </div>
                                  {getStatusBadge(asset.status)}
                              </div>
                              <div className="flex justify-between items-center mb-4 mt-2">
                                  <p className="text-sm text-gray-500 line-clamp-1 flex-1 mr-2">{asset.description || 'Sem descrição'}</p>
                                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100 flex items-center gap-1 whitespace-nowrap">
                                      <BarChart3 size={10} /> {getMethodBadge(asset.depreciationMethod)}
                                  </span>
                              </div>
                              
                              <div className="space-y-3 mb-6">
                                  <div className="flex justify-between text-sm">
                                      <span className="text-gray-500">Valor Original</span>
                                      <span className="font-medium">R$ {asset.initialValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                      <span className="text-gray-500">Valor Atual</span>
                                      <span className="font-bold text-indigo-700">R$ {metrics.currentValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                                  </div>
                                  
                                  <div className="mt-2">
                                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                                          <span>Depreciação ({metrics.progress.toFixed(0)}%)</span>
                                          {asset.depreciationMethod === 'UNITS_OF_PRODUCTION' && (
                                              <span>{asset.usageCurrent}/{asset.usageTotalEstimated} un.</span>
                                          )}
                                      </div>
                                      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                          <div className="bg-orange-400 h-1.5 rounded-full" style={{ width: `${metrics.progress}%` }}></div>
                                      </div>
                                  </div>
                              </div>
                          </div>

                          <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                              <p className="text-xs text-gray-400">Aq: {new Date(asset.acquisitionDate).toLocaleDateString('pt-BR')}</p>
                              <div className="flex gap-2">
                                  <button onClick={() => handleOpenEdit(asset)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"><Edit2 size={16}/></button>
                                  <button onClick={() => handleDelete(asset.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={16}/></button>
                              </div>
                          </div>
                      </div>
                  );
              })}
          </div>
      )}

      {/* List View */}
      {viewMode === 'LIST' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600 font-bold text-xs uppercase">
                      <tr>
                          <th className="px-6 py-4">Ativo</th>
                          <th className="px-6 py-4">Categoria</th>
                          <th className="px-6 py-4">Aquisição</th>
                          <th className="px-6 py-4">Método</th>
                          <th className="px-6 py-4 text-right">Valor Original</th>
                          <th className="px-6 py-4 text-right">Depreciação</th>
                          <th className="px-6 py-4 text-right">Valor Atual</th>
                          <th className="px-6 py-4 text-center">Status</th>
                          <th className="px-6 py-4 text-center">Ações</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {filteredAssets.map(asset => {
                          const metrics = calculateAssetMetrics(asset);
                          const categoryName = categories.find(c => c.id === asset.categoryId)?.name || '-';

                          return (
                              <tr key={asset.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-6 py-4 font-medium text-gray-900">
                                      {asset.name}
                                      <div className="text-xs text-gray-400 font-normal">{asset.description}</div>
                                  </td>
                                  <td className="px-6 py-4 text-gray-600">{categoryName}</td>
                                  <td className="px-6 py-4 text-gray-600">{new Date(asset.acquisitionDate).toLocaleDateString('pt-BR')}</td>
                                  <td className="px-6 py-4 text-gray-600">
                                      <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">{getMethodBadge(asset.depreciationMethod)}</span>
                                  </td>
                                  <td className="px-6 py-4 text-right">R$ {asset.initialValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                                  <td className="px-6 py-4 text-right text-red-500">- R$ {metrics.accumulatedDepreciation.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                                  <td className="px-6 py-4 text-right font-bold text-indigo-700">R$ {metrics.currentValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                                  <td className="px-6 py-4 text-center">
                                      {getStatusBadge(asset.status)}
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                      <div className="flex items-center justify-center gap-2">
                                          <button onClick={() => handleOpenEdit(asset)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"><Edit2 size={16}/></button>
                                          <button onClick={() => handleDelete(asset.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                      </div>
                                  </td>
                              </tr>
                          );
                      })}
                  </tbody>
              </table>
          </div>
      )}

      {filteredAssets.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
              <Search size={48} className="text-gray-300 mx-auto mb-4"/>
              <p className="text-gray-500 font-medium">Nenhum ativo encontrado para o período selecionado.</p>
              <button 
                  onClick={handleOpenAdd}
                  className="mt-4 text-indigo-600 font-bold text-sm hover:underline"
              >
                  Cadastrar Ativo
              </button>
          </div>
      )}
    </div>
  );
};

export default AssetsView;
