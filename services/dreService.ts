import { supabase } from './supabaseClient';
import { DRETemplate, DRELineItem, DREMapping } from '../types';

export const dreService = {
    async fetchDRETemplate(companyId: string): Promise<DRETemplate | null> {
        const { data, error } = await supabase
            .from('dre_templates')
            .select('*')
            .eq('company_id', companyId)
            .eq('active', true)
            .limit(1)
            .single();

        if (error || !data) return null;

        return {
            id: data.id,
            name: data.name,
            companyId: data.company_id,
            structureType: data.structure_type,
            active: data.active,
            isSystemDefault: data.is_system_default
        };
    },

    async fetchDRELines(templateId: string): Promise<DRELineItem[]> {
        const { data, error } = await supabase
            .from('dre_line_items')
            .select(`
                *,
                dre_mappings (*)
            `)
            .eq('template_id', templateId)
            .order('order_index', { ascending: true });

        if (error) {
            console.error('Error fetching DRE lines:', error);
            return [];
        }

        return data.map((line: any) => ({
            id: line.id,
            templateId: line.template_id,
            name: line.name,
            type: line.type,
            order: line.order_index,
            parentId: line.parent_id,
            mappings: line.dre_mappings?.map((m: any) => ({
                id: m.id,
                type: m.linked_type,
                itemId: m.linked_id,
                operation: m.operation
            })) || []
        }));
    },

    // Helper to calculate DRE (simulated) - In real app, this might be a Postgres function or heavy backend logic
    // This frontend/service calculation is for display.

    async cloneTemplate(sourceId: string, name: string, companyId: string): Promise<string | null> {
        const { data, error } = await supabase.rpc('clone_dre_template', {
            source_template_id: sourceId,
            new_name: name,
            p_company_id: companyId
        });

        if (error) {
            console.error('Error cloning template:', error);
            return null;
        }
        return data as string; // Returns new ID
    },

    async createTemplate(name: string, companyId: string): Promise<string | null> {
        // Find system default template to clone from
        const { data: defaultTpl } = await supabase
            .from('dre_templates')
            .select('id')
            .eq('company_id', companyId)
            .eq('is_system_default', true)
            .limit(1)
            .single();

        if (defaultTpl) {
            return this.cloneTemplate(defaultTpl.id, name, companyId);
        } else {
            // Fallback: Create empty if no default exists (shouldn't happen if initialized)
            const { data, error } = await supabase
                .from('dre_templates')
                .insert([{
                    company_id: companyId,
                    name: name,
                    structure_type: 'CUSTOM',
                    is_system_default: false
                }])
                .select()
                .single();

            if (error) return null;
            return data.id;
        }
    },

    async fetchTemplates(companyId: string): Promise<DRETemplate[]> {
        const { data, error } = await supabase
            .from('dre_templates')
            .select('*')
            .eq('company_id', companyId)
            .order('is_system_default', { ascending: false }) // System first
            .order('name', { ascending: true });

        if (error) return [];
        return data.map((t: any) => ({
            id: t.id,
            name: t.name,
            companyId: t.company_id,
            structureType: t.structure_type,
            active: t.active,
            isSystemDefault: t.is_system_default
        }));
    },
    async updateDRELine(line: DRELineItem): Promise<{ success: boolean; error?: string }> {
        const { error } = await supabase
            .from('dre_line_items')
            .update({
                name: line.name,
                type: line.type,
                order_index: line.order,
                parent_id: line.parentId
            })
            .eq('id', line.id);

        if (error) {
            console.error('Error updating DRE line:', error);
            return { success: false, error: error.message || JSON.stringify(error) };
        }
        return { success: true };
    },

    async createDRELine(line: Omit<DRELineItem, 'id'>): Promise<{ item: DRELineItem | null; error?: string }> {
        const { data, error } = await supabase
            .from('dre_line_items')
            .insert([{
                template_id: line.templateId,
                name: line.name,
                type: line.type,
                order_index: line.order,
                parent_id: line.parentId
            }])
            .select()
            .single();

        if (error) {
            console.error('Error creating DRE line:', error);
            return { item: null, error: error.message || JSON.stringify(error) };
        }

        return {
            item: {
                id: data.id,
                templateId: data.template_id,
                name: data.name,
                type: data.type,
                order: data.order_index,
                parentId: data.parent_id,
                mappings: []
            }
        };
    },

    async deleteDRELine(lineId: string): Promise<boolean> {
        const { error } = await supabase
            .from('dre_line_items')
            .delete()
            .eq('id', lineId);

        if (error) {
            console.error('Error deleting DRE line:', error);
            return false;
        }
        return true;
    },
    async updateDREMappings(lineId: string, mappings: DREMapping[]): Promise<boolean> {
        // 1. Clear existing mappings for this line
        const { error: deleteError } = await supabase
            .from('dre_mappings')
            .delete()
            .eq('line_item_id', lineId);

        if (deleteError) {
            console.error('Error deleting old mappings:', deleteError);
            return false;
        }

        if (mappings.length === 0) return true;

        // 2. Insert new mappings
        const { error: insertError } = await supabase
            .from('dre_mappings')
            .insert(mappings.map(m => ({
                line_item_id: lineId,
                linked_type: m.type,
                linked_id: m.itemId,
                operation: m.operation
            })));

        if (insertError) {
            console.error('Error inserting new mappings:', insertError);
            return false;
        }

        return true;
    },

    async deleteTemplate(templateId: string): Promise<boolean> {
        // Line items and mappings cascade delete if configured in DB, but let's be safe
        // Ideally we rely on Postgres CASCADE constraints.
        // Assuming we have ON DELETE CASCADE for templates -> lines and lines -> mappings.

        const { error } = await supabase
            .from('dre_templates')
            .delete()
            .eq('id', templateId);

        if (error) {
            console.error('Error deleting template:', error);
            return false;
        }
        return true;
    }
};
