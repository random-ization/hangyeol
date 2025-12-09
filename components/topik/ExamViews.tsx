import React, { useMemo, useRef, useState } from 'react';
import { TopikExam, Language, Annotation } from '../../types';
import { Clock, Trophy, RotateCcw, ArrowLeft, CheckCircle, Eye, MessageSquare, Trash2, X, Check } from 'lucide-react';
import { getLabels } from '../../utils/i18n';
import { QuestionRenderer } from './QuestionRenderer';
import AnnotationMenu from '../AnnotationMenu';

// PDF 仿真样式常量
const PAPER_MAX_WIDTH = "max-w-[900px]";
const FONT_SERIF = "font-serif";

// TOPIK Reading 结构定义
const TOPIK_READING_STRUCTURE = [
  { range: [1, 2], instruction: "※ [1~2] (    )에 들어갈 가장 알맞은 것을 고르십시오. (각 2점)" },
  { range: [3, 4], instruction: "※ [3～4] 다음 밑줄 친 부분과 의미가 비슷한 것을 고르십시오. (각 2점)" },
  { range: [5, 8], instruction: "※ [5～8] 다음은 무엇에 대한 글인지 고르십시오. (각 2점)" },
  { range: [9, 12], instruction: "※ [9～12] 다음 글 또는 도표의 내용과 같은 것을 고르십시오. (각 2점)" },
  { range: [13, 15], instruction: "※ [13～15] 다음을 순서대로 맞게 배열한 것을 고르십시오. (각 2점)" },
  { range: [16, 18], instruction: "※ [16～18] 다음을 읽고 (    )에 들어갈 내용으로 가장 알맞은 것을 고르십시오. (각 2점)" },
  { range: [19, 24], instruction: "※ [19～24] 다음을 읽고 물음에 답하십시오. (각 2점)" },
  { range: [25, 27], instruction: "※ [25～27] 다음은 신문 기사의 제목입니다. 가장 잘 설명한 것을 고르십시오. (각 2점)" },
  { range: [28, 31], instruction: "※ [28～31] 다음을 읽고 (    )에 들어갈 내용으로 가장 알맞은 것을 고르십시오. (각 2점)" },
  { range: [32, 34], instruction: "※ [32～34] 다음을 읽고 내용이 같은 것을 고르십시오. (각 2점)" },
  { range: [35, 38], instruction: "※ [35～38] 다음 글의 주제로 가장 알맞은 것을 고르십시오. (각 2점)" },
  { range: [39, 41], instruction: "※ [39～41] 다음 글에서 <보기>의 문장이 들어가기에 가장 알맞은 곳을 고르십시오. (각 2점)" },
  { range: [42, 50], instruction: "※ [42～50] 다음을 읽고 물음에 답하십시오. (각 2점)" },
];

const TOPIK_LISTENING_STRUCTURE = [
  { range: [1, 3], instruction: "※ [1～3] 다음을 듣고 알맞은 그림을 고르십시오. (각 2점)" },
  { range: [4, 8], instruction: "※ [4～8] 다음 대화를 잘 듣고 이어질 수 있는 말을 고르십시오. (각 2점)" },
  { range: [9, 12], instruction: "※ [9～12] 다음 대화를 잘 듣고 여자가 이어서 할 행동으로 알맞은 것을 고르십시오. (각 2점)" },
  { range: [13, 16], instruction: "※ [13～16] 다음을 듣고 내용과 일치하는 것을 고르십시오. (각 2점)" },
  { range: [17, 20], instruction: "※ [17～20] 다음을 듣고 남자의 중심 생각을 고르십시오. (각 2점)" },
  { range: [21, 50], instruction: "※ [21～50] 다음을 듣고 물음에 답하십시오. (각 2점)" },
];

// Exam Cover View - PDF 风格封面
interface ExamCoverViewProps {
  exam: TopikExam;
  language: Language;
  onStart: () => void;
  onBack: () => void;
  hasAttempted?: boolean;
}

