
// ... existing imports ...
import {
    Company, PlanType, Transaction, TransactionType, User, UserRole,
    AuditLog, CostCenter, Goal, FinancialAccount, FinancialCategory,
    AccountPlanItem, DRETemplate, DRELineItem, TransactionPayment,
    LongTermItem, DREMapping, RecurrenceConfig, SystemPlan, Asset, AssetCategory, ChatMessage, PermissionKey,
    CRMLead, Task, KanbanStage, CustomMenuItem
} from '../types';

// ... existing data definition (COMPANIES) ...
export let COMPANIES: Company[] = [
    { id: '1', name: 'Tech Solutions', cnpj: '12.345.678/0001-99', plan: PlanType.PREMIUM, active: true, primaryColor: 'indigo' },
    { id: '2', name: 'Consultoria Silva', cnpj: '98.765.432/0001-11', plan: PlanType.FREE, active: true, primaryColor: 'emerald' },
    { id: '3', name: 'Padaria do João', cnpj: '11.222.333/0001-44', plan: PlanType.ENTERPRISE, active: false, primaryColor: 'orange' }
];

const ALL_PERMISSIONS: PermissionKey[] = [
    'VIEW_DASHBOARD', 'VIEW_TRANSACTIONS', 'EDIT_TRANSACTIONS', 'VIEW_GOALS',
    'VIEW_COST_CENTERS', 'VIEW_ASSETS', 'VIEW_REPORTS', 'USE_AI', 'VIEW_SETTINGS',
    'MANAGE_USERS', 'VIEW_CRM', 'VIEW_TASKS', 'VIEW_LEADS', 'MANAGE_COMPANIES'
];

export let USERS: User[] = [
    // Demo Users matching SQL Script credentials for Fallback
    {
        id: 'u1',
        name: 'Admin Geral',
        email: 'admin@fingestao.com',
        role: UserRole.ADMIN,
        linkedCompanyIds: ['1', '2'],
        permissions: []
    },
    {
        id: 'u5',
        name: 'Parceiro BPO',
        email: 'bpo@fingestao.com',
        role: UserRole.BPO,
        linkedCompanyIds: ['1', '2', '3'],
        permissions: ['VIEW_DASHBOARD', 'VIEW_CRM', 'VIEW_TASKS', 'VIEW_LEADS', 'MANAGE_COMPANIES', 'MANAGE_USERS', 'VIEW_SETTINGS']
    },
    {
        id: 'u6',
        name: 'Consultor Externo',
        email: 'consultor@fingestao.com',
        role: UserRole.CONSULTANT,
        linkedCompanyIds: ['1', '3'],
        permissions: ['VIEW_DASHBOARD', 'VIEW_CRM', 'VIEW_TASKS', 'VIEW_LEADS', 'MANAGE_COMPANIES', 'VIEW_SETTINGS']
    },
    {
        id: 'u3',
        name: 'Funcionário Operacional',
        email: 'func@fingestao.com',
        role: UserRole.EMPLOYEE,
        linkedCompanyIds: ['1'],
        permissions: ['VIEW_DASHBOARD', 'VIEW_TRANSACTIONS', 'EDIT_TRANSACTIONS']
    },
    // Legacy/Other Mocks
    { id: 'u2', name: 'Gestor Silva', email: 'gestor@silva.com', role: UserRole.MANAGER, linkedCompanyIds: ['2'], permissions: [] },
    { id: 'superadmin', name: 'Suporte Fingestão', email: 'suporte@fingestao.com', role: UserRole.SUPER_ADMIN, linkedCompanyIds: [], permissions: ALL_PERMISSIONS }
];

// ... (Keep existing arrays like TRANSACTIONS, ACCOUNTS, etc. unchanged below) ...
export let TRANSACTIONS: Transaction[] = [
    {
        id: 't1', companyId: '1', description: 'Venda de Software', amount: 5000, type: TransactionType.INCOME, category: 'Vendas', date: '2024-05-15', status: 'PAID', payments: [], accountId: 'acc1'
    },
    {
        id: 't2', companyId: '1', description: 'Servidor AWS', amount: 150, type: TransactionType.EXPENSE, category: 'Infraestrutura', date: '2024-05-16', status: 'PAID', payments: [], accountId: 'acc1', costCenterId: 'cc1'
    }
];

