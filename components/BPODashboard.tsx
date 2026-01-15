
import React, { useEffect, useState } from 'react';
import { User, Company, Task } from '../types';
import { companyService } from '../services/companyService';
import { crmService } from '../services/crmService';
import { Building2, AlertTriangle, CheckCircle2, TrendingDown, TrendingUp, Users, ListTodo, Wallet, Loader2 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';

interface BPODashboardProps {
    currentUser: User;
    onNavigate: (view: string) => void;
}

const BPODashboard: React.FC<BPODashboardProps> = ({ currentUser, onNavigate }) => {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, [currentUser]);

    const loadDashboardData = async () => {
        setLoading(true);
        // 1. Fetch Companies
        const myCompanies = await companyService.fetchCompanies();
        if (myCompanies) {
            setCompanies(myCompanies);

            // 2. Fetch Global Tasks for alerts
            const companyIds = myCompanies.map(c => c.id);
            if (companyIds.length > 0) {
                const globalTasks = await crmService.fetchGlobalTasks(companyIds);
                setTasks(globalTasks);
            }
        }
        setLoading(false);
    };

    // Calculate aggregates
    const totalCompanies = companies.length;

    // Note: For now, Financial Balances are not fetched globally to avoid performance issues.
    // We will assume "OK" status for financials unless we implement a specific global financial service.
    // We can use Task logic for "Warnings".

    const companyStats = companies.map(comp => {
        // Filter tasks for this company
        const compTasks = tasks.filter(t => t.linkedCompanyId === comp.id);

        // Check overdue tasks
        const overdueTasks = compTasks.filter(t => t.status !== 'DONE' && t.dueDate && new Date(t.dueDate) < new Date());
        const pendingTasks = compTasks.filter(t => t.status !== 'DONE');

        // Status Logic
        let status: 'OK' | 'WARNING' | 'CRITICAL' = 'OK';
        if (overdueTasks.length > 2) status = 'CRITICAL';
        else if (overdueTasks.length > 0) status = 'WARNING';

        return {
            ...comp,
            balance: 0, // Placeholder
            pendingPayables: 0, // Placeholder
            overdueCount: overdueTasks.length,
            pendingCount: pendingTasks.length,
            status
        };
    });

    const criticalCount = companyStats.filter(c => c.status === 'CRITICAL').length;
    const warningCount = companyStats.filter(c => c.status === 'WARNING').length;
    const okCount = companyStats.filter(c => c.status === 'OK' && c.active).length;

    // Chart Data (Mocking Balance for Visuals until service is ready, or hiding)
    const chartData = companyStats.map(c => ({
        name: c.name.substring(0, 10) + '...',
        balance: c.balance
    }));

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="animate-spin text-indigo-600" size={48} />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Visão Geral da Carteira</h2>
                    <p className="text-gray-500">Acompanhamento consolidado de todos os seus clientes.</p>
                </div>
                <button onClick={loadDashboardData} className="text-indigo-600 font-bold text-sm hover:underline">
                    Atualizar
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Building2 size={24} /></div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Total Clientes</p>
                        <p className="text-2xl font-bold text-gray-900">{totalCompanies}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-red-50 text-red-600 rounded-lg"><AlertTriangle size={24} /></div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Críticos (Tarefas)</p>
                        <p className="text-2xl font-bold text-gray-900">{criticalCount}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg"><ListTodo size={24} /></div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Atenção</p>
                        <p className="text-2xl font-bold text-gray-900">{warningCount}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-green-50 text-green-600 rounded-lg"><CheckCircle2 size={24} /></div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Em Dia</p>
                        <p className="text-2xl font-bold text-gray-900">{okCount}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 
            TODO: Reimplement Financial Chart when global financial service is available.
            For now, showing Task Status Chart or hiding.
          */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-80 flex items-center justify-center text-gray-400 flex-col">
                    <Wallet size={48} className="mb-4 opacity-20" />
                    <p>Gráfico Financeiro Consolidado</p>
                    <span className="text-xs">Disponível em breve</span>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-800">Alertas Operacionais</h3>
                        <button onClick={() => onNavigate('tasks')} className="text-indigo-600 text-xs font-bold hover:underline">Ver Tarefas</button>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                        {companyStats.filter(c => c.status !== 'OK').map(c => (
                            <div key={c.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                {c.status === 'CRITICAL'
                                    ? <div className="p-1.5 bg-red-100 text-red-600 rounded"><AlertTriangle size={16} /></div>
                                    : <div className="p-1.5 bg-yellow-100 text-yellow-600 rounded"><ListTodo size={16} /></div>
                                }
                                <div>
                                    <p className="text-sm font-bold text-gray-900">{c.name}</p>
                                    <p className="text-xs text-gray-500">
                                        {c.status === 'CRITICAL'
                                            ? `${c.overdueCount} tarefas atrasadas`
                                            : `${c.overdueCount} tarefas atrasadas`
                                        }
                                    </p>
                                </div>
                            </div>
                        ))}
                        {companyStats.every(c => c.status === 'OK') && (
                            <div className="text-center py-8 text-gray-400">
                                <CheckCircle2 size={40} className="mx-auto mb-2 text-green-200" />
                                <p>Tudo certo! Nenhuma pendência crítica.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BPODashboard;
