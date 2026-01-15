
import React, { useState, useEffect } from 'react';
import { X, ChevronRight, Lock } from 'lucide-react';
import { AccountPlanItem } from '../types';

interface AccountPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: AccountPlanItem | null;
  allAccounts: AccountPlanItem[];
}

const AccountPlanModal: React.FC<AccountPlanModalProps> = ({ isOpen, onClose, onSave, initialData, allAccounts }) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [type, setType] = useState('ASSET');
  const [nature, setNature] = useState('DEBIT');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState(true); // true = ACTIVE, false = INACTIVE

  const isReadOnly = initialData?.isSystemDefault;

  // Filter possible parents (cannot be itself)
  const availableParents = allAccounts.filter(a => !initialData || a.id !== initialData.id);

  useEffect(() => {
    if (isOpen && initialData) {
      setCode(initialData.code);
      setName(initialData.name);
      setParentId(initialData.parentId || '');
      setType(initialData.type);
      setNature(initialData.nature);
      setDescription(initialData.description || '');
      setStatus(initialData.status === 'ACTIVE');
    } else if (isOpen) {
      setCode('');
      setName('');
      setParentId('');
      setType('ASSET');
      setNature('DEBIT');
      setDescription('');
      setStatus(true);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!code || !name) return;

    onSave({
      code,
      name,
      parentId: parentId || null,
      type,
      nature,
      description,
      status: status ? 'ACTIVE' : 'INACTIVE'
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            {isReadOnly && <Lock size={20} className="text-gray-400"/>}
            {initialData ? (isReadOnly ? 'Detalhes da Conta (Padrão)' : 'Editar Conta') : 'Nova Conta'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {isReadOnly && (
             <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700 mb-4">
                Esta conta faz parte do plano padrão do sistema e não pode ser modificada. Você pode criar novas subcontas vinculadas a ela.
             </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Código *</label>
              <input
                type="text"
                required
                disabled={!!isReadOnly}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ex: 1.1.1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-gray-400 disabled:bg-gray-100 disabled:text-gray-500 bg-white text-black"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Conta Pai</label>
              <select
                value={parentId}
                disabled={!!isReadOnly}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-black disabled:bg-gray-100 disabled:text-gray-500"
              >
                <option value="">Nenhuma (Conta Principal)</option>
                {availableParents.sort((a,b) => a.code.localeCompare(b.code)).map(item => (
                  <option key={item.id} value={item.id}>
                    {item.code} - {item.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">Nome da Conta *</label>
            <input
              type="text"
              required
              disabled={!!isReadOnly}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Caixa, Bancos, Fornecedores..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-gray-400 disabled:bg-gray-100 disabled:text-gray-500 bg-white text-black"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Tipo *</label>
              <select
                value={type}
                disabled={!!isReadOnly}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-black disabled:bg-gray-100 disabled:text-gray-500"
              >
                <option value="ASSET">Ativo</option>
                <option value="LIABILITY">Passivo</option>
                <option value="EQUITY">Patrimônio Líquido</option>
                <option value="REVENUE">Receita</option>
                <option value="EXPENSE">Despesa</option>
                <option value="COST">Custo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Natureza *</label>
              <select
                value={nature}
                disabled={!!isReadOnly}
                onChange={(e) => setNature(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-black disabled:bg-gray-100 disabled:text-gray-500"
              >
                <option value="DEBIT">Devedora</option>
                <option value="CREDIT">Credora</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">Descrição</label>
            <textarea
              rows={3}
              value={description}
              disabled={!!isReadOnly}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição opcional da conta..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-gray-400 resize-none disabled:bg-gray-100 disabled:text-gray-500 bg-white text-black"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
             <label className="font-semibold text-gray-800 text-sm">Conta Ativa</label>
             <button
               type="button"
               disabled={!!isReadOnly}
               onClick={() => setStatus(!status)}
               className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                 status ? 'bg-gray-900' : 'bg-gray-200'
               } ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
             >
               <span
                 className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                   status ? 'translate-x-6' : 'translate-x-1'
                 }`}
               />
             </button>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              {isReadOnly ? 'Fechar' : 'Cancelar'}
            </button>
            {!isReadOnly && (
              <button
                type="submit"
                className="flex-1 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                {initialData ? 'Salvar Alterações' : 'Criar'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccountPlanModal;
