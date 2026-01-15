
import React, { useState } from 'react';
import { X, Copy, Plus } from 'lucide-react';

interface DRETemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  isCloning: boolean;
  baseTemplateName?: string;
}

const DRETemplateModal: React.FC<DRETemplateModalProps> = ({ isOpen, onClose, onSave, isCloning, baseTemplateName }) => {
  const [name, setName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name);
    setName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            {isCloning ? <Copy size={20} className="text-indigo-600"/> : <Plus size={20} className="text-green-600"/>}
            {isCloning ? 'Duplicar Modelo' : 'Novo Modelo DRE'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {isCloning && baseTemplateName && (
             <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-xs text-indigo-700 mb-2">
                Você está criando uma cópia editável baseada em: <b>{baseTemplateName}</b>
             </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">Nome do Novo Modelo *</label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: DRE Gerencial 2024 - Customizado"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-white text-black"
            />
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
              className="flex-1 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              {isCloning ? 'Criar Cópia' : 'Criar Modelo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DRETemplateModal;
