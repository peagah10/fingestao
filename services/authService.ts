
import { supabase } from './supabaseClient';
import { User, UserRole } from '../types';

// Helper to map Supabase Profile + Company Members to App User
const mapSupabaseUser = async (authUser: any): Promise<User | null> => {
    if (!authUser) return null;

    // 1. Definição de valores padrão baseados nos metadados de autenticação
    // Isso garante que temos um usuário válido mesmo sem acesso ao banco de dados SQL
    let role = (authUser.user_metadata?.role as UserRole) || UserRole.ADMIN; // Fallback to ADMIN for first user/dev
    let name = authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Usuário';
    let avatar = authUser.user_metadata?.avatar_url;
    let linkedIds: string[] = [];

    // 2. Tentar enriquecer com dados do banco (Tabelas profiles e company_members)
    try {
        // Busca Perfil
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .maybeSingle();

        if (!profileError && profile) {
            role = profile.role || role;
            name = profile.name || name;
            avatar = profile.avatar_url || avatar;
        } else if (profileError) {
            // Apenas loga o erro, não impede o fluxo
            console.warn("Aviso: Não foi possível carregar tabela 'profiles'. Usando dados da sessão.", profileError.message);
        }

        // Busca Empresas Vinculadas
        const { data: members, error: memberError } = await supabase
            .from('company_members')
            .select('company_id')
            .eq('user_id', authUser.id);

        if (!memberError && members && members.length > 0) {
            linkedIds = members.map((m: any) => m.company_id);
        } else if (memberError) {
             console.warn("Aviso: Não foi possível carregar tabela 'company_members'.", memberError.message);
        }

    } catch (error) {
        // Catch-all para erros de rede ou schema crítico
        console.error("Erro não obstrutivo ao mapear usuário:", error);
    }

    // 3. Retorna o objeto User montado (com dados do DB ou Fallbacks)
    return {
        id: authUser.id,
        email: authUser.email || '',
        name: name,
        role: role as UserRole,
        linkedCompanyIds: linkedIds, // Se vazio, o App.tsx vai mostrar o seletor ou criar empresa
        permissions: [], 
        avatar: avatar
    };
};

export const authService = {
    async signIn(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                console.error("Supabase login error:", error.message);
                
                let friendlyError = 'Erro ao realizar login.';
                
                if (error.message.includes('Invalid login credentials')) {
                    friendlyError = 'Email ou senha incorretos.';
                } else if (error.message.includes('Email not confirmed')) {
                    friendlyError = 'Email não confirmado. Verifique sua caixa de entrada.';
                } else if (error.message.includes('Too many requests')) {
                    friendlyError = 'Muitas tentativas. Tente novamente mais tarde.';
                }

                return { user: null, error: friendlyError };
            }

            if (data.user) {
                // Tenta mapear. Mesmo se falhar o DB, mapSupabaseUser retorna o usuário básico.
                const appUser = await mapSupabaseUser(data.user);
                
                if (!appUser) {
                    return { user: null, error: 'Erro crítico: Usuário autenticado mas sem dados de sessão.' };
                }
                
                return { user: appUser, error: null };
            }
            
            return { user: null, error: 'Erro desconhecido ao obter sessão.' };
        } catch (err: any) {
            console.error("Auth Exception:", err);
            return { user: null, error: 'Falha na conexão. Verifique sua internet.' };
        }
    },

    async signUp(email: string, password: string, userData: { name: string; role: UserRole }): Promise<{ user: User | null; error: string | null }> {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name: userData.name,
                        role: userData.role
                    }
                }
            });

            if (error) {
                console.error("Sign up error:", error.message);
                return { user: null, error: error.message };
            }

            if (data.user) {
                const appUser = await mapSupabaseUser(data.user);
                return { user: appUser, error: null };
            }

            return { user: null, error: 'Verifique seu email para confirmar o cadastro.' };

        } catch (err: any) {
            console.error("Sign Up Exception:", err);
            return { user: null, error: 'Erro ao realizar cadastro.' };
        }
    },

    async signOut() {
        await supabase.auth.signOut();
    },

    async getCurrentSessionUser(): Promise<User | null> {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) {
                console.warn("No active session found:", error.message);
                return null;
            }
            if (session?.user) {
                return await mapSupabaseUser(session.user);
            }
        } catch (e) {
            console.error("Session check exception", e);
        }
        return null;
    }
};
