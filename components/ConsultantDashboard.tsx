import React from 'react';
import { Company, Transaction, TransactionType } from '../types';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { FileText, Download, Target } from 'lucide-react';

interface ConsultantDashboardProps {
  company: Company;
  transactions: Transaction[];
}

const ConsultantDashboard: React.FC<ConsultantDashboardProps> = ({ company, transactions }) => {
  
  // Prepare data for charts
  const income = transactions.filter(t => t.type === TransactionType.INCOME).reduce((a, b) => a + b.amount, 0);
  const expense = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((a, b) => a + b.amount, 0);

  const pieData = [
    { name: 'Receita', value: income },
    { name: 'Despesa', value: expense },
  ];
  const COLORS = ['#10b981', '#ef4444'];

  // Mock cash flow projection
  const lineData = [
    { name: 'Jan', cash: 4000 },
    { name: 'Fev', cash: 3000 },
    { name: 'Mar', cash: 5000 },
    { name: 'Abr', cash: 2780 },
    { name: 'Mai', cash: 1890 },
    { name: 'Jun', cash: 2390 },
    { name: 'Jul', cash: 3490 },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-indigo-900 rounded-xl p-8 text-white shadow-lg">
        <h2 className="text-2xl font-bold mb-2">Visão Estratégica: {company.name}</h2>
        <p className="text-indigo-200">Modo de visualização exclusivo para consultores. Edição desabilitada.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-6 flex items-center gap-2">
            <Target size={18} className="text-indigo-500"/>
            Composição do Resultado
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-6 flex items-center gap-2">
            <FileText size={18} className="text-indigo-500"/>
            Projeção de Caixa (Semestral)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 12}} />
                <YAxis tick={{fontSize: 12}} />
                <Tooltip />
                <Line type="monotone" dataKey="cash" stroke="#6366f1" strokeWidth={3} dot={{r: 4}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
           <div>
             <h3 className="font-bold text-gray-800">Relatórios Disponíveis</h3>
             <p className="text-sm text-gray-500">Baixe os demonstrativos oficiais para análise detalhada.</p>
           </div>
           <div className="flex gap-3">
             <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
               <Download size={16} className="mr-2"/> DRE Sintético
             </button>
             <button className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
               <Download size={16} className="mr-2"/> Fluxo de Caixa Completo
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ConsultantDashboard;
