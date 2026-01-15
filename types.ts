
export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
  BPO = 'BPO',
  CONSULTANT = 'CONSULTANT',
  VIEWER = 'VIEWER',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

export type PermissionKey =
  | 'VIEW_DASHBOARD'
  | 'VIEW_TRANSACTIONS'
  | 'EDIT_TRANSACTIONS'
  | 'VIEW_GOALS'
  | 'VIEW_COST_CENTERS'
  | 'VIEW_ASSETS'
  | 'VIEW_REPORTS'
  | 'USE_AI'
  | 'VIEW_SETTINGS'
  | 'MANAGE_USERS'
  | 'VIEW_CRM'
  | 'VIEW_TASKS'
  | 'VIEW_LEADS'
  | 'MANAGE_COMPANIES';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions?: PermissionKey[];
  linkedCompanyIds: string[];
  avatar?: string;
  password?: string;
}

export enum PlanType {
  FREE = 'FREE',
  PREMIUM = 'PREMIUM',
  ENTERPRISE = 'ENTERPRISE'
}

export interface Company {
  id: string;
  name: string;
  cnpj: string;
  plan: PlanType;
  active: boolean;
  phone?: string;
  address?: string;
  primaryColor?: string;
  createdAt?: string;
  logo?: string; // Base64 or URL

  // Ownership
  createdBy?: string;

  apiToken?: string; // Security Token
  apiTokenDescription?: string; // Description for the Token
  serviceType?: 'CONSULTING' | 'BPO' | 'BOTH'; // New Field
}

export interface SystemPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  billingCycle: 'MONTHLY' | 'YEARLY';
  features: string[];
  targetRoles: UserRole[];
  active: boolean;
  recommended?: boolean;
}

// --- Menu Configuration Types ---
export type MenuParams = 'FIXED' | 'COLLAPSIBLE';

export interface CustomMenuItem {
  id: string;
  type: 'ITEM' | 'GROUP';
  label: string;
  icon?: string; // String identifier for the icon
  viewId?: string; // Route ID (Only for ITEM)
  permission?: PermissionKey; // Required permission
  children?: CustomMenuItem[]; // Nested items (Only for GROUP)
  groupType?: MenuParams; // (Only for GROUP) FIXED = Section Header, COLLAPSIBLE = Accordion
  isExpanded?: boolean; // UI State for editor/initial state
  active?: boolean; // If false, item is hidden from menu
}
// -------------------------------

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export type PaymentMethod = 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BOLETO' | 'CASH' | 'TRANSFER' | 'OTHER';

export interface TransactionPayment {
  id: string;
  method: PaymentMethod;
  amount: number;
  date: string;
  status: 'PENDING' | 'PAID';
  installmentNumber?: number;
  totalInstallments?: number;
}

export interface RecurrenceConfig {
  frequency: 'MONTHLY' | 'WEEKLY' | 'YEARLY' | 'DAILY';
  interval: number;
  infinite: boolean;
  endDate?: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
  status: 'PENDING' | 'PAID' | 'PARTIAL';
  accountId?: string;
  costCenterId?: string;
  payments: TransactionPayment[];
  recurrence?: RecurrenceConfig;
  documentNumber?: string;
  observation?: string;
  linkedCompanyId?: string;
  linkedLongTermItemId?: string;
  createdBy?: string;
  companyId: string;
}

export interface FinancialCategory {
  id: string;
  name: string;
  type: TransactionType;
  color?: string;
  active: boolean;
  isSystemDefault?: boolean;
  companyId: string;
  linkedAccountPlanId?: string | null;
}

export interface FinancialAccount {
  id: string;
  name: string;
  type: 'BANK' | 'CASH' | 'DIGITAL_WALLET';
  balance: number;
  status: 'ACTIVE' | 'INACTIVE';
  companyId: string;
  bankName?: string;
  agency?: string;
  accountNumber?: string;
  internalCode?: string;
  createdAt?: string;
}

export type CostCenterPeriod = 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'WEEKLY' | 'SEMIANNUAL';

