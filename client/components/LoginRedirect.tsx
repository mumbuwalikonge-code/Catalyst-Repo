// src/components/LoginRedirect.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const LoginRedirect = () => {
  const navigate = useNavigate();
  const { currentUser, loading } = useAuth();

  useEffect(() => {
    if (!loading && currentUser) {
      // Redirect based on role
      if (currentUser.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (currentUser.role === 'teacher') {
        navigate('/teacher/dashboard', { replace: true });
      }
    }
  }, [currentUser, loading, navigate]);

  return null;
};