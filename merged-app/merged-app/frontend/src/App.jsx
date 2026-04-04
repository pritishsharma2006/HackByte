import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import OnboardingPage from './pages/OnboardingPage';
import UploadPage from './pages/UploadPage';
import ResumeView from './pages/ResumeView';
import CoverLetterBuilder from './pages/CoverLetterBuilder';
import InterviewPage from './pages/InterviewPage';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="loader"></div>;
  if (!user) return <Navigate to="/landing" />;
  if (user.status === 'new' && window.location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" />;
  }

  return children;
};

const AppContent = () => {
  return (
    <div className="app-container">
      <Routes>
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        
        {/* Protected Routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <UploadPage />
          </ProtectedRoute>
        } />
        
        {/* Public Viewable Resume */}
        <Route path="/:username" element={<ResumeView />} />
        
        {/* Protected Cover Letter Builder */}
        <Route path="/:username/cover-letter" element={
          <ProtectedRoute>
             <CoverLetterBuilder />
          </ProtectedRoute>
        } />
        
        {/* AI Interview Simulator */}
        <Route path="/interview" element={
          <ProtectedRoute>
            <InterviewPage />
          </ProtectedRoute>
        } />
      </Routes>
    </div>
  );
};

function App() {
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
