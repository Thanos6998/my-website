import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from './components/ui/sonner';

import OnboardingModal from './components/OnboardingModal';
import BottomNav from './components/BottomNav';
import ProtectedRoute from './components/ProtectedRoute';

import HomePage from './pages/HomePage';
import TrendingPage from './pages/TrendingPage';
import NotificationsPage from './pages/NotificationsPage';
import StrangerChat from './pages/StrangerChat';
import AdminDashboard from './pages/AdminDashboard';
import CommentsModal from './pages/CommentsModal';
import ReportModal from './pages/ReportModal';
import CreateConfessionModal from './components/CreateConfessionModal';

function MainLayout({ user, refreshTrigger, onCommentClick, onReport, onCreateClick }) {
  const location = useLocation();
  const hiddenNavPaths = ['/chat', '/admin/dashboard'];
  const hideNav = hiddenNavPaths.some(p => location.pathname.startsWith(p));

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              key={refreshTrigger}
              onCommentClick={onCommentClick}
              onReport={onReport}
              onCreateClick={onCreateClick}
            />
          }
        />
        <Route
          path="/trending"
          element={
            <TrendingPage
              onCommentClick={onCommentClick}
              onReport={onReport}
              onCreateClick={onCreateClick}
            />
          }
        />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/chat" element={<StrangerChat />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!hideNav && <BottomNav onCreateClick={onCreateClick} isAdmin={user?.role === 'admin'} />}
    </>
  );
}

function AppContent() {
  const { user, loading: authLoading, isOnboarded } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedConfession, setSelectedConfession] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500" />
      </div>
    );
  }

  if (!isOnboarded) {
    return <OnboardingModal />;
  }

  return (
    <>
      <Routes>
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <MainLayout
                user={user}
                refreshTrigger={refreshTrigger}
                onCommentClick={setSelectedConfession}
                onReport={setReportTarget}
                onCreateClick={() => setShowCreateModal(true)}
              />
            </ProtectedRoute>
          }
        />
      </Routes>

      {showCreateModal && (
        <CreateConfessionModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => setRefreshTrigger(prev => prev + 1)}
        />
      )}

      {selectedConfession && (
        <CommentsModal
          confession={selectedConfession}
          onClose={() => setSelectedConfession(null)}
        />
      )}

      {reportTarget && (
        <ReportModal
          confession={reportTarget}
          onClose={() => setReportTarget(null)}
        />
      )}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-center" theme="dark" richColors />
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