export let FINANCIAL_ACCOUNTS: FinancialAccount[] = [
    { id: 'acc1', name: 'Banco Principal', type: 'BANK', balance: 15000, status: 'ACTIVE', companyId: '1', bankName: 'Inter' },
    { id: 'acc2', name: 'Caixa Pequeno', type: 'CASH', balance: 500, status: 'ACTIVE', companyId: '1' }
];

export let CATEGORIES: FinancialCategory[] = [
    { id: 'cat1', name: 'Vendas', type: TransactionType.INCOME, active: true, companyId: '1' },
    { id: 'cat2', name: 'Infraestrutura', type: TransactionType.EXPENSE, active: true, companyId: '1' }
];

export let COST_CENTERS: CostCenter[] = [
    { id: 'cc1', name: 'TI', code: '001', description: 'Tecnologia', budget: 5000, period: 'MONTHLY', status: 'ACTIVE', companyId: '1' }
];

// ... (Initialize other arrays empty or with existing data) ...
export let ASSETS: Asset[] = [];
export let ASSET_CATEGORIES: AssetCategory[] = [];
export let LONG_TERM_ITEMS: LongTermItem[] = [];
export let GOALS: Goal[] = [];
export let ACCOUNT_PLAN: AccountPlanItem[] = [];
export let DRE_TEMPLATES: DRETemplate[] = [];
export let DRE_LINES: DRELineItem[] = [];
export let AUDIT_LOGS: AuditLog[] = [];
export let PERSONAL_TRANSACTIONS: Transaction[] = [];
export let PERSONAL_CATEGORIES: FinancialCategory[] = [];
export let CHAT_HISTORY: Record<string, ChatMessage[]> = {};
export let SYSTEM_PLANS: SystemPlan[] = [
    { id: 'sp1', name: 'Starter', description: 'Para pequenas empresas', price: 0, billingCycle: 'MONTHLY', features: ['Dashboard', 'Lançamentos'], targetRoles: [UserRole.ADMIN], active: true },
    { id: 'sp2', name: 'Pro', description: 'Para empresas em crescimento', price: 99.90, billingCycle: 'MONTHLY', features: ['Dashboard', 'Lançamentos', 'IA', 'Relatórios'], targetRoles: [UserRole.ADMIN], active: true, recommended: true }
];
export let CRM_STAGES: KanbanStage[] = [
    { id: 'NEW', label: 'Novo Lead', color: 'border-blue-400', bg: 'bg-blue-50', order: 1 },
    { id: 'CONTACTED', label: 'Contatado', color: 'border-yellow-400', bg: 'bg-yellow-50', order: 2 },
    { id: 'PROPOSAL', label: 'Proposta', color: 'border-purple-400', bg: 'bg-purple-50', order: 3 },
    { id: 'CLOSED_WON', label: 'Fechado', color: 'border-green-400', bg: 'bg-green-50', order: 4 },
    { id: 'CLOSED_LOST', label: 'Perdido', color: 'border-red-400', bg: 'bg-red-50', order: 5 },
];
export let LEADS: CRMLead[] = [
    { id: 'l1', name: 'Roberto Justus', companyName: 'Justus Corp', companyId: '1', email: 'roberto@justus.com', phone: '11999999999', status: 'PROPOSAL', value: 15000, createdAt: '2024-05-01', source: 'Indicação', notes: 'Interessado em consultoria financeira avançada.' }
];
export let TASK_STAGES: KanbanStage[] = [
    { id: 'TODO', label: 'A Fazer', color: 'border-gray-400', bg: 'bg-gray-50', order: 1 },
    { id: 'IN_PROGRESS', label: 'Em Progresso', color: 'border-blue-400', bg: 'bg-blue-50', order: 2 },
    { id: 'DONE', label: 'Concluído', color: 'border-green-400', bg: 'bg-green-50', order: 3 }
];
export let TASKS: Task[] = [
    { id: 'tsk1', title: 'Fechar Balancete Tech Solutions', description: 'Revisar lançamentos de Maio e emitir DRE.', dueDate: '2024-05-30', status: 'IN_PROGRESS', priority: 'HIGH', linkedCompanyId: '1', assignedToId: 'u5' },
    { id: 'tsk2', title: 'Conciliação Bancária Consultoria Silva', description: 'Verificar extrato do Itaú x Sistema.', dueDate: '2024-05-25', status: 'TODO', priority: 'MEDIUM', linkedCompanyId: '2', assignedToId: 'u5' },
    { id: 'tsk3', title: 'Reunião Mensal Padaria do João', description: 'Apresentar resultados do trimestre.', dueDate: '2024-06-05', status: 'TODO', priority: 'MEDIUM', linkedCompanyId: '3', assignedToId: 'u5' },
    { id: 'tsk4', title: 'Enviar Proposta Justus', description: 'Adequar valores conforme reunião.', dueDate: '2024-05-22', status: 'DONE', priority: 'HIGH', linkedCompanyId: undefined, linkedLeadId: 'l1', assignedToId: 'u5' },
];
export let COMPANY_MENUS: Record<string, CustomMenuItem[]> = {};

