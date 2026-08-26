import React from 'react';
import { CheckCircle2, AlertCircle, RefreshCw, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'loading' | 'success' | 'error';
  title: string;
  description?: string;
}

interface ToastNotificationProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-3 left-3 sm:left-auto sm:right-6 sm:bottom-6 z-[9999] flex flex-col space-y-2 max-w-sm sm:max-w-md w-auto pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto p-3.5 sm:p-4 rounded-2xl border shadow-2xl flex items-start space-x-3 transition-all animate-in slide-in-from-bottom-5 fade-in duration-300 ${
            toast.type === 'loading'
              ? 'bg-slate-900/95 text-white border-slate-700 backdrop-blur-md'
              : toast.type === 'success'
              ? 'bg-emerald-950/95 text-emerald-50 border-emerald-600/80 backdrop-blur-md ring-1 ring-emerald-500/30'
              : 'bg-red-950/95 text-red-50 border-red-600/80 backdrop-blur-md ring-1 ring-red-500/30'
          }`}
        >
          <div className="shrink-0 pt-0.5">
            {toast.type === 'loading' && (
              <RefreshCw className="w-5 h-5 text-red-400 animate-spin" />
            )}
            {toast.type === 'success' && (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            )}
            {toast.type === 'error' && (
              <AlertCircle className="w-5 h-5 text-red-400" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-xs sm:text-sm font-black leading-snug">{toast.title}</h4>
            {toast.description && (
              <p className="text-[11px] sm:text-xs opacity-90 font-medium mt-0.5 leading-normal">{toast.description}</p>
            )}
          </div>

          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
