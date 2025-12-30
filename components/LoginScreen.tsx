
import React, { useState } from 'react';
import { UserRole } from '../types';
import { Shield, Smartphone, ArrowRight, Lock, HelpCircle, AlertCircle, ChevronLeft } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (role: UserRole, email: string, password: string) => boolean;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState<UserRole>(UserRole.SALESMAN);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isForgotPass, setIsForgotPass] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    setTimeout(() => {
      const success = onLogin(activeTab, email, password);
      if (success) {
        // Logged in
      } else {
        setError("Invalid credentials. Please contact your supervisor.");
        setIsLoading(false);
      }
    }, 800);
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setResetSent(true);
      setIsLoading(false);
    }, 1200);
  };

  if (isForgotPass) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl shadow-slate-200 overflow-hidden p-10 border border-slate-100">
          <button onClick={() => { setIsForgotPass(false); setResetSent(false); }} className="text-slate-400 mb-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:text-slate-900 transition-colors">
            <ChevronLeft size={16} /> Back to Login
          </button>
          
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-3xl mb-6">
              <Lock className="text-blue-600 w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Recovery</h2>
            <p className="text-slate-400 text-[10px] mt-2 font-black uppercase tracking-widest leading-relaxed">Identity verification required</p>
          </div>

          {resetSent ? (
            <div className="text-center space-y-6">
              <div className="bg-green-50 text-green-700 p-6 rounded-3xl text-xs font-bold border border-green-100 leading-relaxed">
                A secure reset request for <span className="underline">{resetEmail}</span> has been queued.
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide leading-loose">
                Please check your official communications for authorization steps.
              </p>
              <button onClick={() => setIsForgotPass(false)} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest">Return Home</button>
            </div>
          ) : (
            <form onSubmit={handleForgotSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Workforce Identifier</label>
                <input 
                  required 
                  type="text" 
                  className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                  placeholder="ID or Email"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                />
              </div>
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-slate-200 active:scale-95 transition-all flex items-center justify-center"
              >
                {isLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" /> : 'Request Reset Authorization'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl shadow-slate-200 overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="bg-slate-900 p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-400 to-transparent"></div>
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-[2rem] mb-6 shadow-2xl shadow-blue-900/40">
              <Smartphone className="text-white w-10 h-10" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase">GeoSales</h1>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Enterprise Solutions</p>
          </div>
        </div>

        {/* Custom Segmented Control */}
        <div className="flex p-2 bg-slate-50 mx-8 mt-8 rounded-2xl border border-slate-100">
          <button
            onClick={() => { setActiveTab(UserRole.SALESMAN); setError(null); }}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all
              ${activeTab === UserRole.SALESMAN ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Field
          </button>
          <button
            onClick={() => { setActiveTab(UserRole.ADMIN); setError(null); }}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all
              ${activeTab === UserRole.ADMIN ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Admin
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-10 space-y-6">
          
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-[11px] font-bold flex items-center gap-3 border border-red-100 animate-slide-up">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Authorized Identifier
              </label>
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white focus:border-blue-500/50 outline-none transition-all text-sm font-bold text-slate-800"
                placeholder={activeTab === UserRole.SALESMAN ? "Employee ID" : "Email Address"}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Passcode
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white focus:border-blue-500/50 outline-none transition-all text-sm font-bold text-slate-800"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
             <button 
              type="button" 
              onClick={() => setIsForgotPass(true)}
              className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:text-blue-700 transition-colors"
             >
               Forgot Credentials?
             </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-5 rounded-2xl font-black text-white shadow-2xl flex items-center justify-center gap-3 transition-all active:scale-95 text-[10px] uppercase tracking-[0.25em]
              ${activeTab === UserRole.SALESMAN 
                ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-200' 
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-200'}`}
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Initialize Access <ArrowRight size={16} />
              </>
            )}
          </button>
          
          <p className="text-center text-[9px] font-bold text-slate-300 uppercase tracking-widest pt-4">
            Proprietary Enterprise Software v2.5.0
          </p>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;