// ... (Rest of the file remains strictly unchanged: Helpers, CRUD functions) ...
const DEFAULT_MENU: CustomMenuItem[] = [
    { id: 'dashboard', type: 'ITEM', label: 'Dashboard', icon: 'LayoutDashboard', viewId: 'dashboard', permission: 'VIEW_DASHBOARD', active: true },
    { id: 'ai_advisor', type: 'ITEM', label: 'IA Financeira', icon: 'Bot', viewId: 'ia-financeira', permission: 'USE_AI', active: true },
    { id: 'transactions', type: 'ITEM', label: 'Lançamentos', icon: 'CircleDollarSign', viewId: 'lancamentos', permission: 'VIEW_TRANSACTIONS', active: true },
    { id: 'goals', type: 'ITEM', label: 'Metas', icon: 'Target', viewId: 'metas', permission: 'VIEW_GOALS', active: true },
    { id: 'prolabore', type: 'ITEM', label: 'Prolabore', icon: 'Wallet', viewId: 'prolabore', permission: 'VIEW_TRANSACTIONS', active: true },
    { id: 'cost_centers', type: 'ITEM', label: 'Centro de Custos', icon: 'Tags', viewId: 'centros-de-custo', permission: 'VIEW_COST_CENTERS', active: true },
    { id: 'long_term', type: 'ITEM', label: 'Longo Prazo', icon: 'CalendarRange', viewId: 'longo-prazo', permission: 'VIEW_TRANSACTIONS', active: true },
    { id: 'assets', type: 'ITEM', label: 'Ativos', icon: 'Briefcase', viewId: 'ativos', permission: 'VIEW_ASSETS', active: true },
    { id: 'accounts', type: 'ITEM', label: 'Contas', icon: 'Landmark', viewId: 'contas', permission: 'VIEW_SETTINGS', active: true },
    { id: 'agenda', type: 'ITEM', label: 'Agenda', icon: 'Calendar', viewId: 'agenda', permission: 'VIEW_TASKS', active: true },
    { id: 'reports', type: 'ITEM', label: 'Relatórios', icon: 'FileText', viewId: 'relatorios', permission: 'VIEW_REPORTS', active: true },
    { id: 'tools', type: 'ITEM', label: 'Ferramentas', icon: 'Wrench', viewId: 'ferramentas', permission: 'VIEW_SETTINGS', active: true },
    { id: 'users', type: 'ITEM', label: 'Usuários', icon: 'Users', viewId: 'usuarios', permission: 'MANAGE_USERS', active: true },
    { id: 'settings', type: 'ITEM', label: 'Configurações', icon: 'Settings', viewId: 'configuracao', permission: 'VIEW_SETTINGS', active: true },
];

export const getCompanyMenu = (companyId: string): CustomMenuItem[] => {
    return JSON.parse(JSON.stringify(COMPANY_MENUS[companyId] || DEFAULT_MENU));
};
export const saveCompanyMenu = (companyId: string, menu: CustomMenuItem[]) => {
    COMPANY_MENUS[companyId] = menu;
};
export const resetCompanyMenu = (companyId: string) => {
    delete COMPANY_MENUS[companyId];
};

