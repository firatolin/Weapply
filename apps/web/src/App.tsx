import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from '@/components/layout/Layout';
import { HomePage } from '@/pages/HomePage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ScholarshipsPage } from '@/pages/ScholarshipsPage';
import { ScholarshipDetailsPage } from '@/pages/ScholarshipDetailsPage';
import { CreateScholarshipPage } from '@/pages/CreateScholarshipPage';
import { LoginPage } from '@/pages/LoginPage';
import { SignupPage } from '@/pages/SignupPage';
import { VerifyEmailPage } from '@/pages/VerifyEmailPage';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ProfilePage } from './pages/ProfilePage';
import { FavoritesPage } from './pages/FavoritesPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { EmployeeDashboard } from './pages/employee/EmployeeDashboard';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              } 
            />
            <Route 
            path="/favorites" 
            element={
              <ProtectedRoute>
                <FavoritesPage />
              </ProtectedRoute>
              } 
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employee"
              element={
                <ProtectedRoute>
                  <EmployeeDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/scholarships" element={<ScholarshipsPage />} />
            <Route path="/scholarships/:id" element={<ScholarshipDetailsPage />} />
            <Route
              path="/scholarships/create"
              element={
                <ProtectedRoute>
                  <CreateScholarshipPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Layout>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </Router>
  );
}

export default App;
