
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { DRELineItem, DRELineType } from '../types';

interface DRELineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: DRELineItem | null;
  availableParents: DRELineItem[];
}

const DRELineModal: React.FC<DRELineModalProps> = ({ isOpen, onClose, onSave, initialData, availableParents }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<DRELineType>('EXPENSE');
  const [parentId, setParentId] = useState<string>('');
  
  // Filter parents: only groups can be parents, and a line cannot be its own parent
  const validParents = availableParents.filter(
    p => p.type === 'GROUP' && (!initialData || p.id !== initialData.id)
  );

  useEffect(() => {
    if (isOpen && initialData) {
      setName(initialData.name);
      setType(initialData.type);
      setParentId(initialData.parentId || '');
    } else if (isOpen) {
      setName('');
      setType('EXPENSE');
      setParentId('');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    onSave({
      name,
      type,
      parentId: parentId || null
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-900">
            {initialData ? 'Editar Linha' : 'Nova Linha'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">Nome da Linha *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: (-) Despesas com Marketing"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">Tipo *</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as DRELineType)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
            >
              <option value="REVENUE">Receita</option>
              <option value="DEDUCTION">Dedução</option>
              <option value="COST">Custo</option>
              <option value="EXPENSE">Despesa</option>
              <option value="TAX">Imposto</option>
              <option value="SUBTOTAL">Subtotal</option>
              <option value="GROUP">Grupo</option>
              <option value="RESULT">Resultado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">Grupo Pai (opcional)</label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
            >
              <option value="">Nenhum</option>
              {validParents.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <span className="text-lg">💾</span> Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DRELineModal;
