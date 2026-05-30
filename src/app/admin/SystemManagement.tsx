import React, { useState, useEffect } from 'react';
import { Send, Save, MessageSquare, Shield, Users, Stethoscope, RefreshCcw, Bell } from 'lucide-react';
import { toast } from 'react-toastify';
import AdminLayout from './layout';

interface SystemConfig {
  clientWelcomeMessage: string;
  therapistWelcomeMessage: string;
}

export default function SystemManagement() {
  const [config, setConfig] = useState<SystemConfig>({
    clientWelcomeMessage: '',
    therapistWelcomeMessage: ''
  });
  const [announcement, setAnnouncement] = useState('');
  const [targetRole, setTargetRole] = useState<'ALL' | 'CLIENT' | 'THERAPIST'>('ALL');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem('access_token');
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${apiUrl}/admin/system/config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (err) {
      toast.error('Failed to load system configuration');
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${apiUrl}/admin/system/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        toast.success('System configuration updated successfully');
      } else {
        toast.error('Failed to update configuration');
      }
    } catch (err) {
      toast.error('Network error while saving configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleBroadcast = async () => {
    if (!announcement.trim()) {
      toast.warning('Please enter an announcement message');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/admin/system/announce`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: announcement.trim(), targetRole })
      });
      if (res.ok) {
        const result = await res.json();
        toast.success(`Announcement broadcasted to ${result.count} users!`);
        setAnnouncement('');
      } else {
        toast.error('Failed to broadcast announcement');
      }
    } catch (err) {
      toast.error('Network error during broadcast');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout breadcrumb="System Settings">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Row 1: Welcome Messages */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-[#1cb78d]/10 rounded-lg text-[#1cb78d]">
                 <Users size={20} />
              </div>
              <h3 className="font-bold text-gray-900">Patient Welcome Message</h3>
            </div>
            <textarea
              className="w-full h-40 p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1cb78d]/20 focus:border-[#1cb78d] transition-all text-[14px] leading-relaxed resize-none"
              placeholder="Enter greeting for new patients..."
              value={config.clientWelcomeMessage}
              onChange={e => setConfig({ ...config, clientWelcomeMessage: e.target.value })}
            />
            <p className="mt-2 text-[11px] text-gray-400 font-medium italic">Supports {`{name}`} placeholder</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-[#0f385a]/10 rounded-lg text-[#0f385a]">
                 <Stethoscope size={20} />
              </div>
              <h3 className="font-bold text-gray-900">Therapist Welcome Message</h3>
            </div>
            <textarea
              className="w-full h-40 p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1cb78d]/20 focus:border-[#1cb78d] transition-all text-[14px] leading-relaxed resize-none"
              placeholder="Enter greeting for new therapists..."
              value={config.therapistWelcomeMessage}
              onChange={e => setConfig({ ...config, therapistWelcomeMessage: e.target.value })}
            />
            <p className="mt-2 text-[11px] text-gray-400 font-medium italic">Supports {`{name}`} placeholder</p>
          </div>
        </div>

        <div className="flex justify-end">
          <button 
            onClick={handleSaveConfig}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#1cb78d] hover:bg-[#18a07b] text-white font-bold rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            {saving ? <RefreshCcw size={18} className="animate-spin" /> : <Save size={18} />}
            Save System Configuration
          </button>
        </div>

        {/* Row 2: Mass Announcement */}
        <div className="bg-[#0f385a] rounded-3xl p-8 shadow-xl text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-white/10 rounded-2xl">
                 <Bell size={24} className="text-[#1cb78d]" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Mass Announcement Broadcast</h3>
                <p className="text-white/60 text-[13px]">Send a push notification from Tapfere Support to users</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex flex-wrap gap-3">
                {(['ALL', 'CLIENT', 'THERAPIST'] as const).map(role => (
                  <button
                    key={role}
                    onClick={() => setTargetRole(role)}
                    className={`px-4 py-1.5 rounded-full text-[12px] font-bold border transition-all ${targetRole === role ? 'bg-[#1cb78d] border-[#1cb78d]' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                  >
                    {role === 'ALL' ? 'Everyone' : role === 'CLIENT' ? 'All Patients' : 'All Therapists'}
                  </button>
                ))}
              </div>

              <div className="relative">
                <textarea
                  className="w-full h-32 p-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-[#1cb78d]/50 focus:border-[#1cb78d] transition-all text-[15px] placeholder-white/30 resize-none"
                  placeholder="Type your announcement message here..."
                  value={announcement}
                  onChange={e => setAnnouncement(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[12px] text-white/60">
                   <Shield size={14} />
                   This will create a one-way message in the Support chat.
                </div>
                <button 
                  onClick={handleBroadcast}
                  disabled={loading || !announcement.trim()}
                  className="flex items-center gap-2 px-8 py-3 bg-[#1cb78d] hover:bg-[#18a07b] text-white font-bold rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <RefreshCcw size={18} className="animate-spin" /> : <Send size={18} />}
                  Push Announcement
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
