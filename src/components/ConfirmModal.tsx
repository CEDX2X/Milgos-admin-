import React from 'react';
import { AlertTriangle, CheckCircle, Trash2, ShoppingBag, X } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary' | 'warning' | 'success';
  icon?: 'trash' | 'check' | 'warning' | 'cart';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  variant = 'primary',
  icon = 'warning',
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const renderIcon = () => {
    switch (icon) {
      case 'trash':
        return <Trash2 className="w-6 h-6 text-red-600" />;
      case 'cart':
        return <ShoppingBag className="w-6 h-6 text-red-600" />;
      case 'check':
        return <CheckCircle className="w-6 h-6 text-emerald-600" />;
      case 'warning':
      default:
        return <AlertTriangle className="w-6 h-6 text-amber-600" />;
    }
  };

  const getIconBg = () => {
    switch (variant) {
      case 'danger':
        return 'bg-red-100 border-red-200';
      case 'success':
        return 'bg-emerald-100 border-emerald-200';
      case 'warning':
        return 'bg-amber-100 border-amber-200';
      case 'primary':
      default:
        return 'bg-red-100 border-red-200';
    }
  };

  const getConfirmButtonStyle = () => {
    switch (variant) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-200';
      case 'success':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-200';
      case 'primary':
      default:
        return 'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative text-slate-800 my-auto animate-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3.5 mb-3.5">
          <div className={`p-2.5 sm:p-3 rounded-2xl border flex items-center justify-center shrink-0 ${getIconBg()}`}>
            {renderIcon()}
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">
              {title}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">
              Confirmation requise
            </p>
          </div>
        </div>

        {/* Modal Content */}
        <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl mb-5">
          {message}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all touch-manipulation active:scale-95 disabled:opacity-50"
          >
            {cancelText}
          </button>
          
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-5 py-2.5 font-extrabold text-xs rounded-xl transition-all touch-manipulation active:scale-95 flex items-center space-x-2 disabled:opacity-50 ${getConfirmButtonStyle()}`}
          >
            {isLoading ? (
              <span>Traitement...</span>
            ) : (
              <span>{confirmText}</span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
