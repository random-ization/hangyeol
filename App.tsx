
import React, { useState, useMemo, useEffect } from 'react';
import Layout from './components/Layout';
import Auth from './components/Auth';
import Home from './components/Home';
import VocabModule from './components/VocabModule';
import ReadingModule from './components/ReadingModule';
import ListeningModule from './components/ListeningModule';
import GrammarModule from './components/GrammarModule';
import AdminPanel from './components/AdminPanel';
import Dashboard from './components/Dashboard';
import TopikModule from './components/TopikModule';
import { User, CourseSelection, LearningModuleType, Language, Institute, TextbookContextMap, UserTier, TextbookContent, Annotation, VocabularyItem, UserRole, TopikExam, ExamAttempt } from './types';
import { getLabels } from './utils/i18n';
import { api } from './services/api';
import { Library } from 'lucide-react';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState('auth'); // Start at auth, check token will redirect
  const [language, setLanguage] = useState<Language>('zh'); 
  
  // Learning State
  const [selectedInstitute, setSelectedInstitute] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<number>(0);
  const [activeModule, setActiveModule] = useState<LearningModuleType | null>(null);
  
  // Custom List State
  const [activeCustomList, setActiveCustomList] = useState<VocabularyItem[] | null>(null);
  const [activeListType, setActiveListType] = useState<'SAVED' | 'MISTAKES' | null>(null);

  // Data from Backend
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [textbookContexts, setTextbookContexts] = useState<TextbookContextMap>({}); 
  const [topikExams, setTopikExams] = useState<TopikExam[]>([]);

  const labels = getLabels(language);

  // 1. Initial Session Check
  useEffect(() => {
    const checkSession = async () => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const data = await api.getMe();
                setUser(data.user);
                setPage('home');
                // Fetch initial data immediately if logged in
                fetchInitialData();
            } catch (e) {
                console.error("Session expired or invalid");
                localStorage.removeItem('token');
                setPage('auth');
            }
        } else {
            setPage('auth');
        }
        setLoading(false);
    };
    checkSession();
  }, []);

  // 2. Fetch Data Helper
  const fetchInitialData = async () => {
      try {
          const [insts, content, exams] = await Promise.all([
              api.getInstitutes(),
              api.getTextbookContent(),
              api.getTopikExams()
          ]);
          setInstitutes(insts);
          setTextbookContexts(content);
          setTopikExams(exams);
      } catch (e) {
          console.error("Failed to load app data", e);
      }
  };

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    setPage('home');
    fetchInitialData();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setPage('auth');
    setSelectedInstitute('');
    setSelectedLevel(0);
    setActiveModule(null);
  };

  // --- User Actions Handlers ---

  const handleSaveWord = async (vocabItem: VocabularyItem | string, meaning?: string) => {
    if (!user) return;
    
    let newItem: VocabularyItem;
    if (typeof vocabItem === 'string' && meaning) {
        newItem = { 
            korean: vocabItem, 
            english: meaning, 
            exampleSentence: '', 
            exampleTranslation: '' 
        };
    } else {
        newItem = vocabItem as VocabularyItem;
    }

    // Optimistic Update
    const updatedSavedWords = [...user.savedWords, newItem];
    setUser({ ...user, savedWords: updatedSavedWords });

    // API Call
    try {
        await api.saveWord(newItem);
    } catch (e) {
        console.error("Failed to save word", e);
    }
  };

  const handleRecordMistake = async (word: VocabularyItem) => {
      if (!user) return;
      const updatedMistakes = [...user.mistakes, word];
      setUser({ ...user, mistakes: updatedMistakes });
      try { await api.saveMistake(word); } catch (e) { console.error(e); }
  };

  const handleClearMistakes = () => {
      if (user && window.confirm("Are you sure?")) {
          setUser({ ...user, mistakes: [] });
          // In real app, call API to clear
      }
  };

  const handleSaveAnnotation = async (annotation: Annotation) => {
      if (!user) return;
      
      let updatedAnnotations = [...user.annotations];
      const index = updatedAnnotations.findIndex(a => a.id === annotation.id);
      
      if (index !== -1) {
          if (!annotation.color && !annotation.note) {
              updatedAnnotations.splice(index, 1);
          } else {
              updatedAnnotations[index] = annotation;
          }
      } else {
          updatedAnnotations.push(annotation);
      }
      
      setUser({ ...user, annotations: updatedAnnotations });
      try { await api.saveAnnotation(annotation); } catch (e) { console.error(e); }
  };

  const handleSaveExamAttempt = async (attempt: ExamAttempt) => {
      if (!user) return;
      const updatedHistory = [...(user.examHistory || []), attempt];
      setUser({ ...user, examHistory: updatedHistory });
      try { await api.saveExamAttempt(attempt); } catch (e) { console.error(e); }
  };

  // --- Admin Handlers (Sync with Backend) ---

  const handleAddInstitute = async (name: string) => {
      try {
          const newInst = await api.createInstitute({ 
              id: name.toLowerCase().replace(/\s+/g, '-'), 
              name, 
              levels: [1,2,3,4,5,6] 
          });
          setInstitutes([...institutes, newInst]);
      } catch (e) { alert("Failed to create institute"); }
  };

  const handleSaveTextbookContext = async (key: string, content: TextbookContent) => {
      try {
          const saved = await api.saveTextbookContent(key, content);
          setTextbookContexts(prev => ({ ...prev, [saved.key]: saved }));
      } catch (e) { alert("Failed to save content"); }
  };

  const handleSaveTopikExam = async (exam: TopikExam) => {
      try {
          const saved = await api.saveTopikExam(exam);
          // Check if update or create
          const exists = topikExams.find(e => e.id === saved.id);
          if (exists) {
              setTopikExams(topikExams.map(e => e.id === saved.id ? saved : e));
          } else {
              setTopikExams([saved, ...topikExams]);
          }
      } catch (e) { alert("Failed to save exam"); }
  };

  const handleDeleteTopikExam = async (id: string) => {
      try {
          await api.deleteTopikExam(id);
          setTopikExams(topikExams.filter(e => e.id !== id));
      } catch (e) { alert("Failed to delete exam"); }
  };

  // --- Render Helpers ---

  const currentLevelContexts = useMemo(() => {
    if (!selectedInstitute || !selectedLevel) return {};
    const prefix = `${selectedInstitute}-${selectedLevel}-`;
    const contexts: Record<number, TextbookContent> = {};
    
    Object.keys(textbookContexts).forEach(key => {
        if (key.startsWith(prefix)) {
            const unit = parseInt(key.split('-')[2]);
            if (!isNaN(unit)) {
                contexts[unit] = textbookContexts[key];
            }
        }
    });
    return contexts;
  }, [textbookContexts, selectedInstitute, selectedLevel]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  const renderContent = () => {
    if (!user) return <Auth onLogin={handleLogin} language={language} />;

    if (page === 'admin' && user.role === 'ADMIN') {
        return (
            <AdminPanel 
                institutes={institutes}
                onUpdateInstitutes={setInstitutes} // We don't have a bulk update API, handled via Add/Delete
                onAddInstitute={handleAddInstitute}
                onDeleteInstitute={(id) => setInstitutes(institutes.filter(i => i.id !== id))} // Implement API delete if needed
                textbookContexts={textbookContexts}
                onSaveContext={handleSaveTextbookContext}
                language={language}
                users={[user]} // In real app, fetch all users
                onUpdateUser={() => {}} 
                onDeleteUser={() => {}}
                stats={{ totalUsers: 1, activeUsers: 1, premiumUsers: 0, totalRevenue: 0, contentCoverage: 0 }}
                topikExams={topikExams}
                onAddTopikExam={handleSaveTopikExam}
                onUpdateTopikExam={handleSaveTopikExam}
                onDeleteTopikExam={handleDeleteTopikExam}
            />
        );
    }

    if (page === 'home') {
        return <Home user={user} onNavigate={setPage} language={language} />;
    }
    
    if (page === 'profile') {
        return <div className="text-center p-8">Profile settings coming soon.</div>;
    }

    if (page === 'topik') {
        return (
            <TopikModule 
                exams={topikExams} 
                language={language} 
                history={user.examHistory || []}
                onSaveHistory={handleSaveExamAttempt}
                annotations={user.annotations || []}
                onSaveAnnotation={handleSaveAnnotation}
            />
        );
    }

    if (activeModule) {
        return (
            <div>
                <button onClick={() => { setActiveModule(null); setActiveCustomList(null); setActiveListType(null); }} className="mb-4 text-sm text-slate-500 hover:text-indigo-600 flex items-center">← {labels.backCurr}</button>
                {activeModule === LearningModuleType.VOCABULARY && <VocabModule course={{ instituteId: selectedInstitute, level: selectedLevel, textbookUnit: 0 }} instituteName={institutes.find(i => i.id === selectedInstitute)?.name || 'Korean'} language={language} levelContexts={currentLevelContexts} customWordList={activeCustomList || undefined} customListType={activeListType || undefined} onRecordMistake={handleRecordMistake} onSaveWord={handleSaveWord} />}
                {activeModule === LearningModuleType.READING && <ReadingModule course={{ instituteId: selectedInstitute, level: selectedLevel, textbookUnit: 0 }} instituteName={institutes.find(i => i.id === selectedInstitute)?.name || 'Korean'} onSaveWord={handleSaveWord} onSaveAnnotation={handleSaveAnnotation} savedWordKeys={user.savedWords.map(w => w.korean)} annotations={user.annotations} language={language} levelContexts={currentLevelContexts} />}
                {activeModule === LearningModuleType.LISTENING && <ListeningModule course={{ instituteId: selectedInstitute, level: selectedLevel, textbookUnit: 0 }} instituteName={institutes.find(i => i.id === selectedInstitute)?.name || 'Korean'} onSaveAnnotation={handleSaveAnnotation} annotations={user.annotations} language={language} levelContexts={currentLevelContexts} />}
                {activeModule === LearningModuleType.GRAMMAR && <GrammarModule course={{ instituteId: selectedInstitute, level: selectedLevel, textbookUnit: 0 }} instituteName={institutes.find(i => i.id === selectedInstitute)?.name || 'Korean'} language={language} levelContexts={currentLevelContexts} />}
            </div>
        );
    }

    if (page === 'dashboard') {
        if (selectedInstitute && selectedLevel) {
            return (
                <Dashboard user={user} institute={institutes.find(i => i.id === selectedInstitute)} level={selectedLevel} language={language} onChangeCourse={() => { setSelectedInstitute(''); setSelectedLevel(0); }} onOpenVocabBook={() => { setActiveCustomList(user.savedWords); setActiveListType('SAVED'); setActiveModule(LearningModuleType.VOCABULARY); }} onOpenMistakeBook={() => { setActiveCustomList(user.mistakes); setActiveListType('MISTAKES'); setActiveModule(LearningModuleType.VOCABULARY); }} onClearMistakes={handleClearMistakes} onStartModule={(mod) => setActiveModule(mod)} />
            );
        }
        if (!selectedInstitute) {
            return (
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-6">{labels.selectInstitute}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {institutes.map((inst) => (
                            <button key={inst.id} onClick={() => setSelectedInstitute(inst.id)} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-indigo-300 transition-all text-left group">
                                <div className="flex items-start justify-between"><div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors"><Library className="w-6 h-6" /></div></div>
                                <h3 className="text-xl font-bold text-slate-900">{inst.name}</h3>
                                <p className="text-slate-500 mt-2 text-sm">Levels 1-6</p>
                            </button>
                        ))}
                    </div>
                </div>
            );
        }
        if (!selectedLevel) {
            return (
                <div>
                    <button onClick={() => setSelectedInstitute('')} className="mb-4 text-sm text-slate-500">← {labels.backInst}</button>
                    <h2 className="text-2xl font-bold text-slate-800 mb-6">{labels.selectLevel}</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map((lvl) => (
                            <button key={lvl} onClick={() => setSelectedLevel(lvl)} className="bg-white py-8 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-center"><span className="block text-3xl font-bold text-slate-800 mb-1">{lvl}</span><span className="text-sm text-slate-500 uppercase tracking-wider">{labels.bookLevel}</span></button>
                        ))}
                    </div>
                </div>
            );
        }
    }

    return <div className="text-center mt-20"><p>{labels.noCourseSelected}</p></div>;
  };

  return (
    <Layout user={user} onLogout={handleLogout} currentPage={page} onNavigate={(p) => { setPage(p); setActiveModule(null); setActiveCustomList(null); setActiveListType(null); }} language={language} onLanguageChange={setLanguage}>
      {renderContent()}
    </Layout>
  );
}

export default App;
