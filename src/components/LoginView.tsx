import React, { useState, useEffect } from 'react';
import { Serveuse } from '../types';
import { posApi } from '../services/api';
import { KeyRound, Lock, User, AlertCircle, CheckCircle2, ShieldCheck, ChefHat, ShoppingBag, Info } from 'lucide-react';

interface LoginViewProps {
  serveusesList: Serveuse[];
  onLoginSuccess: (serveuse: Serveuse) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  serveusesList,
  onLoginSuccess,
}) => {
  const [usernameInput, setUsernameInput] = useState<string>(
    serveusesList.length > 0 ? (serveusesList[0].nom || serveusesList[0].idServeuse) : 'admin1'
  );
  const [pinInput, setPinInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const handlePhysicalKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if focus is inside text input (e.g. typing username)
      if (document.activeElement?.tagName === 'INPUT' && (document.activeElement as HTMLInputElement).type === 'text') {
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClear();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (pinInput.length === 4) {
          verifyPin(usernameInput, pinInput);
        }
      }
    };

    window.addEventListener('keydown', handlePhysicalKeyDown);
    return () => window.removeEventListener('keydown', handlePhysicalKeyDown);
  }, [pinInput, usernameInput]);

  const handleKeyPress = (digit: string) => {
    if (pinInput.length < 4) {
      const nextPin = pinInput + digit;
      setPinInput(nextPin);
      setErrorMsg('');
      if (nextPin.length === 4) {
        verifyPin(usernameInput, nextPin);
      }
    }
  };

  const handleDelete = () => {
    setPinInput(prev => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleClear = () => {
    setPinInput('');
    setErrorMsg('');
  };

  const verifyPin = async (userToVerify: string, pinToVerify: string) => {
    if (!userToVerify.trim()) {
      setErrorMsg("Veuillez sélectionner ou saisir un profil");
      return;
    }
    if (!pinToVerify || pinToVerify.length < 4) {
      setErrorMsg('Veuillez saisir un code PIN à 4 chiffres');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await posApi.loginServeuse(userToVerify.trim(), pinToVerify);
      if (res.success && res.serveuse) {
        onLoginSuccess(res.serveuse);
      } else {
        setErrorMsg(res.message || "Code PIN incorrect pour ce profil.");
        setPinInput('');
      }
    } catch (err: any) {
      setErrorMsg("Erreur de connexion au serveur.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    verifyPin(usernameInput, pinInput);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="bg-purple-100 text-purple-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-purple-200">Admin</span>;
      case 'cuisine':
        return <span className="bg-amber-100 text-amber-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-amber-200">Cuisine</span>;
      default:
        return <span className="bg-red-100 text-red-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-red-200">Serveuse</span>;
    }
  };

  return (
    <div className="h-[100dvh] w-full bg-slate-900 text-slate-100 flex flex-col items-center justify-start sm:justify-center p-3 sm:p-6 lg:p-10 relative overflow-y-auto touch-scroll-y">
      {/* Subtle background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="bg-white text-slate-900 border border-slate-200 rounded-2xl sm:rounded-3xl max-w-md md:max-w-3xl lg:max-w-4xl w-full p-4 sm:p-8 shadow-2xl relative z-10 my-0 sm:my-auto animate-in fade-in zoom-in-95 duration-200 shrink-0">
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* Left Column (Desktop): Brand & Profile Selection */}
          <div className="md:col-span-5 lg:col-span-5 space-y-4 sm:space-y-5 flex flex-col justify-between h-full border-b md:border-b-0 md:border-r border-slate-100 pb-5 md:pb-0 md:pr-6 lg:pr-8">
            
            <div>
              {/* App Brand Header */}
              <div className="flex items-center space-x-3.5 mb-5 sm:mb-6">
                <img 
                  src="/logo.svg" 
                  alt="Milgos Logo" 
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo.png'; }}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white border-2 border-red-100 shadow-lg object-contain shrink-0 p-0.5 ring-2 ring-red-500/20" 
                />
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">MILGO'S</h1>
                  <p className="text-xs sm:text-sm font-bold text-red-600 tracking-wider uppercase mt-1">FIRED UP CHICKEN • POS</p>
                </div>
              </div>

              {/* Profile Login Instruction */}
              <div className="bg-red-50/70 border border-red-100 rounded-xl p-3 mb-4 text-[11px] sm:text-xs text-red-950 flex items-start space-x-2.5">
                <Info className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>Cliquez sur votre nom ci-dessous ou saisissez votre identifiant pour vous connecter.</span>
              </div>

              {/* Active Users Selection */}
              {serveusesList.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700">
                    Sélectionner un profil utilisateur :
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-2 max-h-48 sm:max-h-60 overflow-y-auto p-1.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl">
                    {serveusesList.map((usr) => {
                      const isSelected = usernameInput.toLowerCase() === usr.idServeuse.toLowerCase() || usernameInput.toLowerCase() === usr.nom.toLowerCase();
                      return (
                        <button
                          key={usr.idServeuse}
                          type="button"
                          onClick={() => {
                            setUsernameInput(usr.nom || usr.idServeuse);
                            setPinInput('');
                            setErrorMsg('');
                          }}
                          className={`w-full px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between text-left touch-manipulation active:scale-98 ${
                            isSelected
                              ? 'bg-red-600 text-white shadow-md shadow-red-600/20 ring-2 ring-red-300'
                              : 'bg-white border border-slate-200 text-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center space-x-2 truncate pr-2">
                            <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-red-500'}`} />
                            <span className="truncate font-extrabold">{usr.nom}</span>
                          </div>
                          <div className="shrink-0">
                            {getRoleBadge(usr.role)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Username Input Field */}
              <div className="mt-4">
                <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                  Ou identifiant manuel :
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="ex: admin1"
                    value={usernameInput}
                    onChange={(e) => {
                      setUsernameInput(e.target.value);
                      setErrorMsg('');
                    }}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm font-extrabold text-slate-900 placeholder-slate-400 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Desktop Keyboard Helper */}
            <div className="hidden md:flex items-center space-x-2 text-[11px] text-slate-400 pt-3 border-t border-slate-100">
              <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono font-bold text-[10px] text-slate-600">Clavier</span>
              <span>Vous pouvez saisir le PIN directement avec le pavé numérique de l'ordinateur.</span>
            </div>

          </div>

          {/* Right Column (Desktop): PIN Keypad & Submit */}
          <div className="md:col-span-7 lg:col-span-7 space-y-3 sm:space-y-4">
            
            {/* Active User Summary Header */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl p-3 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-black text-sm">
                  {usernameInput.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Profil Sélectionné</div>
                  <div className="text-xs sm:text-sm font-black text-slate-900 truncate max-w-[180px] sm:max-w-xs">{usernameInput || 'Aucun'}</div>
                </div>
              </div>
              <div className="text-xs">
                <Lock className="w-4 h-4 text-red-600" />
              </div>
            </div>

            {/* PIN Display */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center">
              <div className="text-[11px] sm:text-xs font-bold text-slate-600 mb-2 flex items-center justify-center space-x-1">
                <span>Code PIN de sécurité (4 chiffres)</span>
              </div>
              <div className="flex justify-center space-x-3 py-1">
                {[0, 1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl border-2 flex items-center justify-center text-xl font-bold transition-all ${
                      pinInput.length > idx
                        ? 'bg-red-600 border-red-600 text-white scale-105 shadow-md shadow-red-600/20'
                        : 'bg-white border-slate-200 text-transparent'
                    }`}
                  >
                    ●
                  </div>
                ))}
              </div>
            </div>

            {errorMsg && (
              <div className="p-2.5 sm:p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-[11px] sm:text-xs font-bold flex items-center space-x-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Touch & Desktop Keypad */}
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleKeyPress(digit)}
                  className="py-3 sm:py-3.5 min-h-[46px] bg-slate-50 hover:bg-slate-100 active:bg-red-600 active:text-white text-slate-900 font-bold text-base sm:text-xl rounded-xl border border-slate-200 transition-all touch-manipulation shadow-xs flex items-center justify-center"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                className="py-3 sm:py-3.5 min-h-[46px] bg-slate-50 hover:bg-slate-100 text-amber-700 font-bold text-[11px] sm:text-xs rounded-xl border border-slate-200 transition-all touch-manipulation shadow-xs flex items-center justify-center uppercase tracking-wider"
              >
                Effacer
              </button>
              <button
                type="button"
                onClick={() => handleKeyPress('0')}
                className="py-3 sm:py-3.5 min-h-[46px] bg-slate-50 hover:bg-slate-100 active:bg-red-600 active:text-white text-slate-900 font-bold text-base sm:text-xl rounded-xl border border-slate-200 transition-all touch-manipulation shadow-xs flex items-center justify-center"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="py-3 sm:py-3.5 min-h-[46px] bg-slate-50 hover:bg-slate-100 text-red-600 font-bold text-[11px] sm:text-xs rounded-xl border border-slate-200 transition-all touch-manipulation shadow-xs flex items-center justify-center uppercase tracking-wider"
              >
                ⌫ Retour
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || pinInput.length < 4}
              className="w-full py-3.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm rounded-xl sm:rounded-2xl shadow-lg shadow-red-600/30 transition-all flex items-center justify-center space-x-2 touch-manipulation active:scale-98 mt-2 min-h-[48px]"
            >
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>{loading ? 'Vérification...' : 'Se Connecter à la Caisse'}</span>
            </button>

          </div>

        </form>

      </div>
    </div>
  );
};
