import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { generateReadingPassage } from '../../../services/geminiService';
import { CourseSelection, ReadingContent, Language, TextbookContent, Annotation } from '../../../types';
import {
  ChevronRight, MessageSquare, Trash2, Check, ArrowLeft,
  BookOpen, Type, Languages, Highlighter
} from 'lucide-react';
import { getLabels } from '../../../utils/i18n';
import { useAnnotation } from '../../../hooks/useAnnotation';
import AnnotationMenu from '../../../components/AnnotationMenu';
import { getHighlightClasses } from '../../utils/highlightUtils';
import AnnotationSidebar from '../../components/annotation/AnnotationSidebar';
import { useAuth } from '../../../contexts/AuthContext';
import { SubscriptionType } from '../../../types';
import UpgradeModal from '../../../components/common/UpgradeModal';
import { Lock } from 'lucide-react';

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

  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  const labels = getLabels(language);

  const contextKey = activeUnit
    ? `${course.instituteId}-${course.level}-${activeUnit}-READING`
    : '';

  // Sidebar Edit State
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
  // editNoteInput removed, managed by sidebar
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);
  const [hoveredAnnotationId, setHoveredAnnotationId] = useState<string | null>(null); // New hover state
  const [newlyCreatedAnnotationId, setNewlyCreatedAnnotationId] = useState<string | null>(null); // Track new annotations for cancel cleanup

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
      a => a.contextKey === contextKey && a.startOffset !== undefined && a.endOffset !== undefined && a.color
    )
    .sort((a, b) => (a.startOffset || 0) - (b.startOffset || 0));

  const sidebarAnnotations = currentAnnotations.filter(a =>
    (a.note && a.note.trim().length > 0) || a.id === editingAnnotationId
  );

  useEffect(() => {
    // ... existing useEffect code ...
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

  const handleUpdateNote = (id: string, text: string) => {
    // If input is empty, treat as Cancel
    if (!text.trim()) {
      if (id === newlyCreatedAnnotationId) {
        handleDeleteAnnotation(id); // Clean up new empty annotation
      }
      setEditingAnnotationId(null);
      setActiveAnnotationId(null);
      setNewlyCreatedAnnotationId(null);
      return;
    }

    const ann = currentAnnotations.find(a => a.id === id);
    if (ann) {
      onSaveAnnotation({ ...ann, note: text });
    }
    setEditingAnnotationId(null);
    setActiveAnnotationId(null);
    setNewlyCreatedAnnotationId(null);
  };

  const koreanSentenceRanges = useMemo(() => {
    // ... existing implementation ...
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

  const isNote = (ann: Annotation) => !!(ann.note && ann.note.trim());

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
        const isActive = activeAnnotationId === currentAnn.id || editingAnnotationId === currentAnn.id || hoveredAnnotationId === currentAnn.id;
        const hasNote = isNote(currentAnn);

        // specific width/height token or just use text length
        // specific width/height token or just use text length
        className = getHighlightClasses(currentAnn, !!isActive, !!hasNote);
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

              // If it's a pure highlight (no note), start editing so it appears in sidebar
              // This allows the user to delete it or add a note
              if (!isNote(currentAnn)) {
                setEditingAnnotationId(currentAnn.id);
              }

              // Use setTimeout to allow React to render the sidebar card if it wasn't there
              setTimeout(() => {
                const el = document.getElementById(`sidebar-card-${currentAnn.id}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 0);
            }}
          >
            {segmentText}
            {/* Red dot removed here */}
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

  // ... (TOC View omitted for brevity as it's not changing) ...

  // To insert correct ReplacementContent properly, I need to include the sidebar rendering part too which is further down in the original file, or split this into two replacements if possible, but the limit is contiguous blocks.
  // The original file structure has renderHighlightedText -> TOC if -> Loading if -> return JSX.
  // I will assume I need to replace from line 63 down to where sidebar rendering happens.
  // The sidebar rendering starts around line 430 in original view.
  // Let me re-read the original file content to make sure I cover all changes.
  // The sidebar loop is at lines 440+. I need to add onMouseEnter/Leave there.

  // Since I can't replace huge chunks reliably without making mistakes in "unchanged" code, I will use multi_replace_file_content.
  // But wait, the original tool call is `replace_file_content` which is for single contiguous block.
  // The changes are:
  // 1. New state variable `hoveredAnnotationId` (Line 66)
  // 2. Updated `renderHighlightedText` (Lines 159-251)
  // 3. Sidebar `div` props (Line 445)

  // I should indeed use `multi_replace_file_content`.



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
              const title = c.readingTitle || `Unit ${u}`;

              const { user } = useAuth();
              const isLocked = user?.subscriptionType === SubscriptionType.FREE && u > 3;

              return (
                <button
                  key={u}
                  onClick={() => {
                    if (isLocked) {
                      setUpgradeModalOpen(true);
                    } else {
                      setActiveUnit(u);
                    }
                  }}
                  className={`group relative w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all text-left flex justify-between items-center overflow-hidden ${isLocked ? 'hover:border-slate-200 opacity-90' : 'hover:border-indigo-200'
                    }`}
                >
                  <div className={`absolute inset-y-0 left-0 w-1 transition-opacity ${isLocked ? 'bg-amber-500 opacity-0 group-hover:opacity-100' : 'bg-indigo-500 opacity-0 group-hover:opacity-100'}`}></div>
                  <div className="flex items-center gap-5">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-mono font-bold text-lg transition-colors ${isLocked
                      ? 'bg-slate-100 text-slate-400 group-hover:bg-amber-50 group-hover:text-amber-600'
                      : 'bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                      }`}>
                      {isLocked ? <Lock className="w-5 h-5" /> : u}
                    </div>
                    <div>
                      <h3 className={`text-lg font-bold transition-colors font-serif ${isLocked ? 'text-slate-500' : 'text-slate-800 group-hover:text-indigo-700'
                        }`}>
                        {title}
                      </h3>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                          Unit {u}
                        </span>
                        {isLocked && (
                          <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 flex items-center gap-1">
                            Pro
                          </span>
                        )}
                        {course.level <= 2 && !isLocked && (
                          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Beginner</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all transform group-hover:translate-x-1 ${isLocked
                    ? 'bg-slate-50 text-slate-300 group-hover:text-amber-500'
                    : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white'
                    }`}>
                    {isLocked ? <Lock className="w-4 h-4" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
        <UpgradeModal
          isOpen={upgradeModalOpen}
          onClose={() => setUpgradeModalOpen(false)}
          title="Unlock Premium Lessons"
          message="Lessons 4 and beyond are available exclusively for Pro members. Upgrade now to access the full curriculum!"
        />
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
        <AnnotationSidebar
          sidebarAnnotations={sidebarAnnotations}
          activeAnnotationId={activeAnnotationId}
          editingAnnotationId={editingAnnotationId}
          hoveredAnnotationId={hoveredAnnotationId}
          labels={{
            annotate: labels.annotate,
            cancel: labels.cancel,
            save: labels.save,
            clickToAddNote: labels.clickToAddNote
          }}
          onActivate={setActiveAnnotationId}
          onHover={setHoveredAnnotationId}
          onEdit={(id) => {
            setEditingAnnotationId(id);
            setActiveAnnotationId(id);
            // setEditNoteInput removed
            setTimeout(() => {
              const el = document.getElementById(`annotation-${id}`);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 50);
          }}
          onCancelEdit={(id) => {
            if (id === newlyCreatedAnnotationId) {
              handleDeleteAnnotation(id);
            }
            setEditingAnnotationId(null);
            setNewlyCreatedAnnotationId(null);
          }}
          onSave={handleUpdateNote}
          onDelete={(id) => handleDeleteAnnotation(id)}
        />
      </div>

      <AnnotationMenu
        visible={showAnnotationMenu}
        position={menuPosition}
        selectionText={currentSelectionRange?.text}
        onAddNote={() => {
          const id = saveAnnotation(undefined, undefined, true);
          if (id) {
            const existed = annotations.some(a => a.id === id);
            if (!existed) {
              setNewlyCreatedAnnotationId(id);
            } else {
              setNewlyCreatedAnnotationId(null);
            }
            setEditingAnnotationId(id);
            // setNewlyCreatedAnnotationId(null); // REMOVE THIS: We need to keep it until save/cancel
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