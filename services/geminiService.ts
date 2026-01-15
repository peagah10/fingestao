import { GoogleGenAI, Chat, Tool, Content } from "@google/genai";
import {
  Transaction,
  TransactionType,
  Asset,
  LongTermItem,
  FinancialAccount,
  CostCenter,
  ChatMessage,
} from "../types";

// Pega a API key do ambiente Vite
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  throw new Error(
    "VITE_GEMINI_API_KEY não está definida. Configure no arquivo .env e nas variáveis da Vercel."
  );
}

// Inicializa o client da API
const ai = new GoogleGenAI({ apiKey });

// --- Existing Analysis Function ---
export const analyzeFinancials = async (
  transactions: Transaction[],
  companyName: string
): Promise<string> => {
  // (este if vira só uma mensagem amigável, mas na prática o throw acima já impede uso sem chave)
  if (!apiKey) {
    return "API Key not configured. Please add your Gemini API Key.";
  }

  const income = transactions
    .filter((t) => t.type === TransactionType.INCOME)
    .reduce((acc, t) => acc + t.amount, 0);
  const expense = transactions
    .filter((t) => t.type === TransactionType.EXPENSE)
    .reduce((acc, t) => acc + t.amount, 0);
  const balance = income - expense;

  const summary = `
    Company: ${companyName}
    Total Income: R$ ${income.toFixed(2)}
    Total Expense: R$ ${expense.toFixed(2)}
    Net Result: R$ ${balance.toFixed(2)}
    Recent Transactions: ${JSON.stringify(
      transactions.slice(0, 5).map((t) => ({
        d: t.description,
        a: t.amount,
        t: t.type,
      }))
    )}
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
      model: "gemini-3-flash-preview",
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
  history?: ChatMessage[];
}

export const createFinancialChatSession = (context: FinancialContext): Chat => {
  const totalBalance = context.accounts.reduce(
    (sum, acc) => sum + acc.balance,
    0
  );

  const sortedTxs = [...context.transactions]
    .sort(
      (a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    .slice(0, 50);

  const txSummary = sortedTxs
    .map(
      (t) =>
        `- ${t.date}: ${t.description} | ${
          t.type === "INCOME" ? "+" : "-"
        }R$${t.amount.toFixed(2)} | Cat: ${t.category}`
    )
    .join("\n");

  const activeCCs = context.costCenters
    .filter((cc) => cc.status === "ACTIVE")
    .map((cc) => cc.name)
    .join(", ");

  let historyContent: Content[] = [];
  if (context.history) {
    historyContent = context.history
      .filter((msg) => msg.role === "user" || msg.role === "model")
      .map((msg) => ({
        role: msg.role as "user" | "model",
        parts: [{ text: msg.text }],
      }));
  }

  const systemInstruction = `
    Você é o FinAI, o assistente financeiro inteligente da empresa "${context.companyName}".

    ... (resto do texto igual ao seu, pode manter)
  `;

  return ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction,
      temperature: 0.2,
      tools: context.tools,
    },
    history: historyContent,
  });
};
