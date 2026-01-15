import React from 'react';
import { Lock, AlertTriangle, Phone } from 'lucide-react';

interface AccessDeniedProps {
  companyName: string;
  onBack?: () => void;
}

const AccessDenied: React.FC<AccessDeniedProps> = ({ companyName, onBack }) => {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-gray-50 p-6">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8 text-center border-t-4 border-red-500">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock size={40} className="text-red-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Suspenso</h2>
        <p className="text-gray-600 mb-6">
          A empresa <strong className="text-gray-900">{companyName}</strong> está temporariamente inativa.
          <br/>
          Todas as operações financeiras e visualizações de dados foram bloqueadas pelo administrador.
        </p>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-8 text-left flex gap-3">
          <AlertTriangle className="text-orange-500 flex-shrink-0" size={20} />
          <p className="text-sm text-orange-800">
            Se você acredita que isso é um erro ou precisa regularizar a conta, entre em contato com o suporte ou com o administrador do sistema.
          </p>
        </div>

        <div className="flex gap-4 justify-center">
           {onBack && (
            <button 
              onClick={onBack}
              className="px-6 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              Voltar para Seleção
            </button>
           )}
           <button className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2">
             <Phone size={18} />
             Contatar Suporte
           </button>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;
