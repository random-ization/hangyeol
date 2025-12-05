import React, { ReactNode, useState, useCallback } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { LearningProvider, useLearning } from './LearningContext';
import { DataProvider, useData } from './DataContext';

// Combined Provider that wraps all three contexts
interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [page, setPage] = useState('auth');

  const handleLoginSuccess = useCallback(() => {
    setPage('home');
  }, []);

  return (
    <AuthProvider onLoginSuccess={handleLoginSuccess}>
      <DataProvider>
        <LearningProvider>
          <PageContext.Provider value={{ page, setPage }}>
            {children}
          </PageContext.Provider>
        </LearningProvider>
      </DataProvider>
    </AuthProvider>
  );
};

// Page navigation context (temporary until React Router is fully integrated)
interface PageContextType {
  page: string;
  setPage: (page: string) => void;
}

const PageContext = React.createContext<PageContextType | undefined>(undefined);

export const usePage = () => {
  const context = React.useContext(PageContext);
  if (!context) {
    throw new Error('usePage must be used within AppProvider');
  }
  return context;
};

// Backward compatibility hook that combines all three contexts
export const useApp = () => {
  const auth = useAuth();
  const learning = useLearning();
  const data = useData();
  const { page, setPage } = usePage();

  return {
    // Auth context
    user: auth.user,
    loading: auth.loading,
    login: auth.login,
    logout: auth.logout,
    updateUser: auth.updateUser,
    language: auth.language,
    setLanguage: auth.setLanguage,
    saveWord: auth.saveWord,
    recordMistake: auth.recordMistake,
    clearMistakes: auth.clearMistakes,
    saveAnnotation: auth.saveAnnotation,
    saveExamAttempt: auth.saveExamAttempt,
    logActivity: auth.logActivity,
    updateLearningProgress: auth.updateLearningProgress,
    canAccessContent: auth.canAccessContent,
    showUpgradePrompt: auth.showUpgradePrompt,
    setShowUpgradePrompt: auth.setShowUpgradePrompt,
    
    // Learning context
    selectedInstitute: learning.selectedInstitute,
    setSelectedInstitute: learning.setSelectedInstitute,
    selectedLevel: learning.selectedLevel,
    setSelectedLevel: learning.setSelectedLevel,
    activeModule: learning.activeModule,
    setActiveModule: learning.setActiveModule,
    activeCustomList: learning.activeCustomList,
    setActiveCustomList: learning.setActiveCustomList,
    activeListType: learning.activeListType,
    setActiveListType: learning.setActiveListType,
    
    // Data context
    institutes: data.institutes,
    textbookContexts: data.textbookContexts,
    topikExams: data.topikExams,
    fetchInitialData: data.fetchInitialData,
    addInstitute: data.addInstitute,
    deleteInstitute: data.deleteInstitute,
    saveTextbookContext: data.saveTextbookContext,
    saveTopikExam: data.saveTopikExam,
    deleteTopikExam: data.deleteTopikExam,
    
    // Page navigation
    page,
    setPage,
  };
};
