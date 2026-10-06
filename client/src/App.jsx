import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/common/Navbar';
import AIChatWidget from './components/common/AIChatWidget';
import LoginPage from './pages/LoginPage';
import ApplicantDashboard from './pages/ApplicantDashboard';
import OfficerDashboard from './pages/OfficerDashboard';
import ApproverDashboard from './pages/ApproverDashboard';
import ApplicationDetailView from './pages/ApplicationDetailView';

// Route dispatcher that routes based on user role
const RoleBasedHome = () => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-xs text-slate-400">
        Loading session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  switch (role) {
    case 'applicant':
      return <ApplicantDashboard />;
    case 'loan_officer':
      return <OfficerDashboard />;
    case 'approver':
    case 'admin':
      return <ApproverDashboard />;
    default:
      return <ApplicantDashboard />;
  }
};

// Protected Layout
const ProtectedLayout = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs text-slate-400">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <footer className="bg-white border-t border-slate-200/80 py-4 text-center text-xs text-slate-400">
        LoanFlow MERN Tracker v2 • Lifecycle State Machine • AI-Powered Underwriting
      </footer>
      <AIChatWidget />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/"
            element={
              <ProtectedLayout>
                <RoleBasedHome />
              </ProtectedLayout>
            }
          />

          <Route
            path="/applications/:id"
            element={
              <ProtectedLayout>
                <ApplicationDetailView />
              </ProtectedLayout>
            }
          />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
