// services/geminiService.ts
// Versão sem integração com Gemini: nenhuma chamada externa é feita.

import {
  Transaction,
  TransactionType,
  Asset,
  LongTermItem,
  FinancialAccount,
  CostCenter,
  ChatMessage,
} from "../types";

// --- Análise financeira "manual", sem IA ---

export const analyzeFinancials = async (
  transactions: Transaction[],
  companyName: string
): Promise<string> => {
  const income = transactions
    .filter((t) => t.type === TransactionType.INCOME)
    .reduce((acc, t) => acc + t.amount, 0);

  const expense = transactions
    .filter((t) => t.type === TransactionType.EXPENSE)
    .reduce((acc, t) => acc + t.amount, 0);

  const balance = income - expense;

  return `
### Análise Financeira Básica - ${companyName}

- **Receitas totais:** R$ ${income.toFixed(2)}
- **Despesas totais:** R$ ${expense.toFixed(2)}
- **Resultado líquido:** R$ ${balance.toFixed(2)}

*(Análise automática via IA está desativada nesta versão.)*
  `;
};

// --- Chat "fake" apenas para não quebrar a UI ---

interface FinancialContext {
  companyName: string;
  transactions: Transaction[];
  assets: Asset[];
  longTermItems: LongTermItem[];
  accounts: FinancialAccount[];
  costCenters: CostCenter[];
  tools?: unknown[];
  history?: ChatMessage[];
}

// Tipo simples para substituir o Chat da Gemini
export interface SimpleChat {
  history: ChatMessage[];
  sendMessage: (text: string) => Promise<ChatMessage>;
}

export const createFinancialChatSession = (
  context: FinancialContext
): SimpleChat => {
  const welcome: ChatMessage = {
    role: "model",
    text:
      "O chat com IA está desativado nesta versão. " +
      "Você ainda pode usar todas as funções financeiras normalmente.",
  };

  return {
    history: [welcome],
    async sendMessage(text: string): Promise<ChatMessage> {
      return {
        role: "model",
        text:
          "O chat com IA está desativado nesta versão. " +
          "Mensagem do usuário: " +
          text,
      };
    },
  };
};
