import React, { useState, useEffect } from 'react';
import {
  Users, UserPlus, Search, Loader2, Link2,
  Trash2, Shield, Stethoscope, UserCheck,
  Pencil, X, Check, Save, MessageSquare, User
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { toast } from 'react-toastify';

interface Therapist {
  id: string;
  email: string;
  name: string;
  displayName: string | null;
  avatar: string | null;
}

interface Assignment {
  id: string;
  therapistId: string;
  patientVisibleName: string | null;
  adminLabel: string | null;
  therapist: Therapist;
}

interface Patient {
  id: string;
  email: string;
  name: string;
  displayName: string | null;
  patientAssignments: Assignment[];
  createdAt: string;
}

export default function PatientManagement() {
  const [patients,    setPatients]    = useState<Patient[]>([]);
  const [therapists,  setTherapists]  = useState<Therapist[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [searching,   setSearching]   = useState('');
  
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isAssignModalOpen, setAssignModalOpen] = useState(false);
  const [assignmentParams, setAssignmentParams] = useState({ therapistId: '', name: '', adminLabel: '' });
  const [isOnboardModalOpen, setOnboardModalOpen] = useState(false);
  const [newPatientData, setNewPatientData] = useState({ email: '', displayName: '' });
  const [editingDisplayName, setEditingDisplayName] = useState<{ id: string, name: string } | null>(null);

  const navigate = useNavigate();
  const token    = localStorage.getItem('access_token');
  const apiUrl   = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const fetchData = async () => {
    try {
      if (!token) { navigate('/login'); return; }
      
      const [pRes, tRes] = await Promise.all([
        fetch(`${apiUrl}/patients`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${apiUrl}/patients/therapists`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (!pRes.ok || !tRes.ok) throw new Error('Failed to load data');
      
      setPatients(await pRes.json());
      setTherapists(await tRes.json());
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAssign = async () => {
    if (!selectedPatient || !assignmentParams.therapistId) return;
    try {
      const res = await fetch(`${apiUrl}/patients/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          patientId: selectedPatient.id, 
          therapistId: assignmentParams.therapistId,
          patientVisibleName: assignmentParams.name,
          adminLabel: assignmentParams.adminLabel
        }),
      });
      if (!res.ok) throw new Error('Assignment failed');
      toast.success('Therapist assigned');
      setAssignModalOpen(false);
      setAssignmentParams({ therapistId: '', name: '', adminLabel: '' });
      fetchData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleOnboard = async () => {
    if (!newPatientData.email) return;
    try {
      const res = await fetch(`${apiUrl}/whitelist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: newPatientData.email, role: 'CLIENT', displayName: newPatientData.displayName }),
      });
      if (!res.ok) throw new Error('Onboarding failed');
      toast.success('Patient whitelisted');
      setOnboardModalOpen(false);
      setNewPatientData({ email: '', displayName: '' });
      fetchData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleRemoveAssignment = async (patientId: string, therapistId: string) => {
    try {
      const res = await fetch(`${apiUrl}/patients/assign/${patientId}/${therapistId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to remove assignment');
      toast.success('Assignment removed');
      fetchData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleUpdateDisplayName = async () => {
    if (!editingDisplayName) return;
    try {
      const res = await fetch(`${apiUrl}/patients/${editingDisplayName.id}/display-name`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ displayName: editingDisplayName.name }),
      });
      if (!res.ok) throw new Error('Failed to update display name');
      toast.success('Label updated');
      setEditingDisplayName(null);
      fetchData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const filteredPatients = patients.filter(p => 
    p.email.toLowerCase().includes(searching.toLowerCase()) || 
    (p.displayName || p.name).toLowerCase().includes(searching.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-gray-900 tracking-tight">Patient Management</h1>
          <p className="text-[12px] text-gray-400 mt-0.5 font-medium">Assign therapists and manage patient privacy labels</p>
        </div>
      </div>


      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
          <input
            type="text"
            placeholder="Search patients..."
            value={searching}
            onChange={e => setSearching(e.target.value)}
            className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-[12px] w-full sm:w-64 outline-none focus:ring-2 focus:ring-[#1cb78d]/20 focus:border-[#1cb78d] transition-all shadow-sm"
          />
        </div>
        <button
          onClick={() => setOnboardModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-[#1cb78d] text-white text-[12px] font-bold rounded-xl hover:bg-[#19a580] transition-all shadow-sm cursor-pointer w-full sm:w-auto"
        >
          <UserPlus size={16} />
          Onboard New Patient
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Loader2 className="animate-spin text-[#1cb78d]" size={24} />
            <p className="text-[12px] text-gray-400">Syncing patient data...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/30">
                <th className="pl-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-normal">Patient Details</th>
                <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-normal">Display Label (Patient Views)</th>
                <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-normal">Assigned Therapists</th>
                <th className="pr-6 py-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-normal">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                  <td className="pl-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-[13px]">
                        {p.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-bold text-gray-900 leading-tight">{p.name}</p>
                          {(p as any).isPending && (
                            <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 text-[9px] font-bold uppercase rounded border border-amber-100">Pending</span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5">{p.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {editingDisplayName?.id === p.id ? (
                      <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          value={editingDisplayName.name}
                          onChange={e => setEditingDisplayName({ ...editingDisplayName, name: e.target.value })}
                          className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-[12px] w-40 outline-none focus:border-[#1cb78d]"
                          autoFocus
                        />
                        <button onClick={handleUpdateDisplayName} className="p-1 text-[#1cb78d] hover:bg-[#1cb78d]/10 rounded-md cursor-pointer"><Check size={14} /></button>
                        <button onClick={() => setEditingDisplayName(null)} className="p-1 text-red-400 hover:bg-red-50 rounded-md cursor-pointer"><X size={14} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group/label">
                        <span className={`text-[12px] font-semibold ${p.displayName ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                          {p.displayName || 'Set privacy label...'}
                        </span>
                        <button 
                          onClick={() => setEditingDisplayName({ id: p.id, name: p.displayName || p.name })} 
                          className="opacity-0 group-hover/label:opacity-100 p-1 text-gray-400 hover:text-gray-600 transition-all cursor-pointer"
                        >
                          <Pencil size={11} />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {p.patientAssignments.map(a => (
                        <div key={a.id} className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 pl-1 pr-2 py-0.5 bg-white border border-gray-200 rounded-full group/chip hover:border-red-100 hover:bg-red-50 transition-all">
                            {a.therapist.avatar
                              ? <img src={a.therapist.avatar} className="w-4 h-4 rounded-full object-cover" alt="" />
                              : <div className="w-4 h-4 rounded-full bg-[#0f385a]/10 flex items-center justify-center flex-shrink-0">
                                  <User size={9} className="text-[#0f385a]" />
                                </div>
                            }
                            <span className="text-[11px] font-bold text-gray-700">{a.patientVisibleName || a.therapist.displayName || a.therapist.name}</span>
                            <button 
                              onClick={() => handleRemoveAssignment(p.id, a.therapist.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                            >
                              <X size={10} strokeWidth={3} />
                            </button>
                          </div>
                          {a.adminLabel && (
                            <span className="text-[9px] px-2 py-0.5 bg-purple-50 text-purple-600 rounded-md border border-purple-100 font-bold uppercase tracking-tight self-start">
                              {a.adminLabel}
                            </span>
                          )}
                        </div>
                      ))}
                      {(p as any).isPending && (
                        <span className="text-[10px] text-gray-300 italic">Login required</span>
                      )}
                    </div>
                  </td>
                  <td className="pr-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {!(p as any).isPending && (
                        <button
                          onClick={() => { setSelectedPatient(p); setAssignModalOpen(true); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-[#0f385a] bg-[#0f385a]/10 hover:bg-[#0f385a]/20 rounded-xl transition-all cursor-pointer"
                        >
                          <Link2 size={13} />
                          Assign
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/admin/chats/client/${p.id}`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-[#1cb78d] bg-[#1cb78d]/10 hover:bg-[#1cb78d]/20 rounded-xl transition-all cursor-pointer"
                      >
                        <MessageSquare size={13} />
                        Chats
                      </button>
                      <button className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Onboard Modal */}
      <Modal isOpen={isOnboardModalOpen} onClose={() => setOnboardModalOpen(false)} title="Onboard New Patient">
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Email Address</label>
            <input 
              type="email" 
              placeholder="patient@example.com"
              value={newPatientData.email}
              onChange={e => setNewPatientData({ ...newPatientData, email: e.target.value })}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[13px] outline-none focus:bg-white focus:ring-2 focus:ring-[#1cb78d]/20 focus:border-[#1cb78d] transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Privacy Label (Optional)</label>
            <input 
              type="text" 
              placeholder="E.g. Patient A"
              value={newPatientData.displayName}
              onChange={e => setNewPatientData({ ...newPatientData, displayName: e.target.value })}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[13px] outline-none focus:bg-white focus:ring-2 focus:ring-[#1cb78d]/20 focus:border-[#1cb78d] transition-all"
            />
          </div>
          <button 
            onClick={handleOnboard}
            className="w-full py-3 bg-[#0f385a] text-white font-bold rounded-xl hover:bg-[#0c2e48] transition-all mt-2 shadow-md cursor-pointer"
          >
            Authorize Access
          </button>
        </div>
      </Modal>

      {/* Assignment Modal */}
      <Modal isOpen={isAssignModalOpen} onClose={() => setAssignModalOpen(false)} title="Assign therapist">
        <div className="space-y-4">
          <p className="text-[12px] text-gray-500">Pick a professional to assign to <span className="font-bold text-gray-900">{selectedPatient?.name}</span></p>
          
          {assignmentParams.therapistId && (
             <div className="p-4 bg-[#1cb78d]/5 border border-[#1cb78d]/10 rounded-2xl space-y-3 animate-in slide-in-from-top-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#1cb78d] uppercase tracking-wider">Patient-Visible Name</label>
                  <input 
                    type="text" 
                    value={assignmentParams.name}
                    onChange={e => setAssignmentParams({ ...assignmentParams, name: e.target.value })}
                    placeholder="E.g. Dr. John"
                    className="w-full px-3 py-2 bg-white border border-[#1cb78d]/20 rounded-xl text-[13px] outline-none focus:ring-2 focus:ring-[#1cb78d]/10 focus:border-[#1cb78d]"
                  />
                  <p className="text-[10px] text-gray-400">What the patient sees in their portal.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#1cb78d] uppercase tracking-wider">Internal Assignment Label</label>
                  <input 
                    type="text" 
                    value={assignmentParams.adminLabel}
                    onChange={e => setAssignmentParams({ ...assignmentParams, adminLabel: e.target.value })}
                    placeholder="E.g. Morning Therapy / Sports Focus"
                    className="w-full px-3 py-2 bg-white border border-[#1cb78d]/20 rounded-xl text-[13px] outline-none focus:ring-2 focus:ring-[#1cb78d]/10 focus:border-[#1cb78d]"
                  />
                  <p className="text-[10px] text-gray-400">Internal note for Admin/Therapist (e.g. Session timing).</p>
                </div>

                <button 
                  onClick={handleAssign}
                  className="w-full py-2.5 bg-[#1cb78d] text-white font-bold rounded-xl text-[12px] hover:bg-[#19a580] transition-colors cursor-pointer shadow-sm mt-1"
                >
                  Confirm Assignment
                </button>
             </div>
          )}

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
            {therapists.map(t => {
              const isAssigned = selectedPatient?.patientAssignments.some(a => a.therapist.id === t.id);
              const isActive = assignmentParams.therapistId === t.id;

              return (
                <div key={t.id} className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${isActive ? 'border-[#1cb78d] bg-[#1cb78d]/5 shadow-sm' : 'border-gray-100 bg-gray-50/50 hover:bg-gray-50'}`}>
                  <div className="flex items-center gap-3">
                    {t.avatar
                      ? <img src={t.avatar} className="w-8 h-8 rounded-full object-cover border border-white shadow-sm" alt="" />
                      : <div className="w-8 h-8 rounded-full bg-[#0f385a]/10 border border-white shadow-sm flex items-center justify-center flex-shrink-0">
                          <User size={14} className="text-[#0f385a]" />
                        </div>
                    }
                    <div>
                      <p className="text-[13px] font-bold text-gray-900">{t.displayName || t.name}</p>
                      <p className="text-[11px] text-gray-400">{t.email}</p>
                    </div>
                  </div>
                  {isAssigned ? (
                    <span className="text-[11px] font-bold text-[#1cb78d] flex items-center gap-1 px-2 py-1 bg-[#1cb78d]/10 rounded-lg"><Check size={12} /> Assigned</span>
                  ) : (
                    <button 
                      onClick={() => setAssignmentParams({ 
                        therapistId: t.id, 
                        name: t.displayName || t.name,
                        adminLabel: '' 
                      })}
                      className={`px-3 py-1.5 font-bold rounded-lg text-[11px] transition-colors cursor-pointer shadow-sm
                        ${isActive ? 'bg-[#1cb78d] text-white' : 'bg-[#0f385a] text-white hover:bg-[#0c2e48]'}
                      `}
                    >
                      {isActive ? 'Selected' : 'Select'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Modal>
    </div>
  );
}
