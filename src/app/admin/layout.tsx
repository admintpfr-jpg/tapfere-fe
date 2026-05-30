import React, { useState } from 'react';
import {
  LayoutDashboard, Users, FileText,
  Settings, Shield, Bell, Search, LogOut,
  ChevronLeft, ChevronRight, Stethoscope, Menu, X
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ConfirmDialog } from '../../components/ui/Modal';
import { toast } from 'react-toastify';

interface LayoutProps {
  children: React.ReactNode;
  breadcrumb?: string;
}

const mainNav = [
  { name: 'Dashboard',       icon: LayoutDashboard, path: '/admin/dashboard' },
  { name: 'Inbox',           icon: FileText,         path: '/admin/inbox' },
  { name: 'Therapists',      icon: Stethoscope,      path: '/admin/therapists' },
  { name: 'Patients',        icon: Users,            path: '/admin/patients' },
];

const manageNav = [
  { name: 'User Management', icon: Shield,   path: '/admin/user-management' },
  { name: 'System Settings', icon: Settings, path: '/admin/system'        },
];

function NavSection({
  label,
  items,
  isCollapsed,
  location,
  navigate,
  onNavigate,
}: {
  label: string;
  items: typeof mainNav;
  isCollapsed: boolean;
  location: ReturnType<typeof useLocation>;
  navigate: ReturnType<typeof useNavigate>;
  onNavigate?: () => void;
}) {
  return (
    <div className="mb-4">
      <p className={`px-3 mb-1 text-[10px] font-bold text-gray-400 uppercase tracking-normal ${isCollapsed ? 'md:hidden' : ''}`}>
        {label}
      </p>
      <div className="space-y-0.5">
        {items.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          const Icon = item.icon;
          return (
            <button
              key={item.name}
              onClick={() => { navigate(item.path); onNavigate?.(); }}
              title={isCollapsed ? item.name : ''}
              className={`w-full flex items-center ${isCollapsed ? 'md:justify-center' : 'gap-2.5'} px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 relative cursor-pointer
                ${isActive
                  ? 'bg-[#1cb78d]/10 text-[#1cb78d] font-semibold'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }
              `}
            >
              <Icon size={16} strokeWidth={isActive ? 2.5 : 1.8} className={isActive ? 'text-[#1cb78d]' : 'text-gray-400'} />
              <span className={isCollapsed ? 'md:hidden' : ''}>{item.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SidebarContent({
  isCollapsed,
  search,
  setSearch,
  location,
  navigate,
  onNavigate,
}: {
  isCollapsed: boolean;
  search: string;
  setSearch: (v: string) => void;
  location: ReturnType<typeof useLocation>;
  navigate: ReturnType<typeof useNavigate>;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className={`h-14 flex items-center border-b border-gray-100 flex-shrink-0 ${isCollapsed ? 'justify-center' : 'px-4 gap-2.5'}`}>
        {isCollapsed
          ? <img src="/Tapfere_Logo Mark_1.svg" alt="T" className="h-7 w-auto object-contain" />
          : <img src="/Tapfere_Logo_1.svg"      alt="Tapfere" className="h-10 w-auto object-contain" />
        }
      </div>

      <div className={`px-3 pt-3 pb-2 ${isCollapsed ? 'md:hidden' : ''}`}>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search"
            className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[12px] text-gray-800 placeholder-gray-400 outline-none focus:ring-1 focus:ring-[#1cb78d]/40 focus:border-[#1cb78d] transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pt-2">
        <NavSection label="Main Menu" items={mainNav}   isCollapsed={isCollapsed} location={location} navigate={navigate} onNavigate={onNavigate} />
        <NavSection label="Manage"    items={manageNav} isCollapsed={isCollapsed} location={location} navigate={navigate} onNavigate={onNavigate} />
      </div>

      <div className={`border-t border-gray-100 p-3 flex items-center flex-shrink-0 ${isCollapsed ? 'md:justify-center' : 'gap-2.5'}`}>
        <img
          src="https://ui-avatars.com/api/?name=Admin+User&background=e6f7f3&color=1cb78d&size=64"
          alt="User"
          className="w-7 h-7 rounded-full border border-gray-200 flex-shrink-0 cursor-pointer"
        />
        <div className={`flex-1 min-w-0 ${isCollapsed ? 'md:hidden' : ''}`}>
          <p className="text-[12px] font-semibold text-gray-900 truncate leading-tight">System Admin</p>
          <p className="text-[10px] text-gray-400 truncate">admin@tapfere.com</p>
        </div>
      </div>
    </>
  );
}

export default function AdminLayout({ children, breadcrumb = 'User Management' }: LayoutProps) {
  const [isCollapsed, setIsCollapsed]   = useState(false);
  const [mobileOpen,  setMobileOpen]    = useState(false);
  const [isLogoutModalOpen, setLogoutModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    toast.success('Successfully signed out');
    navigate('/login');
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="flex h-screen bg-[#ECEEF2] font-['DM_Sans',sans-serif] overflow-hidden">

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden" onClick={closeMobile} />
      )}

      {/* Mobile drawer */}
      <aside className={`fixed top-0 left-0 bottom-0 w-[240px] z-50 md:hidden flex flex-col bg-white border-r border-gray-200 transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <button onClick={closeMobile} className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors z-10 cursor-pointer">
          <X size={16} />
        </button>
        <SidebarContent isCollapsed={false} search={search} setSearch={setSearch} location={location} navigate={navigate} onNavigate={closeMobile} />
      </aside>

      {/* Desktop sidebar */}
      <aside className={`hidden md:flex flex-col flex-shrink-0 bg-white border-r border-gray-200 relative z-20 transition-all duration-300 ${isCollapsed ? 'w-[64px]' : 'w-[220px]'}`}>
        <SidebarContent isCollapsed={isCollapsed} search={search} setSearch={setSearch} location={location} navigate={navigate} />
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-[22px] bg-white border border-gray-200 rounded-full p-0.5 shadow-sm text-gray-500 hover:text-gray-900 z-30 cursor-pointer"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">

        {/* Top bar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 md:px-6 gap-3 flex-shrink-0 z-10">
          <button
            className="md:hidden p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer flex-shrink-0"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={18} />
          </button>

          <div className="flex items-center gap-1.5 text-[12px] text-gray-400 font-medium min-w-0">
            <span className="hidden sm:inline hover:text-gray-700 cursor-pointer transition-colors">Admin</span>
            <ChevronRight size={12} className="text-gray-300 hidden sm:inline" />
            <span className="text-gray-900 font-semibold truncate">{breadcrumb}</span>
          </div>

          <div className="flex-1" />

          <button className="relative p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer flex-shrink-0">
            <Bell size={16} strokeWidth={1.8} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
          </button>

          <div className="flex items-center gap-2 cursor-pointer pl-2 border-l border-gray-100 flex-shrink-0">
            <img
              src="https://ui-avatars.com/api/?name=Admin+User&background=e6f7f3&color=1cb78d&size=64"
              alt="User"
              className="w-7 h-7 rounded-full border border-gray-200"
            />
            <p className="hidden sm:block text-[12px] font-semibold text-gray-900 leading-tight">System Admin</p>
          </div>

          <button
            onClick={() => setLogoutModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-black text-white text-[12px] font-medium rounded-lg transition-colors cursor-pointer flex-shrink-0"
          >
            <LogOut size={13} strokeWidth={2} />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>

      <ConfirmDialog
        isOpen={isLogoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        onConfirm={handleLogout}
        title="Sign Out"
        message="Are you sure you want to sign out of your Admin session? You will need to re-authenticate with Google SSO."
        confirmText="Sign Out"
        isDestructive={true}
      />
    </div>
  );
}
