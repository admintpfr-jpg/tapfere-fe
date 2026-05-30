import React, { useState, useEffect } from 'react';
import {
  Search, Loader2, Stethoscope,
  Pencil, X, Check, Activity,
  ChevronDown, ChevronUp, UserCheck, MessageSquare, User, Link2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

interface Patient {
  id: string;
  email: string;
  name: string;
  displayName: string | null;
}

interface Assignment {
  id: string;
  patientVisibleName: string | null;
  adminLabel: string | null;
  patient: Patient;
}

interface Therapist {
  id: string;
  email: string;
  name: string;
  displayName: string | null;
  avatar: string | null;
  therapistAssignments: Assignment[];
  createdAt: string;
}

export default function TherapistManagement() {
  const [therapists,  setTherapists]  = useState<Therapist[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [searching,   setSearching]   = useState('');
  const [expandedId,  setExpandedId]  = useState<string | null>(null);
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [newTherapistData, setNewTherapistData] = useState({ email: '', displayName: '' });
  const [editingDisplayName, setEditingDisplayName] = useState<{ id: string, name: string } | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isAssignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedTherapist, setSelectedTherapist] = useState<Therapist | null>(null);
  const [assignParams, setAssignParams] = useState({ patientId: '', name: '', adminLabel: '' });

  const navigate = useNavigate();
  const token    = localStorage.getItem('access_token');
  const apiUrl   = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const fetchData = async () => {
    try {
      if (!token) { navigate('/login'); return; }

      const [tRes, pRes] = await Promise.all([
        fetch(`${apiUrl}/patients/therapists-with-patients`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${apiUrl}/patients`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (!tRes.ok || !pRes.ok) throw new Error('Failed to load data');
      setTherapists(await tRes.json());
      setPatients(await pRes.json());
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignPatient = async () => {
    if (!selectedTherapist || !assignParams.patientId) return;
    try {
      const res = await fetch(`${apiUrl}/patients/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          patientId: assignParams.patientId,
          therapistId: selectedTherapist.id,
          patientVisibleName: assignParams.name,
          adminLabel: assignParams.adminLabel,
        }),
      });
      if (!res.ok) throw new Error('Assignment failed');
      toast.success('Patient assigned');
      setAssignModalOpen(false);
      setAssignParams({ patientId: '', name: '', adminLabel: '' });
      fetchData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAddTherapist = async () => {
    if (!newTherapistData.email) return;
    try {
      const res = await fetch(`${apiUrl}/whitelist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: newTherapistData.email, role: 'THERAPIST', displayName: newTherapistData.displayName }),
      });
      if (!res.ok) throw new Error('Failed to add therapist');
      toast.success('Therapist authorized');
      setAddModalOpen(false);
      setNewTherapistData({ email: '', displayName: '' });
      fetchData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleUpdateName = async () => {
    if (!editingDisplayName) return;
    try {
      const res = await fetch(`${apiUrl}/patients/${editingDisplayName.id}/display-name`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ displayName: editingDisplayName.name }),
      });
      if (!res.ok) throw new Error('Failed to update name');
      toast.success('Therapist name updated');
      setEditingDisplayName(null);
      fetchData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const filteredTherapists = therapists.filter(t => 
    t.email.toLowerCase().includes(searching.toLowerCase()) || 
    (t.displayName || t.name).toLowerCase().includes(searching.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-gray-900 tracking-tight">Therapist Management</h1>
          <p className="text-[12px] text-gray-400 mt-0.5 font-medium">Review workloads and manage professional aliases</p>
        </div>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-[#1cb78d]/10 flex items-center justify-center text-[#1cb78d]">
            <Stethoscope size={20} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 leading-none">{therapists.length}</p>
            <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-normal mt-1">Total Professionals</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-[#0f385a]/10 flex items-center justify-center text-[#0f385a]">
            <Activity size={20} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 leading-none">
              {therapists.reduce((acc, t) => acc + t.therapistAssignments.length, 0)}
            </p>
            <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-normal mt-1">Active Treatments</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
          <input
            type="text"
            placeholder="Search therapists..."
            value={searching}
            onChange={e => setSearching(e.target.value)}
            className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-[12px] w-full sm:w-64 outline-none focus:ring-2 focus:ring-[#1cb78d]/20 focus:border-[#1cb78d] transition-all shadow-sm"
          />
        </div>
        <button
          onClick={() => setAddModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-[#0f385a] text-white text-[12px] font-bold rounded-xl hover:bg-[#0c2e48] transition-all shadow-sm cursor-pointer w-full sm:w-auto"
        >
          <Stethoscope size={16} />
          Register New Therapist
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Loader2 className="animate-spin text-[#1cb78d]" size={24} />
            <p className="text-[12px] text-gray-400">Loading professional directory...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[500px]">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/30">
                <th className="pl-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-normal">Professional</th>
                <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-normal text-center">Active Load</th>
                <th className="pr-6 py-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-normal">Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredTherapists.map((t) => (
                <React.Fragment key={t.id}>
                  <tr className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                    <td className="pl-6 py-4">
                      <div className="flex items-center gap-3">
                        {t.avatar
                          ? <img src={t.avatar} className="w-9 h-9 rounded-full object-cover border border-gray-100" alt="" />
                          : <div className="w-9 h-9 rounded-full bg-[#0f385a]/10 border border-gray-100 flex items-center justify-center flex-shrink-0">
                              <User size={15} className="text-[#0f385a]" />
                            </div>
                        }
                        <div className="flex-1 min-w-0">
                          {editingDisplayName?.id === t.id ? (
                            <div className="flex items-center gap-2">
                              <input 
                                type="text" 
                                value={editingDisplayName.name}
                                onChange={e => setEditingDisplayName({ ...editingDisplayName, name: e.target.value })}
                                className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-[12px] w-48 outline-none focus:border-[#1cb78d]"
                                autoFocus
                              />
                              <button onClick={handleUpdateName} className="p-1 text-[#1cb78d] hover:bg-[#1cb78d]/10 rounded-md cursor-pointer"><Check size={14} /></button>
                              <button onClick={() => setEditingDisplayName(null)} className="p-1 text-red-400 hover:bg-red-50 rounded-md cursor-pointer"><X size={14} /></button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 group/name">
                              <p className="text-[14px] font-bold text-gray-900 leading-tight truncate">{t.displayName || t.name}</p>
                              {(t as any).isPending && (
                                <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 text-[9px] font-bold uppercase rounded border border-amber-100">Pending</span>
                              )}
                              <button 
                                onClick={() => setEditingDisplayName({ id: t.id, name: t.displayName || t.name })} 
                                className="opacity-0 group-hover/name:opacity-100 p-1 text-gray-400 hover:text-gray-600 transition-all cursor-pointer"
                              >
                                <Pencil size={11} />
                              </button>
                            </div>
                          )}
                          <p className="text-[11px] text-gray-400 mt-0.5 truncate">{t.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold
                        ${t.therapistAssignments.length > 0 ? 'bg-[#1cb78d]/10 text-[#1cb78d]' : 'bg-gray-100 text-gray-400'}
                      `}>
                        {t.therapistAssignments.length} Patients
                      </span>
                    </td>
                    <td className="pr-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setSelectedTherapist(t); setAssignParams({ patientId: '', name: '', adminLabel: '' }); setAssignModalOpen(true); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-[#0f385a] bg-[#0f385a]/10 hover:bg-[#0f385a]/20 rounded-xl transition-all cursor-pointer"
                        >
                          <Link2 size={13} />
                          Assign
                        </button>
                        <button
                          onClick={() => navigate(`/admin/chats/therapist/${t.id}`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-[#1cb78d] bg-[#1cb78d]/10 hover:bg-[#1cb78d]/20 rounded-xl transition-all cursor-pointer"
                        >
                          <MessageSquare size={13} />
                          Chats
                        </button>
                        <button
                          onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                          className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
                        >
                          {expandedId === t.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                  
                  {/* Expanded Patient List */}
                  {expandedId === t.id && (
                    <tr className="bg-gray-50/30">
                      <td colSpan={3} className="px-6 py-4">
                        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <UserCheck size={12} /> Assigned Patients
                          </p>
                          {t.therapistAssignments.length === 0 ? (
                            <p className="text-[12px] text-gray-400 italic">No patients currently assigned to this professional.</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                              {t.therapistAssignments.map(a => (
                                <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-[#1cb78d]/5 hover:border-[#1cb78d]/20 transition-all group/p">
                                  <div className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-700 shadow-sm group-hover/p:border-[#1cb78d]/40">
                                    {a.patient.name.charAt(0)}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex flex-col gap-0.5">
                                      <div className="flex items-center gap-2">
                                        <p className="text-[12px] font-bold text-gray-900 truncate leading-tight">{a.patient.displayName || a.patient.name}</p>
                                        {a.patientVisibleName && (
                                          <span className="text-[9px] px-1 bg-[#1cb78d]/10 text-[#1cb78d] rounded border border-[#1cb78d]/20 font-bold uppercase tracking-tighter">Alias: {a.patientVisibleName}</span>
                                        )}
                                      </div>
                                      {a.adminLabel && (
                                        <span className="text-[9px] px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded border border-purple-100 font-bold uppercase tracking-tighter w-fit">
                                          {a.adminLabel}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-gray-400 truncate mt-0.5">{a.patient.email}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
      {/* Assign Patient Modal */}
      <Modal isOpen={isAssignModalOpen} onClose={() => { setAssignModalOpen(false); setAssignParams({ patientId: '', name: '', adminLabel: '' }); }} title={`Assign patient to ${selectedTherapist?.displayName || selectedTherapist?.name || 'therapist'}`}>
        <div className="space-y-4">
          {assignParams.patientId && (
            <div className="p-4 bg-[#1cb78d]/5 border border-[#1cb78d]/10 rounded-2xl space-y-3 animate-in slide-in-from-top-2">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#1cb78d] uppercase tracking-wider">Patient-Visible Therapist Name</label>
                <input
                  type="text"
                  value={assignParams.name}
                  onChange={e => setAssignParams({ ...assignParams, name: e.target.value })}
                  placeholder="E.g. Dr. Smith"
                  className="w-full px-3 py-2 bg-white border border-[#1cb78d]/20 rounded-xl text-[13px] outline-none focus:ring-2 focus:ring-[#1cb78d]/10 focus:border-[#1cb78d]"
                />
                <p className="text-[10px] text-gray-400">What the patient sees as this therapist's name.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#1cb78d] uppercase tracking-wider">Internal Assignment Label</label>
                <input
                  type="text"
                  value={assignParams.adminLabel}
                  onChange={e => setAssignParams({ ...assignParams, adminLabel: e.target.value })}
                  placeholder="E.g. Morning Therapy / Sports Focus"
                  className="w-full px-3 py-2 bg-white border border-[#1cb78d]/20 rounded-xl text-[13px] outline-none focus:ring-2 focus:ring-[#1cb78d]/10 focus:border-[#1cb78d]"
                />
                <p className="text-[10px] text-gray-400">Internal note visible only to admin.</p>
              </div>
              <button
                onClick={handleAssignPatient}
                className="w-full py-2.5 bg-[#1cb78d] text-white font-bold rounded-xl text-[12px] hover:bg-[#19a580] transition-colors cursor-pointer shadow-sm"
              >
                Confirm Assignment
              </button>
            </div>
          )}

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {patients.map(p => {
              const isAssigned = selectedTherapist?.therapistAssignments.some(a => a.patient.id === p.id);
              const isActive = assignParams.patientId === p.id;
              return (
                <div key={p.id} className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${isActive ? 'border-[#1cb78d] bg-[#1cb78d]/5 shadow-sm' : 'border-gray-100 bg-gray-50/50 hover:bg-gray-50'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#0f385a]/10 flex items-center justify-center text-[12px] font-bold text-[#0f385a] flex-shrink-0">
                      {(p.displayName || p.name).charAt(0)}
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-gray-900">{p.displayName || p.name}</p>
                      <p className="text-[11px] text-gray-400">{p.email}</p>
                    </div>
                  </div>
                  {isAssigned ? (
                    <span className="text-[11px] font-bold text-[#1cb78d] flex items-center gap-1 px-2 py-1 bg-[#1cb78d]/10 rounded-lg"><Check size={12} /> Assigned</span>
                  ) : (
                    <button
                      onClick={() => setAssignParams({ patientId: p.id, name: selectedTherapist?.displayName || selectedTherapist?.name || '', adminLabel: '' })}
                      className="px-3 py-1.5 font-bold rounded-lg text-[11px] bg-[#0f385a] text-white hover:bg-[#0c2e48] transition-colors cursor-pointer shadow-sm"
                    >
                      Select
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Modal>

      {/* Register Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setAddModalOpen(false)} title="Register New Therapist">
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Email Address</label>
            <input 
              type="email" 
              placeholder="therapist@example.com"
              value={newTherapistData.email}
              onChange={e => setNewTherapistData({ ...newTherapistData, email: e.target.value })}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[13px] outline-none focus:bg-white focus:ring-2 focus:ring-[#1cb78d]/20 focus:border-[#1cb78d] transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Therapist Name</label>
            <input 
              type="text" 
              placeholder="E.g. John Doe / Dr. John"
              value={newTherapistData.displayName}
              onChange={e => setNewTherapistData({ ...newTherapistData, displayName: e.target.value })}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[13px] outline-none focus:bg-white focus:ring-2 focus:ring-[#1cb78d]/20 focus:border-[#1cb78d] transition-all"
            />
          </div>
          <button 
            onClick={handleAddTherapist}
            className="w-full py-3 bg-[#0f385a] text-white font-bold rounded-xl hover:bg-[#0c2e48] transition-all mt-2 shadow-md cursor-pointer"
          >
            Authorize Access
          </button>
        </div>
      </Modal>
    </div>
  );
}

const Modal = ({ isOpen, onClose, title, children }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-900 transition-colors cursor-pointer"><X size={18} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};
