import React from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import Auth from '../components/Auth';
import { useAuth } from '../contexts/AuthContext';

const AuthPage: React.FC = () => {
  const { user, login, language } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = (loggedInUser: any) => {
    login(loggedInUser);
    navigate('/home');
  };

  if (user) {
    return <Navigate to="/home" replace />;
  }

  // Determine if we're on the register page
  const isRegisterPage = location.pathname === '/register';

  return <Auth onLogin={handleLogin} language={language} initialMode={isRegisterPage ? 'register' : 'login'} />;
};

export default AuthPage;
