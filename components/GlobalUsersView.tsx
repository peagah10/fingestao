
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { USERS, addUserToCompany, updateUser, deleteUser } from '../services/mockData';
import UserModal from './UserModal';
import { Users, Plus, Search, Edit2, Trash2, Mail, ShieldCheck, Briefcase } from 'lucide-react';
import { ROLE_LABELS } from '../constants';

interface GlobalUsersViewProps {
  currentUser: User;
  onRefresh: () => void;
}

const GlobalUsersView: React.FC<GlobalUsersViewProps> = ({ currentUser, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Filter only BPO and Consultant users for this view
  const teamUsers = USERS.filter(u => u.role === UserRole.BPO || u.role === UserRole.CONSULTANT);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleSave = (userData: Partial<User>) => {
    if (editingUser) {
      updateUser(editingUser.id, userData);
    } else {
      // For global users, we link them to a dummy ID or handle logic differently in real backend
      // Here we just add them to the system
      const newUser = {
          ...userData,
          linkedCompanyIds: currentUser.linkedCompanyIds // Inherit access to current BPO's companies
      };
      // We use addUserToCompany as a proxy to add to the USERS array
      addUserToCompany('global-bpo-context', newUser); 
    }
    onRefresh();
  };

  const handleDelete = (userId: string) => {
    if (userId === currentUser.id) {
        alert('Você não pode excluir seu próprio usuário.');
        return;
    }
    if (confirm('Tem certeza que deseja remover este membro da equipe?')) {
        deleteUser(userId);
        onRefresh();
    }
  };

  const filteredUsers = teamUsers.filter(u => 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <UserModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        initialData={editingUser}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Briefcase className="text-indigo-600" size={28} /> Equipe Interna
          </h2>
          <p className="text-gray-500 mt-1">Gerencie sócios e consultores da sua operação de BPO.</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium transition-all shadow-sm flex items-center gap-2"
        >
          <Plus size={18} /> Novo Membro
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
         <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
         <input 
           type="text" 
           placeholder="Buscar por nome ou email..." 
           value={searchTerm}
           onChange={(e) => setSearchTerm(e.target.value)}
           className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black bg-white"
         />
      </div>

      {/* User List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs border-b border-gray-200">
                  <tr>
                      <th className="px-6 py-4">Membro</th>
                      <th className="px-6 py-4">Função</th>
                      <th className="px-6 py-4">Acesso a Clientes</th>
                      <th className="px-6 py-4 text-center">Ações</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map(user => {
                      const isMe = user.id === currentUser.id;
                      const clientsCount = user.linkedCompanyIds ? user.linkedCompanyIds.length : 0;
                      
                      return (
                          <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm ${user.role === UserRole.BPO ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
                                          {user.name.charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                          <p className="font-bold text-gray-900 flex items-center gap-2">
                                              {user.name}
                                              {isMe && <span className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded border border-indigo-200">VOCÊ</span>}
                                          </p>
                                          <p className="text-xs text-gray-500 flex items-center gap-1">
                                              <Mail size={10}/> {user.email}
                                          </p>
                                      </div>
                                  </div>
                              </td>
                              <td className="px-6 py-4">
                                  <span className={`px-2 py-1 rounded text-xs font-medium border ${user.role === UserRole.BPO ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                                      {ROLE_LABELS[user.role]}
                                  </span>
                              </td>
                              <td className="px-6 py-4">
                                  <div className="flex items-center gap-2 text-xs text-gray-600">
                                      <Users size={14} className="text-gray-400"/>
                                      {clientsCount > 0 
                                        ? `${clientsCount} carteiras vinculadas` 
                                        : <span className="text-orange-500">Sem clientes</span>
                                      }
                                  </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                      <button 
                                        onClick={() => handleOpenEdit(user)}
                                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                        title="Editar Perfil"
                                      >
                                          <Edit2 size={16}/>
                                      </button>
                                      {!isMe && (
                                          <button 
                                            onClick={() => handleDelete(user.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                            title="Remover da Equipe"
                                          >
                                              <Trash2 size={16}/>
                                          </button>
                                      )}
                                  </div>
                              </td>
                          </tr>
                      );
                  })}
              </tbody>
          </table>
          {filteredUsers.length === 0 && (
              <div className="p-12 text-center text-gray-500 bg-gray-50">
                  <Users size={48} className="mx-auto mb-3 text-gray-300"/>
                  <p>Nenhum membro encontrado.</p>
              </div>
          )}
      </div>
    </div>
  );
};

export default GlobalUsersView;
