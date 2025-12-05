import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Auth from '../components/Auth';
import { useAuth } from '../contexts/AuthContext';

const AuthPage: React.FC = () => {
  const { user, login, language } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (loggedInUser: any) => {
    login(loggedInUser);
    navigate('/home');
  };

  if (user) {
    return <Navigate to="/home" replace />;
  }

  return <Auth onLogin={handleLogin} language={language} />;
};

export default AuthPage;
