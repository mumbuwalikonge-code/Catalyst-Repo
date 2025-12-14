// src/components/ProtectedRoute.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'teacher')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles 
}) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!currentUser) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && currentUser.role && !allowedRoles.includes(currentUser.role)) {
    // User has a role but not allowed for this route
    // Redirect to their appropriate dashboard
    const redirectTo = currentUser.role === 'admin' ? '/admin/dashboard' : '/teacher/dashboard';
    return <Navigate to={redirectTo} replace />;
  }

  // User is authenticated and has the right role
  return <>{children}</>;
};