export const logAction = (user: User, action: string) => {
    AUDIT_LOGS.unshift({
        id: Math.random().toString(36).substr(2, 9),
        userName: user.name,
        action,
        timestamp: new Date().toLocaleString()
    });
};

export const registerUser = (userData: Partial<User>, planId?: string): User => {
    const newUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        name: userData.name || 'User',
        email: userData.email || '',
        role: userData.role || UserRole.EMPLOYEE,
        linkedCompanyIds: ['1'],
        permissions: []
    };
    USERS.push(newUser);
    return newUser;
};

// ... (Rest of functions: Plan, Company, User, Transaction, Account, CostCenter, Goal, DRE, etc. CRUDs remain unchanged) ...
export const getSystemPlans = () => SYSTEM_PLANS;
export const addSystemPlan = (plan: Partial<SystemPlan>, user: User) => {
    SYSTEM_PLANS.push({ ...plan, id: Math.random().toString(36).substr(2, 9) } as SystemPlan);
    logAction(user, `Criou plano: ${plan.name}`);
};
export const updateSystemPlan = (id: string, updates: Partial<SystemPlan>, user: User) => {
    const idx = SYSTEM_PLANS.findIndex(p => p.id === id);
    if (idx >= 0) SYSTEM_PLANS[idx] = { ...SYSTEM_PLANS[idx], ...updates };
};
export const deleteSystemPlan = (id: string, user: User) => {
    SYSTEM_PLANS = SYSTEM_PLANS.filter(p => p.id !== id);
};

export const createCompany = (data: Partial<Company>, user: User) => {
    const newComp: Company = {
        id: Math.random().toString(36).substr(2, 9),
        name: data.name || 'Nova Empresa',
        cnpj: data.cnpj || '',
        plan: data.plan || PlanType.FREE,
        active: true,
        primaryColor: data.primaryColor || 'indigo',
        createdAt: new Date().toISOString()
    };
    COMPANIES.push(newComp);

    // Auto-link creator to company
    const userIdx = USERS.findIndex(u => u.id === user.id);
    if (userIdx >= 0) {
        USERS[userIdx].linkedCompanyIds.push(newComp.id);
    }

    if (user) logAction(user, `Criou empresa: ${newComp.name}`);
    return newComp;
};

export const updateCompany = (id: string, updates: Partial<Company>) => {
    const idx = COMPANIES.findIndex(c => c.id === id);
    if (idx >= 0) {
        COMPANIES[idx] = { ...COMPANIES[idx], ...updates };
    }
};

export const deleteCompany = (id: string) => {
    COMPANIES = COMPANIES.filter(c => c.id !== id);
    USERS.forEach(u => {
        u.linkedCompanyIds = u.linkedCompanyIds.filter(cid => cid !== id);
    });
};

export const getUsersByCompany = (companyId: string) => {
    return USERS.filter(u =>
        u.linkedCompanyIds.includes(companyId) &&
        u.role !== UserRole.BPO &&
        u.role !== UserRole.CONSULTANT &&
        u.role !== UserRole.SUPER_ADMIN
    );
};

export const addUserToCompany = (companyId: string, user: Partial<User>) => {
    USERS.push({ ...user, id: Math.random().toString(36).substr(2, 9), linkedCompanyIds: [companyId] } as User);
};
export const updateUser = (id: string, updates: Partial<User>) => {
    const idx = USERS.findIndex(u => u.id === id);
    if (idx >= 0) USERS[idx] = { ...USERS[idx], ...updates };
};
export const deleteUser = (id: string) => {
    USERS = USERS.filter(u => u.id !== id);
};

