import React, { useState } from 'react';
import { Serveuse } from '../types';
import { posApi } from '../services/api';
import { KeyRound, User, Lock, CheckCircle2, AlertCircle, X } from 'lucide-react';

interface WaitstaffLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  serveusesList: Serveuse[];
  currentServeuse: Serveuse | null;
  onSelectServeuse: (serveuse: Serveuse) => void;
}

export const WaitstaffLoginModal: React.FC<WaitstaffLoginModalProps> = ({
  isOpen,
  onClose,
  serveusesList,
  currentServeuse,
  onSelectServeuse,
}) => {
  const [selectedId, setSelectedId] = useState<string>(currentServeuse?.idServeuse || (serveusesList[0]?.idServeuse || 'SRV-001'));
  const [pinInput, setPinInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleKeyPress = (num: string) => {
    if (pinInput.length < 4) {
      setPinInput(prev => prev + num);
      setErrorMsg('');
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

  const handleLoginSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pinInput || pinInput.length < 4) {
      setErrorMsg('Veuillez saisir un code PIN à 4 chiffres');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await posApi.loginServeuse(selectedId, pinInput);
      if (res.success && res.serveuse) {
        onSelectServeuse(res.serveuse);
        setPinInput('');
        onClose();
      } else {
        setErrorMsg(res.message || 'Code PIN invalide pour cette serveuse.');
        setPinInput('');
      }
    } catch (err: any) {
      setErrorMsg('Erreur lors de la vérification');
    } finally {
      setLoading(false);
    }
  };

  // Quick switch bypass for active demo / training
  const handleQuickSelectWithoutPin = (serveuse: Serveuse) => {
    setSelectedId(serveuse.idServeuse);
    setPinInput(serveuse.pin);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl relative overflow-y-auto max-h-[90dvh] touch-scroll-y animate-in fade-in zoom-in duration-200 text-slate-800">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto mb-3">
            <User className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Changer de Serveuse / Session</h2>
          <p className="text-xs text-slate-500 mt-1">Sélectionnez votre identifiant et entrez votre code PIN</p>
        </div>

        {/* Waitstaff Selector Grid */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-700 mb-2">Choisir la Serveuse :</label>
          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
            {serveusesList.map((s) => (
              <button
                key={s.idServeuse}
                type="button"
                onClick={() => handleQuickSelectWithoutPin(s)}
                className={`flex items-center space-x-3 p-3 rounded-xl border text-left transition-all ${
                  selectedId === s.idServeuse
                    ? 'bg-red-50 border-red-500 text-red-950 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                  selectedId === s.idServeuse ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {s.idServeuse.split('-')[1]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate text-slate-900">{s.nom}</div>
                  <div className="text-[10px] text-slate-500 uppercase">{s.role} • ID: {s.idServeuse}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* PIN Display */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-4 text-center">
          <div className="text-xs text-slate-500 mb-1 flex items-center justify-center space-x-1">
            <Lock className="w-3.5 h-3.5 text-red-600" />
            <span>Code PIN Serveuse (4 chiffres)</span>
          </div>
          <div className="flex justify-center space-x-3 py-2">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-10 h-10 rounded-xl border flex items-center justify-center text-xl font-bold transition-all ${
                  pinInput.length > idx
                    ? 'bg-red-600 border-red-600 text-white scale-105'
                    : 'bg-white border-slate-300 text-transparent'
                }`}
              >
                ●
              </div>
            ))}
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Touch Keypad optimized for tablet */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeyPress(digit)}
              className="py-3 bg-slate-100 hover:bg-slate-200 active:bg-red-600 active:text-white text-slate-900 font-bold text-lg rounded-xl border border-slate-200 transition-colors touch-manipulation shadow-xs"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="py-3 bg-slate-100 hover:bg-slate-200 text-amber-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors touch-manipulation shadow-xs"
          >
            EFFACER
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="py-3 bg-slate-100 hover:bg-slate-200 active:bg-red-600 active:text-white text-slate-900 font-bold text-lg rounded-xl border border-slate-200 transition-colors touch-manipulation shadow-xs"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="py-3 bg-slate-100 hover:bg-slate-200 text-red-600 font-semibold text-xs rounded-xl border border-slate-200 transition-colors touch-manipulation shadow-xs"
          >
            ⌫ RETOUR
          </button>
        </div>

        {/* Submit Action */}
        <button
          onClick={() => handleLoginSubmit()}
          disabled={loading || pinInput.length < 4}
          className="w-full py-3.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md shadow-red-600/20 transition-all flex items-center justify-center space-x-2 touch-manipulation active:scale-95"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>{loading ? 'Vérification...' : 'Valider & Activer Session'}</span>
        </button>

      </div>
    </div>
  );
};
