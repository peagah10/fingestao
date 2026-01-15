import { supabase } from './supabaseClient';
import { AccountPlanItem } from '../types';

export const accountPlanService = {
    async fetchAccountPlan(companyId: string): Promise<AccountPlanItem[]> {
        const { data, error } = await supabase
            .from('account_plans')
            .select('*')
            .eq('company_id', companyId)
            .order('code', { ascending: true });

        if (error) {
            console.error('Error fetching account plan:', error);
            return [];
        }

        return data.map((item: any) => ({
            id: item.id,
            companyId: item.company_id,
            code: item.code,
            name: item.name,
            type: item.type,
            nature: item.nature,
            parentId: item.parent_code, // TODO: map this correctly if parent_id uses UUID
            isSystemDefault: item.is_system_default,
            status: item.active ? 'ACTIVE' : 'INACTIVE'
        }));
    },

    async createAccountPlanItem(item: Partial<AccountPlanItem>): Promise<AccountPlanItem | null> {
        const { data, error } = await supabase.from('account_plans').insert([{
            company_id: item.companyId,
            code: item.code,
            name: item.name,
            type: item.type,
            nature: item.nature,
            is_system_default: false,
            active: true
        }]).select().single();

        if (error) {
            console.error('Error creating account plan:', error);
            return null;
        }
        return { ...item, id: data.id } as AccountPlanItem;
    },

    async updateAccountPlanItem(id: string, updates: Partial<AccountPlanItem>) {
        const { error } = await supabase.from('account_plans').update({
            name: updates.name,
            active: updates.status === 'ACTIVE'
        }).eq('id', id);
        return !error;
    },

    async deleteAccountPlanItem(id: string) {
        // RLS prevents deleting system defaults, but good to catch here too if we wanted.
        const { error } = await supabase.from('account_plans').delete().eq('id', id);
        if (error) console.error('Error deleting account plan item:', error);
        return !error;
    }
};
