import { supabase } from "./supabaseClient";
import { User, UserRole } from '../types';

export interface PendingInvite {
    id: string;
    email: string;
    role: UserRole;
    created_at: string;
    token: string;
}

export const userService = {
    // Fetch users linked to the current company
    async fetchCompanyUsers(companyId: string): Promise<User[]> {
        try {
            const { data, error } = await supabase
                .from('company_members')
                .select(`
                    user_id,
                    role,
                    profile:profiles (
                        id,
                        name,
                        email,
                        avatar_url
                    )
                `)
                .eq('company_id', companyId);

            if (error) {
                console.error('Error fetching company users:', error);
                return [];
            }

            // Map flattened structure
            return data.map((item: any) => ({
                id: item.user_id,
                name: item.profile?.name || 'Usuário Sem Nome',
                email: item.profile?.email || '',
                role: item.role as UserRole,
                linkedCompanyIds: [companyId], // Context specific
                avatar: item.profile?.avatar_url
            }));
        } catch (err) {
            console.error('Exception fetching users:', err);
            return [];
        }
    },

    // Fetch Pending Invites
    async fetchPendingInvites(companyId: string): Promise<PendingInvite[]> {
        try {
            const { data, error } = await supabase
                .from('company_invites')
                .select('*')
                .eq('company_id', companyId);

            if (error) {
                console.error('Error fetching invites:', error);
                return [];
            }
            return data as PendingInvite[];
        } catch (err) {
            return [];
        }
    },

    // Invite/Add User
    async inviteUserToCompany(email: string, role: string, companyId: string): Promise<{ success: boolean; message: string; invite_token?: string; is_new_user?: boolean }> {
        try {
            const { data, error } = await supabase
                .rpc('invite_user_to_company', {
                    _email: email,
                    _company_id: companyId,
                    _role: role
                });

            if (error) return { success: false, message: error.message };
            return {
                success: data.success,
                message: data.message,
                invite_token: data.invite_token,
                is_new_user: data.is_new_user
            };
        } catch (err: any) {
            return { success: false, message: err.message };
        }
    },

    // Cancel Invite
    async cancelInvite(inviteId: string, companyId: string): Promise<{ success: boolean; message: string }> {
        try {
            const { data, error } = await supabase
                .rpc('cancel_invite', {
                    _invite_id: inviteId,
                    _company_id: companyId
                });

            if (error) return { success: false, message: error.message };
            return { success: data.success, message: data.message };
        } catch (err: any) {
            return { success: false, message: err.message };
        }
    },

    // Update Role
    async updateUserRole(userId: string, companyId: string, newRole: string): Promise<{ success: boolean; message: string }> {
        try {
            const { data, error } = await supabase
                .rpc('update_user_role', {
                    _target_user_id: userId,
                    _company_id: companyId,
                    _new_role: newRole
                });

            if (error) return { success: false, message: error.message };
            return { success: data.success, message: data.message };
        } catch (err: any) {
            return { success: false, message: err.message };
        }
    },

    // Remove User
    async removeUserFromCompany(userId: string, companyId: string): Promise<{ success: boolean; message: string }> {
        try {
            const { data, error } = await supabase
                .rpc('remove_user_from_company', {
                    _target_user_id: userId,
                    _company_id: companyId
                });

            if (error) return { success: false, message: error.message };
            return { success: data.success, message: data.message };
        } catch (err: any) {
            return { success: false, message: err.message };
        }
    }
};
