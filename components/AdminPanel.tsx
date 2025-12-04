
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Institute, Language, TextbookContextMap, User, AdminStats, TextbookContent, VocabularyItem, UserRole, UserTier, TopikExam, TopikQuestion, TopikType, GrammarPoint } from '../types';
import { getLabels } from '../utils/i18n';
import { 
    Save, Plus, ChevronRight, Book, Users, BarChart3, Upload, Music, 
    FileText, Settings, Edit2, Trash2, FileSpreadsheet, Search, 
    User as UserIcon, Crown, GraduationCap, Loader2, Image as ImageIcon, 
    ArrowLeft, Underline, Bold, CheckSquare, List, PlayCircle, MoreHorizontal,
    Sparkles, Eye, LayoutTemplate, Headphones, BookOpen, X, Library, Clock, FileJson, AlertCircle, FileUp
} from 'lucide-react';
import * as XLSX from 'xlsx';

// Define interface for structure items to avoid TypeScript errors with optional properties
interface ExamSectionStructure {
    range: number[];
    instruction: string;
    type?: string;
    grouped?: boolean;
    style?: string;
    hasBox?: boolean;
}

// --- TOPIK II READING FIXED STRUCTURE DEFINITION ---
const TOPIK_READING_STRUCTURE: ExamSectionStructure[] = [
    { range: [1, 2], instruction: "※ [1~2] (    )에 들어갈 가장 알맞은 것을 고르십시오. (각 2점)" },
    { range: [3, 4], instruction: "※ [3～4] 다음 밑줄 친 부분과 의미가 비슷한 것을 고르십시오. (각 2점)" },
    { range: [5, 8], instruction: "※ [5～8] 다음은 무엇에 대한 글인지 고르십시오. (각 2점)", type: "IMAGE_OPTIONAL" },
    { range: [9, 12], instruction: "※ [9～12] 다음 글 또는 도표의 내용과 같은 것을 고르십시오. (각 2점)", type: "IMAGE_OPTIONAL" },
    { range: [13, 15], instruction: "※ [13～15] 다음을 순서대로 맞게 배열한 것을 고르십시오. (각 2점)" },
    { range: [16, 18], instruction: "※ [16～18] 다음을 읽고 (    )에 들어갈 내용으로 가장 알맞은 것을 고르십시오. (각 2점)" },
    { range: [19, 20], instruction: "※ [19～20] 다음을 읽고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [21, 22], instruction: "※ [21～22] 다음을 읽고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [23, 24], instruction: "※ [23～24] 다음을 읽고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [25, 27], instruction: "※ [25～27] 다음은 신문 기사의 제목입니다. 가장 잘 설명한 것을 고르십시오. (각 2점)", style: "HEADLINE" },
    { range: [28, 31], instruction: "※ [28～31] 다음을 읽고 (    )에 들어갈 내용으로 가장 알맞은 것을 고르십시오. (각 2점)" },
    { range: [32, 34], instruction: "※ [32～34] 다음을 읽고 내용이 같은 것을 고르십시오. (각 2점)" },
    { range: [35, 38], instruction: "※ [35～38] 다음 글의 주제로 가장 알맞은 것을 고르십시오. (각 2점)" },
    { range: [39, 41], instruction: "※ [39～41] 다음 글에서 <보기>의 문장이 들어가기에 가장 알맞은 곳을 고르십시오. (각 2점)", hasBox: true },
    { range: [42, 43], instruction: "※ [42～43] 다음을 읽고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [44, 45], instruction: "※ [44～45] 다음을 읽고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [46, 47], instruction: "※ [46～47] 다음을 읽고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [48, 50], instruction: "※ [48～50] 다음을 읽고 물음에 답하십시오. (각 2점)", grouped: true },
];

// --- TOPIK II LISTENING FIXED STRUCTURE DEFINITION ---
const TOPIK_LISTENING_STRUCTURE: ExamSectionStructure[] = [
    { range: [1, 3], instruction: "※ [1～3] 다음을 듣고 알맞은 그림을 고르십시오. (각 2점)", type: "IMAGE_CHOICE" },
    { range: [4, 8], instruction: "※ [4～8] 다음 대화를 잘 듣고 이어질 수 있는 말을 고르십시오. (각 2점)" },
    { range: [9, 12], instruction: "※ [9～12] 다음 대화를 잘 듣고 여자가 이어서 할 행동으로 알맞은 것을 고르십시오. (각 2점)" },
    { range: [13, 16], instruction: "※ [13～16] 다음을 듣고 내용과 일치하는 것을 고르십시오. (각 2점)" },
    { range: [17, 20], instruction: "※ [17～20] 다음을 듣고 남자의 중심 생각을 고르십시오. (각 2점)" },
    { range: [21, 22], instruction: "※ [21～22] 다음을 듣고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [23, 24], instruction: "※ [23～24] 다음을 듣고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [25, 26], instruction: "※ [25～26] 다음을 듣고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [27, 28], instruction: "※ [27～28] 다음을 듣고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [29, 30], instruction: "※ [29～30] 다음을 듣고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [31, 32], instruction: "※ [31～32] 다음을 듣고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [33, 34], instruction: "※ [33～34] 다음을 듣고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [35, 36], instruction: "※ [35～36] 다음을 듣고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [37, 38], instruction: "※ [37～38] 다음은 교양 프로그램입니다. 잘 듣고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [39, 40], instruction: "※ [39～40] 다음은 대담입니다. 잘 듣고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [41, 42], instruction: "※ [41～42] 다음은 강연입니다. 잘 듣고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [43, 44], instruction: "※ [43～44] 다음은 다큐멘터리입니다. 잘 듣고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [45, 46], instruction: "※ [45～46] 다음은 강연입니다. 잘 듣고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [47, 48], instruction: "※ [47～48] 다음은 대담입니다. 잘 듣고 물음에 답하십시오. (각 2점)", grouped: true },
    { range: [49, 50], instruction: "※ [49～50] 다음은 강연입니다. 잘 듣고 물음에 답하십시오. (각 2점)", grouped: true },
];

interface AdminPanelProps {
  institutes: Institute[];
  onUpdateInstitutes: (institutes: Institute[]) => void;
  onAddInstitute: (name: string) => void;
  onDeleteInstitute: (id: string) => void;
  textbookContexts: TextbookContextMap;
  onSaveContext: (key: string, content: TextbookContent) => void;
  language: Language;
  users: User[];
  onUpdateUser: (id: string, updates: Partial<User>) => void;
  onDeleteUser: (id: string) => void;
  stats: AdminStats;
  topikExams: TopikExam[];
  onUpdateTopikExam: (exam: TopikExam) => void;
  onAddTopikExam: (exam: TopikExam) => void;
  onDeleteTopikExam: (id: string) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
    institutes, onUpdateInstitutes, onAddInstitute, onDeleteInstitute,
    textbookContexts, onSaveContext, language, users, onUpdateUser, onDeleteUser, stats,
    topikExams, onUpdateTopikExam, onAddTopikExam, onDeleteTopikExam
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'curriculum' | 'topik'>('dashboard');
  const labels = getLabels(language);

  // ================= USER MANAGEMENT STATE =================
  const [userSearch, setUserSearch] = useState('');

  // ================= CURRICULUM STATE =================
  const [selInst, setSelInst] = useState<Institute | null>(null);
  const [curriculumTab, setCurriculumTab] = useState<'vocab' | 'reading' | 'listening' | 'grammar'>('vocab');
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [uploadStatus, setUploadStatus] = useState<'IDLE' | 'PARSING' | 'READY' | 'SAVING' | 'SUCCESS'>('IDLE');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ================= TOPIK STATE =================
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [activeQuestionId, setActiveQuestionId] = useState<number>(1); // Scroll to question

  // Helper: Get currently editing exam
  const currentExam = topikExams.find(e => e.id === editingExamId);

  // Ensure currentExam has 50 questions
  useEffect(() => {
      if (currentExam) {
          const filledQuestions = [...currentExam.questions];
          let changed = false;
          
          // Ensure we have Q1 to Q50
          for (let i = 1; i <= 50; i++) {
              if (!filledQuestions.find(q => q.id === i)) {
                  filledQuestions.push({
                      id: i,
                      question: '',
                      options: ['', '', '', ''],
                      correctAnswer: 0,
                      score: 2,
                      passage: '',
                      contextBox: ''
                  });
                  changed = true;
              }
          }
          
          if (changed) {
              filledQuestions.sort((a,b) => a.id - b.id);
              onUpdateTopikExam({ ...currentExam, questions: filledQuestions });
          }
      }
  }, [currentExam]);

  // ================= HANDLERS =================
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploadStatus('PARSING');
      const reader = new FileReader();
      
      reader.onload = (evt) => {
          try {
              const bstr = evt.target?.result;
              const wb = XLSX.read(bstr, { type: 'binary' });
              const wsname = wb.SheetNames[0];
              const ws = wb.Sheets[wsname];
              // Use header: 1 to get array of arrays, skipping the first row (header) manually
              const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
              
              // Remove header row (row 0) and filter empty rows
              const rows = data.slice(1).filter(r => r && r.length > 0 && r[0] !== undefined);
              setPreviewData(rows);
              setUploadStatus('READY');
          } catch (err) {
              console.error(err);
              alert("Failed to parse Excel file. Please check format.");
              setUploadStatus('IDLE');
          }
      };
      reader.readAsBinaryString(file);
  };

  const handleBatchSave = () => {
      if (!selInst || previewData.length === 0) return;
      setUploadStatus('SAVING');

      // Helper to get or create content object
      const getContent = (level: number, unit: number): TextbookContent => {
          const key = `${selInst.id}-${level}-${unit}`;
          const existing = textbookContexts[key];
          return existing ? { ...existing } : { 
              generalContext: '', vocabularyList: '', readingText: '', readingTranslation: '', readingTitle: `Lesson ${unit}`, 
              listeningScript: '', listeningTranslation: '', listeningTitle: `Lesson ${unit}`, listeningAudioUrl: null, grammarList: '' 
          };
      };

      // Temporary storage for batch updates to avoid state race conditions
      const updates: Record<string, TextbookContent> = {};

      if (curriculumTab === 'vocab') {
          // Group by Level/Unit first
          const grouped: Record<string, VocabularyItem[]> = {};
          
          previewData.forEach((row) => {
              // Cols: Level(0), Unit(1), Word(2), POS(3), Meaning(4), Example(5)
              const level = parseInt(row[0]);
              const unit = parseInt(row[1]);
              if (!level || !unit) return;

              const key = `${selInst.id}-${level}-${unit}`;
              if (!grouped[key]) grouped[key] = [];

              grouped[key].push({
                  korean: row[2] || '',
                  pos: row[3] || '',
                  english: row[4] || '',
                  exampleSentence: row[5] || '',
                  exampleTranslation: '', // Not in excel spec
                  unit: unit
              });
          });

          // Apply updates
          Object.keys(grouped).forEach(key => {
              const [_, lvl, unt] = key.split('-');
              const content = updates[key] || getContent(parseInt(lvl), parseInt(unt));
              // Merge with existing or overwrite? Prompt implies "update data", let's overwrite list
              content.vocabularyList = JSON.stringify(grouped[key]);
              updates[key] = content;
          });
      }

      if (curriculumTab === 'reading') {
          previewData.forEach((row) => {
              // Cols: Level(0), Unit(1), Text(2), Translation(3)
              const level = parseInt(row[0]);
              const unit = parseInt(row[1]);
              if (!level || !unit) return;

              const key = `${selInst.id}-${level}-${unit}`;
              const content = updates[key] || getContent(level, unit);
              
              content.readingText = row[2] || '';
              content.readingTranslation = row[3] || '';
              // Assuming Title isn't in Excel, keep default or existing
              updates[key] = content;
          });
      }

      if (curriculumTab === 'listening') {
          previewData.forEach((row) => {
              // Cols: Level(0), Unit(1), Text(2), Translation(3)
              const level = parseInt(row[0]);
              const unit = parseInt(row[1]);
              if (!level || !unit) return;

              const key = `${selInst.id}-${level}-${unit}`;
              const content = updates[key] || getContent(level, unit);
              
              content.listeningScript = row[2] || '';
              content.listeningTranslation = row[3] || '';
              updates[key] = content;
          });
      }

      if (curriculumTab === 'grammar') {
          const grouped: Record<string, GrammarPoint[]> = {};

          previewData.forEach((row) => {
              // Cols: Level(0), Unit(1), Pattern(2), Def(3), Example(4), ExTrans(5)
              const level = parseInt(row[0]);
              const unit = parseInt(row[1]);
              if (!level || !unit) return;

              const key = `${selInst.id}-${level}-${unit}`;
              if (!grouped[key]) grouped[key] = [];

              grouped[key].push({
                  pattern: row[2] || '',
                  explanation: row[3] || '',
                  usages: [{
                      situation: 'General',
                      example: row[4] || '',
                      translation: row[5] || ''
                  }]
              });
          });

          Object.keys(grouped).forEach(key => {
              const [_, lvl, unt] = key.split('-');
              const content = updates[key] || getContent(parseInt(lvl), parseInt(unt));
              content.grammarList = JSON.stringify(grouped[key]);
              updates[key] = content;
          });
      }

      // Commit Updates
      Object.keys(updates).forEach(key => {
          onSaveContext(key, updates[key]);
      });

      setUploadStatus('SUCCESS');
      setTimeout(() => {
          setUploadStatus('IDLE');
          setPreviewData([]);
          if(fileInputRef.current) fileInputRef.current.value = '';
      }, 2000);
  };

  // --- TOPIK HANDLERS ---
  const handleCreateExam = (type: TopikType) => {
      const newExam: TopikExam = {
          id: Date.now().toString(),
          title: `New ${type === 'READING' ? 'Reading' : 'Listening'} Exam`,
          round: 35, // Default Round
          type: type,
          paperType: 'B',
          timeLimit: type === 'READING' ? 70 : 60,
          questions: [] // Will be auto-filled by useEffect
      };
      onAddTopikExam(newExam);
      setEditingExamId(newExam.id);
  };

  const updateExamField = (field: keyof TopikExam, value: any) => {
      if (!currentExam) return;
      onUpdateTopikExam({ ...currentExam, [field]: value });
  };

  const updateQuestion = (id: number, field: keyof TopikQuestion, value: any) => {
      if (!currentExam) return;
      const updatedQs = currentExam.questions.map(q => q.id === id ? { ...q, [field]: value } : q);
      onUpdateTopikExam({ ...currentExam, questions: updatedQs });
  };

  const updateOption = (qId: number, optIdx: number, value: string) => {
      if (!currentExam) return;
      const q = currentExam.questions.find(q => q.id === qId);
      if (!q) return;
      const newOpts = [...q.options];
      newOpts[optIdx] = value;
      updateQuestion(qId, 'options', newOpts);
  };

  const updateOptionImage = (qId: number, optIdx: number, value: string) => {
      if (!currentExam) return;
      const q = currentExam.questions.find(q => q.id === qId);
      if (!q) return;
      const newOptionImages = [...(q.optionImages || ['', '', '', ''])];
      newOptionImages[optIdx] = value;
      updateQuestion(qId, 'optionImages', newOptionImages);
  };

  const handleGroupPassageChange = (leaderId: number, newPassage: string) => {
      updateQuestion(leaderId, 'passage', newPassage);
  };

  const handleExamAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && currentExam) {
          const reader = new FileReader();
          reader.onloadend = () => {
              updateExamField('audioUrl', reader.result);
          };
          reader.readAsDataURL(file);
      }
  };

  // ================= RENDERERS =================

  const renderUsers = () => {
      const filteredUsers = users.filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()));
      
      return (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
              <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                  <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                          type="text" 
                          placeholder={labels.searchUsers} 
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64 bg-white"
                      />
                  </div>
                  <div className="text-sm text-slate-500 font-medium">
                      {filteredUsers.length} {labels.totalUsers}
                  </div>
              </div>
              <div className="overflow-y-auto flex-1">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                          <tr>
                              <th className="px-6 py-3">{labels.user}</th>
                              <th className="px-6 py-3">{labels.role}</th>
                              <th className="px-6 py-3">{labels.plan}</th>
                              <th className="px-6 py-3 text-right">{labels.actions}</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {filteredUsers.map(u => (
                              <tr key={u.id} className="hover:bg-slate-50/50">
                                  <td className="px-6 py-4">
                                      <div className="flex items-center">
                                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold mr-3">
                                              {u.name.charAt(0)}
                                          </div>
                                          <div>
                                              <div className="font-bold text-slate-800">{u.name}</div>
                                              <div className="text-xs text-slate-500">{u.email}</div>
                                          </div>
                                      </div>
                                  </td>
                                  <td className="px-6 py-4">
                                      <span className={`px-2 py-1 rounded text-xs font-bold ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                                          {u.role}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4">
                                      <span className={`px-2 py-1 rounded text-xs font-bold ${u.tier === UserTier.PAID ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                          {u.tier === UserTier.PAID ? 'Premium' : 'Free'}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4 text-right space-x-2">
                                      {u.role === 'STUDENT' ? (
                                          <button onClick={() => onUpdateUser(u.id, { role: 'ADMIN' })} className="text-purple-600 hover:bg-purple-50 p-1.5 rounded" title={labels.promoteAdmin}><Crown className="w-4 h-4"/></button>
                                      ) : (
                                          <button onClick={() => onUpdateUser(u.id, { role: 'STUDENT' })} className="text-slate-400 hover:bg-slate-100 p-1.5 rounded" title={labels.demote}><UserIcon className="w-4 h-4"/></button>
                                      )}
                                      
                                      {u.tier === UserTier.FREE ? (
                                          <button onClick={() => onUpdateUser(u.id, { tier: UserTier.PAID })} className="text-amber-600 hover:bg-amber-50 p-1.5 rounded" title={labels.grantPremium}><Sparkles className="w-4 h-4"/></button>
                                      ) : (
                                          <button onClick={() => onUpdateUser(u.id, { tier: UserTier.FREE })} className="text-slate-400 hover:bg-slate-100 p-1.5 rounded" title={labels.revokePremium}><X className="w-4 h-4"/></button>
                                      )}

                                      <button onClick={() => onDeleteUser(u.id)} className="text-red-400 hover:bg-red-50 p-1.5 rounded" title={labels.deleteUser}><Trash2 className="w-4 h-4"/></button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      );
  };

  const renderCurriculum = () => {
    return (
        <div className="flex h-full gap-6">
            {/* Sidebar: Institute Selection Only */}
            <div className="w-64 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col shrink-0">
                <div className="p-4 border-b border-slate-200 bg-slate-50 font-bold text-slate-700 flex justify-between items-center">
                    Institutes
                    <button onClick={() => {
                        const name = prompt(labels.enterInstituteName);
                        if(name) onAddInstitute(name);
                    }} className="p-1 hover:bg-slate-200 rounded text-indigo-600"><Plus className="w-4 h-4"/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {institutes.map(inst => (
                        <div 
                            key={inst.id} 
                            className={`flex items-center justify-between px-4 py-3 rounded-lg cursor-pointer text-sm font-medium transition-colors ${selInst?.id === inst.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
                            onClick={() => { setSelInst(inst); setPreviewData([]); setUploadStatus('IDLE'); }}
                        >
                            {inst.name}
                            {selInst?.id !== inst.id && (
                                <button onClick={(e) => { e.stopPropagation(); onDeleteInstitute(inst.id); }} className="text-slate-300 hover:text-red-500"><Trash2 className="w-3 h-3"/></button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content: Module Selection & Upload */}
            <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                {selInst ? (
                    <>
                        <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800">{selInst.name}</h2>
                                <p className="text-slate-500 text-sm mt-1">{labels.selectInstituteTip}</p>
                            </div>
                            {/* Module Tabs */}
                            <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                                <button onClick={() => { setCurriculumTab('vocab'); setPreviewData([]); }} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${curriculumTab === 'vocab' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>{labels.vocab}</button>
                                <button onClick={() => { setCurriculumTab('reading'); setPreviewData([]); }} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${curriculumTab === 'reading' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>{labels.reading}</button>
                                <button onClick={() => { setCurriculumTab('listening'); setPreviewData([]); }} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${curriculumTab === 'listening' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>{labels.listening}</button>
                                <button onClick={() => { setCurriculumTab('grammar'); setPreviewData([]); }} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${curriculumTab === 'grammar' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>{labels.grammar}</button>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col p-8 overflow-hidden">
                            {/* Upload Area */}
                            <div className="mb-8 p-8 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors flex flex-col items-center justify-center text-center">
                                <FileSpreadsheet className="w-12 h-12 text-green-600 mb-4" />
                                <h3 className="text-lg font-bold text-slate-700 mb-2">{labels.uploadExcel}</h3>
                                <p className="text-slate-500 text-sm mb-6 max-w-md">
                                    {curriculumTab === 'vocab' && labels.excelColumnsVocab}
                                    {curriculumTab === 'reading' && labels.excelColumnsReading}
                                    {curriculumTab === 'listening' && labels.excelColumnsListening}
                                    {curriculumTab === 'grammar' && labels.excelColumnsGrammar}
                                </p>
                                <label className="cursor-pointer px-6 py-3 bg-white border border-slate-300 shadow-sm text-slate-700 font-bold rounded-lg hover:border-indigo-500 hover:text-indigo-600 transition-all flex items-center">
                                    <FileUp className="w-4 h-4 mr-2" />
                                    {labels.selectFile}
                                    <input ref={fileInputRef} type="file" hidden accept=".xlsx, .xls" onChange={handleFileUpload} />
                                </label>
                            </div>

                            {/* Preview Area */}
                            {previewData.length > 0 && (
                                <div className="flex-1 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="font-bold text-slate-700 flex items-center"><Eye className="w-4 h-4 mr-2"/> {labels.previewRows} ({previewData.length})</h4>
                                        <button 
                                            onClick={handleBatchSave}
                                            disabled={uploadStatus === 'SAVING' || uploadStatus === 'SUCCESS'}
                                            className={`px-6 py-2 rounded-lg font-bold text-white shadow-lg transition-all flex items-center ${uploadStatus === 'SUCCESS' ? 'bg-green-500' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                                        >
                                            {uploadStatus === 'SAVING' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                            {uploadStatus === 'SUCCESS' && <CheckSquare className="w-4 h-4 mr-2" />}
                                            {uploadStatus === 'IDLE' || uploadStatus === 'READY' ? labels.saveUpdate : uploadStatus === 'SUCCESS' ? labels.success : labels.saving}
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-auto border border-slate-200 rounded-xl bg-white shadow-inner">
                                        <table className="w-full text-sm text-left whitespace-nowrap">
                                            <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0 z-10 shadow-sm">
                                                <tr>
                                                    <th className="px-4 py-3">Level</th>
                                                    <th className="px-4 py-3">Unit</th>
                                                    <th className="px-4 py-3">Content (Col 3)</th>
                                                    <th className="px-4 py-3">Content (Col 4)</th>
                                                    <th className="px-4 py-3">Content (Col 5)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {previewData.slice(0, 100).map((row, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50">
                                                        <td className="px-4 py-2 font-mono text-xs">{row[0]}</td>
                                                        <td className="px-4 py-2 font-mono text-xs">{row[1]}</td>
                                                        <td className="px-4 py-2 max-w-xs truncate">{row[2]}</td>
                                                        <td className="px-4 py-2 max-w-xs truncate">{row[3]}</td>
                                                        <td className="px-4 py-2 max-w-xs truncate">{row[4]}</td>
                                                    </tr>
                                                ))}
                                                {previewData.length > 100 && (
                                                    <tr><td colSpan={5} className="px-4 py-3 text-center text-slate-400 italic">... {previewData.length - 100} more rows ...</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <Library className="w-16 h-16 mb-4 opacity-20" />
                        <p className="font-medium">{labels.selectInstituteTip}</p>
                    </div>
                )}
            </div>
        </div>
    );
  };

  const renderVisualEditor = () => {
      if (!currentExam) return null;

      const STRUCTURE = currentExam.type === 'LISTENING' ? TOPIK_LISTENING_STRUCTURE : TOPIK_READING_STRUCTURE;
      const getQ = (id: number) => currentExam.questions.find(q => q.id === id) || { id, question: '', options: ['','','',''], correctAnswer: 0, score: 2, passage: '' };

      return (
          <div className="flex h-full bg-slate-100">
              {/* Left Sidebar: Navigation */}
              <div className="w-16 bg-white border-r border-slate-200 overflow-y-auto flex flex-col items-center py-4 gap-2 no-scrollbar">
                  {STRUCTURE.map((section, idx) => (
                      <button 
                        key={idx}
                        onClick={() => {
                            setActiveQuestionId(section.range[0]);
                            document.getElementById(`q-anchor-${section.range[0]}`)?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                            activeQuestionId >= section.range[0] && activeQuestionId <= section.range[1] 
                            ? 'bg-indigo-600 text-white shadow-md' 
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                        title={section.instruction}
                      >
                          {section.range[0]}
                      </button>
                  ))}
              </div>

              {/* Main Canvas: The Exam Paper */}
              <div className="flex-1 overflow-y-auto p-8 flex justify-center">
                  <div className="bg-white w-full max-w-[900px] min-h-[1200px] shadow-xl p-12 border border-slate-300">
                      {/* Header - FULLY EDITABLE */}
                      <div className="border-b-2 border-black pb-6 mb-8 text-center relative">
                          {/* LISTENING AUDIO UPLOAD */}
                          {currentExam.type === 'LISTENING' && (
                              <div className="absolute top-0 right-0">
                                  <label className="flex items-center px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-700 font-bold text-sm cursor-pointer hover:bg-indigo-100 transition-colors">
                                      <Upload className="w-4 h-4 mr-2" />
                                      {currentExam.audioUrl ? "Change Audio" : "Upload Audio"}
                                      <input type="file" hidden accept="audio/*" onChange={handleExamAudioUpload} />
                                  </label>
                                  {currentExam.audioUrl && (
                                      <div className="mt-2 text-xs text-emerald-600 font-bold flex items-center justify-end">
                                          <CheckSquare className="w-3 h-3 mr-1" /> Audio Ready
                                      </div>
                                  )}
                              </div>
                          )}

                          <div className="flex justify-center items-center gap-3 mb-4">
                              <h1 className="text-4xl font-extrabold tracking-widest font-serif text-slate-900">TOPIK Ⅱ</h1>
                              <div className="relative">
                                  <select 
                                      value={currentExam.paperType || 'B'} 
                                      onChange={(e) => updateExamField('paperType', e.target.value)}
                                      className="appearance-none bg-black text-white text-2xl font-serif font-bold rounded-full w-10 h-10 text-center cursor-pointer hover:bg-slate-800 focus:ring-2 focus:ring-offset-2 focus:ring-black"
                                      style={{ textAlignLast: 'center' }}
                                  >
                                      <option value="A">A</option>
                                      <option value="B">B</option>
                                  </select>
                              </div>
                          </div>
                          
                          {/* Round Line: 제35회 한국어 능력 시험 */}
                          <div className="flex justify-center items-center text-xl font-bold text-slate-700 font-serif gap-1">
                              <span>제</span>
                              <input 
                                  type="number"
                                  className="w-16 text-center bg-white border-b-2 border-slate-300 focus:border-indigo-600 outline-none px-1"
                                  value={currentExam.round}
                                  onChange={(e) => updateExamField('round', parseInt(e.target.value) || 0)}
                              />
                              <span>회 한국어능력시험</span>
                          </div>

                          {/* Title Edit */}
                          <div className="mt-4 flex justify-center">
                              <input 
                                  className="text-center text-slate-400 font-medium bg-white border-b border-transparent hover:border-slate-200 focus:border-indigo-400 outline-none w-1/2 transition-colors"
                                  value={currentExam.title}
                                  onChange={(e) => updateExamField('title', e.target.value)}
                                  placeholder={labels.examTitleInternal}
                              />
                          </div>
                      </div>

                      {/* Sections */}
                      {STRUCTURE.map((section, sIdx) => {
                          const [start, end] = section.range;
                          const isGrouped = section.grouped; // Share passage
                          const questionsInRange = [];
                          for(let i=start; i<=end; i++) questionsInRange.push(getQ(i));

                          return (
                              <div key={sIdx} className="mb-12 relative group/section" id={`q-anchor-${start}`}>
                                  {/* Instruction Header - Fixed */}
                                  <div className="bg-slate-50 border-l-4 border-slate-800 p-2 mb-6 font-bold text-slate-800 text-[17px] font-serif select-none">
                                      {section.instruction}
                                  </div>

                                  {/* SHARED PASSAGE EDITOR (For Groups) */}
                                  {isGrouped && (
                                      <div className="mb-6 p-4 border-2 border-dashed border-slate-200 rounded-xl hover:border-indigo-400 transition-colors bg-slate-50/50">
                                          <label className="block text-xs font-bold text-indigo-500 mb-2 uppercase">{labels.sharedPassage} (Q{start}~{end})</label>
                                          <textarea 
                                              className="w-full bg-white border-none focus:ring-0 text-[17px] leading-8 font-serif resize-none h-48 outline-none"
                                              placeholder={labels.enterPassagePlaceholder}
                                              value={questionsInRange[0].passage || ''}
                                              onChange={(e) => handleGroupPassageChange(questionsInRange[0].id, e.target.value)}
                                          />
                                      </div>
                                  )}

                                  {/* Questions Loop */}
                                  <div className={isGrouped ? "pl-2" : ""}>
                                      {questionsInRange.map((q) => (
                                          <div key={q.id} className="mb-8 p-4 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200">
                                              <div className="flex gap-4">
                                                  <span className="text-xl font-bold font-serif pt-1">{q.id}.</span>
                                                  
                                                  <div className="flex-1 space-y-4">
                                                      {/* Single Question Passage/Image (If not grouped) */}
                                                      {!isGrouped && (
                                                          <div className="mb-2">
                                                              {/* Standard IMAGE_OPTIONAL means question-level image (Reading Q5-8) */}
                                                              {(section.type === 'IMAGE_OPTIONAL') && (
                                                                  <div className="mb-2">
                                                                      {q.imageUrl ? (
                                                                          <div className="relative inline-block group/img">
                                                                              <img src={q.imageUrl} className="max-h-40 border border-slate-200" />
                                                                              <button onClick={() => updateQuestion(q.id, 'imageUrl', '')} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded opacity-0 group-hover/img:opacity-100"><Trash2 className="w-3 h-3"/></button>
                                                                          </div>
                                                                      ) : (
                                                                          <label className="cursor-pointer inline-flex items-center px-3 py-1 bg-slate-100 text-slate-600 text-xs rounded hover:bg-slate-200">
                                                                              <ImageIcon className="w-3 h-3 mr-1"/> {labels.addQuestionImage} <input type="file" hidden accept="image/*" onChange={(e)=>{
                                                                                  const f=e.target.files?.[0]; if(f){ const r=new FileReader(); r.onloadend=()=>updateQuestion(q.id,'imageUrl',r.result); r.readAsDataURL(f); }
                                                                              }}/>
                                                                          </label>
                                                                      )}
                                                                  </div>
                                                              )}
                                                              
                                                              {/* Box / 보기 Editor */}
                                                              {section.hasBox && (
                                                                  <div className="border border-slate-800 p-4 mb-4 relative">
                                                                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-2 text-xs font-bold border border-slate-200">&lt;보 기&gt;</span>
                                                                      <textarea 
                                                                          className="w-full bg-white p-2 text-[15px] resize-none outline-none border-b border-dashed border-slate-300 focus:border-indigo-500 h-24"
                                                                          placeholder={labels.enterContextBox}
                                                                          value={q.contextBox || ''}
                                                                          onChange={(e) => updateQuestion(q.id, 'contextBox', e.target.value)}
                                                                      />
                                                                  </div>
                                                              )}

                                                              {/* Standard Passage (if needed for individual q) */}
                                                              {!section.type && !section.hasBox && (
                                                                  <textarea 
                                                                      className={`w-full bg-white border-none focus:ring-0 text-[17px] leading-8 font-serif resize-none outline-none ${section.style === 'HEADLINE' ? 'font-bold border-2 border-slate-800 p-4 shadow-[3px_3px_0px_#000]' : 'h-24'}`}
                                                                      placeholder={section.style === 'HEADLINE' ? labels.enterHeadline : labels.enterPassageOptional}
                                                                      value={q.passage || ''}
                                                                      onChange={(e) => updateQuestion(q.id, 'passage', e.target.value)}
                                                                  />
                                                              )}
                                                          </div>
                                                      )}

                                                      {/* Question Prompt */}
                                                      <input 
                                                          className="w-full font-bold text-[18px] bg-white border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none"
                                                          placeholder={labels.enterQuestionPrompt}
                                                          value={q.question}
                                                          onChange={(e) => updateQuestion(q.id, 'question', e.target.value)}
                                                      />

                                                      {/* Options Area */}
                                                      {section.type === 'IMAGE_CHOICE' ? (
                                                          // --- Image Options Grid (For Listening Q1-3) ---
                                                          <div className="grid grid-cols-2 gap-4">
                                                              {[0, 1, 2, 3].map((optIdx) => {
                                                                  const img = q.optionImages?.[optIdx];
                                                                  return (
                                                                      <div key={optIdx} className="flex flex-col items-center gap-2">
                                                                          <button 
                                                                              onClick={() => updateQuestion(q.id, 'correctAnswer', optIdx)}
                                                                              className={`w-full aspect-[4/3] border-2 rounded-lg flex flex-col items-center justify-center relative overflow-hidden group/optImg ${q.correctAnswer === optIdx ? 'border-indigo-600 ring-2 ring-indigo-200' : 'border-slate-200 hover:border-indigo-300'}`}
                                                                          >
                                                                              {img ? (
                                                                                  <>
                                                                                      <img src={img} className="w-full h-full object-contain" />
                                                                                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/optImg:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                                                          <label className="cursor-pointer p-2 bg-white rounded-full text-slate-700 hover:text-indigo-600">
                                                                                              <Edit2 className="w-4 h-4" />
                                                                                              <input type="file" hidden accept="image/*" onChange={(e) => {
                                                                                                  const f=e.target.files?.[0]; if(f){ const r=new FileReader(); r.onloadend=()=>updateOptionImage(q.id,optIdx,r.result as string); r.readAsDataURL(f); }
                                                                                              }}/>
                                                                                          </label>
                                                                                          <div className="p-2 bg-white rounded-full text-red-500 hover:bg-red-50 cursor-pointer" onClick={(e) => { e.stopPropagation(); updateOptionImage(q.id, optIdx, '') }}>
                                                                                              <Trash2 className="w-4 h-4" />
                                                                                          </div>
                                                                                      </div>
                                                                                  </>
                                                                              ) : (
                                                                                  <label className="cursor-pointer flex flex-col items-center text-slate-400 hover:text-indigo-500 p-4 w-full h-full justify-center">
                                                                                      <ImageIcon className="w-8 h-8 mb-2" />
                                                                                      <span className="text-xs font-bold">{labels.uploadOption} {optIdx + 1}</span>
                                                                                      <input type="file" hidden accept="image/*" onChange={(e) => {
                                                                                          const f=e.target.files?.[0]; if(f){ const r=new FileReader(); r.onloadend=()=>updateOptionImage(q.id,optIdx,r.result as string); r.readAsDataURL(f); }
                                                                                      }}/>
                                                                                  </label>
                                                                              )}
                                                                              <div className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${q.correctAnswer === optIdx ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                                                                  {optIdx + 1}
                                                                              </div>
                                                                          </button>
                                                                      </div>
                                                                  );
                                                              })}
                                                          </div>
                                                      ) : (
                                                          // --- Standard Text Options ---
                                                          <div className={`grid ${q.options.some(o => o.length > 25) ? 'grid-cols-1' : 'grid-cols-2'} gap-x-8 gap-y-2`}>
                                                              {q.options.map((opt, oIdx) => (
                                                                  <div key={oIdx} className="flex items-center gap-2">
                                                                      <button 
                                                                          onClick={() => updateQuestion(q.id, 'correctAnswer', oIdx)}
                                                                          className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-sans transition-colors ${q.correctAnswer === oIdx ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-300 text-slate-400 hover:border-indigo-400'}`}
                                                                      >
                                                                          {oIdx + 1}
                                                                      </button>
                                                                      <input 
                                                                          className="flex-1 bg-white border-b border-transparent hover:border-slate-200 focus:border-indigo-500 outline-none text-[16px] py-1"
                                                                          value={opt}
                                                                          onChange={(e) => updateOption(q.id, oIdx, e.target.value)}
                                                                          placeholder={`${labels.optionPlaceholder} ${oIdx + 1}`}
                                                                      />
                                                                  </div>
                                                              ))}
                                                          </div>
                                                      )}
                                                  </div>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>
          </div>
      );
  };

  const renderTopik = () => {
    if (editingExamId) {
        return (
            <div className="flex flex-col h-full bg-slate-50">
                <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
                    <button 
                        onClick={() => setEditingExamId(null)}
                        className="flex items-center text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        {labels.backToExams}
                    </button>
                    <div className="font-bold text-slate-800 text-lg">{currentExam?.title}</div>
                    <div className="w-32 flex justify-end">
                       {/* Future: Add Export/Preview buttons */}
                    </div>
                </div>
                <div className="flex-1 overflow-hidden">
                    {renderVisualEditor()}
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 h-full overflow-y-auto">
             <div className="flex justify-between items-center mb-8">
                 <div>
                     <h2 className="text-2xl font-bold text-slate-800">{labels.topikExam}</h2>
                     <p className="text-slate-500 text-sm mt-1">{labels.manageMockExams}</p>
                 </div>
                 <div className="flex gap-3">
                     <button 
                         onClick={() => handleCreateExam('READING')}
                         className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
                     >
                         <Plus className="w-4 h-4 mr-2" /> {labels.newReading}
                     </button>
                     <button 
                         onClick={() => handleCreateExam('LISTENING')}
                         className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
                     >
                         <Plus className="w-4 h-4 mr-2" /> {labels.newListening}
                     </button>
                 </div>
             </div>
 
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                 {topikExams.map(exam => (
                     <div key={exam.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all group hover:border-indigo-300">
                         <div className="flex justify-between items-start mb-4">
                             <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${exam.type === 'READING' ? 'bg-blue-50 text-blue-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                 {exam.type}
                             </span>
                             <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button onClick={() => { if(window.confirm('Delete exam?')) onDeleteTopikExam(exam.id); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                     <Trash2 className="w-4 h-4" />
                                 </button>
                             </div>
                         </div>
                         
                         <h3 className="text-lg font-bold text-slate-800 mb-2 line-clamp-1">{exam.title}</h3>
                         <div className="flex items-center text-sm text-slate-500 mb-6 gap-4">
                             <span className="flex items-center"><GraduationCap className="w-4 h-4 mr-1.5"/> {labels.round} {exam.round}</span>
                             <span className="flex items-center"><FileText className="w-4 h-4 mr-1.5"/> {exam.questions.length} Qs</span>
                             <span className="flex items-center"><Clock className="w-4 h-4 mr-1.5"/> {exam.timeLimit}m</span>
                         </div>
 
                         <button 
                             onClick={() => setEditingExamId(exam.id)}
                             className="w-full py-2.5 bg-slate-50 text-slate-600 font-bold rounded-lg hover:bg-slate-100 hover:text-indigo-600 transition-colors flex items-center justify-center group/btn"
                         >
                             {labels.editContent} <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover/btn:translate-x-1" />
                         </button>
                     </div>
                 ))}
                 
                 {topikExams.length === 0 && (
                     <div className="col-span-full py-16 text-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50">
                         <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-slate-300">
                             <GraduationCap className="w-8 h-8" />
                         </div>
                         <h3 className="text-lg font-bold text-slate-700 mb-1">{labels.noExamsFound}</h3>
                         <p className="text-slate-500">{labels.createExamTip}</p>
                     </div>
                 )}
             </div>
        </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-100px)] bg-slate-50 gap-6">
        {/* Navigation Sidebar */}
        <div className="w-48 flex flex-col gap-2">
            <button onClick={() => setActiveTab('dashboard')} className={`text-left px-4 py-3 rounded-xl font-bold text-sm flex items-center transition-colors ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-white'}`}>
                <BarChart3 className="w-4 h-4 mr-3" /> {labels.dashboardTab}
            </button>
            <button onClick={() => setActiveTab('users')} className={`text-left px-4 py-3 rounded-xl font-bold text-sm flex items-center transition-colors ${activeTab === 'users' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-white'}`}>
                <Users className="w-4 h-4 mr-3" /> {labels.usersTab}
            </button>
            <button onClick={() => setActiveTab('curriculum')} className={`text-left px-4 py-3 rounded-xl font-bold text-sm flex items-center transition-colors ${activeTab === 'curriculum' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-white'}`}>
                <Book className="w-4 h-4 mr-3" /> {labels.curriculumTab}
            </button>
            <button onClick={() => setActiveTab('topik')} className={`text-left px-4 py-3 rounded-xl font-bold text-sm flex items-center transition-colors ${activeTab === 'topik' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-white'}`}>
                <GraduationCap className="w-4 h-4 mr-3" /> {labels.topik}
            </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden">
            {activeTab === 'dashboard' && (
                <div className="grid grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><h3 className="text-slate-500 text-sm font-bold uppercase mb-2">{labels.totalUsers}</h3><p className="text-4xl font-bold text-slate-800">{stats.totalUsers}</p></div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><h3 className="text-slate-500 text-sm font-bold uppercase mb-2">{labels.activeLearners}</h3><p className="text-4xl font-bold text-emerald-600">{stats.activeUsers}</p></div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><h3 className="text-slate-500 text-sm font-bold uppercase mb-2">{labels.revenue}</h3><p className="text-4xl font-bold text-indigo-600">${stats.totalRevenue}</p></div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><h3 className="text-slate-500 text-sm font-bold uppercase mb-2">{labels.contentCoverage}</h3><p className="text-4xl font-bold text-blue-600">{stats.contentCoverage}%</p></div>
                </div>
            )}
            {activeTab === 'users' && renderUsers()}
            {activeTab === 'curriculum' && renderCurriculum()}
            {activeTab === 'topik' && renderTopik()}
        </div>
    </div>
  );
};

export default AdminPanel;
