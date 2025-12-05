import React from 'react';
import { Navigate } from 'react-router-dom';
import AdminPanel from '../components/admin';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

const AdminPage: React.FC = () => {
  const { user, language } = useAuth();
  const {
    institutes,
    textbookContexts,
    topikExams,
    addInstitute,
    deleteInstitute,
    saveTextbookContext,
    saveTopikExam,
    deleteTopikExam,
  } = useData();

  if (!user || user.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return (
    <AdminPanel
      institutes={institutes}
      onUpdateInstitutes={() => {}}
      onAddInstitute={addInstitute}
      onDeleteInstitute={deleteInstitute}
      textbookContexts={textbookContexts}
      onSaveContext={saveTextbookContext}
      language={language}
      users={[user]}
      onUpdateUser={() => {}}
      onDeleteUser={() => {}}
      stats={{
        totalUsers: 1,
        activeUsers: 1,
        premiumUsers: 0,
        totalRevenue: 0,
        contentCoverage: 0,
      }}
      topikExams={topikExams}
      onAddTopikExam={saveTopikExam}
      onUpdateTopikExam={saveTopikExam}
      onDeleteTopikExam={deleteTopikExam}
    />
  );
};

export default AdminPage;
