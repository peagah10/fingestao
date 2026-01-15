
import { UserRole } from './types';

export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.OWNER]: 'Dono',
  [UserRole.ADMIN]: 'Administrador',
  [UserRole.MANAGER]: 'Gestor',
  [UserRole.EMPLOYEE]: 'Funcionário',
  [UserRole.BPO]: 'BPO Financeiro',
  [UserRole.CONSULTANT]: 'Consultor',
  [UserRole.VIEWER]: 'Visualizador',
  [UserRole.SUPER_ADMIN]: 'Super Admin',
};

export const MOCK_API_DELAY = 600;