export const ExamCoverView: React.FC<ExamCoverViewProps> = React.memo(
  ({ exam, language, onStart, onBack, hasAttempted }) => {
    const labels = useMemo(() => getLabels(language), [language]);

    return (
      <div className="min-h-screen bg-slate-200 py-10 flex justify-center overflow-y-auto px-4">
        <div className={`bg-white w-full ${PAPER_MAX_WIDTH} shadow-2xl p-12 border border-slate-300 flex flex-col relative min-h-[900px]`}>

          {/* 返回按钮 */}
          <button
            onClick={onBack}
            className="absolute top-6 left-6 text-slate-500 hover:text-indigo-600 flex items-center gap-2 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            {labels.back || 'Back'}
          </button>

          {/* 封面主体 */}
          <div className="flex-1 flex flex-col items-center justify-center text-center">

            {/* TOPIK 大标题 */}
            <div className="border-b-4 border-double border-black pb-6 mb-8 w-full max-w-md">
              <div className="text-sm text-slate-500 mb-2">한국어능력시험 II</div>
              <h1 className={`text-6xl font-black ${FONT_SERIF} tracking-widest text-slate-900 mb-4`}>
                TOPIK Ⅱ
              </h1>
              <div className="inline-block bg-slate-900 text-white text-2xl font-bold px-6 py-2 rounded-full">
                {exam.type === 'READING' ? '읽기' : '듣기'}
              </div>
            </div>

            {/* 考试信息 */}
            <div className="grid grid-cols-2 gap-8 w-full max-w-sm text-left mb-8">
              <div className="border-b-2 border-slate-300 pb-2">
                <div className="text-sm text-slate-500 mb-1">회차</div>
                <div className={`text-xl font-bold ${FONT_SERIF}`}>제 {exam.round || '?'} 회</div>
              </div>
              <div className="border-b-2 border-slate-300 pb-2">
                <div className="text-sm text-slate-500 mb-1">시간</div>
                <div className={`text-xl font-bold ${FONT_SERIF}`}>{exam.timeLimit} 분</div>
              </div>
              <div className="border-b-2 border-slate-300 pb-2">
                <div className="text-sm text-slate-500 mb-1">문항수</div>
                <div className={`text-xl font-bold ${FONT_SERIF}`}>{exam.questions.length} 문항</div>
              </div>
              <div className="border-b-2 border-slate-300 pb-2">
                <div className="text-sm text-slate-500 mb-1">배점</div>
                <div className={`text-xl font-bold ${FONT_SERIF}`}>100 점</div>
              </div>
            </div>

            {/* 유의사항 */}
            <div className="bg-slate-50 border-2 border-slate-200 p-6 w-full max-w-md text-left mb-8">
              <h3 className="font-bold text-center mb-4 border-b border-slate-300 pb-2">
                유 의 사 항 (Information)
              </h3>
              <ul className="text-sm space-y-3 list-disc pl-5 text-slate-700">
                <li>
                  시험 시작 지시가 있을 때까지 문제를 풀지 마십시오.
                  <br />
                  <span className="text-slate-400 text-xs">Do not start until instructed.</span>
                </li>
                <li>
                  모든 문제의 정답은 하나입니다.
                  <br />
                  <span className="text-slate-400 text-xs">Each question has only one correct answer.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* 시작 버튼 */}
          <button
            onClick={onStart}
            className={`w-full py-5 bg-slate-900 text-white text-xl font-bold ${FONT_SERIF} hover:bg-slate-800 transition-colors shadow-xl tracking-widest`}
          >
            {hasAttempted
              ? (language === 'zh' ? '重新考试 (RETAKE EXAM)' : '시험 다시 보기 (RETAKE EXAM)')
              : (language === 'zh' ? '开始考试 (START EXAM)' : '시험 시작 (START EXAM)')
            }
          </button>
        </div>
      </div>
    );
  }
);

// Exam Result View
interface ExamResultViewProps {
  exam: TopikExam;
  result: {
    score: number;
    totalScore: number;
    correctCount: number;
    totalQuestions: number;
  };
  language: Language;
  onReview: () => void;
  onTryAgain: () => void;
  onBackToList: () => void;
}

