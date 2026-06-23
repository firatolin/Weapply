import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Layout } from '@/components/layout/Layout';
import { HomePage } from '@/pages/HomePage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ScholarshipsPage } from '@/pages/ScholarshipsPage';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/scholarships" element={<ScholarshipsPage />} />
        </Routes>
      </Layout>
      <Toaster position="top-right" richColors />
    </Router>
  );
}

export default App;
