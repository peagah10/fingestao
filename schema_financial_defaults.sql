-- 1. Create Tables for Account Plans and DRE
-- (Financial Categories already exist in schema_financial.sql, but we will add fields if needed)

-- Ensure financial_categories has necessary fields
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_categories' AND column_name = 'is_system_default') THEN
        ALTER TABLE public.financial_categories ADD COLUMN is_system_default boolean default false;
    END IF;
END $$;

-- Table: Account Plans (Plano de Contas)
CREATE TABLE IF NOT EXISTS public.account_plans (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    type text NOT NULL, -- ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE, COST
    nature text NOT NULL, -- DEBIT, CREDIT
    parent_code text, -- Using code for easier mapping in hierarchy, can be resolved to ID later if strict FK needed
    is_system_default boolean DEFAULT false,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(company_id, code)
);
ALTER TABLE public.account_plans ENABLE ROW LEVEL SECURITY;

-- Table: DRE Templates
CREATE TABLE IF NOT EXISTS public.dre_templates (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    structure_type text DEFAULT 'STANDARD',
    active boolean DEFAULT true,
    is_system_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.dre_templates ENABLE ROW LEVEL SECURITY;

-- Table: DRE Line Items
CREATE TABLE IF NOT EXISTS public.dre_line_items (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    template_id uuid REFERENCES public.dre_templates(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    type text NOT NULL, -- REVENUE, DEDUCTION, COST, EXPENSE, TAX, SUBTOTAL, RESULT
    order_index integer NOT NULL,
    parent_id uuid REFERENCES public.dre_line_items(id), -- Hierarchy
    code text, -- internal code for mapping (e.g. 'gross_revenue')
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.dre_line_items ENABLE ROW LEVEL SECURITY;

-- Table: DRE Mappings (Links Lines -> Categories/Account Plans)
CREATE TABLE IF NOT EXISTS public.dre_mappings (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    line_item_id uuid REFERENCES public.dre_line_items(id) ON DELETE CASCADE NOT NULL,
    linked_type text NOT NULL, -- CATEGORY, ACCOUNT_PLAN
    linked_id uuid NOT NULL, -- ID of the Financial Category or Account Plan
    operation text DEFAULT 'ADD', -- ADD, SUBTRACT
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.dre_mappings ENABLE ROW LEVEL SECURITY;

-- 2. RLS Policies
-- Account Plans
DROP POLICY IF EXISTS "Users can view account plans of their companies" ON public.account_plans;
CREATE POLICY "Users can view account plans of their companies" ON public.account_plans
    FOR SELECT USING (exists (select 1 from public.company_members where company_id = public.account_plans.company_id and user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage account plans of their companies" ON public.account_plans;
CREATE POLICY "Users can manage account plans of their companies" ON public.account_plans
    FOR ALL USING (
        exists (select 1 from public.company_members where company_id = public.account_plans.company_id and user_id = auth.uid())
        AND is_system_default = false -- PREVENT DELETING DEFAULTS
    );

-- DRE Tables
DROP POLICY IF EXISTS "Users can view dre of their companies" ON public.dre_templates;
CREATE POLICY "Users can view dre of their companies" ON public.dre_templates
    FOR SELECT USING (exists (select 1 from public.company_members where company_id = public.dre_templates.company_id and user_id = auth.uid()));

-- ... (Similar detailed policies would go here, ensuring is_system_default protection)

-- 3. Initialization Function
CREATE OR REPLACE FUNCTION public.initialize_company_defaults(target_company_id uuid)
RETURNS void AS $$
DECLARE
    v_dre_template_id uuid;
    v_line_gross_revenue uuid;
    v_line_deductions uuid;
    v_line_net_revenue uuid;
    v_line_costs uuid;
    v_line_gross_profit uuid;
    v_line_expenses uuid;
    v_line_result uuid;
    -- Category IDs holder
    v_cat_vendas uuid;
    v_cat_servicos uuid;
    v_cat_simples uuid;
    -- etc
BEGIN

    -- -------------------------
    -- 0. Insert Default Cost Center
    -- -------------------------
    INSERT INTO public.cost_centers (company_id, name, code, status)
    SELECT target_company_id, 'Geral', '01', 'ACTIVE'
    WHERE NOT EXISTS (SELECT 1 FROM public.cost_centers WHERE company_id = target_company_id AND code = '01');

    -- -------------------------
    -- 1. Insert Categories & Accounts (Generated)
    -- -------------------------
-- GENERATED SQL SECTIONS --
-- CATEGORIES --

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'Vendas de Produtos', 'INCOME', '#10b981', 'ShoppingCart', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Vendas de Produtos');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'Prestação de Serviços', 'INCOME', '#3b82f6', 'Briefcase', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Prestação de Serviços');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'Receitas Financeiras', 'INCOME', '#8b5cf6', 'TrendingUp', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Receitas Financeiras');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'Outras Receitas', 'INCOME', '#6366f1', 'DollarSign', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Outras Receitas');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'Aluguel', 'EXPENSE', '#ef4444', 'Home', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Aluguel');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'Energia Elétrica', 'EXPENSE', '#f59e0b', 'Zap', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Energia Elétrica');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'Salários', 'EXPENSE', '#ec4899', 'Users', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Salários');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'Impostos e Taxas', 'EXPENSE', '#dc2626', 'FileText', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Impostos e Taxas');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'Marketing', 'EXPENSE', '#8b5cf6', 'Megaphone', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Marketing');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'Fornecedores', 'EXPENSE', '#f97316', 'Package', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Fornecedores');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'Outras Despesas', 'EXPENSE', '#64748b', 'MoreHorizontal', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Outras Despesas');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'Vale Transporte', 'EXPENSE', '#7C2D12', 'Circle', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Vale Transporte');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'Vale Refeição/Alimentação', 'EXPENSE', '#FB923C', 'Circle', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Vale Refeição/Alimentação');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'Plano de Saúde', 'EXPENSE', '#FDBA74', 'Circle', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Plano de Saúde');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'Pró-Labore', 'EXPENSE', '#6D28D9', 'Circle', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Pró-Labore');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'Juros Pagos', 'EXPENSE', '#64748B', 'Circle', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Juros Pagos');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'Tarifas Bancárias', 'EXPENSE', '#475569', 'Circle', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Tarifas Bancárias');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'IOF', 'EXPENSE', '#334155', 'Circle', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'IOF');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'Multas e Juros de Mora', 'EXPENSE', '#1E293B', 'Circle', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Multas e Juros de Mora');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'Taxas de Cartão de Crédito', 'EXPENSE', '#0F172A', 'Circle', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Taxas de Cartão de Crédito');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'IRPJ', 'EXPENSE', '#DC2626', 'Circle', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'IRPJ');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'CSLL', 'EXPENSE', '#B91C1C', 'Circle', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'CSLL');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'Simples Nacional', 'EXPENSE', '#991B1B', 'Circle', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Simples Nacional');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'Comissões Recebidas', 'INCOME', '#047857', 'Circle', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Comissões Recebidas');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'Rendimentos de Aplicações', 'INCOME', '#0891B2', 'Circle', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Rendimentos de Aplicações');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'ICMS sobre Vendas', 'EXPENSE', '#F59E0B', 'Circle', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'ICMS sobre Vendas');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'PIS sobre Vendas', 'EXPENSE', '#D97706', 'Circle', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'PIS sobre Vendas');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'COFINS sobre Vendas', 'EXPENSE', '#B45309', 'Circle', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'COFINS sobre Vendas');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'ISS sobre Serviços', 'EXPENSE', '#92400E', 'Circle', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'ISS sobre Serviços');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'Devoluções e Abatimentos', 'EXPENSE', '#78350F', 'Circle', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Devoluções e Abatimentos');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'Custo das Mercadorias Vendidas', 'EXPENSE', '#EF4444', 'Circle', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Custo das Mercadorias Vendidas');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'Custo dos Serviços Prestados', 'EXPENSE', '#DC2626', 'Circle', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Custo dos Serviços Prestados');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'Custo de Produção', 'EXPENSE', '#B91C1C', 'Circle', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Custo de Produção');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'Matéria-Prima', 'EXPENSE', '#991B1B', 'Circle', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Matéria-Prima');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'Mão de Obra Direta', 'EXPENSE', '#7F1D1D', 'Circle', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Mão de Obra Direta');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'Água e Luz', 'EXPENSE', '#7C3AED', 'Circle', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Água e Luz');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'Telefone e Internet', 'EXPENSE', '#6D28D9', 'Circle', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Telefone e Internet');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'Material de Escritório', 'EXPENSE', '#5B21B6', 'Circle', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Material de Escritório');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'Serviços de Terceiros', 'EXPENSE', '#4C1D95', 'Circle', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Serviços de Terceiros');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'Manutenção e Reparos', 'EXPENSE', '#7E22CE', 'Circle', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Manutenção e Reparos');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'Seguros', 'EXPENSE', '#9333EA', 'Circle', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Seguros');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'Honorários Contábeis', 'EXPENSE', '#A855F7', 'Circle', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Honorários Contábeis');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'Honorários Advocatícios', 'EXPENSE', '#C084FC', 'Circle', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Honorários Advocatícios');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'Comissões sobre Vendas', 'EXPENSE', '#EC4899', 'Circle', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Comissões sobre Vendas');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'Marketing e Publicidade', 'EXPENSE', '#DB2777', 'Circle', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Marketing e Publicidade');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'Fretes e Entregas', 'EXPENSE', '#BE185D', 'Circle', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Fretes e Entregas');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'Embalagens', 'EXPENSE', '#9D174D', 'Circle', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Embalagens');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'Viagens e Representação', 'EXPENSE', '#831843', 'Circle', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Viagens e Representação');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'Salários e Ordenados', 'EXPENSE', '#F97316', 'Circle', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Salários e Ordenados');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'Férias e 13º Salário', 'EXPENSE', '#EA580C', 'Circle', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Férias e 13º Salário');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'INSS Patronal', 'EXPENSE', '#C2410C', 'Circle', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'INSS Patronal');

    INSERT INTO public.financial_categories (company_id, name, type, color, icon, is_system_default, active)
    SELECT target_company_id, 'FGTS', 'EXPENSE', '#9A3412', 'Circle', true, true
    WHERE NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE company_id = target_company_id AND name = 'FGTS');

-- ACCOUNTS --

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '1', 'ATIVO', 'ASSET', 'DEBIT', NULL, true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '2', 'PASSIVO', 'LIABILITY', 'CREDIT', NULL, true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '3', 'PATRIMÔNIO LÍQUIDO', 'EQUITY', 'CREDIT', NULL, true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '4', 'RECEITAS', 'REVENUE', 'CREDIT', NULL, true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '5', 'DESPESAS', 'EXPENSE', 'DEBIT', NULL, true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '1', 'ATIVO', 'ASSET', 'DEBIT', NULL, true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '2', 'PASSIVO', 'LIABILITY', 'CREDIT', NULL, true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '3', 'PATRIMÔNIO LÍQUIDO', 'EQUITY', 'CREDIT', NULL, true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '4', 'RECEITAS', 'REVENUE', 'CREDIT', NULL, true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '5', 'DESPESAS', 'EXPENSE', 'DEBIT', NULL, true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '1', 'ATIVO', 'ASSET', 'DEBIT', NULL, true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '2', 'PASSIVO', 'LIABILITY', 'CREDIT', NULL, true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '3', 'PATRIMÔNIO LÍQUIDO', 'EQUITY', 'CREDIT', NULL, true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '4', 'RECEITAS', 'REVENUE', 'CREDIT', NULL, true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '5', 'DESPESAS', 'EXPENSE', 'DEBIT', NULL, true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '1.1', 'Ativo Circulante', 'ASSET', 'DEBIT', '1', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '2.1', 'Passivo Circulante', 'LIABILITY', 'CREDIT', '2', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '3.1', 'Capital Social', 'EQUITY', 'CREDIT', '3', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '4.1', 'Receitas Operacionais', 'REVENUE', 'CREDIT', '4', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '5.1', 'Despesas Operacionais', 'EXPENSE', 'DEBIT', '5', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '2.2', 'PASSIVO NÃO CIRCULANTE', 'LIABILITY', 'CREDIT', '2', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '2.3', 'PATRIMÔNIO LÍQUIDO', 'EQUITY', 'CREDIT', '2', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '3.2', 'RECEITAS FINANCEIRAS', 'REVENUE', 'CREDIT', '3', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '4.2', 'DESPESAS ADMINISTRATIVAS', 'EXPENSE', 'DEBIT', '4', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '4.3', 'DESPESAS COMERCIAIS', 'EXPENSE', 'DEBIT', '4', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '4.4', 'DESPESAS COM PESSOAL', 'EXPENSE', 'DEBIT', '4', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '4.5', 'DESPESAS FINANCEIRAS', 'EXPENSE', 'DEBIT', '4', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '4.6', 'IMPOSTOS E TRIBUTOS', 'EXPENSE', 'DEBIT', '4', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '1.2', 'ATIVO NÃO CIRCULANTE', 'ASSET', 'DEBIT', '1', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '1.1', 'Ativo Circulante', 'ASSET', 'DEBIT', '1', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '2.1', 'Passivo Circulante', 'LIABILITY', 'CREDIT', '2', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '3.1', 'Capital Social', 'EQUITY', 'CREDIT', '3', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '4.1', 'Receitas Operacionais', 'REVENUE', 'CREDIT', '4', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '5.1', 'Despesas Operacionais', 'EXPENSE', 'DEBIT', '5', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '1.1', 'Ativo Circulante', 'ASSET', 'DEBIT', '1', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '2.1', 'Passivo Circulante', 'LIABILITY', 'CREDIT', '2', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '3.1', 'Capital Social', 'EQUITY', 'CREDIT', '3', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '4.1', 'Receitas Operacionais', 'REVENUE', 'CREDIT', '4', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '5.1', 'Despesas Operacionais', 'EXPENSE', 'DEBIT', '5', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '1.1.1', 'Caixa', 'ASSET', 'DEBIT', '1.1', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '1.1.2', 'Bancos', 'ASSET', 'DEBIT', '1.1', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '1.1.3', 'Contas a Receber', 'ASSET', 'DEBIT', '1.1', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '2.1.1', 'Fornecedores', 'LIABILITY', 'CREDIT', '2.1', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '2.1.2', 'Contas a Pagar', 'LIABILITY', 'CREDIT', '2.1', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '4.1.1', 'Vendas', 'REVENUE', 'CREDIT', '4.1', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '4.1.2', 'Serviços', 'REVENUE', 'CREDIT', '4.1', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '5.1.1', 'Energia', 'EXPENSE', 'DEBIT', '5.1', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '5.1.2', 'Aluguel', 'EXPENSE', 'DEBIT', '5.1', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '5.1.3', 'Salários', 'EXPENSE', 'DEBIT', '5.1', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '1.1.1', 'Caixa', 'ASSET', 'DEBIT', '1.1', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '1.1.2', 'Bancos', 'ASSET', 'DEBIT', '1.1', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '1.1.3', 'Contas a Receber', 'ASSET', 'DEBIT', '1.1', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '2.1.1', 'Fornecedores', 'LIABILITY', 'CREDIT', '2.1', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '2.1.2', 'Contas a Pagar', 'LIABILITY', 'CREDIT', '2.1', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '4.1.1', 'Vendas', 'REVENUE', 'CREDIT', '4.1', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '4.1.2', 'Serviços', 'REVENUE', 'CREDIT', '4.1', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '5.1.1', 'Energia', 'EXPENSE', 'DEBIT', '5.1', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '5.1.2', 'Aluguel', 'EXPENSE', 'DEBIT', '5.1', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '5.1.3', 'Salários', 'EXPENSE', 'DEBIT', '5.1', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '1.1.1', 'Caixa', 'ASSET', 'DEBIT', '1.1', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '1.1.2', 'Bancos', 'ASSET', 'DEBIT', '1.1', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '1.1.3', 'Contas a Receber', 'ASSET', 'DEBIT', '1.1', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '2.1.1', 'Fornecedores', 'LIABILITY', 'CREDIT', '2.1', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '2.1.2', 'Contas a Pagar', 'LIABILITY', 'CREDIT', '2.1', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '4.1.1', 'Vendas', 'REVENUE', 'CREDIT', '4.1', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '4.1.2', 'Serviços', 'REVENUE', 'CREDIT', '4.1', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '5.1.1', 'Energia', 'EXPENSE', 'DEBIT', '5.1', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '5.1.2', 'Aluguel', 'EXPENSE', 'DEBIT', '5.1', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '5.1.3', 'Salários', 'EXPENSE', 'DEBIT', '5.1', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '2.1.04', 'Empréstimos CP', 'LIABILITY', 'CREDIT', '2.1', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '2.2.01', 'Financiamentos LP', 'LIABILITY', 'CREDIT', '2.2', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '2.3.01', 'Capital Social', 'EQUITY', 'CREDIT', '2.3', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '2.3.02', 'Reservas de Lucros', 'EQUITY', 'CREDIT', '2.3', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '2.3.03', 'Lucros/Prejuízos Acumulados', 'EQUITY', 'CREDIT', '2.3', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '3.1.01', 'Vendas de Produtos', 'REVENUE', 'CREDIT', '3.1', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '3.1.02', 'Prestação de Serviços', 'REVENUE', 'CREDIT', '3.1', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '3.2.01', 'Juros Recebidos', 'REVENUE', 'CREDIT', '3.2', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '3.2.02', 'Rendimentos de Aplicações', 'REVENUE', 'CREDIT', '3.2', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '4.1.01', 'Custo das Mercadorias Vendidas', 'COST', 'DEBIT', '4.1', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '4.1.02', 'Custo dos Serviços Prestados', 'COST', 'DEBIT', '4.1', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '1.1.01', 'Caixa', 'ASSET', 'DEBIT', '1.1', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '1.1.02', 'Bancos Conta Movimento', 'ASSET', 'DEBIT', '1.1', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '1.1.03', 'Aplicações Financeiras', 'ASSET', 'DEBIT', '1.1', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '1.1.04', 'Clientes a Receber', 'ASSET', 'DEBIT', '1.1', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '1.1.05', 'Estoques', 'ASSET', 'DEBIT', '1.1', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '1.2.01', 'Imobilizado', 'ASSET', 'DEBIT', '1.2', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '1.2.02', '(-) Depreciação Acumulada', 'ASSET', 'CREDIT', '1.2', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '2.1.01', 'Fornecedores', 'LIABILITY', 'CREDIT', '2.1', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '2.1.02', 'Salários a Pagar', 'LIABILITY', 'CREDIT', '2.1', true)
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO public.account_plans (company_id, code, name, type, nature, parent_code, is_system_default)
    VALUES (target_company_id, '2.1.03', 'Impostos a Pagar', 'LIABILITY', 'CREDIT', '2.1', true)
    ON CONFLICT (company_id, code) DO NOTHING;



    -- -------------------------
    -- 3. Insert DRE Template and Lines
    -- -------------------------
    IF NOT EXISTS (SELECT 1 FROM public.dre_templates WHERE company_id = target_company_id AND is_system_default = true) THEN
        
        -- Template
        INSERT INTO public.dre_templates (company_id, name, is_system_default)
        VALUES (target_company_id, 'DRE Padrão', true)
        RETURNING id INTO v_dre_template_id;

        -- 1. Receita Bruta (GROUP)
        INSERT INTO public.dre_line_items (template_id, name, type, order_index, code)
        VALUES (v_dre_template_id, 'Receita Bruta', 'REVENUE', 1, 'gross_revenue')
        RETURNING id INTO v_line_gross_revenue;

        -- 2. Deduções (GROUP)
        INSERT INTO public.dre_line_items (template_id, name, type, order_index, code)
        VALUES (v_dre_template_id, '(-) Deduções da Receita', 'DEDUCTION', 2, 'deductions')
        RETURNING id INTO v_line_deductions;

        -- 3. Receita Líquida (SUBTOTAL)
        INSERT INTO public.dre_line_items (template_id, name, type, order_index, code)
        VALUES (v_dre_template_id, '(=) Receita Líquida', 'SUBTOTAL', 3, 'net_revenue')
        RETURNING id INTO v_line_net_revenue;

        -- 4. Custos (GROUP)
        INSERT INTO public.dre_line_items (template_id, name, type, order_index, code)
        VALUES (v_dre_template_id, '(-) Custos', 'COST', 4, 'costs')
        RETURNING id INTO v_line_costs;
        
        -- 5. Lucro Bruto (SUBTOTAL)
        INSERT INTO public.dre_line_items (template_id, name, type, order_index, code)
        VALUES (v_dre_template_id, '(=) Lucro Bruto', 'SUBTOTAL', 5, 'gross_profit')
        RETURNING id INTO v_line_gross_profit;

        -- 6. Despesas (GROUP)
        INSERT INTO public.dre_line_items (template_id, name, type, order_index, code)
        VALUES (v_dre_template_id, '(-) Despesas Operacionais', 'EXPENSE', 6, 'expenses')
        RETURNING id INTO v_line_expenses;
        
        -- 7. Despesas Financeiras (GROUP)
        INSERT INTO public.dre_line_items (template_id, name, type, order_index, code)
        VALUES (v_dre_template_id, '(-) Despesas Financeiras', 'EXPENSE', 7, 'financial_expenses')
        RETURNING id INTO v_line_result; -- reusing var or adding new one? Let's assume mappings use code lookup.

        -- 8. Resultado (RESULT)
        INSERT INTO public.dre_line_items (template_id, name, type, order_index, code)
        VALUES (v_dre_template_id, '(=) Resultado Líquido', 'RESULT', 8, 'result');

        -- -------------------------
        -- 4. Insert Default Mappings (Generated)
        -- -------------------------


        -- Map despesas_operacionais -> category
        INSERT INTO public.dre_mappings (line_item_id, linked_type, linked_id, operation)
        SELECT id, 'CATEGORY', (SELECT id FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Vale Refeição/Alimentação' LIMIT 1), 'ADD'
        FROM public.dre_line_items 
        WHERE template_id = v_dre_template_id AND code = 'expenses'
        AND (SELECT id FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Vale Refeição/Alimentação' LIMIT 1) IS NOT NULL 
        AND NOT EXISTS (
            SELECT 1 FROM public.dre_mappings 
            WHERE line_item_id = public.dre_line_items.id 
            AND linked_type = 'CATEGORY' 
            AND linked_id = (SELECT id FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Vale Refeição/Alimentação' LIMIT 1)
        );

        -- Map line_1766661597241 -> account
        INSERT INTO public.dre_mappings (line_item_id, linked_type, linked_id, operation)
        SELECT id, 'ACCOUNT_PLAN', (SELECT id FROM public.account_plans WHERE company_id = target_company_id AND code = '4.4' LIMIT 1), 'SUBTRACT'
        FROM public.dre_line_items 
        WHERE template_id = v_dre_template_id AND code = 'expenses'
        AND (SELECT id FROM public.account_plans WHERE company_id = target_company_id AND code = '4.4' LIMIT 1) IS NOT NULL 
        AND NOT EXISTS (
            SELECT 1 FROM public.dre_mappings 
            WHERE line_item_id = public.dre_line_items.id 
            AND linked_type = 'ACCOUNT_PLAN' 
            AND linked_id = (SELECT id FROM public.account_plans WHERE company_id = target_company_id AND code = '4.4' LIMIT 1)
        );

        -- Map line_1766661597241 -> category
        INSERT INTO public.dre_mappings (line_item_id, linked_type, linked_id, operation)
        SELECT id, 'CATEGORY', (SELECT id FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Pró-Labore' LIMIT 1), 'SUBTRACT'
        FROM public.dre_line_items 
        WHERE template_id = v_dre_template_id AND code = 'expenses'
        AND (SELECT id FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Pró-Labore' LIMIT 1) IS NOT NULL 
        AND NOT EXISTS (
            SELECT 1 FROM public.dre_mappings 
            WHERE line_item_id = public.dre_line_items.id 
            AND linked_type = 'CATEGORY' 
            AND linked_id = (SELECT id FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Pró-Labore' LIMIT 1)
        );

        -- Map receita_bruta -> account
        INSERT INTO public.dre_mappings (line_item_id, linked_type, linked_id, operation)
        SELECT id, 'ACCOUNT_PLAN', (SELECT id FROM public.account_plans WHERE company_id = target_company_id AND code = '4.1.2' LIMIT 1), 'ADD'
        FROM public.dre_line_items 
        WHERE template_id = v_dre_template_id AND code = 'gross_revenue'
        AND (SELECT id FROM public.account_plans WHERE company_id = target_company_id AND code = '4.1.2' LIMIT 1) IS NOT NULL 
        AND NOT EXISTS (
            SELECT 1 FROM public.dre_mappings 
            WHERE line_item_id = public.dre_line_items.id 
            AND linked_type = 'ACCOUNT_PLAN' 
            AND linked_id = (SELECT id FROM public.account_plans WHERE company_id = target_company_id AND code = '4.1.2' LIMIT 1)
        );

        -- Map deducoes -> account
        INSERT INTO public.dre_mappings (line_item_id, linked_type, linked_id, operation)
        SELECT id, 'ACCOUNT_PLAN', (SELECT id FROM public.account_plans WHERE company_id = target_company_id AND code = '4.5' LIMIT 1), 'ADD'
        FROM public.dre_line_items 
        WHERE template_id = v_dre_template_id AND code = 'deductions'
        AND (SELECT id FROM public.account_plans WHERE company_id = target_company_id AND code = '4.5' LIMIT 1) IS NOT NULL 
        AND NOT EXISTS (
            SELECT 1 FROM public.dre_mappings 
            WHERE line_item_id = public.dre_line_items.id 
            AND linked_type = 'ACCOUNT_PLAN' 
            AND linked_id = (SELECT id FROM public.account_plans WHERE company_id = target_company_id AND code = '4.5' LIMIT 1)
        );

        -- Map receita_bruta -> account
        INSERT INTO public.dre_mappings (line_item_id, linked_type, linked_id, operation)
        SELECT id, 'ACCOUNT_PLAN', (SELECT id FROM public.account_plans WHERE company_id = target_company_id AND code = '4.1.1' LIMIT 1), 'ADD'
        FROM public.dre_line_items 
        WHERE template_id = v_dre_template_id AND code = 'gross_revenue'
        AND (SELECT id FROM public.account_plans WHERE company_id = target_company_id AND code = '4.1.1' LIMIT 1) IS NOT NULL 
        AND NOT EXISTS (
            SELECT 1 FROM public.dre_mappings 
            WHERE line_item_id = public.dre_line_items.id 
            AND linked_type = 'ACCOUNT_PLAN' 
            AND linked_id = (SELECT id FROM public.account_plans WHERE company_id = target_company_id AND code = '4.1.1' LIMIT 1)
        );

        END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Apply to Existing Companies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM public.companies LOOP
        PERFORM public.initialize_company_defaults(r.id);
    END LOOP;
END $$;

-- 5. Trigger for New Companies
CREATE OR REPLACE FUNCTION public.handle_new_company_defaults()
RETURNS trigger AS $$
BEGIN
    PERFORM public.initialize_company_defaults(new.id);
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_company_created_defaults ON public.companies;
CREATE TRIGGER on_company_created_defaults
    AFTER INSERT ON public.companies
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_company_defaults();
