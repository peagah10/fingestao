import { supabase } from './supabaseClient';
import {
    CRMLead, Task, CRMFunnelStage
} from '../types';

export const crmService = {
    // --- FUNNEL STAGES ---
    async fetchFunnelStages(companyId: string): Promise<CRMFunnelStage[]> {
        const { data } = await supabase
            .from('crm_funnel_stages')
            .select('*')
            .eq('company_id', companyId)
            .order('order', { ascending: true });

        return (data || []).map((s: any) => ({
            id: s.id,
            name: s.name,
            order: s.order,
            color: s.color,
            companyId: s.company_id
        }));
    },

    async createFunnelStage(stage: Partial<CRMFunnelStage>) {
        const { data, error } = await supabase.from('crm_funnel_stages').insert([{
            company_id: stage.companyId,
            name: stage.name,
            order: stage.order,
            color: stage.color,
            is_system_default: false
        }]).select().single();

        if (error) return null;
        return {
            id: data.id,
            name: data.name,
            order: data.order,
            color: data.color,
            companyId: data.company_id
        };
    },

    async deleteFunnelStage(id: string) {
        await supabase.from('crm_funnel_stages').delete().eq('id', id);
    },

    // Helper to batch update leads (e.g. during migration)
    async batchUpdateLeadsStatus(leadIds: string[], newStatus: string) {
        if (leadIds.length === 0) return;
        await supabase.from('crm_leads').update({ status: newStatus }).in('id', leadIds);
    },

    // --- LEADS ---
    async fetchLeads(companyId: string): Promise<CRMLead[]> {
        const { data, error } = await supabase
            .from('crm_leads')
            .select('*')
            .eq('company_id', companyId)
            .order('created_at', { ascending: false });

        if (error) return [];

        return data.map((l: any) => ({
            id: l.id,
            name: l.name,
            companyName: l.company_name,
            email: l.email,
            phone: l.phone,
            status: l.status, // Ideally mapped to stage ID
            source: l.source,
            value: Number(l.value),
            notes: l.notes,
            assignedToId: l.assigned_to,
            createdAt: l.created_at,
            companyId: l.company_id,
            serviceInterest: l.service_interest,
            segment: l.segment,
            revenue: Number(l.revenue),
            pain: l.pain,
            nextAction: l.next_action,
            nextActionDate: l.next_action_date,
            lossReason: l.loss_reason
        }));
    },

    async createLead(lead: Partial<CRMLead>) {
        const { data, error } = await supabase.from('crm_leads').insert([{
            company_id: lead.companyId,
            name: lead.name,
            company_name: lead.companyName,
            email: lead.email,
            phone: lead.phone,
            status: lead.status || 'NEW',
            source: lead.source,
            value: lead.value || 0,
            notes: lead.notes,
            assigned_to: lead.assignedToId,
            service_interest: lead.serviceInterest,
            segment: lead.segment,
            revenue: lead.revenue,
            pain: lead.pain,
            next_action: lead.nextAction,
            next_action_date: lead.nextActionDate
        }]).select().single();

        if (error) return null;
        return { ...lead, id: data.id };
    },

    async updateLead(id: string, updates: Partial<CRMLead>) {
        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.value !== undefined) dbUpdates.value = updates.value;
        if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
        if (updates.email !== undefined) dbUpdates.email = updates.email;
        if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
        if (updates.serviceInterest !== undefined) dbUpdates.service_interest = updates.serviceInterest;
        if (updates.source !== undefined) dbUpdates.source = updates.source;
        if (updates.segment !== undefined) dbUpdates.segment = updates.segment;
        if (updates.revenue !== undefined) dbUpdates.revenue = updates.revenue;
        if (updates.pain !== undefined) dbUpdates.pain = updates.pain;
        if (updates.nextAction !== undefined) dbUpdates.next_action = updates.nextAction;
        if (updates.nextActionDate !== undefined) dbUpdates.next_action_date = updates.nextActionDate;
        if (updates.lossReason !== undefined) dbUpdates.loss_reason = updates.lossReason;

        const { error } = await supabase.from('crm_leads').update(dbUpdates).eq('id', id);
        return !error;
    },

    async deleteLead(id: string) {
        await supabase.from('crm_leads').delete().eq('id', id);
    },

    // --- TASKS ---
    async fetchTasks(companyId: string): Promise<Task[]> {
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('company_id', companyId)
            .order('due_date', { ascending: true });

        if (error) return [];

        return data.map((t: any) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            dueDate: t.due_date,
            priority: t.priority,
            status: t.status,
            assignedToId: t.assigned_to,
            linkedLeadId: t.related_lead_id,
            linkedCompanyId: t.company_id,
            type: t.task_type,
            relatedClientId: t.related_client_id,
            recurrence: t.recurrence_rule ? { rule: t.recurrence_rule, endDate: t.recurrence_end } : undefined
        }));
    },

    async createTask(task: Partial<Task>) {
        const { data, error } = await supabase.from('tasks').insert([{
            company_id: task.linkedCompanyId,
            title: task.title,
            description: task.description,
            due_date: task.dueDate,
            priority: task.priority || 'MEDIUM',
            status: task.status || 'PENDING',
            assigned_to: task.assignedToId,
            related_lead_id: task.linkedLeadId,
            created_by: task.assignedToId,
            task_type: task.type || 'GENERAL',
            related_client_id: task.relatedClientId,
            recurrence_rule: task.recurrence?.rule,
            recurrence_end: task.recurrence?.endDate
        }]).select().single();

        if (error) return null;
        return { ...task, id: data.id };
    },

    async updateTask(id: string, updates: Partial<Task>) {
        const dbUpdates: any = {};
        if (updates.status) dbUpdates.status = updates.status;
        if (updates.title) dbUpdates.title = updates.title;
        if (updates.dueDate) dbUpdates.due_date = updates.dueDate;

        await supabase.from('tasks').update(dbUpdates).eq('id', id);
    },

    async deleteTask(id: string) {
        await supabase.from('tasks').delete().eq('id', id);
    },

    // --- GLOBAL FETCHING (BPO/CONSULTANT) ---
    async fetchGlobalLeads(companyIds: string[]): Promise<CRMLead[]> {
        if (!companyIds.length) return [];

        const { data, error } = await supabase
            .from('crm_leads')
            .select('*')
            .in('company_id', companyIds)
            .order('created_at', { ascending: false });

        if (error) return [];

        return data.map((l: any) => ({
            id: l.id,
            name: l.name,
            companyName: l.company_name,
            email: l.email,
            phone: l.phone,
            status: l.status,
            source: l.source,
            value: Number(l.value),
            notes: l.notes,
            assignedToId: l.assigned_to,
            createdAt: l.created_at,
            companyId: l.company_id,
            serviceInterest: l.service_interest,
            segment: l.segment,
            revenue: Number(l.revenue),
            pain: l.pain,
            nextAction: l.next_action,
            nextActionDate: l.next_action_date,
            lossReason: l.loss_reason
        }));
    },

    async fetchGlobalTasks(companyIds: string[]): Promise<Task[]> {
        if (!companyIds.length) return [];

        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .in('company_id', companyIds)
            .order('due_date', { ascending: true });

        if (error) return [];

        return data.map((t: any) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            dueDate: t.due_date,
            priority: t.priority,
            status: t.status,
            assignedToId: t.assigned_to,
            linkedLeadId: t.related_lead_id,
            linkedCompanyId: t.company_id,
            type: t.task_type,
            relatedClientId: t.related_client_id,
            recurrence: t.recurrence_rule ? { rule: t.recurrence_rule, endDate: t.recurrence_end } : undefined
        }));
    }
};
