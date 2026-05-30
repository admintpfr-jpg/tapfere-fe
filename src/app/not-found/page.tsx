import { ArrowLeft, Activity, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getRoleHomePath } from '../../components/auth/ProtectedRoute';

function getHomeLabel(): string {
  const token = localStorage.getItem('access_token');
  if (!token) return 'Back to Login';

  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const role = user?.role;
    if (role === 'ADMIN') return 'Back to Admin Portal';
    if (role === 'THERAPIST') return 'Back to Therapist Portal';
    if (role === 'CLIENT') return 'Back to Client Portal';
  } catch {
    // fall through
  }
  return 'Back to Dashboard';
}

export default function NotFoundPage() {
  const navigate = useNavigate();
  const homePath = getRoleHomePath();
  const homeLabel = getHomeLabel();
  const isAuthenticated = !!localStorage.getItem('access_token');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 font-['DM_Sans',sans-serif] p-6 text-center overflow-hidden relative">

      {/* Background blobs */}
      <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] bg-[#1cb78d] rounded-full blur-[120px] opacity-[0.15] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-[#0f385a] rounded-full blur-[150px] opacity-10 pointer-events-none" />

      {/* Icon */}
      <div className="relative flex items-center justify-center w-28 h-28 bg-white border border-[#1cb78d]/20 rounded-[2rem] mb-10 shadow-sm z-10">
        <Activity size={48} strokeWidth={2} className="text-[#1cb78d] animate-pulse" style={{ animationDuration: '3000ms' }} />
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-lg w-full">
        <h1 className="text-[120px] leading-none font-black text-[#0f385a] tracking-tight mb-2 drop-shadow-sm select-none">
          4<span className="text-[#1cb78d]">0</span>4
        </h1>

        <h2 className="text-3xl font-bold text-gray-900 mb-5 tracking-tight">
          Out of Alignment
        </h2>

        <p className="text-gray-500 font-medium max-w-md mx-auto mb-10 leading-relaxed text-[15px]">
          This page doesn't exist or has been moved. Let's get you back on track to your clinical dashboard.
        </p>

        {/* Primary CTA */}
        <button
          onClick={() => navigate(homePath)}
          className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-[#0f385a] hover:bg-[#164e7c] text-white font-bold rounded-xl transition-all shadow-[0_8px_20px_rgba(15,56,90,0.2)] hover:shadow-[0_12px_25px_rgba(15,56,90,0.3)] hover:-translate-y-[2px]"
        >
          <ArrowLeft size={20} strokeWidth={2.5} />
          {homeLabel}
        </button>

        {/* Secondary: go to login if not authenticated */}
        {!isAuthenticated && (
          <p className="mt-5 text-sm text-gray-400">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-1 text-[#1cb78d] font-semibold hover:underline"
            >
              <Home size={14} />
              Sign in
            </button>
          </p>
        )}

        {/* Divider & hint */}
        <div className="mt-12 flex items-center gap-4 justify-center text-gray-300">
          <div className="flex-1 h-px bg-gray-200 max-w-[80px]" />
          <span className="text-xs text-gray-400 tracking-wide uppercase font-medium">Error 404</span>
          <div className="flex-1 h-px bg-gray-200 max-w-[80px]" />
        </div>
      </div>

      {/* Subtle bottom branding */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 opacity-20 pointer-events-none z-0">
        <img src="/Tapfere_Logo_1.svg" alt="Tapfere Logo" className="h-9 w-auto grayscale" />
      </div>
    </div>
  );
}
