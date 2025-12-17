import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ModernDashboard from '../components/ModernDashboard';

interface DashboardPageProps {
  canAccessContent: (content: any) => boolean;
  onShowUpgradePrompt: () => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ canAccessContent, onShowUpgradePrompt }) => {
  const { user } = useAuth();

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <ModernDashboard />;
};

export default DashboardPage;
