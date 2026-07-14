import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import LoginPage from './app/(auth)/login/page';
import NotFoundPage from './app/not-found/page';
import UserManagement from './app/admin/UserManagement';
import PatientManagement from './app/admin/PatientManagement';
import TherapistManagement from './app/admin/TherapistManagement';
import AdminLayout from './app/admin/layout';
import AuthMonitor from './components/auth/AuthMonitor';
import ProtectedRoute from './components/auth/ProtectedRoute';

import ChatPage from './app/client/ChatPage';
import TherapistChat from './app/therapist/ChatPage';
import SystemManagement from './app/admin/SystemManagement';
import AdminChatView from './app/admin/AdminChatView';
import AdminInbox from './app/admin/AdminInbox';
import AdminDashboard from './app/admin/Dashboard';

function ChatsWrapper() {
  let userRole: string | null = null;
  try {
    userRole = JSON.parse(localStorage.getItem('user') || '{}')?.role ?? null;
  } catch {}

  if (userRole === 'CLIENT') {
    return <ChatPage />;
  }
  if (userRole === 'THERAPIST') {
    return <TherapistChat />;
  }
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthMonitor />
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Admin routes — ADMIN only */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <AdminLayout breadcrumb="Dashboard"><AdminDashboard /></AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/user-management"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <AdminLayout breadcrumb="User Management"><UserManagement /></AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/patients"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <AdminLayout breadcrumb="Patient Management"><PatientManagement /></AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/therapists"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <AdminLayout breadcrumb="Therapist Management"><TherapistManagement /></AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/system"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <SystemManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/inbox"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <AdminLayout breadcrumb="Inbox"><AdminInbox /></AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/chats/:role/:userId"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <AdminLayout breadcrumb="Chat Monitor"><AdminChatView /></AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <AdminLayout><div className="p-8 text-gray-500">Coming Soon</div></AdminLayout>
            </ProtectedRoute>
          }
        />

        {/* Unified chat routes — CLIENT or THERAPIST */}
        <Route
          path="/chats"
          element={
            <ProtectedRoute roles={['CLIENT', 'THERAPIST']}>
              <ChatsWrapper />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chats/*"
          element={
            <ProtectedRoute roles={['CLIENT', 'THERAPIST']}>
              <ChatsWrapper />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