export const getCompanyById = (id: string) => COMPANIES.find(c => c.id === id);
export const updateCompanySettings = (id: string, data: any) => {
    const idx = COMPANIES.findIndex(c => c.id === id);
    if (idx >= 0) COMPANIES[idx] = { ...COMPANIES[idx], ...data };
};
export const toggleCompanyStatus = (id: string, user: User) => {
    const c = COMPANIES.find(x => x.id === id);
    if (c) {
        c.active = !c.active;
        logAction(user, `${c.active ? 'Ativou' : 'Bloqueou'} empresa ${c.name}`);
    }
};
export const switchCompanyPlan = (id: string, user: User) => {
    const c = COMPANIES.find(x => x.id === id);
    if (c) {
        c.plan = c.plan === PlanType.FREE ? PlanType.PREMIUM : PlanType.FREE;
    }
};

export const getTransactionsByCompany = (companyId: string) => TRANSACTIONS.filter(t => t.companyId === companyId);
export const addTransaction = (transaction: Partial<Transaction>, user: User) => {
    const newT = {
        ...transaction,
        id: Math.random().toString(36).substr(2, 9),
        status: transaction.status || 'PENDING',
        payments: transaction.payments || []
    } as Transaction;

    if (newT.status === 'PAID' && newT.accountId) {
        const acc = FINANCIAL_ACCOUNTS.find(a => a.id === newT.accountId);
        if (acc) {
            if (newT.type === TransactionType.INCOME) acc.balance += newT.amount;
            else acc.balance -= newT.amount;
        }
    }

    TRANSACTIONS.unshift(newT);
    logAction(user, `Adicionou transação: ${newT.description}`);
};
export const updateTransaction = (id: string, updates: any, user: User) => {
    const idx = TRANSACTIONS.findIndex(t => t.id === id);
    if (idx >= 0) {
        TRANSACTIONS[idx] = { ...TRANSACTIONS[idx], ...updates };
        logAction(user, `Atualizou transação: ${TRANSACTIONS[idx].description}`);
    }
};

export const getCategoriesByCompany = (companyId: string) => CATEGORIES.filter(c => c.companyId === companyId);
export const addCategory = (data: any) => CATEGORIES.push({ ...data, id: Math.random().toString(36).substr(2, 9) });
export const updateCategory = (id: string, data: any) => {
    const idx = CATEGORIES.findIndex(c => c.id === id);
    if (idx >= 0) CATEGORIES[idx] = { ...CATEGORIES[idx], ...data };
};
export const deleteCategory = (id: string) => {
    CATEGORIES = CATEGORIES.filter(c => c.id !== id);
};

export const getAccountsByCompany = (companyId: string) => FINANCIAL_ACCOUNTS.filter(a => a.companyId === companyId);
export const addFinancialAccount = (data: any) => FINANCIAL_ACCOUNTS.push({ ...data, id: Math.random().toString(36).substr(2, 9) });
export const updateFinancialAccount = (id: string, data: any) => {
    const idx = FINANCIAL_ACCOUNTS.findIndex(a => a.id === id);
    if (idx >= 0) FINANCIAL_ACCOUNTS[idx] = { ...FINANCIAL_ACCOUNTS[idx], ...data };
};
export const deleteFinancialAccount = (id: string) => {
    FINANCIAL_ACCOUNTS = FINANCIAL_ACCOUNTS.filter(a => a.id !== id);
};

export const getCostCentersByCompany = (companyId: string) => COST_CENTERS.filter(c => c.companyId === companyId);
export const addCostCenter = (data: any, user: User) => COST_CENTERS.push({ ...data, id: Math.random().toString(36).substr(2, 9) });
export const updateCostCenter = (id: string, data: any) => {
    const idx = COST_CENTERS.findIndex(c => c.id === id);
    if (idx >= 0) COST_CENTERS[idx] = { ...COST_CENTERS[idx], ...data };
};
export const deleteCostCenter = (id: string) => {
    COST_CENTERS = COST_CENTERS.filter(c => c.id !== id);
};
export const toggleCostCenterStatus = (id: string) => {
    const c = COST_CENTERS.find(x => x.id === id);
    if (c) c.status = c.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
};

