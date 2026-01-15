
import React, { useState } from 'react';
import { User } from '../types';
import { Settings, Building, Save, Mail, Globe, Palette, Bell } from 'lucide-react';

interface BPOSettingsViewProps {
  currentUser: User;
}

const BPOSettingsView: React.FC<BPOSettingsViewProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'PREFERENCES'>('PROFILE');
  
  // Mock form state for BPO Org
  const [orgData, setOrgData] = useState({
      name: 'Minha Consultoria BPO',
      cnpj: '00.000.000/0001-00',
      email: currentUser.email,
      website: 'www.meubpo.com.br',
      primaryColor: 'indigo'
  });

  const handleSave = (e: React.FormEvent) => {
      e.preventDefault();
      alert('Configurações da organização salvas com sucesso!');
  };

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gray-900 text-white rounded-lg">
                <Settings size={24} />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Configurações da Organização</h2>
                <p className="text-gray-500">Gerencie os dados da sua firma de BPO.</p>
            </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
            <button 
                onClick={() => setActiveTab('PROFILE')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'PROFILE' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                <Building size={16}/> Perfil da Empresa
            </button>
            <button 
                onClick={() => setActiveTab('PREFERENCES')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'PREFERENCES' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                <Palette size={16}/> Preferências
            </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-4xl animate-in fade-in duration-300">
            {activeTab === 'PROFILE' && (
                <form onSubmit={handleSave} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Nome da Organização</label>
                            <input 
                                type="text" 
                                value={orgData.name}
                                onChange={(e) => setOrgData({...orgData, name: e.target.value})}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">CNPJ</label>
                            <input 
                                type="text" 
                                value={orgData.cnpj}
                                onChange={(e) => setOrgData({...orgData, cnpj: e.target.value})}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Email de Contato</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                                <input 
                                    type="email" 
                                    value={orgData.email}
                                    onChange={(e) => setOrgData({...orgData, email: e.target.value})}
                                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Website</label>
                            <div className="relative">
                                <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                                <input 
                                    type="text" 
                                    value={orgData.website}
                                    onChange={(e) => setOrgData({...orgData, website: e.target.value})}
                                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-100 flex justify-end">
                        <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm">
                            <Save size={18}/> Salvar Alterações
                        </button>
                    </div>
                </form>
            )}

            {activeTab === 'PREFERENCES' && (
                <div className="space-y-6">
                    <div>
                        <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Bell size={18}/> Notificações</h4>
                        <div className="space-y-3">
                            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                <input type="checkbox" defaultChecked className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"/>
                                <div>
                                    <span className="block text-sm font-semibold text-gray-700">Alertas de Caixa Crítico</span>
                                    <span className="block text-xs text-gray-500">Receber e-mail quando um cliente entrar no vermelho.</span>
                                </div>
                            </label>
                            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                <input type="checkbox" defaultChecked className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"/>
                                <div>
                                    <span className="block text-sm font-semibold text-gray-700">Resumo Semanal</span>
                                    <span className="block text-xs text-gray-500">Receber relatório consolidado toda segunda-feira.</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Palette size={18}/> Aparência</h4>
                        <div className="flex gap-4">
                            {['indigo', 'blue', 'emerald', 'gray'].map(color => (
                                <button
                                    key={color}
                                    onClick={() => setOrgData({...orgData, primaryColor: color})}
                                    className={`w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center ${orgData.primaryColor === color ? 'border-gray-800 scale-110' : 'border-transparent hover:scale-105'}`}
                                    style={{ backgroundColor: color === 'indigo' ? '#4f46e5' : color === 'blue' ? '#2563eb' : color === 'emerald' ? '#059669' : '#4b5563' }}
                                >
                                    {orgData.primaryColor === color && <div className="w-3 h-3 bg-white rounded-full"></div>}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default BPOSettingsView;
