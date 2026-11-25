import React, { useState } from 'react';
import { Serveuse, RoleServeuse } from '../types';
import { Users, UserPlus, Trash2, CheckCircle2, Shield, AlertTriangle, X, UserCheck, RefreshCw, Eye, EyeOff, CheckSquare, Square } from 'lucide-react';
import { formatPrice } from '../utils/format';
import { ConfirmModal } from './ConfirmModal';

const ALL_PERMISSIONS = [
  { id: 'commande', label: '🛒 Prise de commande & Tables' },
  { id: 'suivi', label: '🍳 Suivi Cuisine & Bar (Temps réel)' },
  { id: 'caisse', label: '💶 Caisse & Encaissement' },
  { id: 'catalogue', label: '📦 Catalogue, Menu & Stocks' },
  { id: 'serveuses', label: '👥 Gestion du Personnel' },
  { id: 'historique', label: '📊 Historique des Ventes & Rapports' },
  { id: 'parametres', label: '⚙️ Paramètres & Configuration' }
];

const getDefaultPermissionsForRole = (r: RoleServeuse): string[] => {
  switch (r) {
    case 'admin':
      return ['commande', 'suivi', 'caisse', 'catalogue', 'serveuses', 'historique', 'parametres'];
    case 'caissier':
      return ['commande', 'caisse', 'historique'];
    case 'cuisine':
    case 'barman':
      return ['suivi'];
    case 'serveuse':
    default:
      return ['commande'];
  }
};

interface WaitstaffManagerViewProps {
  serveuses: Serveuse[];
  currentServeuse?: Serveuse | null;
  onCreateServeuse: (serveuse: Partial<Serveuse>) => Promise<void>;
  onUpdateServeuse: (idServeuse: string, updates: Partial<Serveuse>) => Promise<void>;
  onDeleteServeuse: (idServeuse: string) => Promise<void>;
}

