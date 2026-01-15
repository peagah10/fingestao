
import React, { useState, useEffect } from 'react';
import {
  User, UserRole, PermissionKey, Company, Transaction, FinancialAccount, FinancialCategory, CostCenter
} from './types';
import { transactionService } from './services/transactionService';
import { crmService } from './services/crmService';
import { companyService } from './services/companyService';
import { authService } from './services/authService';
import Login from './components/Login';
import Layout from './components/Layout';
import CompanySelector from './components/CompanySelector';
import AdminDashboard from './components/AdminDashboard';
import AccessDenied from './components/AccessDenied';
import { GLOBAL_ROUTES, OPERATIONAL_ROUTES, RouteConfig } from './routes';
import { Lock, LogOut, Loader2 } from 'lucide-react';
import { useNavigate, useLocation, useParams, Routes, Route, Navigate, useMatch } from 'react-router-dom';

const App: React.FC = () => {
  // Application State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true); // Initial loading state for auth check
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(() => {
    return localStorage.getItem('fingestao_selected_company_id');
  });
  const [currentView, setCurrentView] = useState('dashboard');
  const [viewParams, setViewParams] = useState<any>(null);
  const [dataVersion, setDataVersion] = useState(0);

  const [companies, setCompanies] = useState<Company[]>([]);

  // Financial State (Contextual to selectedCompanyId)
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  // We keep assets/longTerm as mocks or empty for now until their service is ready, 
  // or simple states if we want to silence errors.
  const [assets, setAssets] = useState<any[]>([]);
  const [longTermItems, setLongTermItems] = useState<any[]>([]);
  const [accountPlan, setAccountPlan] = useState<any[]>([]);

  // CRM State
  const [leads, setLeads] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);

  // Routing Hooks
  const navigate = useNavigate();
  const location = useLocation();

  // URL Sync Effect: Parse URL and update State
  useEffect(() => {
    // Scheme: 
    // /login
    // /selecionar-empresa
    // /global/:view
    // /app/:view (Relies on internal state/localStorage for companyId)

    const path = location.pathname;

    if (path === '/login') return;

    if (path === '/selecionar-empresa') {
      // If manually going here, we might want to keep the selected ID or clear it?
      // Usually selection implies clearing previous selection or re-selecting.
      // Let's NOT clear immediately to allow "Cancel", but handleSelectCompany will overwrite.
      setCurrentView('selection');
      return;
    }

    // Match /app/:view
    const appMatch = path.match(/^\/app(?:\/(.+))?$/);
    if (appMatch) {
      const view = appMatch[1] || 'dashboard';
      if (!selectedCompanyId) {
        // Accessing app without company -> Redirect to selection
        navigate('/selecionar-empresa');
        return;
      }
      setCurrentView(view);
      return;
    }

    // Match /global/:view
    const globalMatch = path.match(/^\/global(?:\/(.+))?$/);
    if (globalMatch) {
      const view = globalMatch[1] || 'dashboard';
      // Global View -> Explicitly NOT in a specific company context
      // We don't clear localStorage here to allow "easy return", BUT global view needs null state.
      // We will handle "Global Context" by checking (isExternalUser && !selectedCompanyId) OR path.
      // Ideally, if in Global Route, we assume Global Context.
      // Let's set selectedCompanyId to null in state ONLY while in this route?
      // Better: Explicitly switch context.
      if (selectedCompanyId) {
        setSelectedCompanyId(null);
        // Note: We might NOT want to clear localStorage if we want persistence, 
        // but "Global View" implies "No Company Selected".
        localStorage.removeItem('fingestao_selected_company_id');
      }
      setCurrentView(view);
      return;
    }

    // Root - redirect logic will happen in auth check
  }, [location.pathname]);


  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const user = await authService.getCurrentSessionUser();
        if (user) {
          setCurrentUser(user);
          // Initial Navigation is now handled by URL or defaulting if URL is root
          if (location.pathname === '/' || location.pathname === '/login') {
            handleUserNavigation(user);
          }
        } else {
          // No user, ensuring we show login if not there
          // navigate('/login'); // Optional, but let render handle it
        }
      } catch (e) {
        console.error("Session check failed", e);
      } finally {
        setAuthLoading(false);
      }
    };
    checkSession();
  }, []);

  // Fetch Companies when user is authenticated or dataVersion changes
  useEffect(() => {
    const loadCompanies = async () => {
      if (!currentUser) return;
      const data = await companyService.fetchCompanies();
      if (data) {
        setCompanies(data);
      }
    };
    loadCompanies();
  }, [currentUser, dataVersion]);

  // Fetch Financial Data when Company is Selected
  useEffect(() => {
    const loadFinancialData = async () => {
      if (!selectedCompanyId) return;

      // Parallel fetching
      const [txs, accs, cats, ccs, lds, tsks] = await Promise.all([
        transactionService.fetchTransactions(selectedCompanyId),
        transactionService.fetchAccounts(selectedCompanyId),
        transactionService.fetchCategories(selectedCompanyId),
        transactionService.fetchCostCenters(selectedCompanyId),
        crmService.fetchLeads(selectedCompanyId),
        crmService.fetchTasks(selectedCompanyId)
      ]);

      if (txs) setTransactions(txs);
      if (accs) setAccounts(accs);
      if (cats) setCategories(cats);
      if (ccs) setCostCenters(ccs);
      // New CRM responses
      if (lds) setLeads(lds);
      if (tsks) setTasks(tsks);

      // TODO: Migrating other entities (Assets, etc.) later
      // For now preventing crashes by setting empty or strictly keeping mocks if needed
      // setAssets(...); 
    };
    loadFinancialData();
  }, [selectedCompanyId, dataVersion]);

  // Fetch Global CRM Data (BPO/Consultant Context)
  useEffect(() => {
    const loadGlobalCRM = async () => {
      if (selectedCompanyId) return; // Only fetch global if NOT in specific company
      if (!currentUser) return;
      if (currentUser.role !== UserRole.BPO && currentUser.role !== UserRole.CONSULTANT) return;

      const [lds, tsks] = await Promise.all([
        crmService.fetchGlobalLeads(currentUser.linkedCompanyIds),
        crmService.fetchGlobalTasks(currentUser.linkedCompanyIds)
      ]);

      if (lds) setLeads(lds);
      if (tsks) setTasks(tsks);
    };
    loadGlobalCRM();
  }, [currentUser, selectedCompanyId, dataVersion]);

  const handleUserNavigation = (user: User) => {
    // Logic calculates WHERE to go
    // 1. SUPORTE (Super Admin) -> Painel Global de Administração
    if (user.role === UserRole.SUPER_ADMIN) {
      if (selectedCompanyId) {
        navigate('/app/dashboard');
      } else {
        navigate('/global/companies');
      }
      return;
    }

    // 2. PARCEIROS (BPO & Consultor) -> Dashboard de Carteira Global
    if (user.role === UserRole.BPO || user.role === UserRole.CONSULTANT) {
      if (selectedCompanyId) {
        navigate('/app/dashboard');
      } else {
        navigate('/global/dashboard');
      }
      return;
    }

    // 3. EMPRESAS (Admin, Gestor, Funcionário)
    // Always go to selection screen first IF NO company selected
    if (selectedCompanyId) {
      navigate('/app/dashboard');
    } else {
      navigate('/selecionar-empresa');
    }
  };

  // Handlers
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    handleUserNavigation(user);
  };

  const handleLogout = async () => {
    await authService.signOut();
    setCurrentUser(null);
    setSelectedCompanyId(null);
    localStorage.removeItem('fingestao_selected_company_id');
    setCurrentView('dashboard');
    setViewParams(null);
    setDataVersion(0);
    navigate('/login');
  };

  const handleSelectCompany = (companyId: string) => {
    setSelectedCompanyId(companyId);
    localStorage.setItem('fingestao_selected_company_id', companyId);
    navigate(`/app/dashboard`);
  };

  const handleBackToSelector = () => {
    setSelectedCompanyId(null);
    localStorage.removeItem('fingestao_selected_company_id');
    // Navigate to the CRUD management view instead of the old selector
    navigate('/global/companies');
  };

  const handleExitBPOContext = () => {
    setSelectedCompanyId(null);
    localStorage.removeItem('fingestao_selected_company_id');
    // Ensure we go to the companies list view
    navigate('/global/companies');
  };

  const handleNavigate = (view: string, params?: any) => {
    setViewParams(params || null);

    // Determine target path
    // If View is 'selection', go to companies
    if (view === 'selection') {
      navigate('/selecionar-empresa');
      return;
    }

    // If selectedCompanyId is set, we are in App context
    if (selectedCompanyId) {
      navigate(`/app/${view}`);
    } else {
      // Global context
      navigate(`/global/${view}`);
    }
  };

  const refreshData = () => {
    setDataVersion(prev => prev + 1);
  };

  // Check Permissions Helper
  const checkPermission = (key: PermissionKey) => {
    if (!currentUser) return false;
    // Grant FULL ACCESS to Admin, Super Admin, BPO, and Consultant roles
    if ([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.BPO, UserRole.CONSULTANT].includes(currentUser.role)) {
      return true;
    }
    return currentUser.permissions ? currentUser.permissions.includes(key) : false;
  };

  // 1. Loading State
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
        <p className="text-gray-500 font-medium animate-pulse">Iniciando sistema...</p>
      </div>
    );
  }

  // 2. Login Screen
  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  // 3. SUPER ADMIN DASHBOARD
  if (currentUser.role === UserRole.SUPER_ADMIN && !selectedCompanyId) {
    return (
      <Layout
        user={currentUser}
        onLogout={handleLogout}
        title="Painel Super Admin"
        currentView={currentView}
        onNavigate={handleNavigate}
        menuRefreshTrigger={dataVersion}
        companyId={null}
      >
        <AdminDashboard
          currentUser={currentUser}
          onRefresh={refreshData}
          currentView={currentView}
          onSelectCompany={handleSelectCompany}
        />
      </Layout>
    );
  }

  // Determine if user is external (BPO, Consultant, Super Admin)
  const isExternalUser = currentUser.role === UserRole.BPO || currentUser.role === UserRole.CONSULTANT || currentUser.role === UserRole.SUPER_ADMIN;
  const isBPOOperationalMode = isExternalUser && !!selectedCompanyId;

  // 4. Company Selector (Multi-company users without selection, AND NOT External)
  if (!selectedCompanyId && !isExternalUser) {
    // Filter logic is now handled by RLS on service, but we can double check local link if needed.
    // However, companyService.fetchCompanies already returns only permitted companies.
    // So we just use 'companies' state.
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col animate-in fade-in duration-500">
        <header className="px-8 py-6 flex justify-between items-center bg-white border-b border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-200">
              F
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">FinGestão</span>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-gray-900">{currentUser.name}</p>
              <p className="text-xs text-gray-500">{currentUser.email}</p>
            </div>
            <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-gray-500 hover:text-red-600 transition-colors text-sm font-medium px-3 py-2 rounded-lg hover:bg-red-50"
            >
              <LogOut size={18} /> <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-6">
          <CompanySelector companies={companies} onSelect={handleSelectCompany} onRefresh={refreshData} />
        </main>

        <footer className="py-6 text-center text-xs text-gray-400">
          &copy; {new Date().getFullYear()} FinGestão SaaS. Todos os direitos reservados.
        </footer>
      </div>
    );
  }

  // Ensure selectedCompany exists for standard views, or fallback for BPO aggregate views
  const selectedCompany = selectedCompanyId ? companies.find(c => c.id === selectedCompanyId) : null;

  // Data (Now loaded via state)
  const companyTransactions = transactions;
  // We pass 'transactions' state directly later

  // Security Check: Block access if company is inactive (Standard users only)
  if (selectedCompanyId && selectedCompany && !selectedCompany.active && !isExternalUser) {
    const canGoBack = currentUser.linkedCompanyIds.length > 1;
    return (
      <Layout
        user={currentUser}
        onLogout={handleLogout}
        title="Acesso Restrito"
        currentView="denied"
        onNavigate={() => { }}
        menuRefreshTrigger={dataVersion}
        companyId={null}
      >
        <AccessDenied
          companyName={selectedCompany.name}
          onBack={canGoBack ? handleBackToSelector : undefined}
        />
      </Layout>
    );
  }

  // Determine Title based on context
  const getPageTitle = (view: string) => {
    const activeRoute = (isExternalUser && !selectedCompanyId ? GLOBAL_ROUTES : OPERATIONAL_ROUTES)[view];
    // Use label from route config if available, otherwise fallback to map or generic
    const viewLabel = activeRoute?.label || (view.charAt(0).toUpperCase() + view.slice(1).replace('_', ' '));

    const prefix = isExternalUser && !selectedCompanyId
      ? 'Visão Global'
      : (selectedCompany?.name || 'Sistema');

    return `${prefix} - ${viewLabel}`;
  };

  const renderAccessBlocked = () => (
    <div className="flex flex-col items-center justify-center h-[70vh] text-center animate-in fade-in duration-300">
      <div className="bg-red-50 p-6 rounded-full mb-4 border border-red-100">
        <Lock size={48} className="text-red-500" />
      </div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Acesso Não Autorizado</h2>
      <p className="text-gray-500 max-w-md">
        Seu perfil de usuário ({currentUser.role}) não possui permissão para visualizar esta página neste contexto.
      </p>
      <button
        onClick={() => handleNavigate('dashboard')}
        className="mt-6 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
      >
        Voltar ao Dashboard
      </button>
    </div>
  );

  // --- Dynamic Content Rendering using Route System ---
  const renderContent = () => {
    // Determine which registry to use
    const isGlobalContext = isExternalUser && !selectedCompanyId;
    const routes = isGlobalContext ? GLOBAL_ROUTES : OPERATIONAL_ROUTES;
    const activeRoute: RouteConfig | undefined = routes[currentView];


    // Protection against race conditions: If ID is selected but company object not found yet (loading or error)
    if (selectedCompanyId && !selectedCompany && !isGlobalContext) {
      return (
        <div className="flex flex-col items-center justify-center p-12 h-full text-gray-400">
          <Loader2 className="animate-spin mb-4" size={48} />
          <p className="font-medium">Carregando dados da empresa...</p>
        </div>
      );
    }

    // Fallback if route not found
    if (!activeRoute) {
      const Dashboard = routes['dashboard'].component;
      return <Dashboard
        company={selectedCompany}
        currentUser={currentUser}
        onNavigate={handleNavigate}
        onRefresh={refreshData}
        transactions={companyTransactions}
        role={currentUser.role}
        messages={[]} // Placeholder
        leads={leads}
        tasks={tasks} // Pass tasks to dashboard if needed, or check if Dashboard uses it
        companies={companies}
      />;
    }

    // Check Permission
    if (activeRoute.permission && !checkPermission(activeRoute.permission)) {
      return renderAccessBlocked();
    }

    const Component = activeRoute.component;

    // Construct Context Props
    const commonProps = {
      currentUser,
      onRefresh: refreshData,
      onNavigate: handleNavigate,
      viewParams,
      onClearParams: () => setViewParams(null)
    };

    const operationalProps = {
      company: selectedCompany,
      transactions: transactions,
      categories,
      accountPlan,
      assets,
      longTermItems,
      accounts,
      costCenters,
      leads,
      tasks,
      companies, // Pass companies context for referencing
      role: currentUser.role,
      companyId: selectedCompany?.id
    };

    const globalProps = {
      onSelectCompany: handleSelectCompany,
      leads,
      tasks,
      // Provide a placeholder company to avoid crashes in components expecting 'company' prop
      company: { id: 'GLOBAL', name: 'Carteira Global', plan: 'BPO', active: true },
      companies: companies, // Pass list of companies for global context
    };

    const finalProps = {
      ...commonProps,
      ...(isGlobalContext ? globalProps : operationalProps)
    };

    return <Component {...finalProps} />;
  };

  return (
    <Layout
      user={currentUser}
      onLogout={handleLogout}
      title={getPageTitle(currentView)}
      currentView={currentView}
      onNavigate={handleNavigate}
      isBPOOperationalMode={isBPOOperationalMode}
      onExitOperationalMode={handleExitBPOContext}
      menuRefreshTrigger={dataVersion}
      companyId={selectedCompanyId}
      onSwitchCompany={handleSelectCompany}
      onManageCompanies={handleBackToSelector}
      companies={companies}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;
