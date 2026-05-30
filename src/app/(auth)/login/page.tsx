import { useGoogleLogin } from '@react-oauth/google';
import { Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { toast } from 'react-toastify';

export default function LoginPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (codeResponse) => {
      setIsLoading(true);
      
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const res = await fetch(`${apiUrl}/auth/google-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken: codeResponse.access_token }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Authentication failed. Please contact support.');
        }

        const data = await res.json();
        // Save the JWT token and user info
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Dynamically redirect based on role
        if (data.user?.role === 'ADMIN') {
          navigate('/admin/user-management');
        } else if (data.user?.role === 'CLIENT') {
          navigate('/client');
        } else if (data.user?.role === 'THERAPIST') {
          navigate('/therapist');
        } else {
          navigate('/dashboard');
        }
      } catch (err: any) {
        toast.error(err.message || 'Authentication failed. Please contact support.');
      } finally {
        setIsLoading(false);
      }
    },
    onError: (error) => console.log('Google Sign-In Failed:', error)
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 h-screen w-full bg-white font-['DM_Sans',sans-serif]">
      
      {/* Left Panel: Cover Image Graphic & Overlay Typography */}
      <div className="hidden md:flex relative h-full w-full flex-col justify-end bg-[#0f385a] overflow-hidden">
        
        {/* Soft abstract glowing orbs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#1cb78d] rounded-full blur-[150px] opacity-20 pointer-events-none translate-x-1/3 -translate-y-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#5c6bfa] rounded-full blur-[150px] opacity-10 pointer-events-none -translate-x-1/3 translate-y-1/3"></div>

        {/* Distinctive Brand Pattern/Watermarks */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none">
          <img 
            src="/Tapfere_Logo Mark_1.svg" 
            alt="Tapfere Watermark" 
            className="w-[120%] h-[120%] object-contain mix-blend-overlay"
          />
        </div>
        
        <div className="absolute top-[15%] right-[15%] opacity-20 pointer-events-none rotate-12">
          <img 
            src="/Tapfere_Logo Mark_2.svg" 
            alt="Tapfere Mark Secondary" 
            className="w-32 h-32 object-contain filter drop-shadow-2xl"
          />
        </div>
        
        <div className="absolute bottom-[40%] left-[20%] opacity-[0.08] pointer-events-none -rotate-12">
          <img 
            src="/Tapfere_Logo Mark_4.svg" 
            alt="Tapfere Mark Tertiary" 
            className="w-48 h-48 object-contain"
          />
        </div>

        {/* Text Header */}
        <div className="relative z-10 p-20 pb-24 text-white">
          <h1 className="text-5xl lg:text-7xl font-semibold tracking-tight leading-[1.1] select-none text-white drop-shadow-lg">
            Restoring movement,<br/>
            enhancing <span className="font-serif italic font-medium tracking-normal text-[#1cb78d]">life.</span>
          </h1>
        </div>
      </div>

      {/* Right Panel: Login Container */}
      <div className="relative h-full w-full flex flex-col justify-center bg-white border-l border-gray-100 shadow-[inset_0_0_100px_rgba(0,0,0,0.02)]">
        <div className="max-w-md w-full mx-auto px-8 sm:px-12">
          
          {/* Clinical/Medical Branding Logo */}
          <div className="flex items-center mb-10 w-full">
            <img 
              src="/Tapfere_Logo_1.svg" 
              alt="Tapfere Physio Platform" 
              className="h-24 sm:h-28 w-auto object-contain select-none" 
            />
          </div>

          {/* Heading Section */}
          <div className="mb-8">
            <h2 className="text-[28px] font-bold tracking-tight text-gray-900 mb-3">
              Therapist Portal
            </h2>
            <p className="text-[15px] text-gray-500 leading-relaxed max-w-[90%] font-medium">
              Securely sign in to manage patient records, track recovery progress, and collaborate with your clinic.
            </p>
          </div>

          {/* Premium Google SSO (Gmail) Button */}
          <button 
            type="button"
            disabled={isLoading}
            onClick={() => loginWithGoogle()}
            className="w-full py-4 px-4 bg-white hover:bg-gray-50 disabled:opacity-70 disabled:pointer-events-none border border-gray-200 hover:border-blue-300 rounded-xl flex items-center justify-center gap-3 transition-all duration-200 shadow-sm hover:shadow-md mb-8 group"
          >
            {isLoading ? (
              <Activity className="w-5 h-5 text-gray-400 animate-spin" />
            ) : (
             <svg className="w-5 h-5 group-hover:scale-105 transition-transform duration-300" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5.04c1.67 0 3.2.58 4.41 1.71l3.29-3.29C17.7 1.63 15.01 1 12 1 7.24 1 3.2 3.74 1.25 7.74l3.86 3C6.03 7.82 8.79 5.04 12 5.04z" />
                <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.46c-.28 1.48-1.12 2.74-2.38 3.58l3.69 2.87c2.16-1.99 3.42-4.93 3.42-8.55z" />
                <path fill="#FBBC05" d="M5.11 10.74c-.24-.72-.37-1.49-.37-2.27s.13-1.55.37-2.27L1.25 3.2A11.96 11.96 0 000 12c0 3.19.82 6.18 2.27 8.8l3.86-3.06c-.4-.79-.69-1.68-.89-2.61l-.13-1.39z" />
                <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.69-2.87c-1.03.69-2.35 1.1-4.27 1.1-3.21 0-5.97-2.78-6.89-5.7l-3.86 3A11.98 11.98 0 0012 23z" />
             </svg>
            )}
            <span className="font-semibold text-gray-700 text-[15px] tracking-normal select-none group-hover:text-blue-700 transition-colors">
              {isLoading ? "Verifying access..." : "Secure Sign in with Google"}
            </span>
          </button>

          {/* Bottom Footers & Disclaimers */}
          <div className="w-full h-px bg-gray-100 mb-8 mt-2"></div>
          
          <p className="text-[13px] text-gray-400 font-normal leading-relaxed mb-6">
            By signing in, you agree to Tapfere's Terms of Service and HIPAA-compliant data practices.
          </p>
          
          <div className="text-[13px] text-gray-500 font-medium select-none">
            Need help? — <a href="#" className="underline text-blue-600 hover:text-blue-800 transition-colors duration-150 relative z-10">Contact Support</a>
          </div>

        </div>
      </div>
      
    </div>
  );
}
