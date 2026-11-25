import React, { useState, useEffect, useRef } from 'react';
import { Serveuse } from '../types';
import { posApi } from '../services/api';
import { KeyRound, Lock, User, AlertCircle, CheckCircle2, ShieldCheck, ChefHat, ShoppingBag, Info, Eye, EyeOff } from 'lucide-react';

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
  const [showPin, setShowPin] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const pinInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus PIN input on mount or when username changes
  useEffect(() => {
    pinInputRef.current?.focus();
  }, [usernameInput]);

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
        pinInputRef.current?.focus();
      }
    } catch (err: any) {
      setErrorMsg("Erreur de connexion au serveur.");
    } finally {
      setLoading(false);
    }
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    // Only keep numeric digits and max 4 characters
    const digitsOnly = rawVal.replace(/\D/g, '').slice(0, 4);
    setPinInput(digitsOnly);
    setErrorMsg('');

    if (digitsOnly.length === 4) {
      verifyPin(usernameInput, digitsOnly);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    verifyPin(usernameInput, pinInput);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">Admin</span>;
      case 'caissier':
        return <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">Caisse</span>;
      case 'cuisine':
        return <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">Cuisine</span>;
      case 'barman':
        return <span className="bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-cyan-200 dark:border-cyan-800">Barman</span>;
      default:
        return <span className="bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-red-200 dark:border-red-800">Serveuse</span>;
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-10 relative overflow-y-auto">
      {/* Subtle background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md md:max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative z-10 my-auto animate-in fade-in zoom-in-95 duration-200 shrink-0">
        
        {/* App Brand Header */}
        <div className="flex items-center space-x-3.5 mb-6 border-b border-slate-100 dark:border-slate-800 pb-5">
          <img 
            src="/logo.png" 
            alt="Milgos Logo" 
            referrerPolicy="no-referrer"
            onError={(e) => { 
              const img = e.currentTarget as HTMLImageElement;
              if (img.src.includes('/logo.png')) {
                img.src = 'https://lh3.googleusercontent.com/d/1lsjEbs-loMm1NyLaLSeZbCxcudmxpqPG';
              }
            }}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white border-2 border-red-100 shadow-lg object-contain shrink-0 p-0.5 ring-2 ring-red-500/20" 
          />
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">MILGO'S</h1>
            <p className="text-xs sm:text-sm font-bold text-red-600 dark:text-red-400 tracking-wider uppercase mt-1">FIRED UP CHICKEN • POS</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Profile Selection */}
          {serveusesList.length > 0 ? (
            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                1. Sélectionner votre profil :
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-2xl">
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
                        pinInputRef.current?.focus();
                      }}
                      className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between text-left touch-manipulation active:scale-98 ${
                        isSelected
                          ? 'bg-red-600 text-white shadow-md shadow-red-600/20 ring-2 ring-red-300 dark:ring-red-900'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 truncate pr-2">
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
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Identifiant utilisateur :
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="ex: admin1"
                  value={usernameInput}
                  onChange={(e) => {
                    setUsernameInput(e.target.value);
                    setErrorMsg('');
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-red-500 rounded-xl pl-10 pr-3.5 py-2.5 text-sm font-extrabold text-slate-900 dark:text-white placeholder-slate-400 outline-none transition-all"
                />
              </div>
            </div>
          )}

          {/* PIN Input Section with Native Keyboard Support */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                2. Code PIN de sécurité (4 chiffres) :
              </label>
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 flex items-center space-x-1 transition-colors"
              >
                {showPin ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Masquer</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>Afficher</span>
                  </>
                )}
              </button>
            </div>

            {/* Interactive Visual 4-Box PIN Display (tapping it focuses native keyboard input) */}
            <div 
              onClick={() => pinInputRef.current?.focus()}
              className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 sm:p-5 text-center cursor-pointer relative group transition-all hover:border-red-300 dark:hover:border-red-900/60"
            >
              {/* Invisible native input for capturing mobile/desktop keyboard events */}
              <input
                ref={pinInputRef}
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                autoComplete="one-time-code"
                autoFocus
                value={pinInput}
                onChange={handlePinChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 text-transparent"
                aria-label="Code PIN de sécurité"
              />

              {/* 4 Box Visual Indicator */}
              <div className="flex justify-center space-x-3.5 py-1 pointer-events-none">
                {[0, 1, 2, 3].map((idx) => {
                  const digit = pinInput[idx];
                  const isFilled = digit !== undefined;
                  const isCurrent = pinInput.length === idx;

                  return (
                    <div
                      key={idx}
                      className={`w-12 h-14 sm:w-14 sm:h-16 rounded-2xl border-2 flex items-center justify-center text-2xl font-black transition-all ${
                        isFilled
                          ? 'bg-red-600 border-red-600 text-white shadow-md shadow-red-600/25 scale-105'
                          : isCurrent
                          ? 'bg-white dark:bg-slate-900 border-red-500 ring-4 ring-red-500/20 text-slate-900 dark:text-white'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400'
                      }`}
                    >
                      {isFilled ? (showPin ? digit : '●') : ''}
                    </div>
                  );
                })}
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 font-medium flex items-center justify-center space-x-1.5">
                <KeyRound className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <span>Touchez ou cliquez pour ouvrir le clavier de votre appareil</span>
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-2xl text-xs font-bold flex items-center space-x-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || pinInput.length < 4}
            className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-black text-sm rounded-2xl shadow-xl shadow-red-600/30 transition-all flex items-center justify-center space-x-2 touch-manipulation active:scale-98 min-h-[52px]"
          >
            <ShieldCheck className="w-5 h-5" />
            <span>{loading ? 'Vérification en cours...' : 'Se Connecter à la Caisse'}</span>
          </button>

        </form>

      </div>
    </div>
  );
};