export const getGoalsByCompany = (companyId: string) => GOALS.filter(g => g.companyId === companyId);
export const addGoal = (data: any) => GOALS.push({ ...data, id: Math.random().toString(36).substr(2, 9) });
export const updateGoal = (id: string, data: any) => {
    const idx = GOALS.findIndex(g => g.id === id);
    if (idx >= 0) GOALS[idx] = { ...GOALS[idx], ...data };
};
export const deleteGoal = (id: string) => {
    GOALS = GOALS.filter(g => g.id !== id);
};
export const toggleGoalStatus = (id: string) => {
    const g = GOALS.find(x => x.id === id);
    if (g) g.status = g.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
};

export const getAccountPlanByCompany = (companyId: string) => ACCOUNT_PLAN.filter(a => a.companyId === companyId);
export const addAccountPlanItem = (data: any) => ACCOUNT_PLAN.push({ ...data, id: Math.random().toString(36).substr(2, 9) });
export const updateAccountPlanItem = (id: string, data: any) => {
    const idx = ACCOUNT_PLAN.findIndex(a => a.id === id);
    if (idx >= 0) ACCOUNT_PLAN[idx] = { ...ACCOUNT_PLAN[idx], ...data };
};
export const deleteAccountPlanItem = (id: string) => {
    ACCOUNT_PLAN = ACCOUNT_PLAN.filter(a => a.id !== id);
};

export const getDRETemplatesByCompany = (companyId: string) => DRE_TEMPLATES.filter(t => t.companyId === companyId);
export const addDRETemplate = (data: any) => DRE_TEMPLATES.push({ ...data, id: Math.random().toString(36).substr(2, 9) });
export const updateDRETemplate = (id: string, data: any) => { };
export const deleteDRETemplate = (id: string) => {
    DRE_TEMPLATES = DRE_TEMPLATES.filter(t => t.id !== id);
};
export const cloneDRETemplate = (id: string, companyId: string, name: string) => { };
export const getDRELinesByTemplate = (templateId: string) => DRE_LINES.filter(l => l.templateId === templateId);
export const addDRELine = (data: any) => DRE_LINES.push({ ...data, id: Math.random().toString(36).substr(2, 9) });
export const updateDRELine = (id: string, data: any) => {
    const idx = DRE_LINES.findIndex(l => l.id === id);
    if (idx >= 0) DRE_LINES[idx] = { ...DRE_LINES[idx], ...data };
};
export const deleteDRELine = (id: string) => {
    DRE_LINES = DRE_LINES.filter(l => l.id !== id);
};

export const getPersonalTransactions = (companyId: string) => PERSONAL_TRANSACTIONS.filter(t => t.companyId === companyId);
export const addPersonalTransaction = (data: any) => PERSONAL_TRANSACTIONS.push({ ...data, id: Math.random().toString(36).substr(2, 9) });
export const updatePersonalTransaction = (id: string, data: any) => {
    const idx = PERSONAL_TRANSACTIONS.findIndex(t => t.id === id);
    if (idx >= 0) PERSONAL_TRANSACTIONS[idx] = { ...PERSONAL_TRANSACTIONS[idx], ...data };
};
export const deletePersonalTransaction = (id: string) => {
    PERSONAL_TRANSACTIONS = PERSONAL_TRANSACTIONS.filter(t => t.id !== id);
};
export const getPersonalCategories = (companyId: string) => PERSONAL_CATEGORIES.filter(c => c.companyId === companyId);
export const addPersonalCategory = (data: any) => PERSONAL_CATEGORIES.push({ ...data, id: Math.random().toString(36).substr(2, 9) });
export const updatePersonalCategory = (id: string, data: any) => {
    const idx = PERSONAL_CATEGORIES.findIndex(c => c.id === id);
    if (idx >= 0) PERSONAL_CATEGORIES[idx] = { ...PERSONAL_CATEGORIES[idx], ...data };
};
export const deletePersonalCategory = (id: string) => {
    PERSONAL_CATEGORIES = PERSONAL_CATEGORIES.filter(c => c.id !== id);
};

