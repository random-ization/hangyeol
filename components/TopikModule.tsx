import React, { useState, useEffect, useRef } from 'react';
import { TopikExam, Language, TopikQuestion, ExamAttempt, Annotation } from '../types';
import {
  Clock, Trophy, ArrowLeft, Calendar, Check, X,
  MessageSquare, Trash2, Play, Pause, FastForward,
  RotateCcw, Eye, Download, ChevronRight, ChevronLeft
} from 'lucide-react';
import { getLabels } from '../utils/i18n';

interface TopikModuleProps {
  exams: TopikExam[];
  language: Language;
  history: ExamAttempt[];
  onSaveHistory: (attempt: ExamAttempt) => void;
  annotations: Annotation[];
  onSaveAnnotation: (annotation: Annotation) => void;
}

// --- 仿真布局常量 ---
const PAPER_PADDING = "p-8 md:p-12"; // 试卷内边距
const FONT_READING = "font-serif text-[17px] leading-[1.8] text-justify text-slate-800"; // 阅读文章字体
const FONT_QUESTION = "font-bold text-[16px] text-slate-900 mb-3"; // 问题题干字体
const BOX_STYLE = "border border-slate-700 p-4 relative mt-6 mb-6"; // <보기> 框样式

const TopikModule: React.FC<TopikModuleProps> = ({ exams, language, history, onSaveHistory, annotations, onSaveAnnotation }) => {
  const [view, setView] = useState<'LIST' | 'HISTORY_LIST' | 'COVER' | 'EXAM' | 'RESULT' | 'REVIEW'>('LIST');
  const [currentExam, setCurrentExam] = useState<TopikExam | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [currentPage, setCurrentPage] = useState(0); // 新增：分页模拟（每页显示一组题目）

  // Review Mode
  const [currentReviewAttempt, setCurrentReviewAttempt] = useState<ExamAttempt | null>(null);

  // Annotation State
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number; text: string; contextKey: string } | null>(null);
  const [showAnnotationMenu, setShowAnnotationMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [noteInput, setNoteInput] = useState('');

  const labels = getLabels(language);
  const questionRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const readingExams = exams.filter(e => e.type === 'READING');
  const listeningExams = exams.filter(e => e.type === 'LISTENING');
  const examContextPrefix = currentExam ? `TOPIK-${currentExam.id}` : '';
  const sidebarAnnotations = annotations.filter(a => a.contextKey.startsWith(examContextPrefix) && a.note?.trim());

  // --- Helpers ---
  const getCircleNumber = (num: number) => ['①', '②', '③', '④'][num] || `${num + 1}`;

  // Group questions by shared passage or pages
  // 为了模拟 PDF，我们按“组”来渲染。如果题目有 groupCount > 1，则视为一组。
  const getQuestionGroups = (exam: TopikExam) => {
    const groups: TopikQuestion[][] = [];
    let i = 0;
    while (i < exam.questions.length) {
      const q = exam.questions[i];
      // 简单的分组逻辑：如果有 groupCount 或者是连续的阅读理解题
      // 这里的 groupCount 应该由后端提供，或者我们假设没有显式 groupCount 时按 2-3 题一页
      const count = q.groupCount && q.groupCount > 1 ? q.groupCount : 1;
      groups.push(exam.questions.slice(i, i + count));
      i += count;
    }
    return groups;
  };

  const questionGroups = currentExam ? getQuestionGroups(currentExam) : [];

  // --- Timer ---
  useEffect(() => {
    let interval: number;
    if (timerActive && timeLeft > 0) {
      interval = window.setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && timerActive) {
      submitExam();
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  // --- Actions ---
  const startExam = (exam: TopikExam) => {
    setCurrentExam(exam);
    setUserAnswers({});
    setTimeLeft(exam.timeLimit * 60);
    setCurrentPage(0);
    setView('COVER');
  };

  const beginTest = () => {
    setTimerActive(true);
    setView('EXAM');
  };

  const submitExam = () => {
    setTimerActive(false);
    if (!currentExam) return;
    let score = 0, total = 0;
    currentExam.questions.forEach(q => {
      total += q.score || 2;
      if (userAnswers[q.id] === q.correctAnswer) score += q.score || 2;
    });
    const attempt: ExamAttempt = {
      id: Date.now().toString(),
      examId: currentExam.id,
      examTitle: currentExam.title,
      score, maxScore: total, timestamp: Date.now(), userAnswers: { ...userAnswers }
    };
    onSaveHistory(attempt);
    setCurrentReviewAttempt(attempt);
    setView('RESULT');
  };

  const handleAnswer = (qId: number, optIdx: number) => {
    if (view === 'REVIEW') return;
    setUserAnswers(prev => ({ ...prev, [qId]: optIdx }));
  };

  // --- Annotation Handlers (Highlighting) ---
  const handleTextSelection = (contextKey: string) => {
    if (view !== 'REVIEW') return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    const text = range.toString();
    const rect = range.getBoundingClientRect();

    // 简单的坐标定位
    setSelectionRange({ start: 0, end: 0, text, contextKey }); // 简化逻辑，实际需计算偏移
    setMenuPosition({ top: rect.top + window.scrollY - 40, left: rect.left + rect.width / 2 });
    setShowAnnotationMenu(true);
  };

  const saveHighlight = (color: Annotation['color']) => {
    if (!selectionRange) return;
    const newAnn: Annotation = {
      id: Date.now().toString(),
      contextKey: selectionRange.contextKey,
      text: selectionRange.text,
      color, note: noteInput, timestamp: Date.now()
    };
    onSaveAnnotation(newAnn);
    setShowAnnotationMenu(false);
    setNoteInput('');
    window.getSelection()?.removeAllRanges();
  };

  // --- Renderers ---

  // 1. 渲染文章/材料 (Reading Passage / Box)
  const renderPassage = (q: TopikQuestion) => {
    // 图片题 (Listening Q1-3, Reading Charts)
    if (q.image || q.imageUrl) {
      return (
        <div className="mb-6 flex justify-center bg-white p-2 border border-slate-100 rounded">
          <img src={q.image || q.imageUrl} alt="Question Material" className="max-h-[300px] object-contain" />
        </div>
      );
    }

    // 新闻标题题 (Reading Q25-27)
    if (q.layout === 'NEWS_HEADLINE' && q.passage) {
      return (
        <div className="mb-6 border-2 border-slate-800 p-6 bg-white shadow-[4px_4px_0px_#000]">
          <h3 className="font-serif font-bold text-xl text-slate-900 leading-snug tracking-tight text-center">
            {q.passage}
          </h3>
        </div>
      );
    }

    // 插入文本框 (<보기>) (Reading Q39-41, or just a box)
    if (q.contextBox || q.layout === 'INSERT_BOX') {
      return (
        <>
          {q.passage && (
            <div className={`mb-6 ${FONT_READING} whitespace-pre-wrap`}>
              {q.passage}
            </div>
          )}
          <div className={BOX_STYLE}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-3 text-sm font-bold border border-slate-800">
              &lt;보 기&gt;
            </div>
            <div className={`${FONT_READING} text-[15px]`}>
              {q.contextBox || q.passage}
            </div>
          </div>
        </>
      );
    }

    // 普通阅读文章 (Reading Q1-50 General)
    if (q.passage) {
      return (
        <div className="mb-6 border border-slate-300 p-6 bg-white shadow-sm">
          <div className={`${FONT_READING} whitespace-pre-wrap`}>
            {q.passage}
          </div>
        </div>
      );
    }
    return null;
  };

  // 2. 渲染单个题目 (Question Block)
  const renderQuestion = (q: TopikQuestion, showPassage = false) => {
    const isReview = view === 'REVIEW';
    const myAnswer = isReview ? currentReviewAttempt?.userAnswers[q.id] : userAnswers[q.id];

    return (
      <div key={q.id} ref={el => { questionRefs.current[q.id] = el; }} className="mb-8 break-inside-avoid">
        {/* 题干 */}
        <div className="flex gap-3 mb-3">
          <span className="text-[18px] font-bold text-slate-900 font-serif min-w-[24px] pt-0.5">{q.id}.</span>
          <div className="flex-1">
            {showPassage && renderPassage(q)}
            {q.question && <div className={FONT_QUESTION} dangerouslySetInnerHTML={{ __html: q.question.replace(/\(\s*\)/g, '( &nbsp;&nbsp;&nbsp;&nbsp; )') }} />}
          </div>
        </div>

        {/* 选项 (Grid Layout) */}
        {q.optionImages && q.optionImages.length > 0 ? (
          // 图片选项 (Listening Q1-3)
          <div className="grid grid-cols-2 gap-4 ml-8">
            {q.optionImages.map((img, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswer(q.id, idx)}
                disabled={isReview}
                className={`relative border-2 rounded-lg p-1 transition-all ${myAnswer === idx
                    ? 'border-indigo-600 ring-2 ring-indigo-100'
                    : 'border-slate-200 hover:border-slate-300'
                  }`}
              >
                <span className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${myAnswer === idx ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {getCircleNumber(idx)}
                </span>
                <img src={img} className="w-full h-32 object-contain" />
                {isReview && q.correctAnswer === idx && <div className="absolute inset-0 border-4 border-green-500 rounded-lg pointer-events-none" />}
                {isReview && myAnswer === idx && myAnswer !== q.correctAnswer && <div className="absolute inset-0 bg-red-500/20 pointer-events-none" />}
              </button>
            ))}
          </div>
        ) : (
          // 文本选项 (Standard) - 自动判断排版
          <div className={`grid ${q.options.some(o => o.length > 15) ? 'grid-cols-1 gap-3' : 'grid-cols-2 gap-x-8 gap-y-2'} ml-9`}>
            {q.options.map((opt, idx) => {
              let itemClass = "flex items-start gap-2 cursor-pointer p-1 rounded -ml-1 transition-colors hover:bg-slate-100";
              if (isReview) {
                if (idx === q.correctAnswer) itemClass += " text-green-700 font-bold bg-green-50";
                else if (myAnswer === idx) itemClass += " text-red-600 bg-red-50 line-through decoration-red-400";
                else itemClass += " opacity-50";
              } else {
                if (myAnswer === idx) itemClass += " bg-indigo-50 text-indigo-900 font-medium";
              }

              return (
                <label key={idx} className={itemClass}>
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    className="mt-1.5 w-3 h-3 text-indigo-600 focus:ring-indigo-500 border-gray-300 hidden"
                    checked={myAnswer === idx}
                    onChange={() => handleAnswer(q.id, idx)}
                    disabled={isReview}
                  />
                  <span className={`text-[15px] font-sans ${myAnswer === idx ? 'font-bold' : ''}`}>{getCircleNumber(idx)}</span>
                  <span className="text-[16px] leading-snug">{opt}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // 3. 渲染题目组 (Grouped Questions)
  // 模拟 PDF 的“共享材料在左/上，题目在右/下”
  const renderQuestionGroup = (group: TopikQuestion[]) => {
    if (group.length === 0) return null;

    // 检查是否有共享材料 (取第一个题目的 passage)
    const leader = group[0];
    const hasSharedPassage = group.length > 1 && !!leader.passage;

    // 指引文 (e.g. [1~2] ...)
    const rangeText = group.length > 1 ? `[${leader.id}~${group[group.length - 1].id}]` : `[${leader.id}]`;
    const instruction = `※ ${rangeText} ${leader.instruction || '다음을 읽고 물음에 답하십시오.'}`;

    return (
      <div key={leader.id} className="mb-12 break-inside-avoid">
        {/* 1. Instruction Bar */}
        <div className="bg-slate-50 border-l-4 border-slate-800 px-3 py-2 mb-6 text-slate-800 font-bold text-[15px]">
          {instruction}
        </div>

        {/* 2. Content Layout */}
        <div className={`flex flex-col ${hasSharedPassage ? 'lg:flex-row lg:gap-8' : ''}`}>

          {/* Shared Passage (Left Column on Desktop) */}
          {hasSharedPassage && (
            <div className="lg:w-1/2 shrink-0 mb-6 lg:mb-0">
              <div className="border border-slate-400 p-6 bg-white h-full relative shadow-sm">
                <div className={FONT_READING + " whitespace-pre-wrap"}>
                  {leader.passage}
                </div>
              </div>
            </div>
          )}

          {/* Questions (Right Column) */}
          <div className="flex-1">
            {group.map(q => renderQuestion(q, !hasSharedPassage))} {/* 如果共享了，子题目就不单独渲染材料 */}
          </div>
        </div>
      </div>
    );
  };

  // --- Audio Player (Bottom Fixed) ---
  const AudioBar = ({ url }: { url: string }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);

    const toggle = () => {
      if (audioRef.current?.paused) { audioRef.current.play(); setPlaying(true); }
      else { audioRef.current?.pause(); setPlaying(false); }
    };

    return (
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900 text-white p-4 shadow-lg flex items-center gap-4 z-50">
        <audio
          ref={audioRef}
          src={url}
          onTimeUpdate={(e) => setProgress((e.currentTarget.currentTime / e.currentTarget.duration) * 100)}
          onEnded={() => setPlaying(false)}
        />
        <button onClick={toggle} className="w-10 h-10 bg-white text-slate-900 rounded-full flex items-center justify-center hover:bg-indigo-100">
          {playing ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
        </button>
        <div className="flex-1 bg-slate-700 h-2 rounded-full overflow-hidden">
          <div className="bg-indigo-400 h-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <div className="text-xs font-mono text-slate-400">Listening Audio</div>
      </div>
    );
  };

  // --- VIEW: COVER PAGE ---
  if (view === 'COVER' && currentExam) {
    return (
      <div className="min-h-screen bg-slate-100 py-10 flex justify-center">
        <div className="bg-white w-full max-w-[800px] aspect-[1/1.414] shadow-2xl p-16 border border-slate-300 flex flex-col justify-between relative">
          {/* Watermark-like decoration */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-50 text-[120px] font-black opacity-50 pointer-events-none select-none">TOPIK</div>

          <div className="text-center border-b-4 border-double border-black pb-8">
            <div className="text-lg font-serif mb-2">한국어능력시험 I</div>
            <h1 className="text-5xl font-black font-serif tracking-widest mb-4">TOPIK Ⅱ</h1>
            <div className="text-2xl font-bold font-serif">제 {currentExam.round} 회</div>
          </div>

          <div className="flex-1 flex flex-col justify-center gap-12 px-8">
            <div className="grid grid-cols-2 gap-x-12 gap-y-8 text-xl font-serif">
              <div className="flex justify-between border-b border-black pb-2">
                <span className="font-bold">수험 번호</span>
                <span className="font-mono text-slate-500">12345678</span>
              </div>
              <div className="flex justify-between border-b border-black pb-2">
                <span className="font-bold">이 름</span>
                <span className="font-mono text-slate-500">Hong Gil Dong</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-8 rounded-xl text-center">
              <h3 className="font-bold text-lg mb-6">유 의 사 항 (Information)</h3>
              <ul className="text-left text-sm space-y-3 list-disc pl-5 text-slate-700">
                <li>시험 시작 지시가 있을 때까지 문제를 풀지 마십시오.</li>
                <li>수험번호와 이름을 정확하게 적어 주십시오.</li>
                <li>답안지를 구기거나 훼손하지 마십시오.</li>
              </ul>
            </div>
          </div>

          <button
            onClick={beginTest}
            className="w-full py-5 bg-black text-white text-2xl font-bold font-serif hover:bg-slate-800 transition-colors shadow-lg mt-8"
          >
            시험 시작 (Start Exam)
          </button>
        </div>
      </div>
    );
  }

  // --- VIEW: EXAM PAPER ---
  if ((view === 'EXAM' || view === 'REVIEW') && currentExam) {
    return (
      <div className="flex flex-col h-screen bg-slate-200">
        {/* 1. Header Bar */}
        <div className="bg-slate-800 text-white h-14 flex items-center justify-between px-6 shadow-md z-20 shrink-0">
          <div className="flex items-center gap-4">
            {view === 'REVIEW' && <button onClick={() => setView('HISTORY_LIST')}><ArrowLeft className="w-5 h-5" /></button>}
            <span className="font-bold text-lg tracking-wide">{currentExam.title}</span>
          </div>
          {view === 'EXAM' ? (
            <div className={`text-xl font-mono font-bold flex items-center ${timeLeft < 300 ? 'text-red-400' : 'text-emerald-400'}`}>
              <Clock className="w-5 h-5 mr-2" />
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
            </div>
          ) : (
            <div className="text-emerald-400 font-bold text-lg">
              Score: {currentReviewAttempt?.score} / {currentReviewAttempt?.maxScore}
            </div>
          )}
          <div className="w-32 flex justify-end">
            {view === 'EXAM' && (
              <button onClick={submitExam} className="bg-white text-slate-900 px-4 py-1.5 rounded font-bold text-sm hover:bg-indigo-50">
                제출 (Submit)
              </button>
            )}
          </div>
        </div>

        {/* 2. Main Paper Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden flex justify-center p-4 md:p-8 relative">

          {/* PDF-like Page Container */}
          <div className="bg-white w-full max-w-[1000px] shadow-2xl min-h-screen relative flex flex-col">

            {/* Page Header (模拟每一页的页眉) */}
            <div className="h-16 border-b-2 border-black flex justify-between items-end px-8 pb-2 mb-8">
              <span className="font-bold text-lg text-slate-800">TOPIK Ⅱ {currentExam.type === 'READING' ? '읽기 (Reading)' : '듣기 (Listening)'}</span>
              <span className="font-mono text-slate-400">제 {currentExam.round} 회</span>
            </div>

            {/* Questions Content */}
            <div className={`flex-1 ${PAPER_PADDING} ${view === 'EXAM' ? 'select-none' : ''}`}>
              {questionGroups.map((group, idx) => (
                <React.Fragment key={idx}>
                  {renderQuestionGroup(group)}
                </React.Fragment>
              ))}
            </div>

            {/* Footer (Pagination) */}
            <div className="h-12 border-t border-slate-200 flex items-center justify-center text-slate-400 font-mono text-sm mt-auto">
              - End of Page -
            </div>

            {/* Annotation Popover (Review Only) */}
            {showAnnotationMenu && view === 'REVIEW' && (
              <div
                className="fixed bg-white shadow-xl border border-slate-200 rounded-lg p-2 flex gap-2 z-50 animate-in zoom-in-95"
                style={{ top: menuPosition?.top, left: menuPosition?.left }}
              >
                <button onClick={() => saveHighlight('yellow')} className="w-6 h-6 bg-yellow-200 rounded-full border hover:scale-110" />
                <button onClick={() => saveHighlight('green')} className="w-6 h-6 bg-green-200 rounded-full border hover:scale-110" />
                <button onClick={() => setShowAnnotationMenu(false)} className="ml-2 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
            )}
          </div>
        </div>

        {/* 3. Audio Bar (Listening Only) */}
        {view === 'EXAM' && currentExam.type === 'LISTENING' && currentExam.audioUrl && (
          <AudioBar url={currentExam.audioUrl} />
        )}
      </div>
    );
  }

  // --- VIEW: LIST / HISTORY ---
  // (Simplification: Using your original list view logic here, minimized for brevity)
  if (view === 'LIST') {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2"><Trophy className="text-indigo-600" /> {labels.topikExam}</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {exams.map(exam => (
            <button key={exam.id} onClick={() => startExam(exam)} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-indigo-500 text-left transition-all">
              <div className="flex justify-between mb-2">
                <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded font-bold">{exam.type}</span>
                <span className="text-slate-400 text-xs">{exam.timeLimit} min</span>
              </div>
              <h3 className="font-bold text-lg text-slate-800">{exam.title}</h3>
              <p className="text-slate-500 text-sm mt-1">Round {exam.round}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <Trophy className="w-16 h-16 text-indigo-200 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-800">Exam Completed!</h2>
        <button onClick={() => setView('LIST')} className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg">Back to List</button>
      </div>
    </div>
  );
};

export default TopikModule;