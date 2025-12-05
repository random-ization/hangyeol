import React, { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Home from '../components/Home';
import { useAuth } from '../contexts/AuthContext';

const HomePage: React.FC = () => {
  const { user, language } = useAuth();
  const navigate = useNavigate();

  const handleNavigate = (page: string) => {
    navigate(`/${page}`);
  };

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <Home user={user} onNavigate={handleNavigate} language={language} />;
};

export default HomePage;
