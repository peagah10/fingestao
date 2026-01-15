
import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, DollarSign, Calculator, HardDrive, BarChart3, Activity, Tags } from 'lucide-react';
import { Asset, DepreciationMethod, AssetCategory } from '../types';
import { getAssetCategories } from '../services/mockData';

interface AssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: Asset | null;
  companyId: string; // Passed to fetch categories
}

const METHOD_LABELS: Record<DepreciationMethod, string> = {
    'LINEAR': 'Linear (Linha Reta)',
    'SUM_OF_YEARS': 'Soma dos Dígitos (Acelerada)',
    'DECLINING_BALANCE': 'Saldos Decrescentes (Acelerada)',
    'UNITS_OF_PRODUCTION': 'Unidades Produzidas'
};

const AssetModal: React.FC<AssetModalProps> = ({ isOpen, onClose, onSave, initialData, companyId }) => {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [acquisitionDate, setAcquisitionDate] = useState('');
  const [initialValue, setInitialValue] = useState('');
  const [residualValue, setResidualValue] = useState('');
  const [usefulLifeMonths, setUsefulLifeMonths] = useState('60'); // Default 5 years
  const [status, setStatus] = useState<'ACTIVE' | 'SOLD' | 'WRITTEN_OFF'>('ACTIVE');
  
  // Depreciation Fields
  const [depreciationMethod, setDepreciationMethod] = useState<DepreciationMethod>('LINEAR');
  const [usageTotalEstimated, setUsageTotalEstimated] = useState('');
  const [usageCurrent, setUsageCurrent] = useState('');

  const categories = getAssetCategories(companyId);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setCategoryId(initialData.categoryId || '');
        setDescription(initialData.description || '');
        setAcquisitionDate(initialData.acquisitionDate);
        setInitialValue(initialData.initialValue.toString());
        setResidualValue(initialData.residualValue.toString());
        setUsefulLifeMonths(initialData.usefulLifeMonths.toString());
        setStatus(initialData.status);
        setDepreciationMethod(initialData.depreciationMethod || 'LINEAR');
        setUsageTotalEstimated(initialData.usageTotalEstimated?.toString() || '');
        setUsageCurrent(initialData.usageCurrent?.toString() || '');
      } else {
        setName('');
        setCategoryId('');
        setDescription('');
        setAcquisitionDate(new Date().toISOString().split('T')[0]);
        setInitialValue('');
        setResidualValue('0');
        setUsefulLifeMonths('60');
        setStatus('ACTIVE');
        setDepreciationMethod('LINEAR');
        setUsageTotalEstimated('');
        setUsageCurrent('');
      }
    }
  }, [isOpen, initialData, companyId]);

  if (!isOpen) return null;

  // Basic Validation Logic
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !acquisitionDate || !initialValue || !categoryId) return;

    onSave({
      id: initialData?.id,
      name,
      categoryId,
      description,
      acquisitionDate,
      initialValue: parseFloat(initialValue),
      residualValue: parseFloat(residualValue) || 0,
      usefulLifeMonths: parseInt(usefulLifeMonths) || 1,
      status,
      depreciationMethod,
      usageTotalEstimated: usageTotalEstimated ? parseFloat(usageTotalEstimated) : undefined,
      usageCurrent: usageCurrent ? parseFloat(usageCurrent) : undefined
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <HardDrive size={24} className="text-indigo-600"/>
            {initialData ? 'Editar Ativo' : 'Novo Ativo'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">Nome do Ativo *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Notebook Dell XPS 15"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white text-black"
            />
          </div>

          <div>
             <label className="block text-sm font-semibold text-gray-800 mb-1">Categoria *</label>
             <div className="relative">
                 <Tags className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                 <select
                    required
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-black text-sm"
                 >
                     <option value="">Selecione a categoria...</option>
                     {categories.map(cat => (
                         <option key={cat.id} value={cat.id}>{cat.name}</option>
                     ))}
                 </select>
             </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">Descrição</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes adicionais (Série, Localização...)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none bg-white text-black"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Data de Aquisição *</label>
                <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="date"
                        required
                        value={acquisitionDate}
                        onChange={(e) => setAcquisitionDate(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white text-black"
                    />
                </div>
             </div>
             <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Vida Útil (Meses) *</label>
                <input
                    type="number"
                    required
                    min="1"
                    value={usefulLifeMonths}
                    onChange={(e) => setUsefulLifeMonths(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white text-black"
                />
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Valor Original (R$) *</label>
                <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="number"
                        step="0.01"
                        required
                        value={initialValue}
                        onChange={(e) => setInitialValue(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium bg-white text-black"
                    />
                </div>
             </div>
             <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Valor Residual (R$)</label>
                <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="number"
                        step="0.01"
                        value={residualValue}
                        onChange={(e) => setResidualValue(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white text-black"
                    />
                </div>
             </div>
          </div>

          {/* Depreciation Method Selection */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
              <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1 flex items-center gap-1">
                      <BarChart3 size={14}/> Método de Depreciação
                  </label>
                  <select
                      value={depreciationMethod}
                      onChange={(e) => setDepreciationMethod(e.target.value as DepreciationMethod)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white text-black"
                  >
                      {Object.entries(METHOD_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                      ))}
                  </select>
              </div>

              {depreciationMethod === 'UNITS_OF_PRODUCTION' && (
                  <div className="grid grid-cols-2 gap-3 animate-in fade-in zoom-in duration-300">
                      <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Capacidade Total</label>
                          <input
                              type="number"
                              placeholder="Ex: 100000 km"
                              value={usageTotalEstimated}
                              onChange={(e) => setUsageTotalEstimated(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white text-black"
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Uso Atual (Acumulado)</label>
                          <input
                              type="number"
                              placeholder="Ex: 25000 km"
                              value={usageCurrent}
                              onChange={(e) => setUsageCurrent(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white text-black"
                          />
                      </div>
                  </div>
              )}
              
              <p className="text-[10px] text-gray-500 italic">
                  {depreciationMethod === 'LINEAR' && 'Desgaste uniforme ao longo do tempo.'}
                  {depreciationMethod === 'SUM_OF_YEARS' && 'Maior depreciação nos anos iniciais (fração decrescente).'}
                  {depreciationMethod === 'DECLINING_BALANCE' && 'Taxa fixa sobre saldo (Double Declining - 200%).'}
                  {depreciationMethod === 'UNITS_OF_PRODUCTION' && 'Baseado no uso real da máquina/equipamento.'}
              </p>
          </div>

          {/* Status Selection (Only for Edit) */}
          {initialData && (
              <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">Status</label>
                  <select 
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-black"
                  >
                      <option value="ACTIVE">Ativo (Em uso)</option>
                      <option value="SOLD">Vendido</option>
                      <option value="WRITTEN_OFF">Baixado / Descartado</option>
                  </select>
              </div>
          )}

        </form>
        
        <div className="p-6 border-t border-gray-100 flex gap-3 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit} // Using external handler on button to support form submit
              type="button"
              className="flex-1 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <Save size={18} /> Salvar
            </button>
        </div>
      </div>
    </div>
  );
};

export default AssetModal;
