import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import POS from './pages/POS';
import Admin from './pages/Admin';

function Protected({ children, adminOnly = false }) {
  const { user, isAdmin } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protected><POS /></Protected>} />
      <Route path="/admin/*" element={<Protected adminOnly><Admin /></Protected>} />
    </Routes>
  );
}
