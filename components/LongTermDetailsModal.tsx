
import React, { useState } from 'react';
import { X, CheckCircle2, Clock, AlertCircle, ArrowRight, DollarSign, PieChart, Calendar } from 'lucide-react';
import { LongTermItem, Transaction, FinancialAccount } from '../types';
import LongTermPayModal from './LongTermPayModal';

interface LongTermDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: LongTermItem;
  transactions: Transaction[];
  accounts: FinancialAccount[];
  onSettle: (data: { transactionId: string; date: string; amount: number; accountId: string; interest: number; discount: number }) => any;
}

const LongTermDetailsModal: React.FC<LongTermDetailsModalProps> = ({ 
    isOpen, onClose, item, transactions, accounts, onSettle 
}) => {
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  if (!isOpen) return null;

  // Calculate Progress
  const paidCount = transactions.filter(t => t.status === 'PAID').length;
  const totalCount = transactions.length;
  // const paidAmount = transactions.filter(t => t.status === 'PAID').reduce((acc, t) => acc + t.amount, 0); // Unused in this view but kept for ref
  const remainingAmount = transactions.filter(t => t.status !== 'PAID').reduce((acc, t) => acc + t.amount, 0);
  
  // Percentual
  const percentPaid = totalCount > 0 ? (paidCount / totalCount) * 100 : 0;

  const handlePayClick = (t: Transaction) => {
      setSelectedTransaction(t);
      setPayModalOpen(true);
  };

  const handleConfirmPay = (data: any) => {
      // onSettle returns true/false from parent (LongTermView)
      const success = onSettle(data);
      if (success) {
          setPayModalOpen(false);
          setSelectedTransaction(null);
      }
  };

  const getStatusBadge = (t: Transaction) => {
      if (t.status === 'PAID') {
          return <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600"><CheckCircle2 size={14}/> Pago</span>;
      }
      
      const today = new Date();
      today.setHours(0,0,0,0);
      const dueDate = new Date(t.date);
      
      if (dueDate < today) {
          return <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600"><AlertCircle size={14}/> Atrasado</span>;
      }
      
      return <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600"><Clock size={14}/> Pendente</span>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      {selectedTransaction && (
          <LongTermPayModal 
            isOpen={payModalOpen}
            onClose={() => setPayModalOpen(false)}
            onConfirm={handleConfirmPay}
            transaction={selectedTransaction}
            accounts={accounts}
          />
      )}

      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
        
        {/* Header Visual (Matches LongTermModal Step 1 Header) */}
        <div className="bg-indigo-600 p-6 text-white flex justify-between items-start">
           <div>
             <h3 className="text-xl font-bold flex items-center gap-2">
               <PieChart size={22}/>
               Detalhes do Contrato
             </h3>
             <p className="text-indigo-100 text-sm mt-1 opacity-90">
               {item.title} &bull; {item.provider || 'Sem fornecedor'}
             </p>
           </div>
           <button onClick={onClose} className="text-indigo-200 hover:text-white transition-colors bg-white/10 p-1.5 rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* Summary Bar (Matches LongTermModal Step 2 Summary) */}
        <div className="bg-white px-6 py-4 border-b border-gray-200 shadow-sm z-10 flex justify-between items-center">
            <div>
                <p className="text-xs text-gray-500 uppercase font-bold">Total Contratado</p>
                <p className="text-xl font-bold text-indigo-900">R$ {item.totalValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
            </div>
            <div className="text-right">
                <p className="text-xs text-gray-500 uppercase font-bold flex items-center justify-end gap-1">
                   Saldo Restante
                </p>
                <p className="text-xl font-bold text-gray-700">R$ {remainingAmount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
            </div>
        </div>

        {/* Progress Bar Thin */}
        <div className="h-1 w-full bg-gray-100">
            <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${percentPaid}%` }}></div>
        </div>

        {/* Installments List (Matches LongTermModal Table Style) */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 custom-scrollbar">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-bold">
                        <tr>
                            <th className="px-4 py-3 text-left w-16">#</th>
                            <th className="px-4 py-3 text-left">Vencimento</th>
                            <th className="px-4 py-3 text-left">Descrição</th>
                            <th className="px-4 py-3 text-right">Valor</th>
                            <th className="px-4 py-3 text-center">Status</th>
                            <th className="px-4 py-3 text-center">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {transactions.map((t, index) => (
                            <tr key={t.id} className="hover:bg-indigo-50 transition-colors">
                                <td className="px-4 py-3 text-gray-400 font-mono text-xs">{index + 1}</td>
                                <td className="px-4 py-3 text-gray-700 font-medium">
                                    {new Date(t.date).toLocaleDateString('pt-BR')}
                                </td>
                                <td className="px-4 py-3 text-gray-600 text-xs truncate max-w-[150px]" title={t.description}>
                                    {t.description}
                                    {t.description.includes('Juros') && <span className="ml-1 text-[10px] text-red-500 font-bold">(Juros)</span>}
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-medium text-gray-800">
                                    R$ {t.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    {getStatusBadge(t)}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    {t.status !== 'PAID' ? (
                                        <button 
                                            onClick={() => handlePayClick(t)}
                                            className="text-indigo-600 hover:text-white hover:bg-indigo-600 border border-indigo-200 hover:border-indigo-600 bg-white font-medium text-xs px-3 py-1 rounded transition-all flex items-center justify-center gap-1 mx-auto shadow-sm"
                                        >
                                            <DollarSign size={12}/> Baixar
                                        </button>
                                    ) : (
                                        <span className="text-gray-300">
                                            <CheckCircle2 size={18} className="mx-auto"/>
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {transactions.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500 italic">
                                    Nenhuma parcela encontrada.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            <div className="mt-4 text-center">
                <p className="text-xs text-gray-400">
                    Exibindo {transactions.length} registros vinculados.
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default LongTermDetailsModal;
