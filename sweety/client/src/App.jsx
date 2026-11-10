import { useAuth } from './AuthContext';
import AuthPage from './components/AuthPage';
import Dashboard from './components/Dashboard';
import DoctorDashboard from './components/DoctorDashboard';

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <p className="page-message">Loading…</p>;
  if (!user) return <AuthPage />;
  return user.role === 'doctor' ? <DoctorDashboard /> : <Dashboard />;
}
