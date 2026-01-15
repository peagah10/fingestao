
import { GoogleGenAI, Chat, Tool, Content } from "@google/genai";
import { Transaction, TransactionType, Asset, LongTermItem, FinancialAccount, CostCenter, ChatMessage } from "../types";

// Initialize the API client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Existing Analysis Function ---
export const analyzeFinancials = async (transactions: Transaction[], companyName: string): Promise<string> => {
  if (!process.env.API_KEY) return "API Key not configured. Please add your Gemini API Key.";

  const income = transactions.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0);
  const expense = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + t.amount, 0);
  const balance = income - expense;

  const summary = `
    Company: ${companyName}
    Total Income: R$ ${income.toFixed(2)}
    Total Expense: R$ ${expense.toFixed(2)}
    Net Result: R$ ${balance.toFixed(2)}
    Recent Transactions: ${JSON.stringify(transactions.slice(0, 5).map(t => ({ d: t.description, a: t.amount, t: t.type })))}
  `;

  const prompt = `
    Atue como um Consultor Financeiro Sênior de alto nível (CFO).
    Analise os dados financeiros resumidos abaixo da empresa "${companyName}".
    
    Dados:
    ${summary}

    Forneça:
    1. Um breve diagnóstico da saúde financeira (1 parágrafo).
    2. Duas recomendações táticas para melhorar o caixa.
    3. Um alerta de risco se houver.
    
    Use formatação Markdown simples. Seja direto e profissional.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Não foi possível gerar a análise no momento.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Erro ao conectar com a inteligência artificial. Verifique sua chave de API.";
  }
};

// --- New Chat Functionality ---

interface FinancialContext {
    companyName: string;
    transactions: Transaction[];
    assets: Asset[];
    longTermItems: LongTermItem[];
    accounts: FinancialAccount[];
    costCenters: CostCenter[];
    tools?: Tool[];
    history?: ChatMessage[]; // Added history prop
}

export const createFinancialChatSession = (context: FinancialContext): Chat => {
    // 1. Summarize Financials
    const totalBalance = context.accounts.reduce((sum, acc) => sum + acc.balance, 0);
    
    // 2. Prepare Transactions (Last 50 for context window efficiency)
    const sortedTxs = [...context.transactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 50);
    const txSummary = sortedTxs.map(t => 
        `- ${t.date}: ${t.description} | ${t.type === 'INCOME' ? '+' : '-'}R$${t.amount.toFixed(2)} | Cat: ${t.category}`
    ).join('\n');

    // 3. Prepare Cost Centers
    const activeCCs = context.costCenters.filter(cc => cc.status === 'ACTIVE').map(cc => cc.name).join(', ');

    // 4. Format History for Gemini SDK
    // Filter out 'system' messages and convert to Content objects
    let historyContent: Content[] = [];
    if (context.history) {
        historyContent = context.history
            .filter(msg => msg.role === 'user' || msg.role === 'model')
            .map(msg => ({
                role: msg.role as 'user' | 'model',
                parts: [{ text: msg.text }]
            }));
    }

    const systemInstruction = `
        Você é o FinAI, o assistente financeiro inteligente da empresa "${context.companyName}".
        
        **OBJETIVO:** Coletar informações completas para lançamentos financeiros e encaminhar o usuário para a tela de conferência.

        **DADOS ATUAIS:**
        - Saldo Bancário: R$ ${totalBalance.toFixed(2)}
        - Centros de Custo Disponíveis: [${activeCCs || 'Nenhum'}]
        - Histórico recente:
        ${txSummary}

        **SUAS HABILIDADES (TOOLS):**
        1. \`prepare_transaction_draft\`: Use APÓS coletar todos os dados necessários. Leva o usuário para a tela de confirmação.
        2. \`navigate_to\`: Apenas para visualizar dashboards.

        **DIRETRIZES DE INTERAÇÃO (MEMÓRIA E COLETA):**

        1. **REGISTRO DE DESPESAS (Obrigatório Coletar):**
           - Valor
           - Descrição
           - Categoria (Infira se possível)
           - **Centro de Custo** (Pergunte sempre se houver opções disponíveis: ${activeCCs})
           - **Status de Pagamento** (Pergunte: "Já foi pago ou está pendente?")

        2. **REGISTRO DE RECEITAS:**
           - Valor, Descrição, Categoria, Status (Recebido/Pendente).

        3. **FLUXO DA CONVERSA:**
           - **Passo 1:** Usuário diz "Gastei 50 no Uber".
           - **Passo 2:** Você analisa. Tem o valor? Sim. Descrição? Sim. Categoria? Sim (Transporte). Centro de Custo? NÃO. Status? NÃO.
           - **Passo 3:** PERGUNTE O QUE FALTA. "Entendido. Para qual centro de custo devo alocar? (Opções: ${activeCCs}). E essa despesa já foi paga?"
           - **Passo 4:** Usuário responde.
           - **Passo 5:** Você confirma os dados mentalmente e chama a tool \`prepare_transaction_draft\` preenchida. Diga: "Certo! Abrindo a tela de lançamento para você conferir e salvar."

        4. **EXECUÇÃO:**
           - Não invente dados. Se o usuário não disser o centro de custo mesmo após perguntar, deixe em branco.
           - Sempre mapeie o nome do centro de custo escolhido para o campo \`costCenterName\`.

        5. **TOM DE VOZ:**
           - Profissional, direto e prestativo.
           - Responda sempre em Português do Brasil.
    `;

    return ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
            systemInstruction: systemInstruction,
            temperature: 0.2, // Low temp for precision in data collection
            tools: context.tools,
        },
        history: historyContent // Pass history here
    });
};
