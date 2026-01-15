
import React from 'react';
import { PermissionKey } from './types';

// Global Views
import BPODashboard from './components/BPODashboard';
import PortfolioView from './components/PortfolioView';
import CRMView from './components/CRMView';
import TasksView from './components/TasksView';
import LeadsView from './components/LeadsView';
import GlobalUsersView from './components/GlobalUsersView';
import BPOSettingsView from './components/BPOSettingsView';

// Operational Views
import FinancialDashboard from './components/FinancialDashboard';
import TransactionsView from './components/TransactionsView';
import ProlaboreView from './components/ProlaboreView';
import CostCentersView from './components/CostCentersView';
import GoalsView from './components/GoalsView';
import AccountsView from './components/AccountsView';
import AgendaView from './components/AgendaView';
import LongTermView from './components/LongTermView';
import AssetsView from './components/AssetsView';
import SettingsView from './components/SettingsView';
import FinancialAIView from './components/FinancialAIView';
import ReportsView from './components/ReportsView';
import UsersView from './components/UsersView';
import ToolsView from './components/ToolsView';

// Interface definition for a Route
export interface RouteConfig {
  component: React.FC<any>;
  permission?: PermissionKey;
  label?: string; // Optional override title
}

// Registry for Global Context (BPO/Consultant View - No specific company selected)
export const GLOBAL_ROUTES: Record<string, RouteConfig> = {
  'dashboard': { component: BPODashboard },
  'crm': { component: CRMView, permission: 'VIEW_CRM' },
  'tarefas': { component: TasksView, permission: 'VIEW_TASKS' },
  'leads': { component: LeadsView, permission: 'VIEW_LEADS' },
  'empresas': { component: PortfolioView, permission: 'MANAGE_COMPANIES' },
  'usuarios': { component: GlobalUsersView, permission: 'MANAGE_USERS' },
  'configuracao': { component: BPOSettingsView, permission: 'VIEW_SETTINGS' },
};

// Registry for Operational Context (Specific Company Selected)
export const OPERATIONAL_ROUTES: Record<string, RouteConfig> = {
  'dashboard': { component: FinancialDashboard, permission: 'VIEW_DASHBOARD' },
  'lancamentos': { component: TransactionsView, permission: 'VIEW_TRANSACTIONS' },
  'prolabore': { component: ProlaboreView, permission: 'VIEW_TRANSACTIONS' }, // Reusing transaction permission
  'centros-de-custo': { component: CostCentersView, permission: 'VIEW_COST_CENTERS' },
  'metas': { component: GoalsView, permission: 'VIEW_GOALS' },
  'contas': { component: AccountsView, permission: 'VIEW_SETTINGS' },
  'agenda': { component: AgendaView, permission: 'VIEW_TASKS' }, // Using task permission for agenda
  'longo-prazo': { component: LongTermView, permission: 'VIEW_TRANSACTIONS' },
  'ativos': { component: AssetsView, permission: 'VIEW_ASSETS' },
  'configuracao': { component: SettingsView, permission: 'VIEW_SETTINGS' },
  'ia-financeira': { component: FinancialAIView, permission: 'USE_AI' },
  'relatorios': { component: ReportsView, permission: 'VIEW_REPORTS' },
  'usuarios': { component: UsersView, permission: 'MANAGE_USERS' },
  'ferramentas': { component: ToolsView, permission: 'VIEW_SETTINGS' },
  'tarefas': { component: TasksView, permission: 'VIEW_TASKS' },
};
