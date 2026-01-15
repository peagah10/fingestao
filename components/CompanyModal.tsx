
import React, { useState, useEffect, useRef } from 'react';
import { X, Building2, Save, Palette, Check, Image as ImageIcon, Upload } from 'lucide-react';
import { Company, PlanType } from '../types';

interface CompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Company>) => void;
  initialData?: Company | null;
}

const COLORS = ['indigo', 'blue', 'emerald', 'red', 'violet', 'orange', 'cyan', 'slate'];

const CompanyModal: React.FC<CompanyModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [name, setName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [primaryColor, setPrimaryColor] = useState('indigo');
  const [plan, setPlan] = useState<PlanType>(PlanType.FREE);
  const [active, setActive] = useState(true);
  const [logo, setLogo] = useState('');
  const [serviceType, setServiceType] = useState<'CONSULTING' | 'BPO' | 'BOTH' | ''>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setCnpj(initialData.cnpj);
        setPrimaryColor(initialData.primaryColor || 'indigo');
        setPlan(initialData.plan);
        setActive(initialData.active);
        setLogo(initialData.logo || '');
        setServiceType(initialData.serviceType || '');
      } else {
        setName('');
        setCnpj('');
        setPrimaryColor('indigo');
        setPlan(PlanType.FREE);
        setActive(true);
        setLogo('');
        setServiceType('');
      }
    }
  }, [isOpen, initialData]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !cnpj) return;

    onSave({
      id: initialData?.id,
      name,
      cnpj,
      primaryColor,
      plan,
      active,
      logo,
      serviceType: serviceType || undefined
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">

        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 size={24} className={`text-${primaryColor}-600`} style={{ color: `var(--color-${primaryColor}-600)` }} />
            {initialData ? 'Editar Empresa' : 'Nova Empresa'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Logo Upload */}
          <div className="flex items-center gap-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-16 h-16 rounded-lg bg-gray-50 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-indigo-400 relative group overflow-hidden"
            >
              {logo ? (
                <img src={logo} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <ImageIcon size={20} className="text-gray-400 group-hover:text-indigo-500" />
              )}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Upload size={16} className="text-white" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Logo</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline"
                >
                  Escolher Imagem
                </button>
                {logo && (
                  <button
                    type="button"
                    onClick={() => setLogo('')}
                    className="text-xs text-red-500 hover:text-red-700 hover:underline"
                  >
                    Remover
                  </button>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleLogoUpload}
                accept="image/*"
                className="hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Razão Social / Nome</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Minha Empresa Ltda"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">CNPJ</label>
            <input
              type="text"
              required
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              placeholder="00.000.000/0001-00"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Palette size={16} /> Cor de Identificação
            </label>
            <div className="flex flex-wrap gap-3">
              {COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setPrimaryColor(color)}
                  className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${primaryColor === color ? 'border-gray-600 scale-110 shadow-sm' : 'border-transparent hover:scale-105'
                    }`}
                  style={{ backgroundColor: `var(--color-${color}-500, ${color})` }}
                // Note: In a real app we might map these strings to actual hex codes if Tailwind classes aren't enough dynamic
                >
                  {primaryColor === color && <Check size={14} className="text-white" />}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Plano</label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value as PlanType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value={PlanType.FREE}>Gratuito</option>
                <option value={PlanType.PREMIUM}>Premium</option>
                <option value={PlanType.ENTERPRISE}>Enterprise</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Tipo de Serviço</label>
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="">Nenhum (Padrão)</option>
                <option value="CONSULTING">Consultoria Financeira</option>
                <option value="BPO">BPO Financeiro</option>
                <option value="BOTH">Ambos</option>
              </select>
            </div>

            <div className="flex items-center pt-6 col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="text-sm text-gray-700 font-medium">Empresa Ativa</span>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <Save size={18} /> Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompanyModal;
