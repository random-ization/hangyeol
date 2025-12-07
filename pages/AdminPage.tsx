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

  // 计算实际的统计数据（可选优化）
  const stats = {
    totalUsers: 1, // 这里如果是真实应用应该从API获取
    activeLearners: 1, // 修正字段名: activeUsers -> activeLearners
    totalTextbooks: institutes.length, // 补全: 使用机构数量或教材数量
    totalTopikExams: topikExams.length, // 补全: 使用考试数量
    premiumUsers: 0,
    totalRevenue: 0,
    contentCoverage: Object.keys(textbookContexts).length,
  };

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
      stats={stats} // 使用修复后的 stats 对象
      topikExams={topikExams}
      onAddTopikExam={saveTopikExam}
      onUpdateTopikExam={saveTopikExam}
      onDeleteTopikExam={deleteTopikExam}
    />
  );
};

export default AdminPage;
