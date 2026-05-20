import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// We will map over the existing page components here.
import LoginPage from './app/(auth)/login/page';

const DashboardPage = () => (
  <div className="flex flex-col h-screen w-full items-center justify-center bg-gray-50 font-['DM_Sans',sans-serif]">
    <div className="p-10 bg-white rounded-2xl shadow-sm border border-gray-100 text-center">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Tapfere!</h1>
      <p className="text-gray-500 font-medium">You have successfully logged in via Google SSO.</p>
    </div>
  </div>
);

const AdminPage = () => <div>Admin Dashboard (Coming Soon)</div>;
const ClientPage = () => <div>Client Dashboard (Coming Soon)</div>;
const TherapistPage = () => <div>Therapist Dashboard (Coming Soon)</div>;

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/admin/*" element={<AdminPage />} />
        <Route path="/client/*" element={<ClientPage />} />
        <Route path="/therapist/*" element={<TherapistPage />} />
      </Routes>
    </BrowserRouter>
  );
}
