
import React, { useState, useEffect } from 'react';
import { Company, User } from '../types';
import { userService, PendingInvite } from '../services/userService';
import UserModal from './UserModal';
import { Users, Plus, Search, Edit2, Trash2, Mail, ShieldCheck, Lock, Loader2, Clock, XCircle, Send } from 'lucide-react';
import { ROLE_LABELS } from '../constants';

interface UsersViewProps {
  company: Company;
  currentUser: User;
  onRefresh: () => void;
}

const UsersView: React.FC<UsersViewProps> = ({ company, currentUser, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!company) return;
    setLoading(true);
    const [usersData, invitesData] = await Promise.all([
      userService.fetchCompanyUsers(company.id),
      userService.fetchPendingInvites(company.id)
    ]);
    setUsers(usersData);
    setInvites(invitesData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [company?.id]);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  if (!company) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <Loader2 className="animate-spin mb-2" size={32} />
        <p>Carregando dados da empresa...</p>
      </div>
    );
  }

  const sendInviteEmail = (email: string, token: string | undefined, companyName: string) => {
    // In a real app with SendGrid, this API would trigger the email.
    // Here we simulate by opening the user's mail client.
    const origin = window.location.origin;
    const inviteLink = origin + '/signup?invite=' + (token || '') + '&email=' + email;

    const subject = `Convite para participar da ${companyName} no FinGestão`;
    const body = `Olá,\n\nVocê foi convidado para participar da equipe financeira da empresa ${companyName}.\n\nPara aceitar, clique no link abaixo e crie sua conta:\n${inviteLink}\n\nAtenciosamente,\nEquipe FinGestão`;

    window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
  };

  const handleSave = async (userData: Partial<User>) => {
    if (editingUser) {
      // Update Role
      const result = await userService.updateUserRole(editingUser.id, company.id, userData.role || 'EMPLOYEE');
      if (result.success) {
        alert('Permissões atualizadas com sucesso!');
        fetchData();
      } else {
        alert('Erro ao atualizar: ' + result.message);
      }
    } else {
      // Invite User
      if (!userData.email) return alert('Email é obrigatório');

      const result = await userService.inviteUserToCompany(userData.email, userData.role || 'EMPLOYEE', company.id);

      if (result.success) {
        if (result.is_new_user) {
          // New User -> Trigger Email Client
          if (confirm(`Convite criado! Deseja enviar o email agora?\n\nO sistema abrirá seu cliente de email padrão.`)) {
            sendInviteEmail(userData.email, result.invite_token, company.name);
          }
        } else {
          alert('Usuário existente vinculado com sucesso!');
        }
        fetchData();
      } else {
        alert('Erro ao vincular: ' + result.message);
      }
    }
    onRefresh();
  };

  const handleDelete = async (userId: string) => {
    if (userId === currentUser.id) {
      alert('Você não pode excluir seu próprio usuário.');
      return;
    }
    if (confirm('Tem certeza que deseja remover este usuário da empresa?')) {
      const result = await userService.removeUserFromCompany(userId, company.id);
      if (result.success) {
        alert('Usuário removido com sucesso.');
        fetchData();
      } else {
        alert('Erro ao remover: ' + result.message);
      }
      onRefresh();
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    if (confirm('Tem certeza que deseja cancelar este convite pendente?')) {
      const result = await userService.cancelInvite(inviteId, company.id);
      if (result.success) {
        alert('Convite cancelado com sucesso.');
        fetchData();
      } else {
        alert('Erro ao cancelar convite: ' + result.message);
      }
    }
  };

  const filteredUsers = users.filter(u =>
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
            <Users className="text-indigo-600" size={28} /> Gestão de Usuários
          </h2>
          <p className="text-gray-500 mt-1">Gerencie acessos e permissões da equipe de <b>{company.name}</b>.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium transition-all shadow-sm flex items-center gap-2"
        >
          <Plus size={18} /> Novo Usuário
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
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 bg-white"
        />
      </div>

      {/* Invites Section (Only if there are invites) */}
      {invites.length > 0 && (
        <div className="bg-orange-50 rounded-xl border border-orange-100 p-4">
          <h3 className="text-sm font-bold text-orange-800 mb-3 flex items-center gap-2">
            <Clock size={16} /> Convites Pendentes
          </h3>
          <div className="space-y-2">
            {invites.map(invite => (
              <div key={invite.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-orange-100 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                    <Mail size={14} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{invite.email}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Função: {ROLE_LABELS[invite.role] || invite.role}</span>
                      <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 rounded">Aguardando Cadastro</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => sendInviteEmail(invite.email, invite.token, company.name)}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                    title="Reenviar Email"
                  >
                    <Send size={16} />
                  </button>
                  <button
                    onClick={() => handleCancelInvite(invite.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Cancelar Convite"
                  >
                    <XCircle size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[300px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-gray-400">
            <Loader2 className="animate-spin mb-2" size={32} />
            <p>Carregando usuários...</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Usuário</th>
                <th className="px-6 py-4">Perfil</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map(user => {
                const isMe = user.id === currentUser.id;

                return (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-gray-900 flex items-center gap-2">
                            {user.name}
                            {isMe && <span className="bg-gray-200 text-gray-600 text-[10px] px-1.5 py-0.5 rounded">VOCÊ</span>}
                          </p>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Mail size={10} /> {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium border border-gray-200`}>
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs text-emerald-600">
                        <ShieldCheck size={14} className="text-emerald-500" />
                        Ativo
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(user)}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          title="Alterar Permissões"
                        >
                          <Edit2 size={16} />
                        </button>
                        {!isMe && (
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Remover Acesso"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {!loading && filteredUsers.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            Nenhum usuário encontrado.
          </div>
        )}
      </div>
    </div>
  );
};

export default UsersView;

