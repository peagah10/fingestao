import React, { useState } from 'react';
import { Company, User, Transaction, TransactionType, CostCenter } from '../types';
import { transactionService } from '../services/transactionService';
import CostCenterModal from './CostCenterModal';
import {
  Target,
  Search,
  Plus,
  PieChart,
  Wallet,
  BarChart3,
  CheckCircle2,
  XCircle,
  Trash2
} from 'lucide-react';

interface CostCentersViewProps {
  company: Company;
  transactions: Transaction[];
  costCenters?: CostCenter[]; // Received from App
  currentUser: User;
  onRefresh: () => void;
}

const CostCentersView: React.FC<CostCentersViewProps> = ({ company, transactions, costCenters = [], currentUser, onRefresh }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCC, setEditingCC] = useState<CostCenter | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Handlers
  const handleOpenAdd = () => {
    setEditingCC(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cc: CostCenter) => {
    setEditingCC(cc);
    setIsModalOpen(true);
  };

  const handleSave = async (data: any) => {
    try {
      if (editingCC) {
        await transactionService.updateCostCenter(editingCC.id, data);
      } else {
        await transactionService.createCostCenter({
          ...data,
          companyId: company.id,
          status: 'ACTIVE'
        });
      }
      onRefresh();
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving cost center", error);
      alert("Erro ao salvar centro de custo.");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este centro de custo?')) {
      await transactionService.deleteCostCenter(id);
      onRefresh();
    }
  };

  const handleToggleStatus = async (cc: CostCenter) => {
    const newStatus = cc.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await transactionService.updateCostCenter(cc.id, { status: newStatus });
    onRefresh();
  };

  // Calculations & Filtering
  const filteredCostCenters = costCenters.filter(cc => {
    const matchesSearch = cc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cc.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || cc.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getUsage = (ccId: string) => {
    return transactions
      .filter(t => t.costCenterId === ccId && t.type === TransactionType.EXPENSE)
      .reduce((acc, t) => acc + t.amount, 0);
  };

  const totalBudget = costCenters.filter(c => c.status === 'ACTIVE').reduce((acc, c) => acc + (c.budget || 0), 0);
  const totalUsed = costCenters.filter(c => c.status === 'ACTIVE').reduce((acc, c) => acc + getUsage(c.id), 0);

  return (
    <div className="space-y-6">
      <CostCenterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        initialData={editingCC || undefined}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <PieChart className="text-indigo-600" size={28} /> Centros de Custo
          </h2>
          <p className="text-gray-500 mt-1">Aloque despesas por departamentos ou projetos.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium transition-all shadow-sm flex items-center gap-2"
        >
          <Plus size={18} /> Novo Centro
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Target size={24} /></div>
          <div>
            <p className="text-sm font-medium text-gray-500">Centros Ativos</p>
            <p className="text-2xl font-bold text-gray-900">{costCenters.filter(c => c.status === 'ACTIVE').length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg"><Wallet size={24} /></div>
          <div>
            <p className="text-sm font-medium text-gray-500">Orçamento Total</p>
            <p className="text-2xl font-bold text-gray-900">R$ {totalBudget.toLocaleString('pt-BR', { notation: 'compact' })}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-lg"><BarChart3 size={24} /></div>
          <div>
            <p className="text-sm font-medium text-gray-500">Realizado (Geral)</p>
            <p className="text-2xl font-bold text-gray-900">R$ {totalUsed.toLocaleString('pt-BR', { notation: 'compact' })}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative flex-1 w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome ou código..."
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
            onClick={() => setFilterStatus('INACTIVE')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filterStatus === 'INACTIVE' ? 'bg-white shadow text-gray-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Inativos
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCostCenters.map(cc => {
          const used = getUsage(cc.id);
          const budget = cc.budget || 0;
          const percent = budget > 0 ? (used / budget) * 100 : 0;
          const isOverBudget = percent > 100;

          return (
            <div key={cc.id} className={`bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-all ${cc.status === 'INACTIVE' ? 'border-gray-100 bg-gray-50 opacity-75' : 'border-gray-200'}`}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-sm">
                    {cc.code ? cc.code.substring(0, 2) : cc.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{cc.name}</h3>
                    <p className="text-xs text-gray-500 font-mono">{cc.code}</p>
                  </div>
                </div>
                {cc.status === 'ACTIVE' ? (
                  <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1"><CheckCircle2 size={10} /> ATIVO</span>
                ) : (
                  <span className="bg-gray-200 text-gray-600 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1"><XCircle size={10} /> INATIVO</span>
                )}
              </div>

              <p className="text-sm text-gray-500 mb-4 line-clamp-2 min-h-[40px]">{cc.description || 'Sem descrição.'}</p>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Realizado</span>
                  <span className={`font-bold ${isOverBudget ? 'text-red-600' : 'text-gray-900'}`}>R$ {used.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div className={`h-2 rounded-full ${isOverBudget ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(percent, 100)}%` }}></div>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Orçamento: R$ {budget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  <span>{percent.toFixed(0)}%</span>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => handleOpenEdit(cc)}
                  className="flex-1 py-2 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 hover:text-indigo-600 rounded-lg font-medium transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleToggleStatus(cc)}
                  className="p-2 text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  title={cc.status === 'ACTIVE' ? 'Desativar' : 'Ativar'}
                >
                  {cc.status === 'ACTIVE' ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
                </button>
                <button
                  onClick={() => handleDelete(cc.id)}
                  className="p-2 text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded-lg transition-colors"
                  title="Excluir"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          );
        })}

        {filteredCostCenters.length === 0 && (
          <div className="col-span-full py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <Search size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Nenhum centro de custo encontrado.</p>
            <button
              onClick={handleOpenAdd}
              className="mt-4 text-indigo-600 font-bold text-sm hover:underline"
            >
              Criar Novo
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CostCentersView;
