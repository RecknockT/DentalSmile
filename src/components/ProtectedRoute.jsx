import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

export default function ProtectedRoute({ children }) {
  const [status, setStatus] = useState('checking'); // 'checking' | 'authenticated' | 'unauthenticated'

  useEffect(() => {
    let isMounted = true;

    // Chequeo inicial de sesión al montar
    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setStatus(data.session ? 'authenticated' : 'unauthenticated');
    });

    // Escucha cambios de sesión (login, logout, refresh de token)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setStatus(session ? 'authenticated' : 'unauthenticated');
    });

    return () => {
      isMounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  if (status === 'checking') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#20242b',
        color: '#e4e4e4'
      }}>
        Verificando sesión...
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  return children;
}