export interface CostCenter {
  id: string;
  name: string;
  code: string;
  description: string;
  budget: number;
  period: CostCenterPeriod;
  status: 'ACTIVE' | 'INACTIVE';
  companyId: string;
  createdAt?: string;
}

export interface Goal {
  id: string;
  name: string;
  type: 'REVENUE' | 'EXPENSE_REDUCTION';
  period: string;
  targetAmount: number;
  currentAmount?: number;
  startDate: string;
  endDate: string;
  linkedEntityType: 'CATEGORY' | 'ACCOUNT_PLAN' | 'TOTAL';
  linkedEntityId: string;
  status: 'ACTIVE' | 'INACTIVE';
  companyId: string;
}

export interface AccountPlanItem {
  id: string;
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE' | 'COST';
  nature: 'DEBIT' | 'CREDIT';
  parentId: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  isSystemDefault: boolean;
  description?: string;
  companyId: string;
}

export interface DREMapping {
  id: string;
  type: 'CATEGORY' | 'ACCOUNT';
  itemId: string;
  operation: 'ADD' | 'SUBTRACT';
}

export type DRELineType = 'REVENUE' | 'DEDUCTION' | 'COST' | 'EXPENSE' | 'TAX' | 'SUBTOTAL' | 'GROUP' | 'RESULT';

export interface DRELineItem {
  id: string;
  name: string;
  type: DRELineType;
  order: number;
  parentId: string | null;
  mappings?: DREMapping[];
  templateId: string;
  value?: number;
}

export interface DRETemplate {
  id: string;
  name: string;
  companyId: string;
  structureType: string;
  active: boolean;
  isSystemDefault: boolean;
}

export type LongTermType = 'LOAN' | 'FINANCING' | 'LICENSE';

export interface LongTermItem {
  id: string;
  type: LongTermType;
  title: string;
  provider: string;
  totalValue: number;
  acquisitionDate: string;
  validityEndDate?: string;
  installmentsCount: number;
  status: 'ACTIVE' | 'PAID' | 'CANCELLED';
  companyId: string;
}

export type DepreciationMethod = 'LINEAR' | 'SUM_OF_YEARS' | 'DECLINING_BALANCE' | 'UNITS_OF_PRODUCTION';

export interface AssetCategory {
  id: string;
  name: string;
  linkedAccountPlanId?: string;
  companyId: string;
}

export interface Asset {
  id: string;
  name: string;
  categoryId: string;
  description: string;
  acquisitionDate: string;
  initialValue: number;
  residualValue: number;
  usefulLifeMonths: number;
  status: 'ACTIVE' | 'SOLD' | 'WRITTEN_OFF';
  depreciationMethod: DepreciationMethod;
  usageTotalEstimated?: number;
  usageCurrent?: number;
  companyId: string;
}

export interface AuditLog {
  id: string;
  userName: string;
  action: string;
  timestamp: string;
  companyId?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  type?: 'text' | 'navigation';
  data?: any;
}

export type KanbanStageId = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST' | string;

export interface KanbanStage {
  id: string;
  label: string;
  color: string;
  bg: string;
  order: number;
}

export interface CRMLead {
  id: string;
  companyId: string; // Linked backend ID
  name: string;
  email: string;
  phone: string;
  companyName?: string; // Display name
  status: string; // FUNNEL_STAGE_ID
  source: string;
  value: number;
  notes: string;
  createdAt: string;
  updatedAt?: string;
  assignedToId?: string; // ID of the user responsible
  serviceInterest?: 'CONSULTING' | 'BPO' | 'BOTH'; // New Field
  segment?: string;
  revenue?: number; // Estimated revenue
  pain?: string; // Pain description
  nextAction?: string; // What needs to happen next
  nextActionDate?: string; // When
  lossReason?: string; // Why it was lost
}

export interface Task {
  id: string;
  linkedCompanyId: string;
  title: string;
  description: string;
  dueDate: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  linkedLeadId?: string;
  assignedToId: string;
  type?: 'CRM' | 'BPO' | 'GENERAL';
  relatedClientId?: string;
  recurrence?: {
    rule: string;
    endDate?: string;
  };
}

export interface CRMFunnelStage {
  id: string;
  companyId: string;
  name: string;
  order: number;
  color: string;
}
