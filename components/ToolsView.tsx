
import React, { useState, useMemo } from 'react';
import { User, Company, TransactionType, Transaction, LongTermItem } from '../types';
import { COMPANIES, TRANSACTIONS, FINANCIAL_ACCOUNTS, getLongTermItems } from '../services/mockData';
import { 
  Stethoscope, 
  Activity, 
  Calculator, 
  Search, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  BarChart3,
  TrendingDown,
  TrendingUp,
  Wallet,
  DollarSign,
  Percent,
  FileText,
  Briefcase,
  Calendar,
  Bell,
  Scale,
  PieChart,
  HardDrive,
  Landmark,
  LineChart as LineChartIcon
} from 'lucide-react';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area } from 'recharts';

interface ToolsViewProps {
  currentUser: User;
}

const ToolsView: React.FC<ToolsViewProps> = ({ currentUser }) => {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  
  // Health Check State
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const linkedCompanies = COMPANIES.filter(c => currentUser.linkedCompanyIds.includes(c.id));

  // --- HEALTH CHECK LOGIC ---
  const runHealthCheck = () => {
      const targetId = selectedCompanyId || linkedCompanies[0]?.id;
      if (!targetId) return;
      
      setIsAnalyzing(true);
      setAnalysisResult(null);

      // Simulate API/Processing delay
      setTimeout(() => {
          const comp = COMPANIES.find(c => c.id === targetId);
          const accounts = FINANCIAL_ACCOUNTS.filter(a => a.companyId === targetId);
          const txs = TRANSACTIONS.filter(t => t.companyId === targetId);
          
          // Metrics
          const currentBalance = accounts.reduce((acc, a) => acc + a.balance, 0);
          
          const today = new Date();
          const pendingPayables = txs.filter(t => 
              t.type === TransactionType.EXPENSE && 
              t.status === 'PENDING' && 
              new Date(t.date) < today
          );
          
          const totalIncome = txs.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0);
          const totalExpense = txs.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + t.amount, 0);
          const profitMargin = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

          // Scoring Logic
          let score = 100;
          const issues = [];

          if (currentBalance < 0) {
              score -= 30;
              issues.push({ type: 'CRITICAL', msg: 'Saldo de caixa negativo.' });
          }
          if (pendingPayables.length > 0) {
              score -= (pendingPayables.length * 5);
              issues.push({ type: 'WARNING', msg: `${pendingPayables.length} contas atrasadas detectadas.` });
          }
          if (profitMargin < 5) {
              score -= 20;
              issues.push({ type: 'WARNING', msg: 'Margem de lucro baixa (< 5%).' });
          }
          if (txs.length === 0) {
              score = 0;
              issues.push({ type: 'INFO', msg: 'Sem movimentação registrada.' });
          }

          setAnalysisResult({
              companyName: comp?.name,
              score: Math.max(0, score),
              balance: currentBalance,
              pendingCount: pendingPayables.length,
              profitMargin,
              issues
          });
          setIsAnalyzing(false);
      }, 1500);
  };

  // --- CASH FLOW SIMULATOR LOGIC ---
  const [simulationData, setSimulationData] = useState<any[]>([]);
  
  const runCashFlowSimulation = () => {
      const targetId = selectedCompanyId || linkedCompanies[0]?.id;
      if (!targetId) return;

      setIsAnalyzing(true);
      setTimeout(() => {
          const accounts = FINANCIAL_ACCOUNTS.filter(a => a.companyId === targetId);
          let currentBalance = accounts.reduce((acc, a) => acc + a.balance, 0);
          
          const txs = TRANSACTIONS.filter(t => t.companyId === targetId);
          const longTerm = getLongTermItems(targetId);
          
          const today = new Date();
          const dataPoints = [];

          // Project for 6 months
          for (let i = 0; i < 6; i++) {
              const monthStart = new Date(today.getFullYear(), today.getMonth() + i, 1);
              const monthEnd = new Date(today.getFullYear(), today.getMonth() + i + 1, 0);
              
              // 1. Existing Pending Transactions in this month
              const monthPendingTxs = txs.filter(t => {
                  const d = new Date(t.date);
                  return t.status === 'PENDING' && d >= monthStart && d <= monthEnd;
              });

              // 2. Long Term Installments (simulated from recurrence/installments)
              // Note: In mockData, addLongTermItem adds transactions. 
              // We assume 'monthPendingTxs' covers generated ones. 
              // But for pure simulation without generated txs, we would calculate here.
              // For now, we rely on pending txs.

              // 3. Recurring Transactions (The Logic)
              // Find transactions marked as recurring that happened in the past, and project them
              const recurringTemplates = txs.filter(t => t.recurrence && t.recurrence.frequency === 'MONTHLY');
              // Deduplicate templates (simplified: distinct by description/amount)
              const uniqueRecurring = recurringTemplates.filter((t, index, self) => 
                  index === self.findIndex((x) => x.description === t.description && x.amount === t.amount)
              );

              let projectedIncome = 0;
              let projectedExpense = 0;

              // Sum Pending
              monthPendingTxs.forEach(t => {
                  if (t.type === TransactionType.INCOME) projectedIncome += t.amount;
                  else projectedExpense += t.amount;
              });

              // Sum Recurring Projection (Simplified: Add if not already in pending)
              uniqueRecurring.forEach(t => {
                  // Check if we already have a pending tx for this month matching this recurrence
                  const alreadyExists = monthPendingTxs.some(pt => pt.description === t.description && Math.abs(pt.amount - t.amount) < 0.1);
                  if (!alreadyExists) {
                      if (t.type === TransactionType.INCOME) projectedIncome += t.amount;
                      else projectedExpense += t.amount;
                  }
              });

              currentBalance += (projectedIncome - projectedExpense);

              dataPoints.push({
                  month: monthStart.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
                  income: projectedIncome,
                  expense: projectedExpense,
                  balance: currentBalance
              });
          }

          setSimulationData(dataPoints);
          setIsAnalyzing(false);
      }, 1000);
  };

  const handleToolClick = (toolId: string) => {
      setSelectedCompanyId(''); // Reset selection
      setAnalysisResult(null);
      setSimulationData([]);
      
      if (toolId === 'HEALTH_CHECK') {
          setSelectedTool('HEALTH_CHECK');
      } else if (toolId === 'FLUXO_CAIXA') {
          setSelectedTool('FLUXO_CAIXA');
      } else {
          alert('Esta ferramenta estará disponível na próxima atualização.');
      }
  };

  const toolCategories = [
      {
          id: 'pricing',
          title: 'Precificação',
          icon: DollarSign,
          color: 'bg-emerald-500',
          items: [
              { id: 'PRECIFICACAO_PRODUTOS', label: 'Precificação de Produtos' },
              { id: 'PRECIFICACAO_SERVICOS', label: 'Precificação de Serviços' },
              { id: 'MARGEM_MARKUP', label: 'Margem & Markup' },
              { id: 'FICHA_TECNICA', label: 'Ficha Técnica' }
          ]
      },
      {
          id: 'simulators',
          title: 'Simuladores Financeiros',
          icon: Calculator,
          color: 'bg-blue-600',
          items: [
              { id: 'FLUXO_CAIXA', label: 'Fluxo de Caixa Projetado' }, 
              { id: 'PONTO_EQUILIBRIO', label: 'Ponto de Equilíbrio' },
              { id: 'HEALTH_CHECK', label: 'Diagnóstico de Saúde' },
              { id: 'INVESTIMENTOS', label: 'Cálculo de Investimentos' },
              { id: 'EMPRESTIMOS', label: 'Simulador de Empréstimos' }
          ]
      },
      {
          id: 'tax',
          title: 'Tributação',
          icon: Scale,
          color: 'bg-purple-600',
          items: [
              { id: 'SIMULADOR_IMPOSTOS', label: 'Simulador de Impostos' },
              { id: 'COMPARACAO_REGIME', label: 'Comparação de Regime' }
          ]
      },
      {
          id: 'commercial',
          title: 'Análises Comerciais',
          icon: TrendingUp,
          color: 'bg-orange-600',
          items: [
              { id: 'METAS_VENDAS', label: 'Metas de Vendas' },
              { id: 'CAC_LTV_ROI', label: 'CAC / LTV / ROI' },
              { id: 'PRECO_VOLUME', label: 'Preço x Volume' }
          ]
      },
      {
          id: 'assets',
          title: 'Ativos e Patrimônio',
          icon: HardDrive,
          color: 'bg-indigo-600',
          items: [
              { id: 'REGISTRO_ATIVOS', label: 'Registro de Ativos' },
              { id: 'DEPRECIACAO', label: 'Depreciação' },
              { id: 'VALORIZACAO_BENS', label: 'Valorização de Bens' }
          ]
      },
      {
          id: 'productivity',
          title: 'Produtividade',
          icon: Activity,
          color: 'bg-pink-600',
          items: [
              { id: 'CALENDARIO_FIN', label: 'Calendário Financeiro' },
              { id: 'CONTROLE_CONTRATOS', label: 'Controle de Contratos' },
              { id: 'ALERTAS', label: 'Alertas e Lembretes' }
          ]
      }
  ];

  const renderCompanySelector = (onAction: () => void, actionLabel: string) => (
      <div className="flex gap-4 items-end mb-8">
          <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Selecione o Cliente</label>
              <select 
                  value={selectedCompanyId} 
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-black"
              >
                  <option value="">Selecione...</option>
                  {linkedCompanies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
              </select>
          </div>
          <button 
              onClick={onAction}
              disabled={isAnalyzing || !selectedCompanyId}
              className={`px-6 py-2.5 rounded-lg text-white font-bold flex items-center gap-2 transition-all ${
                  isAnalyzing || !selectedCompanyId ? 'bg-gray-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg'
              }`}
          >
              {isAnalyzing ? 'Processando...' : actionLabel} <Activity size={18} className={isAnalyzing ? "animate-spin" : ""}/>
          </button>
      </div>
  );

  const renderHealthCheck = () => (
      <div className="space-y-6 animate-in slide-in-from-right duration-300">
          <button 
            onClick={() => { setSelectedTool(null); setAnalysisResult(null); }}
            className="text-sm text-gray-500 hover:text-indigo-600 flex items-center gap-1 mb-4"
          >
              &larr; Voltar para o menu
          </button>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm max-w-3xl mx-auto">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-6">
                  <Stethoscope className="text-indigo-600" /> Diagnóstico Financeiro Automático
              </h2>

              {renderCompanySelector(runHealthCheck, 'Rodar Diagnóstico')}

              {analysisResult && (
                  <div className="animate-in fade-in zoom-in duration-300 border-t border-gray-100 pt-6">
                      <div className="flex items-center justify-between mb-6">
                          <div>
                              <p className="text-sm text-gray-500">Resultado para:</p>
                              <h3 className="text-xl font-bold text-gray-900">{analysisResult.companyName}</h3>
                          </div>
                          <div className="text-center">
                              <div className={`text-4xl font-black ${
                                  analysisResult.score >= 80 ? 'text-green-500' : 
                                  analysisResult.score >= 50 ? 'text-yellow-500' : 'text-red-500'
                              }`}>
                                  {analysisResult.score}
                              </div>
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Score de Saúde</p>
                          </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-6">
                          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 text-center">
                              <p className="text-xs text-gray-500 mb-1 flex justify-center items-center gap-1"><Wallet size={12}/> Caixa Atual</p>
                              <p className={`font-bold ${analysisResult.balance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                                  R$ {analysisResult.balance.toLocaleString('pt-BR', { notation: 'compact' })}
                              </p>
                          </div>
                          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 text-center">
                              <p className="text-xs text-gray-500 mb-1 flex justify-center items-center gap-1"><AlertTriangle size={12}/> Atrasos</p>
                              <p className={`font-bold ${analysisResult.pendingCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                  {analysisResult.pendingCount} títulos
                              </p>
                          </div>
                          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 text-center">
                              <p className="text-xs text-gray-500 mb-1 flex justify-center items-center gap-1"><BarChart3 size={12}/> Margem</p>
                              <p className={`font-bold ${analysisResult.profitMargin > 10 ? 'text-green-600' : 'text-yellow-600'}`}>
                                  {analysisResult.profitMargin.toFixed(1)}%
                              </p>
                          </div>
                      </div>

                      <div>
                          <h4 className="font-bold text-gray-800 mb-3">Diagnóstico Detalhado</h4>
                          {analysisResult.issues.length === 0 ? (
                              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-100 rounded-lg text-green-700">
                                  <CheckCircle2 size={24} />
                                  <div>
                                      <p className="font-bold text-sm">Excelente!</p>
                                      <p className="text-xs">Nenhum problema crítico detectado nos dados analisados.</p>
                                  </div>
                              </div>
                          ) : (
                              <div className="space-y-2">
                                  {analysisResult.issues.map((issue: any, idx: number) => (
                                      <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg border text-sm ${
                                          issue.type === 'CRITICAL' ? 'bg-red-50 border-red-100 text-red-700' :
                                          issue.type === 'WARNING' ? 'bg-yellow-50 border-yellow-100 text-yellow-700' :
                                          'bg-blue-50 border-blue-100 text-blue-700'
                                      }`}>
                                          {issue.type === 'CRITICAL' ? <XCircle size={18}/> : <AlertTriangle size={18}/>}
                                          {issue.msg}
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  </div>
              )}
          </div>
      </div>
  );

  const renderCashFlowSimulator = () => (
      <div className="space-y-6 animate-in slide-in-from-right duration-300">
          <button 
            onClick={() => { setSelectedTool(null); setSimulationData([]); }}
            className="text-sm text-gray-500 hover:text-indigo-600 flex items-center gap-1 mb-4"
          >
              &larr; Voltar para o menu
          </button>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mx-auto">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-2">
                  <LineChartIcon className="text-indigo-600" /> Fluxo de Caixa Projetado
              </h2>
              <p className="text-gray-500 mb-6">Simulação automática de saldo futuro baseada em contas a pagar/receber e recorrências.</p>

              {renderCompanySelector(runCashFlowSimulation, 'Gerar Projeção (6 Meses)')}

              {simulationData.length > 0 && (
                  <div className="animate-in fade-in zoom-in duration-300 space-y-6">
                      <div className="h-80 w-full bg-gray-50 rounded-xl p-4 border border-gray-100">
                          <ResponsiveContainer width="100%" height="100%">
                              <ComposedChart data={simulationData}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                                  <XAxis dataKey="month" />
                                  <YAxis />
                                  <Tooltip />
                                  <Legend />
                                  <Bar dataKey="income" name="Entradas Previstas" fill="#10b981" barSize={20} stackId="a" />
                                  <Bar dataKey="expense" name="Saídas Previstas" fill="#ef4444" barSize={20} stackId="a" />
                                  <Line type="monotone" dataKey="balance" name="Saldo Projetado" stroke="#4f46e5" strokeWidth={3} dot={{r:4}} />
                              </ComposedChart>
                          </ResponsiveContainer>
                      </div>

                      <div className="overflow-hidden border border-gray-200 rounded-xl">
                          <table className="w-full text-sm text-left">
                              <thead className="bg-gray-50 font-bold text-gray-700">
                                  <tr>
                                      <th className="p-3">Mês</th>
                                      <th className="p-3 text-right">Entradas (R$)</th>
                                      <th className="p-3 text-right">Saídas (R$)</th>
                                      <th className="p-3 text-right">Saldo Final (R$)</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {simulationData.map((row, idx) => (
                                      <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50">
                                          <td className="p-3 font-medium text-gray-900">{row.month}</td>
                                          <td className="p-3 text-right text-emerald-600">{row.income.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                                          <td className="p-3 text-right text-red-600">{row.expense.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                                          <td className={`p-3 text-right font-bold ${row.balance >= 0 ? 'text-indigo-600' : 'text-red-500'}`}>
                                              {row.balance.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              )}
          </div>
      </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {!selectedTool && (
          <>
            <div className="text-left">
                <h2 className="text-3xl font-bold text-gray-900">Ferramentas Financeiras</h2>
                <p className="text-gray-500 mt-1 text-lg">Calculadoras, simuladores e utilitários para gestão financeira</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {toolCategories.map(category => (
                    <div key={category.id} className="bg-gray-50 rounded-xl overflow-hidden shadow-sm border border-gray-200 flex flex-col h-full hover:shadow-md transition-all">
                        {/* Header */}
                        <div className={`${category.color} p-4 text-white`}>
                            <div className="flex items-center gap-2 mb-1">
                                <category.icon size={20} className="opacity-90"/>
                                <h3 className="font-bold text-lg">{category.title}</h3>
                            </div>
                        </div>
                        
                        {/* Body List */}
                        <div className="p-4 space-y-2.5 flex-1">
                            {category.items.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => handleToolClick(item.id)}
                                    className="w-full text-left px-4 py-3 bg-white rounded-lg shadow-sm border border-gray-100 hover:border-gray-300 hover:shadow-md transition-all text-sm font-medium text-gray-700 flex justify-between items-center group"
                                >
                                    {item.label}
                                    <ArrowRight size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1" />
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
          </>
      )}

      {selectedTool === 'HEALTH_CHECK' && renderHealthCheck()}
      {selectedTool === 'FLUXO_CAIXA' && renderCashFlowSimulator()}
    </div>
  );
};

export default ToolsView;
