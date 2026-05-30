import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'react-toastify';

export default function AuthMonitor() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkToken = () => {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      try {
        const decoded: any = jwtDecode(token);
        const currentTime = Date.now() / 1000;

        if (decoded.exp < currentTime) {
          handleLogout('Session expired. Please login again.');
        } else {
          // Set a timer for exact expiry
          const delay = (decoded.exp - currentTime) * 1000;
          const timer = setTimeout(() => {
            handleLogout('Session expired. Please login again.');
          }, delay);

          return () => clearTimeout(timer);
        }
      } catch (e) {
        console.error('Invalid token found during monitoring');
        handleLogout();
      }
    };

    const handleLogout = (message?: string) => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      
      if (location.pathname !== '/login') {
        if (message) toast.error(message);
        navigate('/login', { replace: true });
      }
    };

    // Check on mount and when location changes
    checkToken();

    // Listen for storage changes (sync logout across tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'access_token' && !e.newValue) {
        handleLogout();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [navigate, location.pathname]);

  return null;
}
