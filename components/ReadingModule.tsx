import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { generateReadingPassage } from '../services/geminiService';
import { CourseSelection, ReadingContent, Language, TextbookContent, Annotation } from '../types';
import {
  ChevronRight, MessageSquare, Trash2, Check, ArrowLeft,
  BookOpen, Type, Languages, Highlighter
} from 'lucide-react';
import { getLabels } from '../utils/i18n';
import { useAnnotation } from '../hooks/useAnnotation';
import AnnotationMenu from './AnnotationMenu';

interface ReadingModuleProps {
  course: CourseSelection;
  instituteName: string;
  onSaveWord: (word: string, meaning: string) => void;
  onSaveAnnotation: (annotation: Annotation) => void;
  savedWordKeys: string[];
  annotations: Annotation[];
  language: Language;
  levelContexts: Record<number, TextbookContent>;
}

const ReadingModule: React.FC<ReadingModuleProps> = ({
  course,
  instituteName,
  onSaveWord,
  onSaveAnnotation,
  savedWordKeys,
  annotations,
  language,
  levelContexts,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeUnit = searchParams.get('unit') ? parseInt(searchParams.get('unit')!, 10) : null;

  const setActiveUnit = (unit: number | null) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (unit) {
        newParams.set('unit', unit.toString());
      } else {
        newParams.delete('unit');
      }
      return newParams;
    });
  };

  const [passage, setPassage] = useState<ReadingContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');

  // Translation Hover State
  const [hoveredSentenceIndex, setHoveredSentenceIndex] = useState<number | null>(null);

  const labels = getLabels(language);

  const contextKey = activeUnit
    ? `${course.instituteId}-${course.level}-${activeUnit}-READING`
    : '';

  // Sidebar Edit State
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
  const [editNoteInput, setEditNoteInput] = useState('');
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);

  const {
    contentRef,
    handleTextSelection: originalHandleTextSelection,
    saveAnnotation,
    deleteAnnotation,
    cancelAnnotation,
    showAnnotationMenu,
    menuPosition,
    selectedColor,
    setSelectedColor,
    currentSelectionRange
  } = useAnnotation(contextKey, annotations, onSaveAnnotation);

  const handleTextSelection = (e: React.MouseEvent) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setActiveAnnotationId(null);
      setEditingAnnotationId(null);
    }
    originalHandleTextSelection(e);
  };

  const currentAnnotations = annotations
    .filter(
      a => a.contextKey === contextKey && a.startOffset !== undefined && a.endOffset !== undefined
    )
    .sort((a, b) => (a.startOffset || 0) - (b.startOffset || 0));

  const sidebarAnnotations = currentAnnotations.filter(a =>
    (a.note && a.note.trim().length > 0) || a.id === editingAnnotationId
  );

  useEffect(() => {
    const fetchContent = async () => {
      if (!activeUnit) return;

      setLoading(true);
      setPassage(null);
      const content = levelContexts[activeUnit];

      try {
        const data = await generateReadingPassage(
          instituteName,
          course.level,
          activeUnit,
          language,
          content
        );
        setPassage(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, [activeUnit, instituteName, course.level, language, levelContexts]);


  const handleDeleteAnnotation = (id: string) => {
    const ann = currentAnnotations.find(a => a.id === id);
    if (ann) {
      onSaveAnnotation({ ...ann, color: null, note: '' });
    }
  };

  const handleUpdateNote = (id: string) => {
    const ann = currentAnnotations.find(a => a.id === id);
    if (ann) {
      onSaveAnnotation({ ...ann, note: editNoteInput });
    }
    setEditingAnnotationId(null);
    setActiveAnnotationId(null);
  };

  const koreanSentenceRanges = useMemo(() => {
    if (!passage?.koreanText) return [];
    const ranges: { start: number; end: number }[] = [];
    const regex = /[^.!?\n]+[.!?\n]*/g;
    let match;
    while ((match = regex.exec(passage.koreanText)) !== null) {
      ranges.push({ start: match.index, end: match.index + match[0].length });
    }
    return ranges;
  }, [passage]);

  const translationSentences = useMemo(() => {
    if (!passage?.englishTranslation) return [];
    return passage.englishTranslation.match(/[^.!?\n]+[.!?\n]*/g) || [passage.englishTranslation];
  }, [passage]);

  const renderHighlightedText = (fullText: string) => {
    if (!fullText) return null;

    const charMap: { annotation?: Annotation }[] = new Array(fullText.length).fill({});
    currentAnnotations.forEach(ann => {
      if (ann.startOffset === undefined || ann.endOffset === undefined) return;
      for (let i = ann.startOffset; i < ann.endOffset; i++) {
        if (i < fullText.length) {
          charMap[i] = { annotation: ann };
        }
      }
    });

    let hoverStart = -1;
    let hoverEnd = -1;
    if (hoveredSentenceIndex !== null && koreanSentenceRanges[hoveredSentenceIndex]) {
      hoverStart = koreanSentenceRanges[hoveredSentenceIndex].start;
      hoverEnd = koreanSentenceRanges[hoveredSentenceIndex].end;
    }

    const result = [];
    let i = 0;
    while (i < fullText.length) {
      const currentAnn = charMap[i].annotation;
      const isHovered = i >= hoverStart && i < hoverEnd;

      let j = i + 1;

      while (j < fullText.length) {
        const nextAnn = charMap[j].annotation;
        const nextHover = j >= hoverStart && j < hoverEnd;

        if (nextAnn !== currentAnn || nextHover !== isHovered) break;
        j++;
      }

      const segmentText = fullText.slice(i, j);
      let className = 'relative rounded px-0 py-0.5 box-decoration-clone transition-all ';

      if (currentAnn) {
        const isActive = activeAnnotationId === currentAnn.id || editingAnnotationId === currentAnn.id;

        const colorMap: { [key: string]: { bg: string, activeBg: string } } = {
          'yellow': { bg: 'bg-yellow-200', activeBg: 'bg-yellow-300 ring-2 ring-yellow-400' },
          'green': { bg: 'bg-green-200', activeBg: 'bg-green-300 ring-2 ring-green-400' },
          'blue': { bg: 'bg-blue-200', activeBg: 'bg-blue-300 ring-2 ring-blue-400' },
          'pink': { bg: 'bg-pink-200', activeBg: 'bg-pink-300 ring-2 ring-pink-400' },
        };
        const colors = colorMap[currentAnn.color || 'yellow'] || colorMap['yellow'];

        className += 'cursor-pointer rounded-sm ';
        if (isActive) {
          className += `${colors.activeBg} `;
        } else {
          className += `${colors.bg} hover:brightness-95 `;
        }
      }

      if (isHovered && !currentAnn) {
        className += 'bg-indigo-50/50 ring-1 ring-indigo-100 ';
      }

      if (currentAnn) {
        result.push(
          <span
            key={i}
            id={`annotation-${currentAnn.id}`}
            className={className}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setActiveAnnotationId(currentAnn.id);
              const el = document.getElementById(`sidebar-card-${currentAnn.id}`);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
          >
            {segmentText}
            {currentAnn.note && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full border border-white shadow-sm"></span>
            )}
          </span>
        );
      } else {
        if (isHovered) {
          result.push(<span key={i} className={className}>{segmentText}</span>);
        } else {
          result.push(<span key={i}>{segmentText}</span>);
        }
      }
      i = j;
    }
    return result;
  };

  // --- 1. TOC View (Table of Contents) ---
  if (!activeUnit) {
    const availableUnits = Object.keys(levelContexts)
      .map(Number)
      .sort((a, b) => a - b);
    const unitsWithReading = availableUnits.filter(u => !!levelContexts[u]?.readingText);

    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
            <BookOpen className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{labels.reading}</h2>
            <p className="text-slate-500">{labels.toc}</p>
          </div>
        </div>

        {unitsWithReading.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <BookOpen className="w-8 h-8" />
            </div>
            <p className="text-slate-500 font-medium">{labels.noReadings}</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {unitsWithReading.map(u => {
              const c = levelContexts[u];
              const title = c.readingText
                ? c.readingText.substring(0, 60) + (c.readingText.length > 60 ? '...' : '')
                : `Unit ${u}`;
              return (
                <button
                  key={u}
                  onClick={() => setActiveUnit(u)}
                  className="group relative w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all text-left flex justify-between items-center overflow-hidden"
                >
                  <div className="absolute inset-y-0 left-0 w-1 bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="flex items-center gap-5">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-mono font-bold text-lg group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                      {u}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-700 transition-colors font-serif">
                        {title}
                      </h3>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                          Unit {u}
                        </span>
                        {course.level <= 2 && (
                          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Beginner</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all transform group-hover:translate-x-1">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // --- 2. Loading View ---
  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium animate-pulse">{labels.loadingReading}</p>
      </div>
    );
  }

  // --- 3. Reading View (Modernized) ---
  const textSizeClass = fontSize === 'sm' ? 'text-base' : fontSize === 'lg' ? 'text-xl' : 'text-lg';
  const lineHeightClass = fontSize === 'sm' ? 'leading-relaxed' : fontSize === 'lg' ? 'leading-loose' : 'leading-loose';

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col w-full max-w-[1800px] mx-auto relative bg-slate-50">

      {/* Top Bar: Navigation & Controls */}
      <div className="flex items-center justify-between py-4 px-6 bg-white border-b border-slate-200 shrink-0 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveUnit(null)}
            className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold transition-colors px-3 py-1.5 hover:bg-slate-50 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" /> {labels.backToList}
          </button>
          <div className="h-6 w-px bg-slate-200"></div>
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{labels.unit} {activeUnit}</span>
            <h1 className="text-lg font-bold text-slate-800 truncate max-w-md">{passage?.title || labels.readingPassage}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Font Size Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 mr-2">
            <button onClick={() => setFontSize('sm')} className={`p-1.5 rounded ${fontSize === 'sm' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><Type className="w-3 h-3" /></button>
            <button onClick={() => setFontSize('base')} className={`p-1.5 rounded ${fontSize === 'base' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><Type className="w-4 h-4" /></button>
            <button onClick={() => setFontSize('lg')} className={`p-1.5 rounded ${fontSize === 'lg' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><Type className="w-5 h-5" /></button>
          </div>

          <button
            onClick={() => setShowTranslation(!showTranslation)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${showTranslation
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
          >
            <Languages className="w-4 h-4" />
            {showTranslation ? labels.hideTrans : labels.showTrans}
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 relative">
          <div className={`flex gap-10 h-full transition-all duration-500 ${showTranslation ? 'max-w-full' : 'max-w-4xl mx-auto'}`}>

            {/* Korean Text - Always Visible */}
            <div
              ref={contentRef}
              className={`flex-1 min-w-0 bg-white rounded-2xl shadow-sm border border-slate-100 p-8 md:p-12 ${selectedColor ? `selection-${selectedColor}` : ''}`}
              onMouseUp={handleTextSelection}
            >
              <div className={`${textSizeClass} ${lineHeightClass} text-slate-800 font-serif whitespace-pre-line select-text`}>
                {passage && renderHighlightedText(passage.koreanText)}
              </div>
            </div>

            {/* Translation - Conditionally Visible */}
            {showTranslation && (
              <div className="flex-1 min-w-0 bg-slate-50 rounded-2xl border border-slate-200/60 p-8 md:p-12 overflow-y-auto">
                <div className="sticky top-0 bg-slate-50 pb-4 border-b border-slate-200 mb-6 z-10 flex items-center gap-2 text-slate-400 font-bold text-sm uppercase tracking-widest">
                  <Languages className="w-4 h-4" /> Translation
                </div>
                {translationSentences.map((sentence, idx) => {
                  const isHovered = hoveredSentenceIndex === idx;
                  return (
                    <p
                      key={idx}
                      className={`mb-6 text-slate-600 ${lineHeightClass} text-base transition-all duration-200 cursor-pointer p-3 rounded-xl border border-transparent ${isHovered ? 'bg-indigo-50 border-indigo-100 text-indigo-900 shadow-sm' : 'hover:bg-slate-100'
                        }`}
                      onMouseEnter={() => setHoveredSentenceIndex(idx)}
                      onMouseLeave={() => setHoveredSentenceIndex(null)}
                    >
                      {sentence}
                    </p>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Annotations */}
        <div className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 z-10 shadow-lg">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h4 className="font-bold text-slate-700 flex items-center gap-2">
              <Highlighter className="w-4 h-4 text-indigo-500" />
              {labels.annotate}
            </h4>
            <span className="text-xs font-bold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
              {currentAnnotations.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
            {sidebarAnnotations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center px-6">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 text-slate-300">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-slate-500 mb-1">暂无笔记</p>
                <p className="text-xs text-slate-400">在文中选中文字即可添加高亮或笔记。</p>
              </div>
            ) : (
              sidebarAnnotations.map(ann => {
                const isEditing = editingAnnotationId === ann.id;
                const isActive = activeAnnotationId === ann.id;

                return (
                  <div
                    key={ann.id}
                    id={`sidebar-card-${ann.id}`}
                    className={`group p-4 rounded-xl border transition-all cursor-pointer relative scroll-mt-24
                      ${isActive || isEditing
                        ? 'bg-white border-indigo-500 shadow-md ring-1 ring-indigo-500/20'
                        : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                      }`}
                    onClick={() => {
                      if (!isEditing) {
                        setActiveAnnotationId(ann.id);
                        setEditingAnnotationId(ann.id);
                        setEditNoteInput(ann.note || '');
                        const el = document.getElementById(`annotation-${ann.id}`);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <div className={`w-1.5 h-1.5 mt-1.5 rounded-full shrink-0 ${{
                        'yellow': 'bg-yellow-400', 'green': 'bg-green-400', 'blue': 'bg-blue-400', 'pink': 'bg-pink-400'
                      }[ann.color || 'yellow'] || 'bg-yellow-400'}`}></div>
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider line-clamp-1 flex-1">
                        {ann.text}
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="mt-2 animate-in fade-in zoom-in-95 duration-200">
                        <textarea
                          value={editNoteInput}
                          onChange={(e) => setEditNoteInput(e.target.value)}
                          className="w-full border border-slate-200 rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none mb-3 bg-slate-50"
                          rows={3}
                          autoFocus
                          placeholder="输入笔记内容..."
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingAnnotationId(null); }}
                            className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            {labels.cancel}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleUpdateNote(ann.id); }}
                            className="px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-1.5 transition-colors shadow-sm"
                          >
                            <Check className="w-3 h-3" /> {labels.save}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {ann.note ? (
                          <p className="text-sm text-slate-800 leading-relaxed pl-3.5 border-l-2 border-slate-100">{ann.note}</p>
                        ) : (
                          <p className="text-xs text-slate-400 italic pl-3.5">{labels.clickToAddNote}</p>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Delete this note?')) handleDeleteAnnotation(ann.id);
                          }}
                          className="absolute top-3 right-3 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <AnnotationMenu
        visible={showAnnotationMenu}
        position={menuPosition}
        selectionText={currentSelectionRange?.text}
        onAddNote={() => {
          const id = saveAnnotation(undefined, undefined, true);
          if (id) {
            setEditingAnnotationId(id);
            setEditNoteInput('');
            setTimeout(() => {
              const el = document.getElementById(`sidebar-card-${id}`);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
          }
        }}
        onHighlight={(color) => saveAnnotation(color, undefined, true)}
        selectedColor={selectedColor}
        setSelectedColor={setSelectedColor}
        onSaveWord={(text) => { onSaveWord(text, ''); cancelAnnotation(); }}
        onClose={cancelAnnotation}
        onDelete={deleteAnnotation}
        labels={labels}
      />
    </div>
  );
};

export default ReadingModule;