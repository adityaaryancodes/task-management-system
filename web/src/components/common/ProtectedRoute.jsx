import { Navigate } from 'react-router-dom';
import { getUser } from '../../lib/auth';

export function ProtectedRoute({ children, roles }) {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}
