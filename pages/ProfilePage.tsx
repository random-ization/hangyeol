import React from 'react';
import { Navigate } from 'react-router-dom';
import Profile from '../components/Profile';
import { useAuth } from '../contexts/AuthContext';

const ProfilePage: React.FC = () => {
  const { user, language } = useAuth();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <Profile language={language} />;
};

export default ProfilePage;
