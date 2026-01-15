
import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, PermissionKey, CustomMenuItem } from '../types';
import { ROLE_LABELS } from '../constants';
import { getCompanyMenu, COMPANIES } from '../services/mockData';
import {
  LogOut, Menu, X, LayoutDashboard, Building2, Settings, FileText, Bot, Target, Wallet, Tags, Landmark, CalendarRange, Briefcase, Wrench, Users, CircleDollarSign, Globe, CreditCard, ShieldCheck, TrendingUp, Filter, ListTodo, Handshake, ArrowLeft, BarChart3, Activity, ChevronDown, ChevronRight, Calendar, ChevronsUpDown, Grid
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
  title: string;
  currentView: string;
  onNavigate: (view: string, params?: any) => void;
  isBPOOperationalMode?: boolean; // New prop to indicate context
  onExitOperationalMode?: () => void; // Function to exit context
  menuRefreshTrigger?: number; // Trigger re-render of menu when changed
  companyId?: string | null; // Specific company context for menu loading
  onSwitchCompany?: (companyId: string) => void; // New: Quick switch
  onManageCompanies?: () => void; // New: Go to CRUD
}

// Map string icon names to components
const ICON_MAP: Record<string, React.ReactNode> = {
  'LayoutDashboard': <LayoutDashboard size={20} />,
  'Bot': <Bot size={20} />,
  'CircleDollarSign': <CircleDollarSign size={20} />,
  'Target': <Target size={20} />,
  'Wallet': <Wallet size={20} />,
  'Tags': <Tags size={20} />,
  'Landmark': <Landmark size={20} />,
  'CalendarRange': <CalendarRange size={20} />,
  'Briefcase': <Briefcase size={20} />,
  'Wrench': <Wrench size={20} />,
  'FileText': <FileText size={20} />,
  'Users': <Users size={20} />,
  'Settings': <Settings size={20} />,
  'Handshake': <Handshake size={20} />,
  'ListTodo': <ListTodo size={20} />,
  'Filter': <Filter size={20} />,
  'Building2': <Building2 size={20} />,
  'BarChart3': <BarChart3 size={20} />,
  'Activity': <Activity size={20} />,
  'CreditCard': <CreditCard size={20} />,
  'Calendar': <Calendar size={20} />
};

