import { supabase } from './supabaseClient';
import { Company, PlanType, User } from '../types';

export const companyService = {
    // Fetch companies that the current user is a member of
    // Uses the RLS policy: "Users can view companies they belong to"
    async fetchCompanies(): Promise<Company[] | null> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const { data, error } = await supabase
                .from('companies')
                .select('*, company_members(user_id, role)')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching companies:', error.message);
                return null;
            }

            // Filter and Map
            const companies: Company[] = [];

            for (const c of data) {
                const membership = c.company_members?.find((m: any) => m.user_id === user.id);

                const role = membership?.role;

                // REVOCATION LOGIC:
                // We permit access if: 
                // 1. Role is OWNER
                // 2. User is the Creator (created_by)
                // 3. Token exists AND is not empty (for external consultants)
                const isOwner = role === 'OWNER';
                const isCreator = c.created_by === user.id;
                const hasValidToken = c.api_token && c.api_token.trim().length > 0;

                if (isOwner || isCreator || hasValidToken) {
                    companies.push({
                        ...c,
                        primaryColor: c.primary_color,
                        createdAt: c.created_at,
                        createdBy: c.created_by,
                        apiToken: c.api_token,
                        apiTokenDescription: c.api_token_description,
                        serviceType: c.service_type
                    });
                }
            }

            return companies;
        } catch (err: any) {
            console.error('Exception fetching companies:', err);
            return null;
        }
    },

    async getCompanyById(id: string): Promise<Company | null> {
        try {
            const { data, error } = await supabase
                .from('companies')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            if (!data) return null;

            return {
                ...data,
                primaryColor: data.primary_color,
                createdAt: data.created_at,
                apiToken: data.api_token,
                apiTokenDescription: data.api_token_description,
                serviceType: data.service_type
            };
        } catch (err) {
            console.error(`Error fetching company ${id}:`, err);
            return null;
        }
    },

    async ensureCurrentUserProfile(): Promise<void> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Check if profile exists
            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', user.id)
                .single();

            if (!profile) {
                // Create profile if missing
                console.log('Profile missing for user, creating...');
                const { error } = await supabase
                    .from('profiles')
                    .insert([{
                        id: user.id,
                        email: user.email,
                        name: user.user_metadata.name || user.email?.split('@')[0] || 'User',
                        role: 'ADMIN' // Default role for creators
                    }]);

                if (error) console.error('Error creating missing profile:', error);
            }
        } catch (err) {
            console.error('Error ensuring profile:', err);
        }
    },
    async createCompany(companyData: Partial<Company>): Promise<{ data: Company | null; error: string | null; isExisting?: boolean }> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { data: null, error: 'User not authenticated' };

            // 0. Sanitize CNPJ
            const cleanCnpj = companyData.cnpj ? companyData.cnpj.replace(/\D/g, '') : '';
            if (!cleanCnpj) return { data: null, error: 'CNPJ é obrigatório.' };

            // 1. Check if Company Exists (Check-then-Link Mode)
            const { data: existingCompanies, error: checkError } = await supabase
                .rpc('get_company_by_cnpj', { p_cnpj: cleanCnpj });

            if (checkError) {
                console.error('Error checking CNPJ:', checkError);
                // Fallback: Proceed to try create (unique constraint will catch if it was a false negative, effectively double check)
            }

            if (existingCompanies && existingCompanies.length > 0) {
                const existingComp = existingCompanies[0];
                // COMPANY EXISTS -> JOIN IT
                console.log('Company exists, joining:', existingComp.name);

                const { error: joinError } = await supabase
                    .rpc('join_existing_company', { company_id: existingComp.id });

                if (joinError) {
                    return { data: null, error: 'Erro ao vincular-se à empresa existente: ' + joinError.message };
                }

                // Fetch full details to return
                // We can't reuse `existingComp` because it's partial from the RPC.
                return await this.getCompanyById(existingComp.id).then(comp => ({
                    data: comp,
                    error: null,
                    isExisting: true // Signal to frontend
                }));
            }

            // 2. Not found or Check failed -> Create New
            const dbPayload: any = {
                name: companyData.name,
                cnpj: cleanCnpj, // Save Clean
                plan: companyData.plan || 'FREE',
                active: true,
                primary_color: companyData.primaryColor || '#4f46e5',
                created_by: user.id
            };

            if (companyData.phone) dbPayload.phone = companyData.phone;
            if (companyData.address) dbPayload.address = companyData.address;
            if (companyData.logo) dbPayload.logo = companyData.logo;
            if (companyData.serviceType) dbPayload.service_type = companyData.serviceType;

            const { data, error } = await supabase
                .from('companies')
                .insert(dbPayload)
                .select()
                .single();

            if (error) {
                // Double check Constraint violation just in case race condition
                if (error.code === '23505') { // Postgres Unique Violation
                    return { data: null, error: 'Esta empresa já está cadastrada (CNPJ). Tente novamente para se vincular.' };
                }
                console.error('Error creating company:', error.message);
                return { data: null, error: error.message };
            }

            const mappedCompany: Company = {
                ...data,
                primaryColor: data.primary_color,
                createdAt: data.created_at,
                createdBy: data.created_by,
                apiToken: data.api_token,
                apiTokenDescription: data.api_token_description,
                serviceType: data.service_type
            };

            return { data: mappedCompany, error: null, isExisting: false };
        } catch (err: any) {
            console.error('Exception creating company:', err);
            return { data: null, error: err.message || 'Unknown error' };
        }
    },


    async updateCompany(id: string, updates: Partial<Company>): Promise<boolean> {
        try {
            // Map updates to snake_case
            const dbUpdates: any = {};
            if (updates.name) dbUpdates.name = updates.name;
            if (updates.cnpj) dbUpdates.cnpj = updates.cnpj;
            if (updates.plan) dbUpdates.plan = updates.plan;
            if (updates.active !== undefined) dbUpdates.active = updates.active;
            if (updates.primaryColor) dbUpdates.primary_color = updates.primaryColor;
            if (updates.phone) dbUpdates.phone = updates.phone;
            if (updates.address) dbUpdates.address = updates.address;
            if (updates.logo) dbUpdates.logo = updates.logo;
            if (updates.apiToken !== undefined) dbUpdates.api_token = updates.apiToken; // Allow clearing
            if (updates.apiTokenDescription !== undefined) dbUpdates.api_token_description = updates.apiTokenDescription;
            if (updates.serviceType) dbUpdates.service_type = updates.serviceType;

            const { error } = await supabase
                .from('companies')
                .update(dbUpdates)
                .eq('id', id);

            if (error) {
                console.error('Error updating company:', error.message);
                return false;
            }
            return true;
        } catch (err: any) {
            console.error('Exception updating company:', err);
            return false;
        }
    },

    async importCompany(token: string): Promise<{ success: boolean; message: string }> {
        try {
            const { data, error } = await supabase
                .rpc('join_company_via_token', { _token: token });

            if (error) {
                console.error('RPC Error importing company:', error);
                return { success: false, message: 'Erro ao processar importação.' };
            }

            // data is returned as JSON object from the function
            // Explicitly cast or access properties
            return {
                success: data?.success || false,
                message: data?.message || 'Resposta inválida do servidor.'
            };

        } catch (err: any) {
            console.error('Exception importing company:', err);
            return { success: false, message: 'Erro interno ao processar solicitação.' };
        }
    },

    async leaveCompany(companyId: string): Promise<{ success: boolean; message: string }> {
        try {
            const { data, error } = await supabase
                .rpc('leave_company', { _company_id: companyId });

            if (error) {
                console.error('RPC Error leaving company:', error);
                return { success: false, message: error.message };
            }

            return {
                success: data?.success || false,
                message: data?.message || 'Erro desconhecido ao sair da empresa.'
            };
        } catch (err: any) {
            console.error('Exception leaving company:', err);
            return { success: false, message: 'Erro interno: ' + err.message };
        }
    },

    // Delete company (Cascade will handle members)
    async deleteCompany(id: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('companies')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Error deleting company:', error.message);
                return false;
            }
            return true;
        } catch (err: any) {
            console.error('Exception deleting company:', err);
            return false;
        }
    }
};
