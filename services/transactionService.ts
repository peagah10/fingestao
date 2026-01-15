import { supabase } from './supabaseClient';
import {
    Transaction, FinancialAccount, FinancialCategory, CostCenter,
    TransactionType, CostCenterPeriod, DRETemplate, DRELineItem, DRELineType
} from '../types';

export const transactionService = {
    // --- TRANSACTIONS ---
    async fetchTransactions(companyId: string): Promise<Transaction[] | null> {
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('company_id', companyId)
                .order('date', { ascending: false });

            if (error) {
                console.error('Error fetching transactions:', error.message);
                return null;
            }

            return data.map((t: any) => ({
                id: t.id,
                companyId: t.company_id,
                description: t.description,
                amount: Number(t.amount),
                type: t.type as TransactionType,
                category: t.category,
                date: t.date,
                status: t.status,
                accountId: t.account_id,
                costCenterId: t.cost_center_id,
                payments: [], // TODO: Implement payments table if needed, for now empty
                recurrence: undefined, // TODO: Implement recurrence
                documentNumber: t.document_number,
                observation: t.observation
            }));
        } catch (err) {
            console.error('Exception fetching transactions:', err);
            return null;
        }
    },

    async createTransaction(tx: Partial<Transaction>): Promise<Transaction | null> {
        try {
            const dbPayload = {
                company_id: tx.companyId,
                account_id: tx.accountId || null,
                cost_center_id: tx.costCenterId || null,
                description: tx.description,
                amount: tx.amount,
                type: tx.type,
                category: tx.category,
                date: tx.date,
                status: tx.status || 'PENDING',
                document_number: tx.documentNumber,
                observation: tx.observation
            };

            const { data, error } = await supabase
                .from('transactions')
                .insert([dbPayload])
                .select()
                .single();

            if (error) throw error;

            // Update Account Balance if PAID
            if (tx.status === 'PAID' && tx.accountId) {
                await this.updateAccountBalance(tx.accountId, tx.amount!, tx.type as TransactionType);
            }

            return { ...tx, id: data.id } as Transaction; // Return optimistic or mapped
        } catch (err) {
            console.error('Error creating transaction:', err);
            return null;
        }
    },

    async updateTransaction(id: string, updates: Partial<Transaction>): Promise<boolean> {
        try {
            // Snake_case mapping
            const dbUpdates: any = {};
            if (updates.description) dbUpdates.description = updates.description;
            if (updates.amount) dbUpdates.amount = updates.amount;
            if (updates.date) dbUpdates.date = updates.date;
            if (updates.status) dbUpdates.status = updates.status;
            if (updates.category) dbUpdates.category = updates.category;
            if (updates.accountId) dbUpdates.account_id = updates.accountId;
            if (updates.costCenterId) dbUpdates.cost_center_id = updates.costCenterId;

            const { error } = await supabase
                .from('transactions')
                .update(dbUpdates)
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (err) {
            console.error('Error updating transaction:', err);
            return false;
        }
    },

    async deleteTransaction(id: string): Promise<boolean> {
        const { error } = await supabase.from('transactions').delete().eq('id', id);
        return !error;
    },

    // --- ACCOUNTS ---
    async fetchAccounts(companyId: string): Promise<FinancialAccount[] | null> {
        const { data, error } = await supabase
            .from('financial_accounts')
            .select('*')
            .eq('company_id', companyId);

        if (error) return null;

        return data.map((a: any) => ({
            id: a.id,
            companyId: a.company_id,
            name: a.name,
            type: a.type,
            balance: Number(a.balance),
            status: a.status,
            bankName: a.bank_name,
            agency: a.agency,
            accountNumber: a.account_number
        }));
    },

    async createAccount(acc: Partial<FinancialAccount>): Promise<FinancialAccount | null> {
        const dbPayload = {
            company_id: acc.companyId,
            name: acc.name,
            type: acc.type,
            balance: acc.balance || 0,
            status: acc.status || 'ACTIVE',
            bank_name: acc.bankName,
            agency: acc.agency,
            account_number: acc.accountNumber
        };

        const { data, error } = await supabase.from('financial_accounts').insert([dbPayload]).select().single();
        if (error) {
            console.error("Error creating account", error);
            return null;
        }
        return { ...acc, id: data.id } as FinancialAccount;
    },

    async updateAccountBalance(id: string, amount: number, type: TransactionType) {
        // Simple balance update (Not atomic/safe for high concurrency but fits MVP)
        // Ideally use an RPC function in Postgres
        const { data: acc } = await supabase.from('financial_accounts').select('balance').eq('id', id).single();
        if (!acc) return;

        const newBalance = type === TransactionType.INCOME
            ? Number(acc.balance) + Number(amount)
            : Number(acc.balance) - Number(amount);

        await supabase.from('financial_accounts').update({ balance: newBalance }).eq('id', id);
    },

    async updateAccount(id: string, updates: Partial<FinancialAccount>) {
        const dbUpdates: any = {};
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.type) dbUpdates.type = updates.type;
        if (updates.balance !== undefined) dbUpdates.balance = updates.balance;
        if (updates.bankName) dbUpdates.bank_name = updates.bankName;
        if (updates.agency) dbUpdates.agency = updates.agency;
        if (updates.accountNumber) dbUpdates.account_number = updates.accountNumber;
        if (updates.status) dbUpdates.status = updates.status;

        await supabase.from('financial_accounts').update(dbUpdates).eq('id', id);
    },

    async deleteAccount(id: string) {
        await supabase.from('financial_accounts').delete().eq('id', id);
    },

    // --- CATEGORIES ---
    async fetchCategories(companyId: string): Promise<FinancialCategory[] | null> {
        const { data, error } = await supabase
            .from('financial_categories')
            .select('*')
            .eq('company_id', companyId);

        if (error) return null;

        return data.map((c: any) => ({
            id: c.id,
            companyId: c.company_id,
            name: c.name,
            type: c.type,
            color: c.color,
            active: c.active,
            isSystemDefault: c.is_system_default // Mapped from DB
        }));
    },

    async createCategory(cat: Partial<FinancialCategory>) {
        const { data, error } = await supabase.from('financial_categories').insert([{
            company_id: cat.companyId,
            name: cat.name,
            type: cat.type,
            color: cat.color,
            active: true
        }]).select().single();

        if (error) return null;
        return { ...cat, id: data.id };
    },

    async deleteCategory(id: string) {
        await supabase.from('financial_categories').delete().eq('id', id);
    },

    // --- COST CENTERS ---
    async fetchCostCenters(companyId: string): Promise<CostCenter[] | null> {
        const { data, error } = await supabase.from('cost_centers').select('*').eq('company_id', companyId);
        if (error) return null;

        return data.map((c: any) => ({
            id: c.id,
            companyId: c.company_id,
            name: c.name,
            code: c.code,
            description: c.description,
            budget: Number(c.budget),
            period: c.period as CostCenterPeriod,
            status: c.status
        }));
    },

    async createCostCenter(cc: Partial<CostCenter>) {
        const { data, error } = await supabase.from('cost_centers').insert([{
            company_id: cc.companyId,
            name: cc.name,
            code: cc.code,
            description: cc.description,
            budget: cc.budget,
            period: cc.period || 'MONTHLY',
            status: 'ACTIVE'
        }]).select().single();
        if (error) return null;
        return { ...cc, id: data.id };
    },

    async updateCostCenter(id: string, updates: Partial<CostCenter>) {
        const dbUpdates: any = {};
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.code) dbUpdates.code = updates.code;
        if (updates.description) dbUpdates.description = updates.description;
        if (updates.budget !== undefined) dbUpdates.budget = updates.budget;
        if (updates.period) dbUpdates.period = updates.period;
        if (updates.status) dbUpdates.status = updates.status;

        await supabase.from('cost_centers').update(dbUpdates).eq('id', id);
    },

    async deleteCostCenter(id: string) {
        await supabase.from('cost_centers').delete().eq('id', id);
    },

    // --- DRE ---
    async fetchDRETemplates(companyId: string): Promise<DRETemplate[] | null> {
        const { data, error } = await supabase
            .from('dre_templates')
            .select('*')
            .eq('company_id', companyId)
            .eq('active', true);

        if (error) return null;

        return data.map((t: any) => ({
            id: t.id,
            name: t.name,
            companyId: t.company_id,
            structureType: t.structure_type,
            active: t.active,
            isSystemDefault: t.is_system_default
        }));
    },

    async fetchDRELines(templateId: string): Promise<DRELineItem[] | null> {
        // Fetch Lines
        const { data: lines, error: lineError } = await supabase
            .from('dre_line_items')
            .select('*')
            .eq('template_id', templateId)
            .order('order_index', { ascending: true });

        if (lineError) {
            console.error('Error fetching DRE lines', lineError);
            return null;
        }

        // Fetch Mappings
        const { data: mappings, error: mapError } = await supabase
            .from('dre_mappings')
            .select('*')
            .in('line_item_id', lines.map((l: any) => l.id));

        if (mapError) {
            console.error('Error fetching DRE mappings', mapError);
            return null;
        }

        // Merge
        return lines.map((l: any) => {
            const lineMappings = mappings
                .filter((m: any) => m.line_item_id === l.id)
                .map((m: any) => ({
                    id: m.id,
                    type: m.linked_type as 'CATEGORY' | 'ACCOUNT',
                    itemId: m.linked_id,
                    operation: m.operation
                }));

            return {
                id: l.id,
                templateId: l.template_id,
                name: l.name,
                type: l.type as DRELineType,
                order: l.order_index,
                parentId: l.parent_id,
                mappings: lineMappings
            };
        });
    }
};
