
import React, { useState, useEffect, useRef } from 'react';
import { Company, Transaction, Asset, LongTermItem, FinancialAccount, TransactionType, User, CostCenter, ChatMessage } from '../types';
import { createFinancialChatSession } from '../services/geminiService';
import { getCostCentersByCompany, getChatHistory, addChatMessage, clearChatHistory } from '../services/mockData';
import { Bot, Send, User as UserIcon, Loader2, Sparkles, AlertCircle, CheckCircle2, ArrowRight, ExternalLink, Mic, MicOff, Edit, Trash2 } from 'lucide-react';
import { Chat, Type, FunctionDeclaration, Tool } from "@google/genai";

interface FinancialAIViewProps {
  company: Company;
  transactions: Transaction[];
  assets: Asset[];
  longTermItems: LongTermItem[];
  accounts: FinancialAccount[];
  currentUser?: User;
  onNavigate: (view: string, params?: any) => void;
  onRefresh?: () => void;
}

// Add Web Speech API type definition
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

const FinancialAIView: React.FC<FinancialAIViewProps> = ({ 
    company, transactions, assets, longTermItems, accounts, onNavigate, currentUser, onRefresh 
}) => {
  // Initialize with stored history
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Fetch cost centers for context
  const costCenters = getCostCentersByCompany(company.id);

  // Load History on Mount
  useEffect(() => {
      const history = getChatHistory(company.id);
      if (history.length > 0) {
          setMessages(history);
      } else {
          // Default Welcome Message if empty
          const welcomeMsg: ChatMessage = {
              id: 'init',
              role: 'model',
              text: `Olá! Sou o FinAI. \n\nPosso ajudar a registrar transações. Tente dizer: \n_"Lançar despesa de 50 reais"_`
          };
          setMessages([welcomeMsg]);
          // Note: We don't save the initial welcome message to storage until user interacts, 
          // or we can save it now. Let's just show it.
      }
  }, [company.id]);

  // --- Voice Recognition Logic ---
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.lang = 'pt-BR';
        recognitionRef.current.interimResults = false;

        recognitionRef.current.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInputValue(prev => (prev ? prev + ' ' + transcript : transcript));
            setIsListening(false);
        };

        recognitionRef.current.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            setIsListening(false);
        };

        recognitionRef.current.onend = () => {
            setIsListening(false);
        };
    }
  }, []);

  const toggleListening = () => {
      if (isListening) {
          recognitionRef.current?.stop();
          setIsListening(false);
      } else {
          try {
            recognitionRef.current?.start();
            setIsListening(true);
          } catch (e) {
            console.error("Mic error", e);
          }
      }
  };

  // --- Tool Definitions ---
  const navigateTool: FunctionDeclaration = {
      name: 'navigate_to',
      description: 'Navega para uma tela de visualização (Dashboard, Relatórios, etc). NÃO use para criar registros.',
      parameters: {
          type: Type.OBJECT,
          properties: {
              view: {
                  type: Type.STRING,
                  enum: ['dashboard', 'transactions', 'goals', 'cost_centers', 'accounts', 'long_term', 'assets', 'reports', 'settings'],
                  description: 'A tela de destino.'
              }
          },
          required: ['view']
      }
  };

  const transactionDraftTool: FunctionDeclaration = {
      name: 'prepare_transaction_draft',
      description: 'Prepara os dados do lançamento e abre a tela de conferência para o usuário salvar.',
      parameters: {
          type: Type.OBJECT,
          properties: {
              type: {
                  type: Type.STRING,
                  enum: ['INCOME', 'EXPENSE'],
                  description: 'Tipo: Receita ou Despesa.'
              },
              description: {
                  type: Type.STRING,
                  description: 'Descrição do lançamento.'
              },
              amount: {
                  type: Type.NUMBER,
                  description: 'Valor numérico.'
              },
              category: {
                  type: Type.STRING,
                  description: 'Categoria inferida.'
              },
              status: {
                  type: Type.STRING,
                  enum: ['PAID', 'PENDING'],
                  description: 'Status do pagamento.'
              },
              costCenterName: {
                  type: Type.STRING,
                  description: 'Nome do Centro de Custo escolhido.'
              }
          },
          required: ['type', 'description', 'amount', 'status']
      }
  };

  const tools: Tool[] = [{ functionDeclarations: [navigateTool, transactionDraftTool] }];

  // --- Init Chat Session with History ---
  useEffect(() => {
      try {
          // Get current history to pass to AI
          // We only pass 'user' and 'model' roles to the AI context to avoid API errors with 'system' roles
          const history = getChatHistory(company.id);
          
          const session = createFinancialChatSession({
              companyName: company.name,
              transactions,
              assets,
              longTermItems,
              accounts,
              costCenters,
              tools,
              history: history // Pass history here
          });
          setChatSession(session);
      } catch (e) {
          console.error("Failed to init chat", e);
      }
  }, [company, transactions, assets, longTermItems, accounts, costCenters]);

  // Auto-scroll
  useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isListening]);

  // Helper to update state AND storage
  const appendMessage = (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
      addChatMessage(company.id, msg);
  };

  const handleClearHistory = () => {
      if(confirm('Tem certeza que deseja apagar todo o histórico de conversas desta empresa?')) {
          clearChatHistory(company.id);
          const welcomeMsg: ChatMessage = {
              id: 'init',
              role: 'model',
              text: `Olá! Sou o FinAI. \n\nHistórico limpo. Como posso ajudar agora?`
          };
          setMessages([welcomeMsg]);
          // Re-init session to clear context
          const session = createFinancialChatSession({
              companyName: company.name,
              transactions,
              assets,
              longTermItems,
              accounts,
              costCenters,
              tools,
              history: [] 
          });
          setChatSession(session);
      }
  };

  const handleSendMessage = async () => {
      if (!inputValue.trim() || !chatSession) return;

      const userText = inputValue;
      setInputValue(''); 
      
      const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: userText, type: 'text' };
      appendMessage(userMsg);
      setIsLoading(true);

      try {
          let result = await chatSession.sendMessage({ message: userText });
          
          while (result.functionCalls && result.functionCalls.length > 0) {
              const call = result.functionCalls[0];
              const args = call.args as any;
              let toolResult = {};

              if (call.name === 'navigate_to') {
                  const viewName = args.view;
                  onNavigate(viewName);
                  const navMsg: ChatMessage = {
                      id: Date.now().toString(),
                      role: 'system',
                      text: `Navegando para ${viewName}`,
                      type: 'navigation',
                      data: { view: viewName }
                  };
                  appendMessage(navMsg);
                  toolResult = { status: 'success', message: `Navegou para ${viewName}` };
              } 
              else if (call.name === 'prepare_transaction_draft') {
                  if (currentUser) {
                      // Resolve Cost Center ID from Name
                      let resolvedCCId = undefined;
                      if (args.costCenterName) {
                          const match = costCenters.find(cc => cc.name.toLowerCase().includes(args.costCenterName.toLowerCase()));
                          if (match) resolvedCCId = match.id;
                      }

                      // Create the draft object
                      const draftTx = {
                          companyId: company.id,
                          description: args.description,
                          amount: Number(args.amount),
                          type: args.type as TransactionType,
                          category: args.category || (args.type === 'INCOME' ? 'Vendas' : 'Outras Despesas'),
                          date: new Date().toISOString().split('T')[0],
                          status: args.status || 'PAID',
                          costCenterId: resolvedCCId,
                          accountId: accounts.length > 0 ? accounts[0].id : undefined,
                          payments: [{
                              method: 'OTHER',
                              amount: Number(args.amount),
                              date: new Date().toISOString().split('T')[0],
                              status: args.status || 'PAID'
                          }]
                      };
                      
                      // Navigate to Transaction View with the Modal Open and Data Prefilled
                      onNavigate('transactions', { openModal: true, prefillData: draftTx });

                      const draftMsg: ChatMessage = {
                          id: Date.now().toString(),
                          role: 'system',
                          text: 'Abrindo formulário para conferência...',
                          type: 'navigation',
                          data: { view: 'transactions (draft)' }
                      };
                      appendMessage(draftMsg);

                      toolResult = { status: 'success', message: 'Tela de conferência aberta com sucesso.' };
                  } else {
                      toolResult = { status: 'error', message: 'Usuário não logado.' };
                  }
              }

              // Use sendMessage to return the function response
              result = await chatSession.sendMessage({
                  message: [{
                      functionResponse: {
                          id: call.id,
                          name: call.name,
                          response: toolResult
                      }
                  }]
              });
          }

          const modelResponse = result.text;
          if (modelResponse) {
            const aiMsg: ChatMessage = { 
                id: (Date.now() + 1).toString(), 
                role: 'model', 
                text: modelResponse
            };
            appendMessage(aiMsg);
          }
      } catch (error) {
          console.error("Chat Error", error);
          
          // INTELLIGENT FALLBACK LOGIC
          const lowerText = userText.toLowerCase();
          let targetView = 'transactions';
          let targetLabel = 'Lançamentos';

          if (lowerText.includes('meta') || lowerText.includes('objetivo')) {
             targetView = 'goals'; targetLabel = 'Metas';
          } else if (lowerText.includes('ativo') || lowerText.includes('patrimonio') || lowerText.includes('bens')) {
             targetView = 'assets'; targetLabel = 'Ativos';
          } else if (lowerText.includes('relatorio') || lowerText.includes('dre') || lowerText.includes('grafico')) {
             targetView = 'reports'; targetLabel = 'Relatórios';
          } else if (lowerText.includes('conta') || lowerText.includes('banco') || lowerText.includes('saldo')) {
             targetView = 'accounts'; targetLabel = 'Contas';
          } else if (lowerText.includes('custo') || lowerText.includes('departamento')) {
             targetView = 'cost_centers'; targetLabel = 'Centros de Custo';
          } else if (lowerText.includes('contrato') || lowerText.includes('emprestimo') || lowerText.includes('longo')) {
             targetView = 'long_term'; targetLabel = 'Longo Prazo';
          }

          // Execute Redirect
          onNavigate(targetView);

          const errorMsg: ChatMessage = { 
              id: (Date.now() + 1).toString(), 
              role: 'model', 
              text: `Tive uma falha momentânea de conexão. \n\nMas entendi que você quer acessar **${targetLabel}**, então estou te levando para lá agora mesmo.` 
          };
          appendMessage(errorMsg);

          const navMsg: ChatMessage = {
              id: (Date.now() + 2).toString(),
              role: 'system',
              text: `Redirecionando para ${targetView}`,
              type: 'navigation',
              data: { view: targetView }
          };
          appendMessage(navMsg);

      } finally {
          setIsLoading(false);
      }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSendMessage();
      }
  };

  const formatMessageText = (text: string) => {
      if (!text) return { __html: '' };
      let html = text.replace(/^#{1,3}\s+(.+)$/gm, '<span class="block font-bold text-gray-900 mt-3 mb-1 text-base">$1</span>');
      html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      html = html.replace(/^[\-\*]\s+(.+)$/gm, '<div class="flex items-start gap-2 ml-1 my-1"><span class="text-gray-400 text-[10px] mt-1.5">●</span> <span>$1</span></div>');
      html = html.replace(/\n/g, '<br/>');
      return { __html: html };
  };

  const renderNavigationBadge = (data: any) => (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium border border-indigo-100 mt-1 mx-auto animate-pulse">
          <Edit size={12} />
          {data.view.includes('draft') ? 'Conferindo Lançamento...' : `Navegou para: ${data.view}`}
      </div>
  );

  return (
    <div className="flex flex-col h-full w-full bg-gray-50">
        <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-gray-200 shrink-0 lg:pl-6 pl-14">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Sparkles size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-lg text-gray-900 leading-tight">Consultor IA</h3>
                    <p className="text-gray-500 text-xs">Empresa: {company.name}</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button 
                    onClick={handleClearHistory}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-50 rounded-full transition-colors"
                    title="Limpar Histórico"
                >
                    <Trash2 size={16} />
                </button>
                <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full border border-indigo-100">
                    <Bot size={12} /> Gemini 2.5
                </div>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-[#F9FAFB] custom-scrollbar">
            {messages.map((msg) => {
                if (msg.role === 'system') {
                    return (
                        <div key={msg.id} className="flex w-full justify-center my-2">
                            {msg.type === 'navigation' ? renderNavigationBadge(msg.data) :
                             <span className="text-xs text-gray-400 italic">{msg.text}</span>
                            }
                        </div>
                    );
                }
                return (
                    <div key={msg.id} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex max-w-[85%] md:max-w-[70%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-sm border ${
                                msg.role === 'user' ? 'bg-white border-gray-200 text-gray-600' : 'bg-indigo-600 border-indigo-600 text-white'
                            }`}>
                                {msg.role === 'user' ? <UserIcon size={14} /> : <Bot size={16} />}
                            </div>
                            <div className={`p-4 rounded-2xl text-sm shadow-sm leading-relaxed ${
                                msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'
                            }`}>
                                <div dangerouslySetInnerHTML={formatMessageText(msg.text)} />
                            </div>
                        </div>
                    </div>
                );
            })}
            
            {isLoading && (
                <div className="flex w-full justify-start">
                    <div className="flex max-w-[80%] gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-1">
                            <Bot size={16} />
                        </div>
                        <div className="p-4 bg-white rounded-2xl rounded-tl-none border border-gray-200 shadow-sm flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-500">Processando...</span>
                            <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-100"></span>
                                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-200"></span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white border-t border-gray-200 shrink-0">
            {isListening && (
                <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-full text-xs font-bold animate-pulse shadow-lg flex items-center gap-2">
                    <Mic size={14}/> Ouvindo...
                </div>
            )}
            <div className="flex gap-2 relative max-w-4xl mx-auto w-full items-center">
                <button
                    onClick={toggleListening}
                    className={`p-3 rounded-xl transition-all flex items-center justify-center ${
                        isListening 
                        ? 'bg-red-100 text-red-600' 
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                    title="Falar comando"
                >
                    {isListening ? <MicOff size={20}/> : <Mic size={20}/>}
                </button>

                <div className="relative flex-1">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={isListening ? "Fale agora..." : "Digite ou fale: 'Gastei 50 no almoço'"}
                        disabled={isLoading || !chatSession}
                        className="w-full pl-4 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all disabled:opacity-60 text-gray-900 placeholder-gray-400 text-sm shadow-sm"
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={isLoading || !inputValue.trim() || !chatSession}
                        className={`absolute right-2 top-2 p-1.5 rounded-lg flex items-center justify-center transition-all ${
                            isLoading || !inputValue.trim()
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                        }`}
                    >
                        {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                </div>
            </div>
            {!process.env.API_KEY && (
                <div className="text-center mt-2">
                    <span className="text-[10px] text-red-500 flex items-center justify-center gap-1">
                        <AlertCircle size={10}/> Chave de API Gemini não detectada.
                    </span>
                </div>
            )}
        </div>
    </div>
  );
};

export default FinancialAIView;
