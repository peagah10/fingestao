
import React, { useState, useEffect } from 'react';
import { X, User, Mail, Lock, Shield, Check, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { User as UserType, UserRole, PermissionKey } from '../types';
import { ROLE_LABELS } from '../constants';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<UserType> & { password?: string }) => void;
  initialData?: UserType | null;
}

const AVAILABLE_PERMISSIONS: { key: PermissionKey; label: string }[] = [
    { key: 'VIEW_DASHBOARD', label: 'Ver Dashboard' },
    { key: 'VIEW_TRANSACTIONS', label: 'Ver Lançamentos' },
    { key: 'EDIT_TRANSACTIONS', label: 'Criar/Editar Lançamentos' },
    { key: 'VIEW_GOALS', label: 'Ver Metas' },
    { key: 'VIEW_COST_CENTERS', label: 'Ver Centros de Custo' },
    { key: 'VIEW_ASSETS', label: 'Gestão de Ativos' },
    { key: 'VIEW_REPORTS', label: 'Acessar Relatórios' },
    { key: 'USE_AI', label: 'Utilizar IA Financeira' },
    { key: 'VIEW_SETTINGS', label: 'Acessar Configurações' },
    { key: 'MANAGE_USERS', label: 'Gerenciar Usuários' },
    { key: 'VIEW_CRM', label: 'Acessar CRM' },
    { key: 'VIEW_TASKS', label: 'Acessar Tarefas' },
    { key: 'VIEW_LEADS', label: 'Gestão de Leads' },
    { key: 'MANAGE_COMPANIES', label: 'Gestão de Empresas' },
];

