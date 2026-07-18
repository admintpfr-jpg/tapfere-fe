import React, { useState, useEffect } from 'react';
import {
  Trash2, UserPlus, Shield, Loader2, Search,
  Pencil, Users, ShieldCheck, Stethoscope, UserCheck, User
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { toast } from 'react-toastify';
import { formatDistanceToNow } from 'date-fns';

interface WhitelistUser {
  id: string;
  email: string;
  role: string;
  displayName?: string | null;
  createdAt: string;
  lastLogin: string | null;
}

const ROLE_CONFIG: Record<string, { label: string; className: string; dot: string }> = {
  ADMIN:     { label: 'Admin',     className: 'bg-[#0f385a]/8 text-[#0f385a] border border-[#0f385a]/15',      dot: 'bg-[#0f385a]'   },
  THERAPIST: { label: 'Therapist', className: 'bg-amber-50 text-amber-700 border border-amber-200/60',          dot: 'bg-amber-500'   },
  CLIENT:    { label: 'Client',    className: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',    dot: 'bg-[#1cb78d]'  },
};

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CONFIG[role] ?? { label: role, className: 'bg-gray-100 text-gray-600 border border-gray-200', dot: 'bg-gray-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold ${cfg.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} flex-shrink-0`} />
      {cfg.label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={18} strokeWidth={2} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
        <p className="text-[11px] text-gray-500 mt-0.5 font-medium">{label}</p>
      </div>
    </div>
  );
}

function RolePicker({ value, onChange }: { value: string; onChange: (r: string) => void }) {
  const roles = ['THERAPIST', 'CLIENT', 'ADMIN'];
  return (
    <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-gray-50 p-1 gap-1">
      {roles.map(role => {
        const cfg = ROLE_CONFIG[role];
        const active = value === role;
        return (
          <button
            key={role}
            type="button"
            onClick={() => onChange(role)}
            className={`flex-1 py-1.5 px-2 rounded-md text-[12px] font-semibold transition-all cursor-pointer
              ${active ? `${cfg.className} bg-white shadow-sm` : 'text-gray-500 hover:text-gray-800 hover:bg-white/60'}
            `}
          >
            {cfg.label}
          </button>
        );
      })}
    </div>
  );
}

export default function UserManagement() {
  const [users,   setUsers]   = useState<WhitelistUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  const [newEmail, setNewEmail] = useState('');
  const [newName,  setNewName]  = useState('');
  const [newRole,  setNewRole]  = useState('THERAPIST');
  const [adding,   setAdding]   = useState(false);

  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [userToDelete,   setUserToDelete] = useState<WhitelistUser | null>(null);
  const [userToEdit,     setUserToEdit]   = useState<WhitelistUser | null>(null);
  const [editRole,       setEditRole]     = useState('');

  const navigate = useNavigate();
  const token    = localStorage.getItem('access_token');
  const apiUrl   = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const fetchWhitelist = async () => {
    try {
      if (!token) { navigate('/login'); return; }
      const res = await fetch(`${apiUrl}/users/whitelist`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load users');
      setUsers(await res.json());
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWhitelist(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      const res = await fetch(`${apiUrl}/users/whitelist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          email: newEmail,
          role: newRole,
          ...(newName.trim() && { displayName: newName.trim() }),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || 'Failed to add user');
      }
      toast.success('User added to platform');
      setNewEmail(''); setNewName(''); setNewRole('THERAPIST');
      setAddModalOpen(false);
      fetchWhitelist();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setAdding(false);
    }
  };

  const openEdit = (u: WhitelistUser) => { setUserToEdit(u); setEditRole(u.role); };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit) return;
    try {
      const res = await fetch(`${apiUrl}/users/whitelist/${userToEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: editRole }),
      });
      if (!res.ok) throw new Error('Failed to update role');
      toast.success('Role updated');
      setUsers(prev => prev.map(u => u.id === userToEdit.id ? { ...u, role: editRole } : u));
      setUserToEdit(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleRevokeConfirm = async () => {
    if (!userToDelete) return;
    try {
      const res = await fetch(`${apiUrl}/users/whitelist/${userToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to revoke access');
      toast.success('Access revoked');
      setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const displayed = users.filter(u => {
    const matchesSearch = u.email.toLowerCase().includes(filter.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const counts = {
    total:     users.length,
    admins:    users.filter(u => u.role === 'ADMIN').length,
    therapists:users.filter(u => u.role === 'THERAPIST').length,
    clients:   users.filter(u => u.role === 'CLIENT').length,
  };

  return (
    <div className="h-full flex flex-col gap-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[17px] font-bold text-gray-900 tracking-tight">User Management</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">Control who can access the Tapfere platform</p>
        </div>
        <button
          onClick={() => setAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0f385a] hover:bg-[#0c2e48] text-white text-[13px] font-semibold rounded-xl transition-all cursor-pointer shadow-sm shadow-[#0f385a]/20 hover:-translate-y-0.5"
        >
          <UserPlus size={14} strokeWidth={2.5} />
          Add User
        </button>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users}        label="Total Users"  value={counts.total}      color="bg-[#0f385a]" />
        <StatCard icon={ShieldCheck}  label="Admins"       value={counts.admins}     color="bg-[#0f385a]/70" />
        <StatCard icon={Stethoscope}  label="Therapists"   value={counts.therapists} color="bg-amber-500" />
        <StatCard icon={UserCheck}    label="Clients"      value={counts.clients}    color="bg-[#1cb78d]" />
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 min-w-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
            <input
              type="text"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Search by email…"
              className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-[12px] text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#1cb78d]/20 focus:border-[#1cb78d] transition-all w-full sm:w-64 shadow-sm"
            />
          </div>

          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-[12px] font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-[#1cb78d]/20 focus:border-[#1cb78d] transition-all cursor-pointer shadow-sm w-full sm:w-auto"
          >
            <option value="ALL">All Roles</option>
            <option value="ADMIN">Admins Only</option>
            <option value="THERAPIST">Therapists Only</option>
            <option value="CLIENT">Clients Only</option>
          </select>

          {(filter || roleFilter !== 'ALL') && (
            <button
              onClick={() => { setFilter(''); setRoleFilter('ALL'); }}
              className="text-[11px] font-bold text-[#1cb78d] hover:text-[#159e78] transition-colors cursor-pointer self-start"
            >
              Clear Filters
            </button>
          )}
        </div>

        <span className="text-[11px] text-gray-400 font-medium self-start sm:self-auto">
          {displayed.length} {displayed.length === 1 ? 'result' : 'results'}
        </span>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-52 gap-3">
            <Loader2 className="animate-spin text-[#1cb78d]" size={24} />
            <p className="text-[12px] text-gray-400">Loading users…</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="pl-6 pr-3 py-3.5 w-10">
                  <input type="checkbox" className="rounded-md border-gray-300 cursor-pointer accent-[#1cb78d]" />
                </th>
                <th className="px-3 py-3.5 text-[10.5px] font-semibold text-gray-400 uppercase tracking-widest">User</th>
                <th className="px-3 py-3.5 text-[10.5px] font-semibold text-gray-400 uppercase tracking-widest">Role</th>
                <th className="px-3 py-3.5 text-[10.5px] font-semibold text-gray-400 uppercase tracking-widest hidden lg:table-cell">Last Login</th>
                <th className="px-3 py-3.5 text-[10.5px] font-semibold text-gray-400 uppercase tracking-widest hidden md:table-cell">Date Added</th>
                <th className="pr-6 py-3.5 text-right text-[10.5px] font-semibold text-gray-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Shield className="text-gray-400" size={24} />
                    </div>
                    <p className="text-[13px] font-semibold text-gray-600">
                      {filter ? 'No matching users' : 'No users yet'}
                    </p>
                    <p className="text-[12px] text-gray-400 mt-1">
                      {filter ? 'Try a different search term' : 'Click "Add User" to get started'}
                    </p>
                    {!filter && (
                      <button
                        onClick={() => setAddModalOpen(true)}
                        className="mt-4 px-4 py-2 bg-[#0f385a] text-white text-[12px] font-semibold rounded-xl cursor-pointer hover:bg-[#0c2e48] transition-colors"
                      >
                        Add first user
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                displayed.map((u, i) => (
                  <tr
                    key={u.id}
                    className={`group transition-all hover:bg-gray-50/70 ${i < displayed.length - 1 ? 'border-b border-gray-50' : ''}`}
                  >
                    <td className="pl-6 pr-3 py-4">
                      <input type="checkbox" className="rounded-md border-gray-300 cursor-pointer accent-[#1cb78d]" />
                    </td>

                    <td className="px-3 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-[#0f385a]/10 ring-2 ring-white shadow-sm flex items-center justify-center flex-shrink-0">
                            <User size={14} className="text-[#0f385a]" />
                          </div>
                          <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${ROLE_CONFIG[u.role]?.dot ?? 'bg-gray-400'}`} />
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-gray-900">{u.displayName || u.email}</p>
                          <p className="text-[11px] text-gray-400">{u.displayName ? u.email : `${u.id?.slice(0, 8)}…`}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-4">
                      <RoleBadge role={u.role} />
                    </td>

                    <td className="px-3 py-4 hidden lg:table-cell">
                      <span className="text-[12px] text-gray-500">
                        {u.lastLogin
                          ? formatDistanceToNow(new Date(u.lastLogin), { addSuffix: true })
                          : 'Never logged in'}
                      </span>
                    </td>

                    <td className="px-3 py-4 hidden md:table-cell">
                      <span className="text-[12px] text-gray-500">
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : '—'}
                      </span>
                    </td>

                    <td className="pr-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(u)}
                          className="p-2 text-gray-400 hover:text-[#1cb78d] hover:bg-[#1cb78d]/8 rounded-lg transition-all cursor-pointer"
                          title="Edit role"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setUserToDelete(u)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                          title="Revoke access"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* ── Add User Modal ── */}
      <Modal isOpen={isAddModalOpen} onClose={() => { setAddModalOpen(false); setNewEmail(''); setNewName(''); setNewRole('THERAPIST'); }} title="Add User">
        <form onSubmit={handleAdd} className="space-y-5">
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-2 uppercase tracking-wider">
              Google Email
            </label>
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              required
              autoFocus
              placeholder="dr.someone@tapfere.com"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#1cb78d]/20 focus:border-[#1cb78d] transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-2 uppercase tracking-wider">
              Name <span className="text-gray-400 font-normal normal-case">(optional)</span>
            </label>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Dr. Someone"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#1cb78d]/20 focus:border-[#1cb78d] transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-2 uppercase tracking-wider">
              Platform Role
            </label>
            <RolePicker value={newRole} onChange={setNewRole} />
          </div>

          <button
            type="submit"
            disabled={adding}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#0f385a] hover:bg-[#0c2e48] text-white text-[13px] font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
          >
            {adding ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
            {adding ? 'Adding…' : 'Grant Access'}
          </button>
        </form>
      </Modal>

      {/* ── Edit Role Modal ── */}
      <Modal isOpen={!!userToEdit} onClose={() => setUserToEdit(null)} title="Edit Role">
        <form onSubmit={handleEditSave} className="space-y-5">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div className="w-8 h-8 rounded-full bg-[#0f385a]/10 flex items-center justify-center flex-shrink-0">
              <User size={14} className="text-[#0f385a]" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-gray-900">{userToEdit?.email}</p>
              <p className="text-[11px] text-gray-400">Current: <span className="font-semibold">{userToEdit?.role}</span></p>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-2 uppercase tracking-wider">
              New Role
            </label>
            <RolePicker value={editRole} onChange={setEditRole} />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setUserToEdit(null)}
              className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 text-[13px] font-semibold rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-[#0f385a] hover:bg-[#0c2e48] text-white text-[13px] font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Revoke Confirm ── */}
      <ConfirmDialog
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleRevokeConfirm}
        title="Revoke Access"
        message={`Remove ${userToDelete?.email} from the whitelist? They will immediately lose platform access.`}
        confirmText="Revoke Access"
        isDestructive={true}
      />
    </div>
  );
}
