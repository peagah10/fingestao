
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { authService } from '../services/authService';
import { getSystemPlans } from '../services/mockData'; // Keeping for UI config
import { Mail, Lock, UserCircle2, Loader2, Chrome, ArrowRight, ArrowLeft, Briefcase, Building2, LineChart, AlertTriangle } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

// Logo Component - Circular Design (Dark Background, Light Content)
const FinGestaoLogo = ({ className = "h-24 w-24" }: { className?: string }) => (
  <svg viewBox="0 0 200 200" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Background Circle - Dark Navy/Black */}
    <circle cx="100" cy="100" r="100" fill="#0f172a" />
    
    {/* Graph Line - Cyan/Bright Blue */}
    <path d="M45 105 L75 80 L105 100 L155 50" stroke="#38BDF8" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M155 50 L130 50 M155 50 L155 75" stroke="#38BDF8" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
    
    {/* Text - White */}
    <text x="100" y="150" textAnchor="middle" fontFamily="sans-serif" fontWeight="bold" fontSize="24" fill="white" letterSpacing="-0.5">FinGestao</text>
  </svg>
);

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationStep, setRegistrationStep] = useState(1);
  const [error, setError] = useState('');

  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Registration State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRole, setRegRole] = useState<UserRole>(UserRole.ADMIN); // Default to Admin
  const [regPlanId, setRegPlanId] = useState('');

  const plans = getSystemPlans();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!loginEmail || !loginPassword) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);
    
    try {
        const { user, error: authError } = await authService.signIn(loginEmail, loginPassword);
        
        if (authError) {
            setError(authError);
            setLoading(false);
        } else if (user) {
            onLogin(user);
        } else {
            setError('Erro desconhecido ao autenticar.');
            setLoading(false);
        }
    } catch (err) {
        console.error(err);
        setError('Falha na conexão com o serviço de autenticação.');
        setLoading(false);
    }
  };

  const handleForgotPassword = () => {
      if (!loginEmail) {
          setError('Por favor, informe seu email no campo acima para recuperar a senha.');
          return;
      }
      setError('');
      alert(`Um link de recuperação de senha foi enviado para: ${loginEmail}`);
  };

  const handleNextStep1 = (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      if(!regName || !regEmail || !regPassword || !regConfirmPassword) {
          setError('Todos os campos são obrigatórios.');
          return;
      }
      if(regPassword !== regConfirmPassword) {
          setError('As senhas não coincidem.');
          return;
      }
      setRegistrationStep(2); // Go to Role Selection
  };

  const handleSelectRole = (role: UserRole) => {
      setRegRole(role);
      setRegistrationStep(3); // Go to Plan Selection
  };

  const handleFinalRegister = async (planId: string) => {
      setRegPlanId(planId);
      setLoading(true);
      setError('');
      
      try {
          // Real Supabase Registration
          const { user, error: signUpError } = await authService.signUp(
              regEmail, 
              regPassword, 
              { name: regName, role: regRole }
          );

          if (signUpError) {
              setError(signUpError);
              setLoading(false);
              return;
          }

          if (user) {
              onLogin(user);
          } else {
              // Usually means email confirmation required
              setError('Cadastro realizado! Verifique seu email para confirmar a conta.');
              setLoading(false);
          }
      } catch (err) {
          console.error(err);
          setError('Erro ao criar conta. Tente novamente.');
          setLoading(false);
      }
  };

  const handleGoogleLogin = () => {
      alert("Login social requer configuração específica no painel do Supabase.");
  };

  const toggleMode = () => {
      setIsRegistering(!isRegistering);
      setError('');
      setRegistrationStep(1); 
      setRegPlanId('');
      setRegRole(UserRole.ADMIN);
  };

  // --- RENDERERS ---

  const renderLogin = () => (
      <form onSubmit={handleLogin} className="space-y-6 animate-in fade-in duration-500">
        <div>
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Email Corporativo</label>
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#2286D2] transition-colors"><Mail size={20} /></div>
                <input 
                  type="email" 
                  value={loginEmail} 
                  onChange={(e) => setLoginEmail(e.target.value)} 
                  className="block w-full pl-11 pr-4 py-4 bg-white border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-[#2286D2] focus:border-transparent outline-none transition-all placeholder-gray-400 shadow-sm" 
                  placeholder="nome@empresa.com" 
                />
            </div>
        </div>
        <div>
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Senha</label>
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#2286D2] transition-colors"><Lock size={20} /></div>
                <input 
                  type="password" 
                  value={loginPassword} 
                  onChange={(e) => setLoginPassword(e.target.value)} 
                  className="block w-full pl-11 pr-4 py-4 bg-white border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-[#2286D2] focus:border-transparent outline-none transition-all placeholder-gray-400 shadow-sm" 
                  placeholder="••••••••" 
                />
            </div>
            <div className="flex justify-end mt-2">
                <button 
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs font-medium text-gray-500 hover:text-[#2286D2] transition-colors focus:outline-none"
                >
                    Esqueceu a senha?
                </button>
            </div>
        </div>
        
        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600 flex items-center gap-2 animate-pulse">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}
        
        <button 
          type="submit" 
          disabled={loading} 
          className="w-full flex items-center justify-center py-4 px-4 rounded-xl bg-[#2286D2] hover:bg-[#1c75b9] text-white font-bold text-sm transition-all shadow-lg shadow-blue-200 hover:shadow-blue-300 transform hover:-translate-y-0.5 active:translate-y-0"
        >
            {loading ? <><Loader2 className="animate-spin mr-2" size={20} /> Autenticando...</> : 'Acessar Sistema'}
        </button>
      </form>
  );

  const renderRegisterStep1 = () => (
      <form onSubmit={handleNextStep1} className="space-y-5 animate-in slide-in-from-right duration-300">
          <div className="flex gap-2 mb-6 justify-center">
              <div className="h-1.5 w-12 bg-[#2286D2] rounded-full"></div>
              <div className="h-1.5 w-12 bg-gray-200 rounded-full"></div>
              <div className="h-1.5 w-12 bg-gray-200 rounded-full"></div>
          </div>
          <h3 className="text-center text-xl font-bold text-gray-900">Crie sua conta</h3>
          
          <div className="grid grid-cols-1 gap-4">
            <div className="relative group">
                <UserCircle2 size={18} className="absolute left-4 top-4 text-gray-400 group-focus-within:text-[#2286D2] transition-colors"/>
                <input type="text" value={regName} onChange={(e) => setRegName(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-[#2286D2] outline-none placeholder-gray-400 shadow-sm" placeholder="Seu Nome Completo" autoFocus />
            </div>
            <div className="relative group">
                <Mail size={18} className="absolute left-4 top-4 text-gray-400 group-focus-within:text-[#2286D2] transition-colors"/>
                <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-[#2286D2] outline-none placeholder-gray-400 shadow-sm" placeholder="Email Corporativo" />
            </div>
            <div className="relative group">
                <Lock size={18} className="absolute left-4 top-4 text-gray-400 group-focus-within:text-[#2286D2] transition-colors"/>
                <input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-[#2286D2] outline-none placeholder-gray-400 shadow-sm" placeholder="Senha" />
            </div>
            <div className="relative group">
                <Lock size={18} className="absolute left-4 top-4 text-gray-400 group-focus-within:text-[#2286D2] transition-colors"/>
                <input type="password" value={regConfirmPassword} onChange={(e) => setRegConfirmPassword(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-[#2286D2] outline-none placeholder-gray-400 shadow-sm" placeholder="Confirmar Senha" />
            </div>
          </div>

          {error && <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600 text-center">{error}</div>}
          
          <button type="submit" className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl bg-[#2286D2] hover:bg-[#1c75b9] text-white font-bold transition-all shadow-lg shadow-blue-200 hover:shadow-blue-300">
              Continuar <ArrowRight size={18} className="ml-2"/>
          </button>
      </form>
  );

  const renderRegisterStep2 = () => (
      <div className="space-y-5 animate-in slide-in-from-right duration-300">
          <div className="flex gap-2 mb-6 justify-center">
              <div className="h-1.5 w-12 bg-green-500 rounded-full"></div>
              <div className="h-1.5 w-12 bg-[#2286D2] rounded-full"></div>
              <div className="h-1.5 w-12 bg-gray-200 rounded-full"></div>
          </div>
          <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Qual o seu objetivo?</h3>
              <p className="text-xs text-gray-500 mt-1">Selecione como você irá utilizar o sistema.</p>
          </div>

          <div className="grid grid-cols-1 gap-3">
              <button 
                  onClick={() => handleSelectRole(UserRole.ADMIN)}
                  className="flex items-center gap-4 p-4 rounded-xl border-2 border-gray-100 hover:border-[#2286D2] hover:bg-blue-50 transition-all text-left group"
              >
                  <div className="p-3 bg-blue-100 text-[#2286D2] rounded-lg group-hover:bg-[#2286D2] group-hover:text-white transition-colors">
                      <Building2 size={24} />
                  </div>
                  <div>
                      <h4 className="font-bold text-gray-800 text-sm">Gestão Empresarial</h4>
                      <p className="text-xs text-gray-500 mt-0.5">Gerenciar o financeiro da minha própria empresa.</p>
                  </div>
              </button>

              <button 
                  onClick={() => handleSelectRole(UserRole.BPO)}
                  className="flex items-center gap-4 p-4 rounded-xl border-2 border-gray-100 hover:border-[#2286D2] hover:bg-blue-50 transition-all text-left group"
              >
                  <div className="p-3 bg-purple-100 text-purple-600 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-colors">
                      <Briefcase size={24} />
                  </div>
                  <div>
                      <h4 className="font-bold text-gray-800 text-sm">BPO Financeiro</h4>
                      <p className="text-xs text-gray-500 mt-0.5">Gerenciar financeiro de múltiplos clientes (Terceirização).</p>
                  </div>
              </button>

              <button 
                  onClick={() => handleSelectRole(UserRole.CONSULTANT)}
                  className="flex items-center gap-4 p-4 rounded-xl border-2 border-gray-100 hover:border-[#2286D2] hover:bg-blue-50 transition-all text-left group"
              >
                  <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <LineChart size={24} />
                  </div>
                  <div>
                      <h4 className="font-bold text-gray-800 text-sm">Consultoria</h4>
                      <p className="text-xs text-gray-500 mt-0.5">Acompanhar e auditar números de empresas clientes.</p>
                  </div>
              </button>
          </div>

          <button onClick={() => setRegistrationStep(1)} className="w-full flex items-center justify-center py-2 text-gray-500 hover:text-gray-900 text-sm transition-colors mt-2">
              <ArrowLeft size={16} className="mr-1"/> Voltar
          </button>
      </div>
  );

  const renderRegisterStep3 = () => {
      return (
        <div className="space-y-5 animate-in slide-in-from-right duration-300">
            <div className="flex gap-2 mb-6 justify-center">
                <div className="h-1.5 w-12 bg-green-500 rounded-full"></div>
                <div className="h-1.5 w-12 bg-green-500 rounded-full"></div>
                <div className="h-1.5 w-12 bg-[#2286D2] rounded-full"></div>
            </div>
            <div className="text-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">Escolha seu Plano</h3>
                <p className="text-xs text-gray-500 mt-1">Comece hoje, cancele quando quiser.</p>
            </div>

            <div className="grid grid-cols-1 gap-3 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                {plans.map(plan => (
                    <div key={plan.id} 
                         onClick={() => setRegPlanId(plan.id)}
                         className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                             regPlanId === plan.id 
                             ? 'border-[#2286D2] bg-blue-50 shadow-md ring-1 ring-blue-200' 
                             : 'border-gray-200 hover:border-gray-300 bg-white'
                         }`}
                    >
                        <div className="flex justify-between items-center mb-1">
                            <h4 className="font-bold text-gray-900 text-sm">{plan.name}</h4>
                            {plan.price === 0 ? (
                                <span className="text-[#2286D2] font-bold text-sm bg-blue-100 px-2 py-0.5 rounded">Grátis</span>
                            ) : (
                                <span className="text-gray-900 font-bold text-sm">R$ {plan.price.toLocaleString('pt-BR')}<span className="text-xs font-normal text-gray-500">/mês</span></span>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2 mt-1">{plan.description}</p>
                    </div>
                ))}
            </div>

            <div className="pt-2 space-y-3">
                <button 
                    onClick={() => regPlanId && handleFinalRegister(regPlanId)} 
                    disabled={loading || !regPlanId}
                    className={`w-full flex items-center justify-center py-3.5 px-4 rounded-xl text-white font-bold transition-all shadow-lg ${
                        loading || !regPlanId ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#2286D2] hover:bg-[#1c75b9] shadow-blue-200 hover:shadow-blue-300 transform hover:-translate-y-0.5'
                    }`}
                >
                    {loading ? <><Loader2 className="animate-spin mr-2" size={20} /> Criando...</> : 'Finalizar Cadastro'}
                </button>
                <button onClick={() => setRegistrationStep(2)} className="w-full flex items-center justify-center py-2 text-gray-500 hover:text-gray-900 text-sm transition-colors">
                    <ArrowLeft size={16} className="mr-1"/> Voltar
                </button>
            </div>
        </div>
      );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-3xl opacity-60"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-50/50 rounded-full blur-3xl opacity-60"></div>
      </div>

      <div className={`relative bg-white border border-gray-100 rounded-2xl shadow-xl w-full max-w-md overflow-hidden transition-all duration-300 z-10 ${registrationStep >= 2 ? 'max-w-lg' : 'max-w-md'}`}>
        {/* Header with Logo */}
        <div className="pt-8 pb-6 px-8 text-center border-b border-gray-50 bg-white">
          <div className="flex justify-center mb-4">
             <FinGestaoLogo className="h-28 w-28" />
          </div>
          {!isRegistering && (
             <p className="text-sm text-gray-500">
                Inteligência financeira para o seu negócio
             </p>
          )}
        </div>

        {/* Content Body */}
        <div className="p-8 pb-6">
          {!isRegistering ? renderLogin() : (
              <>
                {registrationStep === 1 && renderRegisterStep1()}
                {registrationStep === 2 && renderRegisterStep2()}
                {registrationStep === 3 && renderRegisterStep3()}
              </>
          )}

          {/* Social Login (Only on main login screen) */}
          {!isRegistering && (
              <>
                <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                    <div className="relative flex justify-center text-xs uppercase tracking-wide"><span className="px-3 bg-white text-gray-400">Ou</span></div>
                </div>
                <button onClick={handleGoogleLogin} disabled={loading} className="w-full flex items-center justify-center px-4 py-3.5 border border-gray-300 rounded-xl shadow-sm bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all group">
                    <Chrome size={20} className="text-red-500 mr-3" /> Entrar com Google
                </button>
              </>
          )}
        </div>
        
        {/* Footer Toggle */}
        <div className="p-5 bg-gray-50 text-center border-t border-gray-200">
           <p className="text-sm text-gray-600">
             {isRegistering ? 'Já possui uma conta?' : 'Ainda não tem conta?'}
             <button onClick={toggleMode} className="ml-2 text-[#2286D2] font-bold hover:text-blue-800 transition-colors focus:outline-none">
               {isRegistering ? 'Fazer Login' : 'Criar agora'}
             </button>
           </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