const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.EMPLOYEE);
  const [permissions, setPermissions] = useState<PermissionKey[]>([]);
  
  // Password State
  const [changePassword, setChangePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setEmail(initialData.email);
        setRole(initialData.role);
        setPermissions(initialData.permissions || []);
        setChangePassword(false); // Default to closed when editing
      } else {
        setName('');
        setEmail('');
        setRole(UserRole.EMPLOYEE);
        updatePermissionsForRole(UserRole.EMPLOYEE);
        setChangePassword(true); // Default to open when creating
      }
      setPassword('');
      setConfirmPassword('');
    }
  }, [isOpen, initialData]);

  const updatePermissionsForRole = (newRole: UserRole) => {
      let defaultPerms: PermissionKey[] = [];
      if (newRole === UserRole.ADMIN) {
          defaultPerms = AVAILABLE_PERMISSIONS.map(p => p.key);
      } else if (newRole === UserRole.MANAGER) {
          defaultPerms = [
              'VIEW_DASHBOARD', 'VIEW_TRANSACTIONS', 'EDIT_TRANSACTIONS', 
              'VIEW_REPORTS', 'USE_AI', 'VIEW_GOALS', 'VIEW_ASSETS', 'VIEW_COST_CENTERS'
          ];
      } else if (newRole === UserRole.BPO) {
          defaultPerms = [
              'VIEW_DASHBOARD', 'VIEW_CRM', 'VIEW_TASKS', 'VIEW_LEADS', 
              'MANAGE_COMPANIES', 'MANAGE_USERS', 'VIEW_SETTINGS'
          ];
      } else if (newRole === UserRole.CONSULTANT) {
          defaultPerms = [
              'VIEW_DASHBOARD', 'VIEW_CRM', 'VIEW_TASKS', 'VIEW_LEADS', 
              'MANAGE_COMPANIES', 'VIEW_SETTINGS'
          ];
      } else { // EMPLOYEE
          defaultPerms = ['VIEW_DASHBOARD', 'VIEW_TRANSACTIONS', 'EDIT_TRANSACTIONS'];
      }
      setPermissions(defaultPerms);
  };

  const handleRoleChange = (newRole: UserRole) => {
      setRole(newRole);
      updatePermissionsForRole(newRole);
  };

  const togglePermission = (key: PermissionKey) => {
      if ((role === UserRole.ADMIN || role === UserRole.BPO) && key === 'MANAGE_USERS') {
          alert('Este perfil exige permissão de gerenciar usuários.');
          return;
      }
      if (permissions.includes(key)) {
          setPermissions(permissions.filter(p => p !== key));
      } else {
          setPermissions([...permissions, key]);
      }
  };

  const handleSelectAllPermissions = () => {
      if (permissions.length === AVAILABLE_PERMISSIONS.length) {
          setPermissions([]);
      } else {
          setPermissions(AVAILABLE_PERMISSIONS.map(p => p.key));
      }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    // Password Validation
    if (changePassword) {
        if (password !== confirmPassword) {
            alert('As senhas não coincidem.');
            return;
        }
        if (password.length < 6) {
            alert('A senha deve ter pelo menos 6 caracteres.');
            return;
        }
    }

    onSave({
      id: initialData?.id,
      name,
      email,
      role,
      permissions,
      password: changePassword ? password : undefined
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <User size={24} className="text-indigo-600"/>
            {initialData ? 'Editar Perfil' : 'Convidar Usuário'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
          
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">Nome Completo</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Maria Silva"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">Email de Acesso</label>
            <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ex: maria@empresa.com"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-gray-400"
                />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">Perfil de Acesso</label>
            <select
              value={role}
              onChange={(e) => handleRoleChange(e.target.value as UserRole)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            >
              <optgroup label="Empresarial">
                  <option value={UserRole.ADMIN}>Administrador (Acesso Total)</option>
                  <option value={UserRole.MANAGER}>Gestor (Supervisão)</option>
                  <option value={UserRole.EMPLOYEE}>Funcionário (Operacional)</option>
              </optgroup>
              <optgroup label="Parceiros">
                  <option value={UserRole.BPO}>BPO Financeiro</option>
                  <option value={UserRole.CONSULTANT}>Consultor</option>
              </optgroup>
            </select>
          </div>

          {/* Password Section */}
          <div className="pt-2 border-t border-gray-100">
              <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                      <Lock size={16} className="text-indigo-600"/> Segurança
                  </h4>
                  {initialData && (
                      <label className="flex items-center gap-2 text-xs cursor-pointer text-gray-600 select-none">
                          <input 
                            type="checkbox" 
                            checked={changePassword} 
                            onChange={(e) => setChangePassword(e.target.checked)}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          Redefinir Senha
                      </label>
                  )}
              </div>

              {changePassword && (
                  <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 space-y-3 animate-in fade-in zoom-in duration-200">
                      <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Nova Senha"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none bg-white"
                          />
                          <button 
                            type="button" 
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                              {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                          </button>
                      </div>
                      <div>
                          <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Confirmar Nova Senha"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none bg-white ${
                                confirmPassword && password !== confirmPassword 
                                ? 'border-red-300 focus:ring-red-500' 
                                : 'border-orange-200 focus:ring-orange-500'
                            }`}
                          />
                          {confirmPassword && password !== confirmPassword && (
                              <p className="text-[10px] text-red-500 mt-1">As senhas não conferem.</p>
                          )}
                      </div>
                      <p className="text-[10px] text-orange-700 flex items-center gap-1">
                          <AlertCircle size={10}/> A senha será alterada imediatamente após salvar.
                      </p>
                  </div>
              )}
          </div>

          <div className="pt-2 border-t border-gray-100">
              <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                      <Shield size={16} className="text-indigo-600"/> Permissões de Acesso
                  </h4>
                  {role !== UserRole.ADMIN && (
                      <button 
                        type="button" 
                        onClick={handleSelectAllPermissions}
                        className="text-xs text-indigo-600 font-medium hover:underline"
                      >
                          {permissions.length === AVAILABLE_PERMISSIONS.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                      </button>
                  )}
              </div>
              
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  {role === UserRole.ADMIN && (
                      <div className="mb-3 text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-100 flex items-center gap-2">
                          <AlertCircle size={14}/> Administradores possuem acesso completo por padrão.
                      </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {AVAILABLE_PERMISSIONS.map((perm) => {
                          const isChecked = permissions.includes(perm.key);
                          const isDisabled = role === UserRole.ADMIN; // Admins always check all
                          
                          return (
                              <label key={perm.key} className={`flex items-center gap-2 ${isDisabled ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer group'}`}>
                                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isChecked ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300 group-hover:border-indigo-300'}`}>
                                      {isChecked && <Check size={14} className="text-white"/>}
                                  </div>
                                  <input 
                                    type="checkbox" 
                                    className="hidden"
                                    checked={isChecked}
                                    disabled={isDisabled}
                                    onChange={() => togglePermission(perm.key)}
                                  />
                                  <span className={`text-sm ${isChecked ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>{perm.label}</span>
                              </label>
                          );
                      })}
                  </div>
              </div>
          </div>

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
              onClick={handleSubmit} 
              type="submit"
              className="flex-1 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              {initialData ? 'Salvar Alterações' : 'Enviar Convite'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default UserModal;