const Layout: React.FC<LayoutProps> = ({
  children,
  user,
  onLogout,
  title,
  currentView,
  onNavigate,
  isBPOOperationalMode,
  onExitOperationalMode,
  menuRefreshTrigger,
  companyId,
  onSwitchCompany,
  onManageCompanies,
  companies = [] // Default to empty if not passed
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [menuStructure, setMenuStructure] = useState<CustomMenuItem[]>([]);

  // State to track expanded groups - Initialized empty, populated in useEffect
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  // Ref to track the previous company context to detect switches
  const prevCompanyIdRef = useRef<string | null>(null);

  // Get current company details and list of available companies for the user
  const currentCompany = companyId ? companies.find(c => c.id === companyId) : null;
  // Use passed companies list, filtered by user access. 
  // If companies prop is empty but user has linked Ids, we might be waiting for fetch, 
  // but we can't do much without the data.
  const userCompanies = companies.filter(c => user.linkedCompanyIds.includes(c.id));

  // Determine label for selector when no company is selected
  const selectorLabel = currentCompany ? currentCompany.name : "Selecionar Empresa...";

  // Load Menu Configuration
  useEffect(() => {
    // Determine context ID for state persistence
    // Priority: Prop passed > First linked company > Default '1'
    const currentCompanyId = companyId || user.linkedCompanyIds[0] || '1';
    const isContextSwitch = prevCompanyIdRef.current !== currentCompanyId;

    // 1. Super Admin Menu (Hardcoded)
    if (user.role === UserRole.SUPER_ADMIN && !companyId) {
      setMenuStructure([
        { id: 'dashboard', type: 'ITEM', viewId: 'dashboard', label: 'Dashboard Global', icon: 'BarChart3', active: true },
        { id: 'companies', type: 'ITEM', viewId: 'global_view', label: 'Empresas e Logs', icon: 'Building2', active: true },
        { id: 'plans', type: 'ITEM', viewId: 'plans', label: 'Planos', icon: 'CreditCard', active: true },
        { id: 'admin_users', type: 'ITEM', viewId: 'admin_users', label: 'Usuários do Sistema', icon: 'Users', active: true },
        { id: 'audit', type: 'ITEM', viewId: 'audit', label: 'Auditoria', icon: 'Activity', active: true },
        { id: 'settings', type: 'ITEM', viewId: 'configuracao', label: 'Config. SaaS', icon: 'Settings', active: true },
      ]);
      return;
    }

    // 2. BPO/Consultant Global Menu (Hardcoded to specific requirements)
    if ((user.role === UserRole.BPO || user.role === UserRole.CONSULTANT) && !isBPOOperationalMode) {
      const bpoItems: CustomMenuItem[] = [
        { id: 'dashboard', type: 'ITEM', label: 'Dashboard', icon: 'LayoutDashboard', viewId: 'dashboard', permission: 'VIEW_DASHBOARD', active: true },
        { id: 'crm', type: 'ITEM', label: 'CRM', icon: 'Handshake', viewId: 'crm', permission: 'VIEW_CRM', active: true },
        { id: 'tasks', type: 'ITEM', label: 'Tarefas', icon: 'ListTodo', viewId: 'tarefas', permission: 'VIEW_TASKS', active: true },
        { id: 'leads', type: 'ITEM', label: 'Leads', icon: 'Filter', viewId: 'leads', permission: 'VIEW_LEADS', active: true },
        // Singular 'Empresa' for Consultant, Plural 'Empresas' for BPO, though functionally same view
        { id: 'companies', type: 'ITEM', label: user.role === UserRole.CONSULTANT ? 'Empresa' : 'Empresas', icon: 'Building2', viewId: 'empresas', permission: 'MANAGE_COMPANIES', active: true },
      ];

      if (user.role === UserRole.BPO) {
        bpoItems.push({ id: 'users', type: 'ITEM', label: 'Usuários', icon: 'Users', viewId: 'usuarios', permission: 'MANAGE_USERS', active: true });
      }

      bpoItems.push({ id: 'settings', type: 'ITEM', label: 'Configurações', icon: 'Settings', viewId: 'configuracao', permission: 'VIEW_SETTINGS', active: true });
      setMenuStructure(bpoItems);

      // Reset context tracker for BPO view
      prevCompanyIdRef.current = 'BPO_GLOBAL';
      return;
    }

    // 3. Operational Menu (Company Specific - Dynamic)
    const customMenu = getCompanyMenu(currentCompanyId);
    setMenuStructure(customMenu);

    // Initialize expanded groups logic:
    if (isContextSwitch || expandedGroups.length === 0) {
      const initialExpanded = customMenu
        .filter(i => i.type === 'GROUP' && (i.groupType === 'FIXED' || i.isExpanded))
        .map(i => i.id);
      setExpandedGroups(initialExpanded);
      prevCompanyIdRef.current = currentCompanyId;
    }

  }, [user, isBPOOperationalMode, menuRefreshTrigger, companyId, companies]); // Added companies dependency

  // Helper to check permission
  const hasPermission = (key?: PermissionKey) => {
    if (!key) return true;
    // Grant full menu access to privileged roles
    if ([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.BPO, UserRole.CONSULTANT].includes(user.role)) {
      return true;
    }
    return user.permissions ? user.permissions.includes(key) : false;
  };

  const toggleGroup = (groupId: string) => {
    if (expandedGroups.includes(groupId)) {
      setExpandedGroups(expandedGroups.filter(id => id !== groupId));
    } else {
      setExpandedGroups([...expandedGroups, groupId]);
    }
  };

  // Recursive Menu Renderer
  const renderMenuNode = (item: CustomMenuItem, depth: number = 0) => {
    if (item.active === false) return null;
    if (item.permission && !hasPermission(item.permission)) return null;

    if (item.type === 'ITEM') {
      const isActive = currentView === item.viewId || (item.viewId === 'global_view' && currentView === 'companies');

      let bgClass = '';
      let textClass = isActive ? 'text-white' : 'text-[#A3A7AA]';
      let borderClass = 'border-l-4 border-transparent';

      if (isActive) {
        bgClass = 'bg-[#2286D2] shadow-md';
        borderClass = 'border-l-4 border-[#60A5FA]';
      } else {
        if (depth === 1) bgClass = 'bg-[#121416] hover:bg-[#1A1D1F]';
        else if (depth > 1) bgClass = 'bg-[#1B1D1F] hover:bg-[#232628]';
        else bgClass = 'hover:bg-[#1A1D1F]';
      }

      const paddingLeft = (depth * 12) + 16;

      return (
        <button
          key={item.id}
          onClick={() => {
            if (item.viewId) onNavigate(item.viewId);
            setIsSidebarOpen(false);
          }}
          className={`flex items-center w-full py-3 text-sm font-medium transition-all mb-1 rounded-r-lg ${bgClass} ${textClass} ${borderClass}`}
          style={{ paddingLeft: `${paddingLeft}px` }}
        >
          <span className={`mr-3 ${isActive ? 'text-white' : 'text-[#555]'}`}>
            {ICON_MAP[item.icon || ''] || <LayoutDashboard size={20} />}
          </span>
          <span className="truncate">{item.label}</span>
        </button>
      );
    }

    if (item.type === 'GROUP') {
      const isExpanded = expandedGroups.includes(item.id) || item.groupType === 'FIXED';

      const visibleChildren = item.children?.filter(child =>
        child.active !== false && (!child.permission || hasPermission(child.permission))
      );

      if (!visibleChildren || visibleChildren.length === 0) return null;

      return (
        <div key={item.id} className="mb-2">
          {item.groupType === 'FIXED' ? (
            <div className="px-4 py-2 mt-4 text-xs font-bold text-[#555] uppercase tracking-wider">
              {item.label}
            </div>
          ) : (
            <button
              onClick={() => toggleGroup(item.id)}
              className={`flex items-center justify-between w-full px-4 py-2 mt-1 text-sm font-medium transition-colors rounded-lg ${isExpanded ? 'text-white' : 'text-[#A3A7AA] hover:text-white hover:bg-[#1A1D1F]'
                }`}
            >
              <span className="flex items-center gap-2">
                {depth > 0 && <div className="w-1.5 h-1.5 rounded-full bg-gray-600"></div>}
                {item.label}
              </span>
              {isExpanded ? <ChevronDown size={16} className="text-[#2286D2]" /> : <ChevronRight size={16} />}
            </button>
          )}

          {isExpanded && item.children && (
            <div className="mt-1 transition-all duration-200 ease-in-out">
              {item.children.map(child => renderMenuNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const isFullWidthView = currentView === 'ai_advisor';

  return (
    <div className="flex h-screen bg-[#F3F4F6] overflow-hidden">
      {/* Sidebar Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-[#090B0C] border-r border-[#2A2E32] text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="flex items-center justify-between h-20 px-6 bg-[#090B0C] border-b border-[#2A2E32]">
          <span className="text-2xl font-bold text-[#DEDEDD] tracking-tight">FinGestão</span>
          <button className="lg:hidden text-gray-400" onClick={() => setIsSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-col h-[calc(100vh-80px)]">

          {/* Top Section: Company Selector (For Enterprise/BPO) */}
          <div className="px-5 py-4 shrink-0 space-y-2 relative">
            {onSwitchCompany && (userCompanies.length > 0 || onManageCompanies) && ![UserRole.BPO, UserRole.CONSULTANT].includes(user.role) ? (
              <>
                {/* Backdrop for closing dropdown */}
                {isDropdownOpen && (
                  <div
                    className="fixed inset-0 z-10 cursor-default"
                    onClick={() => setIsDropdownOpen(false)}
                  />
                )}

                <p className="text-[10px] font-bold text-[#555] uppercase tracking-wider mb-1">Contexto Atual</p>
                <div className="relative group w-full z-20">
                  <div
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className={`flex items-center gap-3 p-2.5 bg-[#131517] border ${isDropdownOpen ? 'border-[#2286D2] ring-1 ring-[#2286D2]/30' : 'border-[#2A2E32]'} rounded-lg cursor-pointer hover:bg-[#1A1D1F] transition-all relative w-full group-hover:border-[#3A3E42]`}
                  >
                    <div className="w-6 h-6 rounded bg-[#2286D2]/20 text-[#2286D2] flex items-center justify-center">
                      <Building2 size={14} />
                    </div>
                    <div className="flex-1 overflow-hidden min-w-0">
                      <p className="text-sm font-medium truncate text-[#DEDEDD] leading-tight">{selectorLabel}</p>
                    </div>
                    <ChevronsUpDown size={14} className={`text-[#555] shrink-0 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>

                  {/* Custom Dropdown */}
                  {isDropdownOpen && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-[#131517] border border-[#2A2E32] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col">
                      <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                        {userCompanies.length > 0 ? (
                          userCompanies.map(c => (
                            <button
                              key={c.id}
                              onClick={() => {
                                onSwitchCompany(c.id);
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-3 transition-colors ${currentCompany?.id === c.id ? 'bg-[#2286D2]/10 text-[#2286D2]' : 'text-gray-400 hover:bg-[#1A1D1F] hover:text-white'}`}
                            >
                              <div className={`w-1.5 h-1.5 rounded-full ${currentCompany?.id === c.id ? 'bg-[#2286D2]' : 'bg-transparent'}`}></div>
                              <span className="truncate">{c.name}</span>
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-xs text-gray-500 italic text-center">Nenhuma empresa encontrada</div>
                        )}
                      </div>

                      {onManageCompanies && (
                        <div className="p-1 border-t border-[#2A2E32] bg-[#090B0C]">
                          <button
                            onClick={() => {
                              onManageCompanies();
                              setIsDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg text-sm text-[#2286D2] hover:bg-[#2286D2]/10 font-medium flex items-center gap-2 transition-colors"
                          >
                            <Settings size={14} />
                            Gerenciar Empresas
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : isBPOOperationalMode && onExitOperationalMode ? (
              // BPO Operational Mode Back Button (If no specific company context selected yet logic is confusing, fallback here)
              <button
                onClick={onExitOperationalMode}
                className="w-full flex items-center gap-2 px-4 py-3 bg-[#1A1D1F] text-indigo-400 font-bold rounded-lg hover:bg-[#202428] transition-colors text-sm border border-indigo-900/30"
              >
                <ArrowLeft size={18} /> Voltar à Carteira
              </button>
            ) : null}
          </div>

          <nav className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-4">
            {menuStructure.map(item => renderMenuNode(item))}
          </nav>

          {/* Bottom Section: User Info & Logout */}
          <div className="p-4 border-t border-[#2A2E32] bg-[#090B0C] shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-xs font-bold text-white border border-[#2A2E32] shrink-0">
                  {user.name.charAt(0)}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-medium truncate text-[#DEDEDD]">{user.name}</p>
                  <p className="text-[10px] text-[#555] truncate uppercase">{ROLE_LABELS[user.role]}</p>
                </div>
              </div>

              <button
                onClick={onLogout}
                className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Sair do Sistema"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <button
          className="absolute top-4 left-4 z-40 p-2 bg-white rounded-full shadow-md text-gray-600 lg:hidden hover:bg-gray-50 focus:outline-none border border-gray-200"
          onClick={() => setIsSidebarOpen(true)}
        >
          <Menu size={24} />
        </button>

        <main className={`flex-1 bg-[#F3F4F6] ${isFullWidthView ? 'flex flex-col overflow-hidden p-0' : 'overflow-x-hidden overflow-y-auto p-8 pt-16 lg:pt-8'}`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
