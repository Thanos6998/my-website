import { useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation
} from 'react-router-dom';

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

/* INFO PAGES */
import AboutPage from './pages/AboutPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import GuidelinesPage from './pages/GuidelinesPage';
import ContactPage from './pages/ContactPage';

function MainLayout({
  user,
  refreshTrigger,
  onCommentClick,
  onReport,
  onCreateClick
}) {

  const location = useLocation();

  /* Hide bottom nav on specific pages */
  const hiddenNavPaths = [
    '/chat',
    '/admin/dashboard',
    '/about',
    '/privacy',
    '/terms',
    '/guidelines',
    '/contact'
  ];

  const hideNav = hiddenNavPaths.some(path =>
    location.pathname.startsWith(path)
  );

  return (
    <>
      <Routes>

        {/* HOME */}
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

        {/* TRENDING */}
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

        {/* NOTIFICATIONS */}
        <Route
          path="/notifications"
          element={<NotificationsPage />}
        />

        {/* CHAT */}
        <Route
          path="/chat"
          element={<StrangerChat />}
        />

        {/* ADMIN */}
        <Route
          path="/admin/dashboard"
          element={<AdminDashboard />}
        />

        {/* INFO PAGES */}
        <Route
          path="/about"
          element={<AboutPage />}
        />

        <Route
          path="/privacy"
          element={<PrivacyPage />}
        />

        <Route
          path="/terms"
          element={<TermsPage />}
        />

        <Route
          path="/guidelines"
          element={<GuidelinesPage />}
        />

        <Route
          path="/contact"
          element={<ContactPage />}
        />

        {/* FALLBACK */}
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>

      {!hideNav && (
        <BottomNav
          onCreateClick={onCreateClick}
          isAdmin={user?.role === 'admin'}
        />
      )}
    </>
  );
}

function AppContent() {

  const {
    user,
    loading: authLoading,
    isOnboarded
  } = useAuth();

  const [showCreateModal, setShowCreateModal] = useState(false);

  const [selectedConfession, setSelectedConfession] = useState(null);

  const [reportTarget, setReportTarget] = useState(null);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  /* LOADING SCREEN */
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500" />
      </div>
    );
  }

  /* ONBOARDING */
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
                onCreateClick={() =>
                  setShowCreateModal(true)
                }
              />
            </ProtectedRoute>
          }
        />
      </Routes>

      {/* CREATE POST */}
      {showCreateModal && (
        <CreateConfessionModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() =>
            setRefreshTrigger(prev => prev + 1)
          }
        />
      )}

      {/* COMMENTS */}
      {selectedConfession && (
        <CommentsModal
          confession={selectedConfession}
          onClose={() =>
            setSelectedConfession(null)
          }
        />
      )}

      {/* REPORT */}
      {reportTarget && (
        <ReportModal
          target={reportTarget}
          onClose={() =>
            setReportTarget(null)
          }
        />
      )}

    </>
  );
}

function App() {
  return (
    <BrowserRouter>

      <AuthProvider>

        <Toaster
          position="top-center"
          theme="dark"
          richColors
        />

        <AppContent />

      </AuthProvider>

    </BrowserRouter>
  );
}

export default App;