export const ExamResultView: React.FC<ExamResultViewProps> = React.memo(
  ({ exam, result, language, onReview, onTryAgain, onBackToList }) => {
    const labels = useMemo(() => getLabels(language), [language]);
    const percentage = useMemo(
      () => (result.score / result.totalScore) * 100,
      [result.score, result.totalScore]
    );
    const passed = percentage >= 60;

    return (
      <div className="min-h-screen bg-slate-200 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white rounded-xl shadow-2xl p-8 text-center border border-slate-200">

          {/* 图标 */}
          <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${passed ? 'bg-emerald-100' : 'bg-amber-100'}`}>
            <Trophy className={`w-12 h-12 ${passed ? 'text-emerald-600' : 'text-amber-600'}`} />
          </div>

          <h1 className={`text-3xl font-bold ${FONT_SERIF} text-slate-900 mb-2`}>
            {passed ? '축하합니다!' : '시험 완료'}
          </h1>
          <p className="text-slate-500 mb-8">{exam.title}</p>

          {/* 分数 */}
          <div className={`p-6 rounded-xl mb-6 ${passed ? 'bg-emerald-50' : 'bg-slate-50'}`}>
            <div className="text-sm text-slate-500 mb-2">Your Score</div>
            <div className={`text-5xl font-black ${passed ? 'text-emerald-600' : 'text-slate-700'}`}>
              {result.score}
              <span className="text-xl text-slate-400 font-normal"> / {result.totalScore}</span>
            </div>
            <div className="text-sm text-slate-500 mt-2">
              ({result.correctCount} / {result.totalQuestions} correct)
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="space-y-3">
            <button
              onClick={onReview}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center justify-center gap-2"
            >
              <Eye className="w-5 h-5" />
              {labels.reviewAnswers || 'Review Answers'}
            </button>

            <button
              onClick={onTryAgain}
              className="w-full py-3 bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-bold flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              {labels.tryAgain || 'Try Again'}
            </button>

            <button
              onClick={onBackToList}
              className="w-full py-3 text-slate-500 hover:text-indigo-600 font-medium flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              {labels.backToList || 'Back to List'}
            </button>
          </div>
        </div>
      </div>
    );
  }
);

// Exam Review View - PDF 样式复习页
interface ExamReviewViewProps {
  exam: TopikExam;
  userAnswers: Record<number, number>;
  language: Language;
  annotations: Annotation[];
  onSaveAnnotation: (annotation: Annotation) => void;
  onDeleteAnnotation: (contextKey: string) => void;
  onBack: () => void;
}

export const ExamReviewView: React.FC<ExamReviewViewProps> = React.memo(
  ({ exam, userAnswers, language, annotations, onSaveAnnotation, onDeleteAnnotation, onBack }) => {
    const labels = useMemo(() => getLabels(language), [language]);
    const questionRefs = useRef<Record<number, HTMLDivElement | null>>({});

    const structure = exam.type === 'LISTENING' ? TOPIK_LISTENING_STRUCTURE : TOPIK_READING_STRUCTURE;

    // Calculate stats
    const stats = useMemo(() => {
      let correct = 0;
      let wrong = 0;
      exam.questions.forEach((q, idx) => {
        if (userAnswers[idx] === q.correctAnswer) {
          correct++;
        } else {
          wrong++;
        }
      });
      return { correct, wrong };
    }, [exam.questions, userAnswers]);

    // 获取当前题目所属的 instruction
    const getInstructionForQuestion = (qIndex: number) => {
      const qNum = qIndex + 1;
      for (const section of structure) {
        if (qNum >= section.range[0] && qNum <= section.range[1]) {
          return section.instruction;
        }
      }
      return null;
    };

    // 判断是否需要显示 instruction
    const shouldShowInstruction = (qIndex: number) => {
      const qNum = qIndex + 1;
      for (const section of structure) {
        if (qNum === section.range[0]) {
          return true;
        }
      }
      return false;
    };

    const scrollToQuestion = (index: number) => {
      questionRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // --- Annotation State ---
    const [showAnnotationMenu, setShowAnnotationMenu] = useState(false);
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
    const [selectionText, setSelectionText] = useState('');
    const [selectionContextKey, setSelectionContextKey] = useState('');
    const [noteInput, setNoteInput] = useState('');
    const [selectedColor, setSelectedColor] = useState<'yellow' | 'green' | 'blue' | 'pink'>('yellow');
    const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);

    // Sidebar edit state (matching Reading/Listening modules)
    const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
    const [editNoteInput, setEditNoteInput] = useState('');

    // Available highlight colors
    const COLORS = [
      { name: 'yellow', bgClass: 'bg-yellow-300', ringClass: 'ring-yellow-500' },
      { name: 'green', bgClass: 'bg-green-300', ringClass: 'ring-green-500' },
      { name: 'blue', bgClass: 'bg-blue-300', ringClass: 'ring-blue-500' },
      { name: 'pink', bgClass: 'bg-pink-300', ringClass: 'ring-pink-500' },
    ] as const;

    const examContextPrefix = `TOPIK-${exam.id}`;

    // All annotations for this exam (for rendering highlights)
    const currentAnnotations = useMemo(
      () => (annotations || []).filter(a => a.contextKey.startsWith(examContextPrefix)),
      [annotations, examContextPrefix]
    );

    // Sidebar annotations: show those with notes OR the one being edited
    const sidebarAnnotations = useMemo(
      () => currentAnnotations.filter(a =>
        (a.note && a.note.trim().length > 0) || a.id === editingAnnotationId
      ),
      [currentAnnotations, editingAnnotationId]
    );

    // Handle text selection for annotation
    const handleTextSelect = (questionIndex: number, e?: React.MouseEvent) => {
      const selection = window.getSelection();
      if (!selection || selection.toString().trim() === '') return;

      const range = selection.getRangeAt(0);
      let rect = range.getBoundingClientRect();
      const selectedText = selection.toString().trim();
      const contextKey = `${examContextPrefix}-Q${questionIndex}`;

      // Robust positioning fallback using mouse event
      if ((rect.top === 0 && rect.bottom === 0) || (rect.width === 0 && rect.height === 0)) {
        if (e) {
          console.log('Using mouse event fallback for menu position');
          setMenuPosition({ top: e.clientY + 10, left: e.clientX });
        } else {
          // Absolute fallback if no event and no rect (shouldn't happen with updated calls)
          setMenuPosition({ top: window.innerHeight / 2, left: window.innerWidth / 2 });
        }
      } else {
        setMenuPosition({ top: rect.bottom + 10, left: rect.left });
      }

      setSelectionText(selectedText);
      setSelectionContextKey(contextKey);
      setShowAnnotationMenu(true);

      // Check for existing annotation to pre-fill
      const existing = annotations.find(a =>
        a.contextKey === contextKey &&
        (a.text === selectedText || a.selectedText === selectedText)
      );

      if (existing) {
        setNoteInput(existing.note || '');
        if (existing.color) setSelectedColor(existing.color as any);
        setActiveAnnotationId(existing.id);
      } else {
        setNoteInput('');
        setActiveAnnotationId(null);
      }
    };

    // Save annotation (for quick add via menu - creates annotation and enters edit mode)
    const saveAnnotationQuick = (colorOverride?: string) => {
      if (!selectionText || !selectionContextKey) return null;

      // Check if updating existing
      const existing = annotations.find(a =>
        a.contextKey === selectionContextKey &&
        (a.text === selectionText || a.selectedText === selectionText)
      );

      const annotation: Annotation = {
        id: existing ? existing.id : Date.now().toString(),
        contextKey: selectionContextKey,
        text: selectionText,
        note: existing?.note || '',
        color: colorOverride || selectedColor,
        timestamp: existing ? existing.timestamp : Date.now(),
      };

      onSaveAnnotation(annotation);

      setShowAnnotationMenu(false);
      window.getSelection()?.removeAllRanges();

      return annotation.id;
    };

    // Update note from sidebar edit
    const handleUpdateNote = (id: string) => {
      const ann = currentAnnotations.find(a => a.id === id);
      if (ann) {
        onSaveAnnotation({ ...ann, note: editNoteInput });
      }
      setEditingAnnotationId(null);
      setActiveAnnotationId(null);
    };

    // Delete annotation (for sidebar)
    const handleDeleteAnnotation = (id: string) => {
      const ann = currentAnnotations.find(a => a.id === id);
      if (ann) {
        onSaveAnnotation({ ...ann, color: null, note: '' }); // Treat as delete
      }
    };

    // Legacy delete function (for backward compatibility)
    const deleteAnnotation = (annotationId: string) => {
      onDeleteAnnotation(annotationId);
    };

    const tempAnnotation: Annotation | null = showAnnotationMenu && selectionText && selectionContextKey ? {
      id: 'temp',
      contextKey: selectionContextKey,
      text: selectionText,
      note: '',
      color: selectedColor, // Preview current color
      timestamp: Date.now()
    } : null;

    return (
      <div className="min-h-screen bg-slate-200 flex flex-col">
        {/* 顶部栏 */}
        <div className="sticky top-0 z-30 bg-white border-b shadow-sm shrink-0">
          <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={onBack} className="text-slate-500 hover:text-indigo-600">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="font-bold text-slate-800">{exam.title}</div>
                <div className="text-xs text-slate-500">복습 (Review)</div>
              </div>
            </div>

          </div>
        </div>

        {/* 主内容 */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center">
          <div className={`bg-white w-full ${PAPER_MAX_WIDTH} shadow-2xl min-h-screen pb-16 relative border border-slate-300`}>

            {/* 试卷头部 (Header) */}
            <div className="p-8 md:p-12 pb-4 font-serif">

              {/* Title Box - Black rounded rectangle */}
              <div className="bg-black text-white py-6 px-8 rounded-2xl mb-16 shadow-lg">
                <div className="flex items-baseline justify-center gap-4 mb-2">
                  <span className="text-xl md:text-2xl font-bold">제{exam.round}회</span>
                  <span className="text-3xl md:text-5xl font-bold tracking-wider">한 국 어 능 력 시 험</span>
                </div>
                <div className="text-center text-sm md:text-lg italic opacity-80">
                  The {exam.round}th Test of Proficiency in Korean
                </div>
              </div>

              {/* TOPIK II (B) Section - with double lines */}
              <div className="flex justify-center mb-16">
                <div className="text-center">
                  <div className="border-t-2 border-b-2 border-black py-4 px-16">
                    <div className="flex items-center justify-center gap-4">
                      <span className="text-3xl md:text-5xl font-bold tracking-widest">TOPIK</span>
                      <span className="text-3xl md:text-5xl font-light">Ⅱ</span>
                      <span className="border-2 border-black rounded-full w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-xl md:text-2xl font-bold">
                        {exam.paperType || 'B'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Period Box */}
              <div className="flex justify-center mb-16">
                <div className="border-2 border-black w-80 md:w-96">
                  <div className="flex">
                    <div className="w-1/3 bg-gray-100 py-4 text-center font-bold text-2xl md:text-3xl border-r-2 border-black">
                      {exam.type === 'READING' ? '2교시' : '1교시'}
                    </div>
                    <div className="w-2/3 bg-gray-100 py-4 text-center font-bold text-2xl md:text-3xl">
                      {exam.type === 'READING' ? '읽기' : '듣기'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center text-sm text-gray-500 mb-8 font-sans">
                [Scroll down to start]
              </div>
            </div>

            {/* Page Header */}
            <div className="bg-white border-b border-black mx-8 md:mx-12 mb-8 pb-1">
              <div className="flex justify-between items-end">
                <div className="font-bold text-sm text-gray-500">
                  제{exam.round}회 한국어능력시험 II {exam.paperType || 'B'}형 {exam.type === 'READING' ? '2교시 (읽기)' : '1교시 (듣기)'}
                </div>
                <div className="font-bold bg-gray-200 px-4 py-1 rounded-full text-sm">
                  TOPIK Ⅱ {exam.type === 'READING' ? '읽기' : '듣기'} (1번 ~ {exam.questions.length}번)
                </div>
              </div>
            </div>

            {/* 题目区域 */}
            <div className="px-8 md:px-12 select-none">
              {exam.questions.map((question, idx) => (
                <div key={idx} ref={el => (questionRefs.current[idx] = el)}>

                  {/* Instruction Bar */}
                  {shouldShowInstruction(idx) && (
                    <div className="mb-4 font-bold text-lg leading-relaxed text-black">
                      {getInstructionForQuestion(idx)}
                    </div>
                  )}

                  {/* 题目 */}
                  <div className="mb-12" onMouseUp={(e) => handleTextSelect(idx, e)}>
                    <QuestionRenderer
                      question={question}
                      questionIndex={idx}
                      userAnswer={userAnswers[idx]}
                      correctAnswer={question.correctAnswer}
                      language={language}
                      showCorrect={true}
                      // Merge saved annotations with current temp annotation (if context matches)
                      annotations={
                        tempAnnotation && tempAnnotation.contextKey === `TOPIK-${exam.id}-Q${idx}`
                          ? [...annotations, tempAnnotation]
                          : annotations
                      }
                      contextPrefix={`TOPIK-${exam.id}`}
                      onTextSelect={(e) => handleTextSelect(idx, e)}
                      activeAnnotationId={activeAnnotationId}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* 试卷页脚 */}
            <div className="flex justify-center py-12">
              <div className="bg-gray-300 rounded-full px-4 py-1 font-bold text-gray-700">
                End of Section
              </div>
            </div>
          </div>

          {/* 笔记侧边栏 - 与 Reading/Listening 一致的样式 */}
          <div className="w-80 shrink-0 hidden lg:block">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 sticky top-24 flex flex-col max-h-[calc(100vh-120px)]">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
                <h4 className="font-bold text-slate-700 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-500" />
                  {labels.annotate || '笔记'}
                </h4>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {sidebarAnnotations.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm italic">
                    {labels.noNotes || '暂无笔记'}
                  </div>
                ) : (
                  sidebarAnnotations.map(ann => {
                    const isEditing = editingAnnotationId === ann.id;
                    const isActive = activeAnnotationId === ann.id;

                    if (isEditing) {
                      return (
                        <div
                          key={ann.id}
                          id={`sidebar-card-${ann.id}`}
                          className="bg-white p-3 rounded-lg border-2 border-indigo-500 shadow-md scroll-mt-20"
                        >
                          <div className="text-xs font-bold mb-2 text-slate-500">
                            {labels.editingNote || '编辑笔记'}: "{ann.text.substring(0, 15)}..."
                          </div>
                          <textarea
                            value={editNoteInput}
                            onChange={(e) => setEditNoteInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleUpdateNote(ann.id);
                              }
                            }}
                            className="w-full border border-slate-200 rounded-lg p-2 text-sm resize-none focus:ring-2 focus:ring-indigo-200 outline-none mb-2"
                            rows={3}
                            autoFocus
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingAnnotationId(null)}
                              className="px-3 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded"
                            >
                              {labels.cancel || '取消'}
                            </button>
                            <button
                              onClick={() => handleUpdateNote(ann.id)}
                              className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" /> {labels.save || '保存'}
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={ann.id}
                        id={`sidebar-card-${ann.id}`}
                        className={`group p-3 rounded-lg border transition-all cursor-pointer relative scroll-mt-20
                          ${isActive
                            ? 'bg-indigo-50 border-indigo-300 shadow-md'
                            : 'bg-slate-50 border-slate-100 hover:border-indigo-200 hover:shadow-sm'
                          }`}
                        onClick={() => {
                          setActiveAnnotationId(ann.id);
                          setEditingAnnotationId(ann.id);
                          setEditNoteInput(ann.note || '');
                        }}
                      >
                        <div className={`text-xs font-bold mb-1 px-1.5 py-0.5 rounded w-fit ${{
                          'yellow': 'bg-yellow-100 text-yellow-800',
                          'green': 'bg-green-100 text-green-800',
                          'blue': 'bg-blue-100 text-blue-800',
                          'pink': 'bg-pink-100 text-pink-800',
                        }[ann.color || 'yellow'] || 'bg-yellow-100 text-yellow-800'}`}>
                          {ann.text.substring(0, 20)}...
                        </div>
                        {ann.note ? (
                          <p className="text-sm text-slate-700">{ann.note}</p>
                        ) : (
                          <p className="text-xs text-slate-400 italic">{labels.clickToAddNote || '点击添加笔记...'}</p>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAnnotation(ann.id);
                          }}
                          className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>


        {/* 左侧题目导航 */}
        <div className="fixed left-4 top-1/2 -translate-y-1/2 z-40 hidden lg:block">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 p-3 flex flex-col items-center gap-2 max-h-[85vh] overflow-y-auto">
            {/* 题目导航 */}
            <div className="grid grid-cols-5 gap-1">
              {exam.questions.map((q, idx) => {
                const isCorrect = userAnswers[idx] === q.correctAnswer;
                return (
                  <button
                    key={idx}
                    onClick={() => scrollToQuestion(idx)}
                    className={`
                      w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                      ${isCorrect
                        ? 'bg-emerald-500 text-white'
                        : 'bg-red-500 text-white'
                      }
                    `}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Annotation Menu - 与 Reading/Listening 一致 */}
        <AnnotationMenu
          visible={showAnnotationMenu}
          position={menuPosition}
          selectionText={selectionText}
          onAddNote={() => {
            const id = saveAnnotationQuick();
            if (id) {
              setEditingAnnotationId(id);
              setEditNoteInput('');
              setTimeout(() => {
                const el = document.getElementById(`sidebar-card-${id}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 100);
            }
          }}
          onHighlight={(color) => {
            saveAnnotationQuick(color);
          }}
          selectedColor={selectedColor}
          setSelectedColor={setSelectedColor}
          onClose={() => {
            setShowAnnotationMenu(false);
            window.getSelection()?.removeAllRanges();
          }}
          labels={labels}
        />
      </div>
    );
  }
);
