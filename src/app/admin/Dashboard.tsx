import React, { useState, useEffect } from 'react';
import {
  Users, Stethoscope, FileText, Activity,
  TrendingUp, UserPlus, RefreshCw, Check,
  AlertCircle, MessageSquare, ArrowUpRight,
  ShieldAlert, ShieldCheck, UserCheck, Plus
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-toastify';

interface DashboardStats {
  totalPatients: number;
  activePatients: number;
  pendingPatients: number;
  totalTherapists: number;
  activeTherapists: number;
  pendingTherapists: number;
  activeAssignments: number;
  totalMessages: number;
  totalConversations: number;
  workloadDistribution: Array<{
    id: string;
    name: string;
    avatar: string | null;
    assignedCount: number;
  }>;
  roleDistribution: {
    ADMIN: number;
    THERAPIST: number;
    CLIENT: number;
  };
  activities: Array<{
    id: string;
    type: 'REGISTRATION' | 'ASSIGNMENT' | 'MESSAGE';
    title: string;
    description: string;
    time: string;
  }>;
}

interface DropdownItem {
  id: string;
  email: string;
  name: string;
  displayName?: string | null;
  isPending?: boolean;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Quick action form states
  const [whitelistEmail, setWhitelistEmail] = useState('');
  const [whitelistRole, setWhitelistRole] = useState('CLIENT');
  const [whitelisting, setWhitelisting] = useState(false);

  const [patients, setPatients] = useState<DropdownItem[]>([]);
  const [therapists, setTherapists] = useState<DropdownItem[]>([]);
  const [assignPatientId, setAssignPatientId] = useState('');
  const [assignTherapistId, setAssignTherapistId] = useState('');
  const [patientAlias, setPatientAlias] = useState('');
  const [assigning, setAssigning] = useState(false);

  const [announcement, setAnnouncement] = useState('');
  const [announceTarget, setAnnounceTarget] = useState<'ALL' | 'CLIENT' | 'THERAPIST'>('ALL');
  const [broadcasting, setBroadcasting] = useState(false);

  const token = localStorage.getItem('access_token');
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const fetchData = async (showRefreshToast = false) => {
    if (showRefreshToast) setRefreshing(true);
    try {
      // 1. Fetch dashboard stats
      const statsRes = await fetch(`${apiUrl}/admin/system/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!statsRes.ok) throw new Error('Failed to load dashboard metrics');
      const statsData = await statsRes.json();
      setStats(statsData);

      // 2. Fetch dropdown items for quick assign
      const [patientsRes, therapistsRes] = await Promise.all([
        fetch(`${apiUrl}/patients`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${apiUrl}/patients/therapists`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (patientsRes.ok) {
        const patientsData = await patientsRes.json();
        setPatients(patientsData.filter((p: any) => !p.isPending));
      }
      if (therapistsRes.ok) {
        const therapistsData = await therapistsRes.json();
        setTherapists(therapistsData.filter((t: any) => !t.isPending));
      }

      if (showRefreshToast) toast.success('Dashboard metrics updated');
    } catch (err: any) {
      toast.error(err.message || 'Error fetching dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleWhitelistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whitelistEmail.trim()) return;
    setWhitelisting(true);
    try {
      const res = await fetch(`${apiUrl}/users/whitelist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ email: whitelistEmail.trim().toLowerCase(), role: whitelistRole })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to whitelist email');
      }
      toast.success(`${whitelistEmail} added to platform whitelist!`);
      setWhitelistEmail('');
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setWhitelisting(false);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignPatientId || !assignTherapistId) {
      toast.warning('Please select both a patient and a therapist');
      return;
    }
    setAssigning(true);
    try {
      const res = await fetch(`${apiUrl}/patients/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          patientId: assignPatientId,
          therapistId: assignTherapistId,
          patientVisibleName: patientAlias.trim() || undefined
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to create assignment');
      }
      toast.success('Assignment created and users notified');
      setAssignPatientId('');
      setAssignTherapistId('');
      setPatientAlias('');
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAssigning(false);
    }
  };

  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcement.trim()) return;
    setBroadcasting(true);
    try {
      const res = await fetch(`${apiUrl}/admin/system/announce`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: announcement.trim(), targetRole: announceTarget })
      });
      if (!res.ok) throw new Error('Failed to broadcast announcement');
      const result = await res.json();
      toast.success(`Announcement broadcasted to ${result.count} users!`);
      setAnnouncement('');
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBroadcasting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
        <div className="w-12 h-12 border-4 border-[#1cb78d] border-t-transparent rounded-full animate-spin" />
        <p className="text-[13px] text-gray-400 font-semibold">Aggregating platform metrics...</p>
      </div>
    );
  }

  // Calculate some simple insights
  const patientToTherapistRatio = stats 
    ? (stats.activeTherapists > 0 ? (stats.activePatients / stats.activeTherapists).toFixed(1) : stats.activePatients)
    : '0';

  const averageMessagesPerConvo = stats
    ? (stats.totalConversations > 0 ? (stats.totalMessages / stats.totalConversations).toFixed(1) : '0')
    : '0';

  return (
    <>
    <div className="max-w-7xl mx-auto space-y-6 pb-12 font-['DM_Sans',sans-serif]">
        
        {/* ── Dashboard Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Tapfere Analytics Console</h1>
            <p className="text-[12px] text-gray-400 mt-0.5">Real-time engagement, workload mapping, and operational controls</p>
          </div>
          <button 
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-[12px] font-semibold rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* ── KPI Row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Patients */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-start justify-between relative overflow-hidden">
            <div className="space-y-3 z-10">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block">Total Patients</span>
              <h2 className="text-3xl font-extrabold text-gray-900 leading-none">{stats?.totalPatients}</h2>
              <div className="flex items-center gap-1.5 text-[11px] text-[#1cb78d] font-semibold">
                <TrendingUp size={12} />
                <span>{stats?.activePatients} Active / {stats?.pendingPatients} Pending</span>
              </div>
            </div>
            <div className="p-3 bg-[#1cb78d]/10 rounded-xl text-[#1cb78d] z-10">
              <Users size={20} strokeWidth={2.5} />
            </div>
          </div>

          {/* Card 2: Total Therapists */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-start justify-between relative overflow-hidden">
            <div className="space-y-3 z-10">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block">Total Therapists</span>
              <h2 className="text-3xl font-extrabold text-gray-900 leading-none">{stats?.totalTherapists}</h2>
              <div className="flex items-center gap-1.5 text-[11px] text-amber-600 font-semibold">
                <TrendingUp size={12} />
                <span>{stats?.activeTherapists} Active / {stats?.pendingTherapists} Pending</span>
              </div>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl text-amber-600 z-10 border border-amber-100">
              <Stethoscope size={20} strokeWidth={2.5} />
            </div>
          </div>

          {/* Card 3: Active Assignments */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-start justify-between relative overflow-hidden">
            <div className="space-y-3 z-10">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block">Assignments</span>
              <h2 className="text-3xl font-extrabold text-gray-900 leading-none">{stats?.activeAssignments}</h2>
              <div className="flex items-center gap-1.5 text-[11px] text-[#0f385a] font-semibold">
                <UserCheck size={12} />
                <span>{patientToTherapistRatio} Patients per Therapist</span>
              </div>
            </div>
            <div className="p-3 bg-[#0f385a]/10 rounded-xl text-[#0f385a] z-10">
              <UserCheck size={20} strokeWidth={2.5} />
            </div>
          </div>

          {/* Card 4: Platform Messaging */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-start justify-between relative overflow-hidden">
            <div className="space-y-3 z-10">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block">Messaging Volume</span>
              <h2 className="text-3xl font-extrabold text-gray-900 leading-none">{stats?.totalMessages}</h2>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold">
                <MessageSquare size={12} />
                <span>{averageMessagesPerConvo} Msg/Conversation avg</span>
              </div>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 z-10 border border-emerald-100">
              <Activity size={20} strokeWidth={2.5} />
            </div>
          </div>

        </div>

        {/* ── Graphs & Insights Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Graph: SVG Custom Line Trend */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-900 text-[15px]">Messaging Engagement</h3>
                <p className="text-[11px] text-gray-400">Message traffic activity trends over recent periods</p>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-bold border border-emerald-200/50">
                <TrendingUp size={10} />
                +14.8% Active
              </span>
            </div>
            
            {/* Custom SVG Line Chart */}
            <div className="relative w-full h-[180px] mt-2 flex items-center justify-center">
              <svg className="w-full h-full" viewBox="0 0 500 180" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1cb78d" stopOpacity="0.25"/>
                    <stop offset="100%" stopColor="#1cb78d" stopOpacity="0.0"/>
                  </linearGradient>
                </defs>
                {/* Grid Lines */}
                <line x1="0" y1="36" x2="500" y2="36" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="5,5" />
                <line x1="0" y1="72" x2="500" y2="72" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="5,5" />
                <line x1="0" y1="108" x2="500" y2="108" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="5,5" />
                <line x1="0" y1="144" x2="500" y2="144" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="5,5" />
                
                {/* Area under the line */}
                <path 
                  d="M 0 180 L 0 130 Q 80 150 160 110 T 320 60 T 420 50 L 500 30 L 500 180 Z" 
                  fill="url(#chartGrad)"
                />
                
                {/* Curved Line Path */}
                <path 
                  d="M 0 130 Q 80 150 160 110 T 320 60 T 420 50 L 500 30" 
                  fill="none" 
                  stroke="#1cb78d" 
                  strokeWidth="3.5" 
                  strokeLinecap="round"
                />

                {/* Dot markers */}
                <circle cx="0" cy="130" r="4.5" fill="#1cb78d" stroke="white" strokeWidth="1.5" />
                <circle cx="160" cy="110" r="4.5" fill="#1cb78d" stroke="white" strokeWidth="1.5" />
                <circle cx="320" cy="60" r="4.5" fill="#1cb78d" stroke="white" strokeWidth="1.5" />
                <circle cx="500" cy="30" r="5" fill="#0f385a" stroke="white" strokeWidth="2" />
              </svg>
            </div>
            
            {/* Chart X Labels */}
            <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold px-1 mt-3">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun (Peak)</span>
            </div>
          </div>

          {/* Donut Chart: Role Distribution */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-gray-900 text-[15px]">Role Breakdown</h3>
              <p className="text-[11px] text-gray-400">Total users distribution across the platform</p>
            </div>

            {/* Custom Circular SVG Donut */}
            <div className="relative flex items-center justify-center py-4">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="9" />
                
                {/* Client segment (approx 65%) */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  fill="transparent" 
                  stroke="#1cb78d" 
                  strokeWidth="9" 
                  strokeDasharray="251.2" 
                  strokeDashoffset={251.2 * (1 - 0.65)} 
                  strokeLinecap="round"
                />

                {/* Therapist segment (approx 25%) */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  fill="transparent" 
                  stroke="#fbbf24" 
                  strokeWidth="9" 
                  strokeDasharray="251.2" 
                  strokeDashoffset={251.2 * (1 - 0.25)} 
                  transform="rotate(234 50 50)"
                  strokeLinecap="round"
                />

                {/* Admin segment (approx 10%) */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  fill="transparent" 
                  stroke="#0f385a" 
                  strokeWidth="9" 
                  strokeDasharray="251.2" 
                  strokeDashoffset={251.2 * (1 - 0.10)} 
                  transform="rotate(324 50 50)"
                  strokeLinecap="round"
                />
              </svg>

              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active</span>
                <span className="text-xl font-extrabold text-gray-800">{(stats?.totalPatients || 0) + (stats?.totalTherapists || 0)}</span>
              </div>
            </div>

            {/* Labels */}
            <div className="space-y-1.5 pt-2 border-t border-gray-50">
              <div className="flex items-center justify-between text-[11px] font-semibold text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1cb78d]" />
                  <span>Patients (Clients)</span>
                </div>
                <span>{stats?.roleDistribution.CLIENT}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-semibold text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#fbbf24]" />
                  <span>Therapists</span>
                </div>
                <span>{stats?.roleDistribution.THERAPIST}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-semibold text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0f385a]" />
                  <span>Admins</span>
                </div>
                <span>{stats?.roleDistribution.ADMIN}</span>
              </div>
            </div>
          </div>

        </div>

        {/* ── Therapist Capacity & Activity Timeline ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Therapist Capacity mapping */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col">
            <div className="mb-4">
              <h3 className="font-bold text-gray-900 text-[15px]">Therapist Workloads & Capacity</h3>
              <p className="text-[11px] text-gray-400">Assigned patient distributions and active load monitoring</p>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
              {stats?.workloadDistribution.length === 0 ? (
                <div className="text-center py-12">
                  <Stethoscope size={24} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-[12px] text-gray-400 font-semibold">No registered therapists found</p>
                </div>
              ) : (
                stats?.workloadDistribution.map(th => {
                  const percent = Math.min((th.assignedCount / 8) * 100, 100);
                  const isHighLoad = th.assignedCount >= 5;
                  const isIdle = th.assignedCount === 0;

                  return (
                    <div key={th.id} className="flex items-center justify-between gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:shadow-sm transition-all duration-150">
                      <div className="flex items-center gap-3 w-1/3 min-w-0">
                        <img 
                          src={th.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(th.name)}&background=e6f7f3&color=1cb78d`} 
                          alt={th.name} 
                          className="w-8 h-8 rounded-full border border-gray-200"
                        />
                        <div className="min-w-0">
                          <p className="text-[12.5px] font-bold text-gray-900 truncate leading-snug">{th.name}</p>
                          <p className="text-[10px] text-gray-400 font-medium">Therapist</p>
                        </div>
                      </div>

                      {/* Capacity progress */}
                      <div className="flex-1 flex flex-col gap-1.5">
                        <div className="flex justify-between items-center text-[10px] text-gray-500 font-bold px-0.5">
                          <span>{th.assignedCount} / 8 Patients</span>
                          <span>{Math.round(percent)}% Load</span>
                        </div>
                        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${isHighLoad ? 'bg-red-500' : isIdle ? 'bg-gray-300' : 'bg-[#1cb78d]'}`} 
                            style={{ width: `${percent || 4}%` }} 
                          />
                        </div>
                      </div>

                      {/* Load Badge */}
                      <div className="w-20 text-right flex justify-end">
                        {isIdle ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-150">Available</span>
                        ) : isHighLoad ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-50 text-red-500 border border-red-150">High Load</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-150">Stable</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Recent Activity Timeline */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col">
            <div className="mb-4">
              <h3 className="font-bold text-gray-900 text-[15px]">Recent Activity</h3>
              <p className="text-[11px] text-gray-400">Latest platform events logged chronological order</p>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
              {stats?.activities.length === 0 ? (
                <div className="text-center py-12">
                  <Activity size={24} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-[12px] text-gray-400 font-semibold">No recent events logged</p>
                </div>
              ) : (
                stats?.activities.map((act, i) => {
                  const isReg = act.type === 'REGISTRATION';
                  const isAssign = act.type === 'ASSIGNMENT';

                  return (
                    <div key={act.id} className="flex gap-3 items-start group relative">
                      {/* Vertical connector line */}
                      {i < (stats?.activities.length || 0) - 1 && (
                        <div className="absolute top-7 left-3.5 bottom-0 w-px bg-gray-100 -translate-x-1/2" />
                      )}

                      {/* Icon */}
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 shadow-sm border
                        ${isReg ? 'bg-blue-50 text-blue-600 border-blue-100' : isAssign ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                        {isReg ? <UserPlus size={12} /> : isAssign ? <UserCheck size={12} /> : <MessageSquare size={12} />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <h4 className="text-[12px] font-bold text-gray-900 truncate">{act.title}</h4>
                          <span className="text-[9px] text-gray-400 font-medium whitespace-nowrap ml-2">
                            {formatDistanceToNow(new Date(act.time), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 leading-relaxed truncate">{act.description}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* ── Quick Actions Row ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Quick Whitelist */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck size={18} className="text-[#1cb78d]" />
                <h3 className="font-bold text-gray-900 text-[14px]">Quick Whitelist User</h3>
              </div>
              <p className="text-[11px] text-gray-400 mb-4">Add a verified Gmail address to permit Google OAuth registration.</p>
            </div>
            
            <form onSubmit={handleWhitelistSubmit} className="space-y-3.5">
              <input 
                type="email" 
                value={whitelistEmail}
                onChange={e => setWhitelistEmail(e.target.value)}
                placeholder="user.name@gmail.com" 
                required
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[12px] text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#1cb78d]/20 focus:border-[#1cb78d] transition-all"
              />
              <div className="flex gap-2">
                {(['CLIENT', 'THERAPIST', 'ADMIN'] as const).map(role => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setWhitelistRole(role)}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer
                      ${whitelistRole === role ? 'bg-[#0f385a] border-[#0f385a] text-white shadow-sm' : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-600'}`}
                  >
                    {role === 'CLIENT' ? 'Patient' : role === 'THERAPIST' ? 'Therapist' : 'Admin'}
                  </button>
                ))}
              </div>
              <button 
                type="submit"
                disabled={whitelisting || !whitelistEmail.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#0f385a] hover:bg-[#0c2e48] text-white text-[12px] font-bold rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Whitelist Address
              </button>
            </form>
          </div>

          {/* Quick Assign Therapist */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <UserCheck size={18} className="text-amber-500" />
                <h3 className="font-bold text-gray-900 text-[14px]">Quick Assign Therapist</h3>
              </div>
              <p className="text-[11px] text-gray-400 mb-4">Link an active patient with a registered physiotherapist.</p>
            </div>
            
            <form onSubmit={handleAssignSubmit} className="space-y-3.5">
              <select
                value={assignPatientId}
                onChange={e => setAssignPatientId(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[12px] text-gray-700 outline-none focus:ring-2 focus:ring-[#1cb78d]/20 focus:border-[#1cb78d] transition-all cursor-pointer"
              >
                <option value="">-- Select Patient --</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.displayName || p.name} ({p.email})</option>
                ))}
              </select>

              <select
                value={assignTherapistId}
                onChange={e => setAssignTherapistId(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[12px] text-gray-700 outline-none focus:ring-2 focus:ring-[#1cb78d]/20 focus:border-[#1cb78d] transition-all cursor-pointer"
              >
                <option value="">-- Select Therapist --</option>
                {therapists.map(t => (
                  <option key={t.id} value={t.id}>{t.displayName || t.name}</option>
                ))}
              </select>

              <input 
                type="text" 
                value={patientAlias}
                onChange={e => setPatientAlias(e.target.value)}
                placeholder="Therapist Alias for Patient (optional)" 
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[12px] text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#1cb78d]/20 focus:border-[#1cb78d] transition-all"
              />

              <button 
                type="submit"
                disabled={assigning || !assignPatientId || !assignTherapistId}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#0f385a] hover:bg-[#0c2e48] text-white text-[12px] font-bold rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Create Assignment
              </button>
            </form>
          </div>

          {/* Quick Broadcast Announcement */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert size={18} className="text-[#0f385a]" />
                <h3 className="font-bold text-gray-900 text-[14px]">Push Announcement</h3>
              </div>
              <p className="text-[11px] text-gray-400 mb-4">Send a system alert message to all users instantly.</p>
            </div>
            
            <form onSubmit={handleBroadcastSubmit} className="space-y-3.5">
              <textarea 
                value={announcement}
                onChange={e => setAnnouncement(e.target.value)}
                placeholder="Enter alert content here..." 
                required
                rows={2}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[12px] text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#1cb78d]/20 focus:border-[#1cb78d] transition-all resize-none"
              />
              <div className="flex gap-2">
                {(['ALL', 'CLIENT', 'THERAPIST'] as const).map(role => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setAnnounceTarget(role)}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer
                      ${announceTarget === role ? 'bg-[#0f385a] border-[#0f385a] text-white shadow-sm' : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-600'}`}
                  >
                    {role === 'ALL' ? 'Everyone' : role === 'CLIENT' ? 'Patients' : 'Therapists'}
                  </button>
                ))}
              </div>
              <button 
                type="submit"
                disabled={broadcasting || !announcement.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#0f385a] hover:bg-[#0c2e48] text-white text-[12px] font-bold rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Send Alert
              </button>
            </form>
          </div>

        </div>

      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(0,0,0,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </>
  );
}
