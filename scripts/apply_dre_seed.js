
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

async function main() {
    // 1. Load Env
    const envPath = path.resolve(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) {
        console.error('.env not found');
        return;
    }
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const envVars = {};
    envContent.split('\n').forEach(line => {
        const [key, val] = line.split('=');
        if (key && val) envVars[key.trim()] = val.trim();
    });

    const url = envVars['VITE_SUPABASE_URL'];
    const key = envVars['VITE_SUPABASE_ANON_KEY'];

    if (!url || !key) {
        console.error('Missing credentials in .env');
        return;
    }

    const supabase = createClient(url, key);
    console.log('Connected to Supabase.');

    // 2. Read SQL File
    // Note: The SQL file path needs to be absolute or relative to CWD.
    // I know the artifact path: C:\Users\Felipe Goes\.gemini\antigravity\brain\f838349a-b9a5-4b30-a3b3-98d1a2cd61d0\seed_standard_dre_v2.sql
    // But I can't easily access that from the script context if permissions deny outside workspace?
    // Actually, I can use the tool to read it, but the script runs in the user's Node environment. 
    // I will embed the SQL content directly in this script to be safe and self-contained.

    const sqlContent = `
    -- Function to Seed the EXACT Standard DRE Structure requested
    CREATE OR REPLACE FUNCTION public.seed_standard_dre_v2(target_company_id uuid)
    RETURNS void AS $$
    DECLARE
        v_template_id uuid;
        -- Line IDs
        v_l_receita uuid;
        v_l_deducoes uuid;
        v_l_rec_liq uuid;
        v_l_custo uuid;
        v_l_lucro_bruto uuid;
        v_l_desp_op uuid;
        v_l_res_op uuid;
        v_l_res_fin uuid;
        v_l_res_antes_ir uuid;
        v_l_prov_ir uuid;
        v_l_lucro_liq uuid;
        -- Child Line IDs
        v_l_prolabore uuid;
        
        -- Category/Account IDs (lookup vars)
        v_cat_vendas_prod uuid;
        v_cat_vale uuid;
        v_cat_prolabore uuid;
        v_acc_servicos uuid;
        v_acc_vendas uuid;
        v_acc_desp_fin uuid;
        v_acc_desp_pessoal uuid;
    BEGIN
        -- 1. Get or Create "DRE Padrão" Template
        SELECT id INTO v_template_id FROM public.dre_templates 
        WHERE company_id = target_company_id AND is_system_default = true LIMIT 1;

        IF v_template_id IS NULL THEN
            INSERT INTO public.dre_templates (company_id, name, structure_type, is_system_default, active)
            VALUES (target_company_id, 'DRE Padrão', 'STANDARD', true, true)
            RETURNING id INTO v_template_id;
        ELSE
            -- Wipe existing lines for this template to ensure clean state
            DELETE FROM public.dre_line_items WHERE template_id = v_template_id;
        END IF;

        -- 2. Create Lines (Order 1..11)
        
        -- 1. RECEITA BRUTA DE VENDAS (receita)
        INSERT INTO public.dre_line_items (template_id, name, type, order_index, code)
        VALUES (v_template_id, 'RECEITA BRUTA DE VENDAS', 'REVENUE', 1, 'gross_revenue')
        RETURNING id INTO v_l_receita;

        -- 2. (-) Deduções da Receita (deducao)
        INSERT INTO public.dre_line_items (template_id, name, type, order_index, code)
        VALUES (v_template_id, '(-) Deduções da Receita', 'DEDUCTION', 2, 'deductions')
        RETURNING id INTO v_l_deducoes;

        -- 3. (=) RECEITA LÍQUIDA (subtotal)
        INSERT INTO public.dre_line_items (template_id, name, type, order_index, code)
        VALUES (v_template_id, '(=) RECEITA LÍQUIDA', 'SUBTOTAL', 3, 'net_revenue')
        RETURNING id INTO v_l_rec_liq;

        -- 4. (-) Custo das Mercadorias/Serviços (custo)
        INSERT INTO public.dre_line_items (template_id, name, type, order_index, code)
        VALUES (v_template_id, '(-) Custo das Mercadorias/Serviços', 'COST', 4, 'cogs')
        RETURNING id INTO v_l_custo;

        -- 5. (=) LUCRO BRUTO (subtotal)
        INSERT INTO public.dre_line_items (template_id, name, type, order_index, code)
        VALUES (v_template_id, '(=) LUCRO BRUTO', 'SUBTOTAL', 5, 'gross_profit')
        RETURNING id INTO v_l_lucro_bruto;

        -- 6. > DESPESAS OPERACIONAIS (grupo)
        INSERT INTO public.dre_line_items (template_id, name, type, order_index, code)
        VALUES (v_template_id, 'DESPESAS OPERACIONAIS', 'GROUP', 6, 'operating_expenses')
        RETURNING id INTO v_l_desp_op;

            -- 6.1 (-) Prolabore (Child of Desp. Op) - Inferred from screenshot 5 context
            INSERT INTO public.dre_line_items (template_id, name, type, order_index, parent_id, code)
            VALUES (v_template_id, '(-) Prolabore', 'EXPENSE', 1, v_l_desp_op, 'prolabore')
            RETURNING id INTO v_l_prolabore;

        -- 7. (=) RESULTADO OPERACIONAL (subtotal)
        INSERT INTO public.dre_line_items (template_id, name, type, order_index, code)
        VALUES (v_template_id, '(=) RESULTADO OPERACIONAL', 'SUBTOTAL', 7, 'operating_result')
        RETURNING id INTO v_l_res_op;

        -- 8. > RESULTADO FINANCEIRO (grupo)
        INSERT INTO public.dre_line_items (template_id, name, type, order_index, code)
        VALUES (v_template_id, 'RESULTADO FINANCEIRO', 'GROUP', 8, 'financial_result')
        RETURNING id INTO v_l_res_fin;

        -- 9. (=) RESULTADO ANTES DO IR (subtotal)
        INSERT INTO public.dre_line_items (template_id, name, type, order_index, code)
        VALUES (v_template_id, '(=) RESULTADO ANTES DO IR', 'SUBTOTAL', 9, 'pre_tax_result')
        RETURNING id INTO v_l_res_antes_ir;

        -- 10. (-) Provisão IR/CSLL (imposto)
        INSERT INTO public.dre_line_items (template_id, name, type, order_index, code)
        VALUES (v_template_id, '(-) Provisão IR/CSLL', 'TAX', 10, 'taxes')
        RETURNING id INTO v_l_prov_ir;

        -- 11. (=) LUCRO/PREJUÍZO LÍQUIDO (total)
        INSERT INTO public.dre_line_items (template_id, name, type, order_index, code)
        VALUES (v_template_id, '(=) LUCRO/PREJUÍZO LÍQUIDO', 'RESULT', 11, 'net_income')
        RETURNING id INTO v_l_lucro_liq;


        -- 3. Mappings
        
        -- Lookup Categories/Accounts (Assuming they exist from standard seed)
        SELECT id INTO v_cat_vendas_prod FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Vendas de Produtos' LIMIT 1;
        SELECT id INTO v_cat_vale FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Vale Refeição/Alimentação' LIMIT 1;
        SELECT id INTO v_cat_prolabore FROM public.financial_categories WHERE company_id = target_company_id AND name = 'Pró-Labore' LIMIT 1;
        
        SELECT id INTO v_acc_servicos FROM public.account_plans WHERE company_id = target_company_id AND (name ILIKE '%Serviços%' OR code = '4.1.2') LIMIT 1;
        SELECT id INTO v_acc_vendas FROM public.account_plans WHERE company_id = target_company_id AND (name ILIKE '%Vendas%' OR code = '4.1.1') LIMIT 1;
        SELECT id INTO v_acc_desp_fin FROM public.account_plans WHERE company_id = target_company_id AND (name ILIKE '%DESPESAS FINANCEIRAS%' OR code = '4.5') LIMIT 1;
        SELECT id INTO v_acc_desp_pessoal FROM public.account_plans WHERE company_id = target_company_id AND (name ILIKE '%DESPESAS COM PESSOAL%' OR code = '4.4') LIMIT 1;


        -- Map 1: Receita Bruta
        IF v_l_receita IS NOT NULL THEN
            -- Link Account: Serviços (+)
            IF v_acc_servicos IS NOT NULL THEN
                INSERT INTO public.dre_mappings (line_item_id, linked_type, linked_id, operation) VALUES (v_l_receita, 'ACCOUNT_PLAN', v_acc_servicos, 'ADD');
            END IF;
            -- Link Account: Vendas (+)
            IF v_acc_vendas IS NOT NULL THEN
                INSERT INTO public.dre_mappings (line_item_id, linked_type, linked_id, operation) VALUES (v_l_receita, 'ACCOUNT_PLAN', v_acc_vendas, 'ADD');
            END IF;
            -- Link Category: Vendas de Produtos (+)
            IF v_cat_vendas_prod IS NOT NULL THEN
                INSERT INTO public.dre_mappings (line_item_id, linked_type, linked_id, operation) VALUES (v_l_receita, 'CATEGORY', v_cat_vendas_prod, 'ADD');
            END IF;
        END IF;

        -- Map 2: Deduções (Mapped to Despesas Financeiras as per screenshot - weird logic but following screenshot)
        IF v_l_deducoes IS NOT NULL AND v_acc_desp_fin IS NOT NULL THEN
            INSERT INTO public.dre_mappings (line_item_id, linked_type, linked_id, operation) VALUES (v_l_deducoes, 'ACCOUNT_PLAN', v_acc_desp_fin, 'ADD'); 
        END IF;

        -- Map 6: Despesas Operacionais (Group) - Mapped to Vale Refeição
        IF v_l_desp_op IS NOT NULL AND v_cat_vale IS NOT NULL THEN
            INSERT INTO public.dre_mappings (line_item_id, linked_type, linked_id, operation) VALUES (v_l_desp_op, 'CATEGORY', v_cat_vale, 'ADD');
        END IF;

        -- Map 6.1: Prolabore (Child)
        IF v_l_prolabore IS NOT NULL THEN
            -- Account: Despesas com Pessoal (-)
            IF v_acc_desp_pessoal IS NOT NULL THEN
                INSERT INTO public.dre_mappings (line_item_id, linked_type, linked_id, operation) VALUES (v_l_prolabore, 'ACCOUNT_PLAN', v_acc_desp_pessoal, 'SUBTRACT');
            END IF;
            -- Category: Pró-Labore (-)
            IF v_cat_prolabore IS NOT NULL THEN
                INSERT INTO public.dre_mappings (line_item_id, linked_type, linked_id, operation) VALUES (v_l_prolabore, 'CATEGORY', v_cat_prolabore, 'SUBTRACT');
            END IF;
        END IF;

    END;
    $$ LANGUAGE plpgsql;
    `;

    // 3. Define Function
    console.log('Creating SQL function...');
    const { error: funcError } = await supabase.rpc('exec_sql', { sql_query: sqlContent });
    // IMPORTANT: Assuming 'exec_sql' exists or we can run raw SQL. 
    // Supabase JS client doesn't run raw SQL easily on the 'client' side without a specific RPC/Function exposed or using the Service Role key (which we don't have, we have anon).
    // HOWEVER! The user has access to Supabase SQL Editor.
    // AND I previously saw 'dre_functions.sql' creating functions. This implies I might have created a helper or I need to create one?
    // Wait, the user might NOT have 'exec_sql' rpc exposed.
    // I should check if I can run '.rpc'. I will try to create the function using an existing method if possible.
    // Actually, I can't run DDL via the JS client unless I have a specific RPC.
    // But I DO have `force_reinit` script earlier which was SQL?
    // The previous steps (step 699) showed `dre_functions.sql` artifact.
    // The previous steps also showed `generated_sql.py`.

    // **Strategy Change**:
    // I cannot run DDL (CREATE FUNCTION) from the JS client with just the ANON key usually, unless RLS is open or I have a helper.
    // Use the `notify_user` to ask them to run the SQL? The user asked "quero um modelo...".
    // I already created `seed_standard_dre_v2.sql` artifact.
    // I will instruct the user to run it.
    // BUT! I can try to run the *data insertion* part via JS calls directly if I want to be proactive.
    // No, it's too complex (nested IDs).

    // Let's create a *helper* script that prints the instructions clearly or...
    // I see the user just said "continuar".
    // I will try to update the `task.md` and then Notify User with the SQL file to run.

    // WAIT. I can't run `create_dre_tables.sql` from JS either. The user had to do it.
    // So for `seed_standard_dre_v2`, they likely have to run it too.
    // UNLESS I have an admin client? No.
    // I will clean up this script creation attempt and just notify the user.
    // actually, I'll delete the file I was about to create and just output the text to the user artifact.
    // Oh, I haven't called the tool yet. I will skip creating this JS script.

    // I will Create the SQL file (already done).
    // I will Update task.md.
    // I will Notify User.

    return;
}
main();
