
import React from 'react';
import { Company, AuditLog, PlanType, User } from '../types';
import { COMPANIES, AUDIT_LOGS, toggleCompanyStatus, switchCompanyPlan } from '../services/mockData';
import PlansManagement from './PlansManagement';
import { ShieldCheck, Users, Activity, AlertTriangle, RefreshCw, Power, Construction, BarChart3, CreditCard, LogIn } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AdminDashboardProps {
  currentUser?: User; // Passed for logging purposes
  onRefresh: () => void;
  currentView: string;
  onSelectCompany: (id: string) => void; // Added for entering operational mode
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, onRefresh, currentView, onSelectCompany }) => {
  // Calculated metrics
  const totalCompanies = COMPANIES.length;
  const activeCompanies = COMPANIES.filter(c => c.active).length;
  const premiumCompanies = COMPANIES.filter(c => c.plan === PlanType.PREMIUM).length;

  const handleToggleStatus = (id: string) => {
    if (currentUser) {
      toggleCompanyStatus(id, currentUser);
      onRefresh();
    }
  };

  const handleSwitchPlan = (id: string) => {
    if (currentUser) {
      switchCompanyPlan(id, currentUser);
      onRefresh();
    }
  };

  const renderStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Empresas</p>
            <h3 className="text-2xl font-bold text-gray-900">{totalCompanies}</h3>
          </div>
        </div>
      </div>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-full">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Ativas</p>
            <h3 className="text-2xl font-bold text-gray-900">{activeCompanies}</h3>
          </div>
        </div>
      </div>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-full">
            <ShieldCheck size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Plano Premium</p>
            <h3 className="text-2xl font-bold text-gray-900">{premiumCompanies}</h3>
          </div>
        </div>
      </div>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-full">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Bloqueadas</p>
            <h3 className="text-2xl font-bold text-gray-900">{totalCompanies - activeCompanies}</h3>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCompaniesTable = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
        <h3 className="font-semibold text-gray-800">Gerenciamento de Empresas</h3>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Admin Mode</span>
      </div>
      <div className="p-0 overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50">
            <tr>
              <th className="px-6 py-3">Empresa</th>
              <th className="px-6 py-3">Plano</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {COMPANIES.map(c => (
              <tr key={c.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">
                  {c.name}
                  <div className="text-xs text-gray-400 font-normal">{c.cnpj}</div>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleSwitchPlan(c.id)}
                    title="Alternar Plano"
                    className={`px-2 py-1 text-xs rounded-md border flex items-center gap-1 hover:shadow-sm transition-all ${c.plan === PlanType.PREMIUM
                        ? 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200'
                        : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                      }`}>
                    {c.plan}
                    <RefreshCw size={10} />
                  </button>
                </td>
                <td className="px-6 py-4">
                  <span className={`flex items-center gap-1.5 text-xs font-semibold ${c.active ? 'text-green-600' : 'text-red-600'}`}>
                    <span className={`w-2 h-2 rounded-full ${c.active ? 'bg-green-600' : 'bg-red-600'}`}></span>
                    {c.active ? 'Ativa' : 'Inativa'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => onSelectCompany(c.id)}
                      className="flex items-center gap-1 font-medium text-xs px-3 py-1.5 rounded-md transition-colors bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                      title="Entrar como Admin"
                    >
                      <LogIn size={12} /> Acessar
                    </button>
                    <button
                      onClick={() => handleToggleStatus(c.id)}
                      className={`font-medium text-xs px-3 py-1.5 rounded-md transition-colors ${c.active
                          ? 'text-red-600 bg-red-50 hover:bg-red-100'
                          : 'text-green-600 bg-green-50 hover:bg-green-100'
                        }`}
                    >
                      {c.active ? 'Bloquear' : 'Ativar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAuditLog = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
        <h3 className="font-semibold text-gray-800">Logs de Auditoria (BPOs & Admin)</h3>
        <span className="text-xs text-gray-400">Tempo Real</span>
      </div>
      <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
        {AUDIT_LOGS.map(log => (
          <div key={log.id} className="p-4 flex gap-4 hover:bg-gray-50">
            <div className="flex-shrink-0 mt-1">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                {log.userName.charAt(0)}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{log.action}</p>
              <p className="text-xs text-gray-500">
                Por <span className="font-semibold">{log.userName}</span> em {log.timestamp}
              </p>
            </div>
          </div>
        ))}
        {AUDIT_LOGS.length === 0 && <div className="p-6 text-center text-gray-500">Nenhum log registrado.</div>}
      </div>
    </div>
  );

  const renderPlaceholder = (title: string, icon: any) => (
    <div className="flex flex-col items-center justify-center h-[50vh] text-center bg-white rounded-xl border border-gray-200 border-dashed">
      <div className="bg-gray-50 p-6 rounded-full mb-4">
        {icon}
      </div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">{title}</h2>
      <p className="text-gray-500 max-w-md">
        Módulo em desenvolvimento. Em breve disponível no painel de suporte.
      </p>
    </div>
  );

  const renderDashboardCharts = () => {
    const chartData = [
      { name: 'Jan', active: 20, new: 5 },
      { name: 'Fev', active: 24, new: 4 },
      { name: 'Mar', active: 28, new: 6 },
      { name: 'Abr', active: 35, new: 8 },
      { name: 'Mai', active: 40, new: 7 },
    ];

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4">Crescimento de Empresas</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="active" name="Empresas Ativas" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="new" name="Novas Empresas" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  switch (currentView) {
    case 'global_view':
      return (
        <div className="space-y-8">
          {renderStats()}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {renderCompaniesTable()}
            {renderAuditLog()}
          </div>
        </div>
      );
    case 'dashboard':
      return renderDashboardCharts();
    case 'admin_users':
      return renderPlaceholder('Gestão de Usuários do Sistema', <Users size={48} className="text-indigo-400" />);
    case 'companies':
      return renderCompaniesTable();
    case 'plans':
      // Replaced Placeholder with Actual Component
      return currentUser ? <PlansManagement currentUser={currentUser} onRefresh={onRefresh} /> : null;
    case 'audit':
      return renderAuditLog();
    case 'settings':
    case 'configuracao':
      return renderPlaceholder('Configurações Globais do SaaS', <Construction size={48} className="text-gray-400" />);
    default:
      return renderStats();
  }
};

export default AdminDashboard;