export const WaitstaffManagerView: React.FC<WaitstaffManagerViewProps> = ({
  serveuses,
  currentServeuse,
  onCreateServeuse,
  onUpdateServeuse,
  onDeleteServeuse
}) => {
  const [username, setUsername] = useState('');
  const [nom, setNom] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState<RoleServeuse>('serveuse');
  const [permissions, setPermissions] = useState<string[]>(() => getDefaultPermissionsForRole('serveuse'));
  const [isCreating, setIsCreating] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});

  const toggleRevealPin = (idServeuse: string) => {
    setRevealedPins(prev => ({
      ...prev,
      [idServeuse]: !prev[idServeuse]
    }));
  };

  const handleRoleChange = (newRole: RoleServeuse) => {
    setRole(newRole);
    setPermissions(getDefaultPermissionsForRole(newRole));
  };

  const togglePermission = (permId: string) => {
    setPermissions(prev =>
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
  };

  // Editing profile state
  const [editingServeuse, setEditingServeuse] = useState<Serveuse | null>(null);
  const [editNom, setEditNom] = useState('');
  const [editPin, setEditPin] = useState('');
  const [editRole, setEditRole] = useState<RoleServeuse>('serveuse');
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleEditRoleChange = (newRole: RoleServeuse) => {
    setEditRole(newRole);
    setEditPermissions(getDefaultPermissionsForRole(newRole));
  };

  const toggleEditPermission = (permId: string) => {
    setEditPermissions(prev =>
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
  };

  // Delete modal state
  const [serveuseToDelete, setServeuseToDelete] = useState<Serveuse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [editError, setEditError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim() || !pin.trim()) return;

    setIsCreating(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const customId = username.trim() || `SRV-${Math.floor(Math.random() * 900 + 100)}`;
      await onCreateServeuse({
        idServeuse: customId,
        nom: nom.trim(),
        pin: pin.trim(),
        role,
        permissions,
        actif: true
      });
      setSuccessMessage(`Profil "${nom}" (${role}) créé avec succès en base de données !`);
      setUsername('');
      setNom('');
      setPin('');
      setPermissions(getDefaultPermissionsForRole('serveuse'));
      setRole('serveuse');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      console.error('Error creating serveuse:', err);
      setErrorMessage(err.message || 'Erreur lors de la création du profil.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartEdit = (srv: Serveuse) => {
    setEditingServeuse(srv);
    setEditNom(srv.nom);
    setEditPin(srv.pin);
    setEditRole(srv.role);
    setEditPermissions(srv.permissions || getDefaultPermissionsForRole(srv.role));
    setEditError('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingServeuse || !editNom.trim() || !editPin.trim()) return;
    setIsSavingEdit(true);
    setEditError('');
    try {
      await onUpdateServeuse(editingServeuse.idServeuse, {
        nom: editNom.trim(),
        pin: editPin.trim(),
        role: editRole,
        permissions: editPermissions
      });
      setEditingServeuse(null);
    } catch (err: any) {
      console.error('Error updating serveuse:', err);
      setEditError(err.message || 'Erreur lors de la mise à jour.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const confirmDelete = async () => {
    if (!serveuseToDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteServeuse(serveuseToDelete.idServeuse);
      setServeuseToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full min-h-full flex flex-col bg-slate-50 text-slate-800 p-3 sm:p-6 pb-20 sm:pb-8 space-y-4 sm:space-y-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-sm sm:text-base text-slate-900">Gestion du Personnel & Profils Utilisateurs</h2>
            <p className="text-xs text-slate-500">Création des comptes Admin, Serveuses et Cuisiniers avec noms d'affichage et codes PIN personnalisés</p>
          </div>
        </div>

        <div className="text-xs font-bold text-red-700 bg-red-50 px-3 py-1.5 rounded-xl border border-red-200 self-start sm:self-auto shrink-0">
          {serveuses.length} comptes enregistrés
        </div>
      </div>

      {/* Main Grid: Form Left, Roster Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        
        {/* Create Profile Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <UserPlus className="w-5 h-5 text-red-600" />
            <h3 className="font-extrabold text-sm text-slate-900">Créer un Nouveau Profil</h3>
          </div>

          {successMessage && (
            <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 p-3 rounded-2xl text-xs font-bold flex items-center space-x-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="bg-red-50 text-red-800 border border-red-200 p-3 rounded-2xl text-xs font-bold flex items-center space-x-2 animate-fade-in">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Nom d'affichage (Nom complet) :</label>
              <input
                type="text"
                required
                placeholder="ex: Marie Curie ou Chef Paul"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 outline-none focus:border-red-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Identifiant / Username (Optionnel) :</label>
              <input
                type="text"
                placeholder="ex: serveuse1, cuisinier1, admin2"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 outline-none focus:border-red-500 font-medium"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Si vide, un identifiant automatique sera généré.</span>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Code PIN d'Accès (4 chiffres) :</label>
              <input
                type="text"
                required
                maxLength={4}
                placeholder="ex: 1234"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 font-mono text-center tracking-widest text-base outline-none focus:border-red-500"
              />
            </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Rôle Principal :</label>
                <select
                  value={role}
                  onChange={(e) => handleRoleChange(e.target.value as RoleServeuse)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:border-red-500 font-medium"
                >
                  <option value="serveuse">Serveuse</option>
                  <option value="caissier">Caissier</option>
                  <option value="cuisine">Cuisinier</option>
                  <option value="barman">Barman</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="block text-slate-700 font-bold">Accès & Permissions (personnalisables) :</label>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1.5 max-h-44 overflow-y-auto">
                  {ALL_PERMISSIONS.map(perm => {
                    const isChecked = permissions.includes(perm.id);
                    return (
                      <div
                        key={perm.id}
                        onClick={() => togglePermission(perm.id)}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors border ${
                          isChecked
                            ? 'bg-red-50/70 border-red-200 text-slate-900 font-bold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 font-medium'
                        }`}
                      >
                        <span className="text-[11px]">{perm.label}</span>
                        <div className={`w-4 h-4 rounded flex items-center justify-center ${isChecked ? 'bg-red-600 text-white' : 'border border-slate-300 bg-white'}`}>
                          {isChecked && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <span className="text-[10px] text-slate-400 block">Cochez ou décochez les accès selon vos envies pour ce profil.</span>
              </div>

            <button
              type="submit"
              disabled={isCreating}
              className={`w-full py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-red-600/20 transition-all touch-manipulation active:scale-95 flex items-center justify-center space-x-2 ${
                isCreating ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isCreating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Sauvegarde en base...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Créer le Profil Utilisateur</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Waitstaff Roster */}
        <div className="lg:col-span-2 space-y-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Liste des Profils Actifs ({serveuses.length})</span>
            <span className="text-[11px] text-red-600 font-mono">Accès Sécurisé par PIN</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {serveuses.map((srv) => {
              const isCurrentLoggedIn = currentServeuse && (currentServeuse.idServeuse === srv.idServeuse || currentServeuse.nom === srv.nom);

              const getRoleBadgeUI = (r: string) => {
                switch (r) {
                  case 'admin':
                    return <span className="bg-purple-100 text-purple-800 border border-purple-200 uppercase text-[10px] px-2 py-0.5 rounded font-black">Admin</span>;
                  case 'caissier':
                    return <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase text-[10px] px-2 py-0.5 rounded font-black">Caissier</span>;
                  case 'cuisine':
                    return <span className="bg-amber-100 text-amber-800 border border-amber-200 uppercase text-[10px] px-2 py-0.5 rounded font-black">Cuisinier</span>;
                  case 'barman':
                    return <span className="bg-cyan-100 text-cyan-800 border border-cyan-200 uppercase text-[10px] px-2 py-0.5 rounded font-black">Barman</span>;
                  default:
                    return <span className="bg-slate-100 text-slate-800 border border-slate-200 uppercase text-[10px] px-2 py-0.5 rounded font-black">Serveuse</span>;
                }
              };

              return (
                <div
                  key={srv.idServeuse}
                  className={`bg-white border rounded-2xl p-3.5 sm:p-4 space-y-3 relative overflow-hidden shadow-xs transition-all ${
                    isCurrentLoggedIn
                      ? 'border-red-500 ring-2 ring-red-500/20'
                      : 'border-slate-200 hover:border-red-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center justify-center font-black text-sm shrink-0 uppercase">
                        {srv.nom ? srv.nom.substring(0, 2) : 'US'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <h4 className="font-extrabold text-sm text-slate-900 truncate">{srv.nom}</h4>
                          {isCurrentLoggedIn && (
                            <span className="bg-red-100 text-red-700 text-[9px] font-black uppercase px-1.5 py-0.5 rounded flex items-center space-x-0.5 shrink-0">
                              <UserCheck className="w-3 h-3 text-red-600" />
                              <span>En session</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center space-x-1.5 mt-0.5">
                          <span>ID: <strong className="text-red-600">{srv.idServeuse}</strong></span>
                          <span>•</span>
                          <div>{getRoleBadgeUI(srv.role)}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      {/* Edit button */}
                      <button
                        onClick={() => handleStartEdit(srv)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors touch-manipulation active:scale-95"
                        title="Éditer le profil"
                      >
                        <Shield className="w-4 h-4" />
                      </button>

                      {/* Active/Inactive Toggle */}
                      <button
                        onClick={() => onUpdateServeuse(srv.idServeuse, { actif: !srv.actif })}
                        className={`text-[10px] font-extrabold px-2 py-1 rounded-lg border transition-colors shrink-0 ${
                          srv.actif
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                            : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
                        }`}
                        title="Basculer le statut actif/inactif"
                      >
                        {srv.actif ? 'Actif' : 'Inactif'}
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => setServeuseToDelete(srv)}
                        className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors touch-manipulation active:scale-95"
                        title="Supprimer le profil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Details Card */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold">Code PIN</div>
                      <div className="font-mono text-slate-800 font-bold flex items-center justify-center space-x-1 mt-0.5">
                        <span className="tracking-wider">
                          {revealedPins[srv.idServeuse] ? srv.pin : '••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleRevealPin(srv.idServeuse)}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors"
                          title={revealedPins[srv.idServeuse] ? "Masquer le code PIN" : "Révéler le code PIN"}
                        >
                          {revealedPins[srv.idServeuse] ? (
                            <EyeOff className="w-3.5 h-3.5 text-slate-600" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold">Commandes</div>
                      <div className="font-extrabold text-slate-900 mt-1">{srv.commandesTraitees || 0}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold">Total Ventes</div>
                      <div className="font-extrabold text-red-600 truncate mt-1">{formatPrice(srv.chiffreAffaires || 0)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Edit Profile Modal */}
      {editingServeuse && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-900">Éditer le Profil : {editingServeuse.nom}</h3>
              <button
                onClick={() => setEditingServeuse(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Nom d'affichage :</label>
                <input
                  type="text"
                  required
                  value={editNom}
                  onChange={(e) => setEditNom(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 font-medium outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Nouveau Code PIN (4 chiffres) :</label>
                <input
                  type="text"
                  required
                  maxLength={4}
                  value={editPin}
                  onChange={(e) => setEditPin(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 font-mono text-center tracking-widest text-base outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Rôle Principal :</label>
                <select
                  value={editRole}
                  onChange={(e) => handleEditRoleChange(e.target.value as RoleServeuse)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium outline-none focus:border-red-500"
                >
                  <option value="serveuse">Serveuse</option>
                  <option value="caissier">Caissier</option>
                  <option value="cuisine">Cuisinier</option>
                  <option value="barman">Barman</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="block text-slate-700 font-bold">Accès & Permissions (personnalisables) :</label>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1.5 max-h-40 overflow-y-auto">
                  {ALL_PERMISSIONS.map(perm => {
                    const isChecked = editPermissions.includes(perm.id);
                    return (
                      <div
                        key={perm.id}
                        onClick={() => toggleEditPermission(perm.id)}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors border ${
                          isChecked
                            ? 'bg-red-50/70 border-red-200 text-slate-900 font-bold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 font-medium'
                        }`}
                      >
                        <span className="text-[11px]">{perm.label}</span>
                        <div className={`w-4 h-4 rounded flex items-center justify-center ${isChecked ? 'bg-red-600 text-white' : 'border border-slate-300 bg-white'}`}>
                          {isChecked && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingServeuse(null)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="w-1/2 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md"
                >
                  {isSavingEdit ? 'Sauvegarde...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!serveuseToDelete}
        title="Supprimer le profil ?"
        variant="danger"
        icon="trash"
        confirmText="Supprimer définitivement"
        cancelText="Annuler"
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setServeuseToDelete(null)}
        message={
          <div className="space-y-2">
            <p>
              Êtes-vous sûr de vouloir supprimer définitivement ce profil ?
            </p>
            {serveuseToDelete && (
              <div className="bg-white border border-slate-200 p-3 rounded-xl space-y-1 text-slate-800 font-medium">
                <div>Nom : <strong className="text-slate-900 font-extrabold">{serveuseToDelete.nom}</strong></div>
                <div>ID / Username : <span className="font-mono text-red-600 font-bold">{serveuseToDelete.idServeuse}</span></div>
                <div>Role : <span className="uppercase text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-bold text-slate-700">{serveuseToDelete.role}</span></div>
              </div>
            )}
          </div>
        }
      />

    </div>
  );
};
