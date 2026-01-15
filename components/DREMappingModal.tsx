

import React, { useState, useEffect } from 'react';
import { X, Trash2, Plus, ArrowRight } from 'lucide-react';
import { DRELineItem, DREMapping, FinancialCategory, AccountPlanItem } from '../types';

interface DREMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (lineId: string, newMappings: DREMapping[]) => void;
  lineItem: DRELineItem | null;
  categories: FinancialCategory[];
  accounts: AccountPlanItem[];
  readOnly?: boolean;
}

const DREMappingModal: React.FC<DREMappingModalProps> = ({ isOpen, onClose, onUpdate, lineItem, categories, accounts, readOnly = false }) => {
  const [currentMappings, setCurrentMappings] = useState<DREMapping[]>([]);

  // New Mapping State
  const [newType, setNewType] = useState<'CATEGORY' | 'ACCOUNT'>('CATEGORY');
  const [newItemId, setNewItemId] = useState('');
  const [newOperation, setNewOperation] = useState<'ADD' | 'SUBTRACT'>('ADD');

  useEffect(() => {
    if (isOpen && lineItem) {
      setCurrentMappings(lineItem.mappings || []);
      setNewType('CATEGORY');
      setNewItemId('');
      setNewOperation('ADD');
    }
  }, [isOpen, lineItem]);

  if (!isOpen || !lineItem) return null;

  const handleAddMapping = () => {
    if (readOnly) return;
    if (!newItemId) return;

    // Check if already mapped
    if (currentMappings.some(m => m.itemId === newItemId && m.type === newType)) {
      alert('Este item já está mapeado nesta linha.');
      return;
    }

    const newMapping: DREMapping = {
      id: Math.random().toString(36).substr(2, 9),
      type: newType,
      itemId: newItemId,
      operation: newOperation
    };

    const updated = [...currentMappings, newMapping];
    setCurrentMappings(updated);
    onUpdate(lineItem.id, updated);

    setNewItemId('');
  };

  const handleRemoveMapping = (mappingId: string) => {
    if (readOnly) return;
    const updated = currentMappings.filter(m => m.id !== mappingId);
    setCurrentMappings(updated);
    onUpdate(lineItem.id, updated);
  };

  const getItemName = (mapping: DREMapping) => {
    if (mapping.type === 'CATEGORY') {
      return categories.find(c => c.id === mapping.itemId)?.name || 'Categoria Removida';
    }
    return accounts.find(a => a.id === mapping.itemId)?.name || 'Conta Removida';
  };

  const getFilteredItems = () => {
    if (newType === 'CATEGORY') {
      return categories;
    }
    return accounts;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Mapeamento: <span className="text-indigo-600">{lineItem.name}</span>
            </h3>
            {readOnly && <span className="text-xs text-orange-500 font-medium bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100 mt-1 inline-block">Modo Visualização (Somente Leitura)</span>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* List of existing mappings */}
          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-3">Mapeamentos Atuais</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {currentMappings.length === 0 && (
                <p className="text-sm text-gray-400 italic">Nenhum item mapeado.</p>
              )}
              {currentMappings.map(mapping => (
                <div key={mapping.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded border ${mapping.type === 'CATEGORY' ? 'bg-white border-gray-200 text-gray-600' : 'bg-white border-gray-200 text-gray-600'
                      }`}>
                      {mapping.type === 'CATEGORY' ? 'Categoria' : 'Conta'}
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      {getItemName(mapping)}
                    </span>
                    <span className={`px-1.5 py-0.5 text-[10px] rounded font-bold ${mapping.operation === 'ADD' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                      {mapping.operation === 'ADD' ? '+' : '-'}
                    </span>
                  </div>
                  {!readOnly && (
                    <button
                      onClick={() => handleRemoveMapping(mapping.id)}
                      className="text-red-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {!readOnly && (
            <div className="border-t border-gray-100 pt-6">
              <h4 className="text-sm font-semibold text-gray-800 mb-3">Adicionar Mapeamento</h4>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="col-span-1">
                  <select
                    value={newType}
                    onChange={(e) => {
                      setNewType(e.target.value as 'CATEGORY' | 'ACCOUNT');
                      setNewItemId('');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
                  >
                    <option value="CATEGORY">Categoria</option>
                    <option value="ACCOUNT">Conta Contábil</option>
                  </select>
                </div>
                <div className="col-span-1">
                  <select
                    value={newItemId}
                    onChange={(e) => setNewItemId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
                  >
                    <option value="">Selecione</option>
                    {getFilteredItems().map((item: any) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-1">
                  <select
                    value={newOperation}
                    onChange={(e) => setNewOperation(e.target.value as 'ADD' | 'SUBTRACT')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
                  >
                    <option value="ADD">Somar (+)</option>
                    <option value="SUBTRACT">Subtrair (-)</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleAddMapping}
                disabled={!newItemId}
                className={`w-full py-2.5 rounded-lg text-white font-medium text-sm transition-colors flex items-center justify-center gap-2 ${!newItemId ? 'bg-gray-300 cursor-not-allowed' : 'bg-gray-600 hover:bg-gray-700 shadow-sm'
                  }`}
              >
                <Plus size={16} /> Adicionar Mapeamento
              </button>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default DREMappingModal;