export const getLongTermItems = (companyId: string) => LONG_TERM_ITEMS.filter(i => i.companyId === companyId);
export const addLongTermItem = (data: any, user: User, auto: boolean, txs?: any[], cat?: string) => {
    const newItem = { ...data, id: Math.random().toString(36).substr(2, 9) };
    LONG_TERM_ITEMS.push(newItem);
    if (auto && txs) {
        txs.forEach((tx: any) => {
            addTransaction({
                description: `Parcela ${newItem.title}`,
                amount: tx.amount,
                date: tx.date,
                type: TransactionType.EXPENSE,
                category: cat || 'Longo Prazo',
                status: 'PENDING',
                companyId: data.companyId,
                linkedLongTermItemId: newItem.id
            }, user);
        });
    }
};
export const updateLongTermItem = (id: string, data: any, user: User, auto: boolean, txs?: any[], cat?: string) => {
    const idx = LONG_TERM_ITEMS.findIndex(i => i.id === id);
    if (idx >= 0) LONG_TERM_ITEMS[idx] = { ...LONG_TERM_ITEMS[idx], ...data };
};
export const deleteLongTermItem = (id: string) => {
    LONG_TERM_ITEMS = LONG_TERM_ITEMS.filter(i => i.id !== id);
};
export const getTransactionsByLongTermId = (id: string) => TRANSACTIONS.filter(t => t.linkedLongTermItemId === id);
export const settleLongTermInstallment = (id: string, date: string, amount: number, user: User, accountId: string, interest: number, discount: number) => {
    const tx = TRANSACTIONS.find(t => t.id === id);
    if (tx) {
        tx.status = 'PAID';
        tx.date = date; // Pay date
        tx.amount = amount;
        tx.accountId = accountId;
        const acc = FINANCIAL_ACCOUNTS.find(a => a.id === accountId);
        if (acc) acc.balance -= amount;
        return { success: true };
    }
    return { success: false, message: 'Not found' };
};

export const getAssetsByCompany = (companyId: string) => ASSETS.filter(a => a.companyId === companyId);
export const getAssetCategories = (companyId: string) => ASSET_CATEGORIES.filter(c => c.companyId === companyId);
export const addAsset = (data: any) => ASSETS.push({ ...data, id: Math.random().toString(36).substr(2, 9) });
export const updateAsset = (id: string, data: any) => {
    const idx = ASSETS.findIndex(a => a.id === id);
    if (idx >= 0) ASSETS[idx] = { ...ASSETS[idx], ...data };
};
export const deleteAsset = (id: string) => {
    ASSETS = ASSETS.filter(a => a.id !== id);
};
export const addAssetCategory = (data: any) => ASSET_CATEGORIES.push({ ...data, id: Math.random().toString(36).substr(2, 9) });
export const updateAssetCategory = (id: string, data: any) => {
    const idx = ASSET_CATEGORIES.findIndex(c => c.id === id);
    if (idx >= 0) ASSET_CATEGORIES[idx] = { ...ASSET_CATEGORIES[idx], ...data };
};
export const deleteAssetCategory = (id: string) => {
    ASSET_CATEGORIES = ASSET_CATEGORIES.filter(c => c.id !== id);
};

export const getChatHistory = (companyId: string) => CHAT_HISTORY[companyId] || [];
export const addChatMessage = (companyId: string, msg: ChatMessage) => {
    if (!CHAT_HISTORY[companyId]) CHAT_HISTORY[companyId] = [];
    CHAT_HISTORY[companyId].push(msg);
};
export const clearChatHistory = (companyId: string) => {
    CHAT_HISTORY[companyId] = [];
};

export const updateLead = (id: string, updates: Partial<CRMLead>) => {
    const idx = LEADS.findIndex(l => l.id === id);
    if (idx >= 0) LEADS[idx] = { ...LEADS[idx], ...updates };
};

export const addTask = (task: Partial<Task>, user?: User) => {
    const newTask: Task = {
        id: Math.random().toString(36).substr(2, 9),
        title: task.title!,
        description: task.description!,
        dueDate: task.dueDate!,
        status: task.status || 'TODO',
        priority: task.priority || 'MEDIUM',
        linkedCompanyId: task.linkedCompanyId,
        linkedLeadId: task.linkedLeadId,
        assignedToId: task.assignedToId || (user ? user.id : 'u1')
    };
    TASKS.unshift(newTask);
    if (user) logAction(user, `Criou tarefa: ${newTask.title}`);
};
