import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { generateReadingPassage } from '../services/geminiService';
import { CourseSelection, ReadingContent, Language, TextbookContent, Annotation } from '../types';
import { Play, Pause, RotateCcw, Volume2, ChevronRight, Music, MessageSquare, Trash2, Check } from 'lucide-react';
import { getLabels } from '../utils/i18n';
import { useAnnotation } from '../hooks/useAnnotation';
import AnnotationMenu from './AnnotationMenu';
import { getPreviewFromContent } from '../utils/textUtils';

interface ListeningModuleProps {
  course: CourseSelection;
  instituteName: string;
  onSaveAnnotation: (annotation: Annotation) => void;
  annotations: Annotation[];
  language: Language;
  levelContexts: Record<number, TextbookContent>;
}

const ListeningModule: React.FC<ListeningModuleProps> = ({
  course,
  instituteName,
  onSaveAnnotation,
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showScript, setShowScript] = useState(true); // Default to showing script
  const [showTranslation, setShowTranslation] = useState(false);

  // Refs
  const manualAudioRef = useRef<HTMLAudioElement | null>(null);

  const contextKey = activeUnit
    ? `${course.instituteId}-${course.level}-${activeUnit}-LISTENING`
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

  const labels = getLabels(language);
  const content = activeUnit ? levelContexts[activeUnit] : undefined;
  const isManualAudio = !!content?.listeningAudioUrl;

  // Filter annotations for rendering
  const currentAnnotations = annotations
    .filter(a => a.contextKey === contextKey && a.startOffset !== undefined && a.endOffset !== undefined)
    .sort((a, b) => (a.startOffset || 0) - (b.startOffset || 0));

  // Sidebar Logic: Show annotations with notes OR the one being edited
  const sidebarAnnotations = currentAnnotations.filter(a =>
    (a.note && a.note.trim().length > 0) || a.id === editingAnnotationId
  );

  // Fetch Text Content when active unit changes
  useEffect(() => {
    const fetchContent = async () => {
      if (!activeUnit || !content) return;

      setLoading(true);
      setPassage(null);

      try {
        const effectiveContent = {
          ...content,
          readingText: content.listeningScript || content.readingText || '',
          readingTranslation: content.listeningTranslation || content.readingTranslation || '',
          readingTitle: content.listeningTitle || '',
        };

        const data = await generateReadingPassage(
          instituteName,
          course.level,
          activeUnit,
          language,
          effectiveContent
        );
        setPassage(data);
      } catch (error) {
        console.error('Content generation failed', error);
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, [activeUnit, instituteName, course.level, language, content]);

  // Audio Controls (Keep existing logic)
  const togglePlayback = () => {
    if (isManualAudio && manualAudioRef.current) {
      if (isPlaying) {
        manualAudioRef.current.pause();
        setIsPlaying(false);
      } else {
        manualAudioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const restartAudio = () => {
    if (isManualAudio && manualAudioRef.current) {
      manualAudioRef.current.currentTime = 0;
      manualAudioRef.current.play();
      setIsPlaying(true);
    }
  };

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

    const result = [];
    let i = 0;
    while (i < fullText.length) {
      const currentAnn = charMap[i].annotation;
      let j = i + 1;

      while (j < fullText.length) {
        const nextAnn = charMap[j].annotation;
        if (nextAnn !== currentAnn) break;
        j++;
      }

      const segmentText = fullText.slice(i, j);
      let className = 'relative rounded px-0 py-0.5 box-decoration-clone transition-all ';

      if (currentAnn) {
        // STYLE LOGIC UPDATE (Listening Module):
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
              <span className="absolute -top-1.5 -right-1 w-2 h-2 bg-red-400 rounded-full border border-white"></span>
            )}
          </span>
        );
      } else {
        result.push(<span key={i}>{segmentText}</span>);
      }
      i = j;
    }
    return result;
  };

  // Table of Contents View
  if (!activeUnit) {
    // (Keep TOC Logic Identical)
    const availableUnits = Object.keys(levelContexts)
      .map(Number)
      .sort((a, b) => a - b);
    const unitsWithAudio = availableUnits.filter(u => {
      const c = levelContexts[u];
      return !!c?.listeningScript || !!c?.listeningAudioUrl;
    });

    return (
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">
          {labels.toc} - {labels.listening}
        </h2>
        {unitsWithAudio.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-500">
            {labels.noListening}
          </div>
        ) : (
          <div className="space-y-4">
            {unitsWithAudio.map(u => {
              const c = levelContexts[u];
              const title = getPreviewFromContent(c.listeningScript, 50) || `Track ${u}`;
              return (
                <button
                  key={u}
                  onClick={() => setActiveUnit(u)}
                  className="w-full bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all text-left flex justify-between items-center group"
                >
                  <div className="flex items-center">
                    {/* ... Copy previous internal logic ... */}
                    <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mr-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Volume2 className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
                        {labels.unit} {u}
                      </div>
                      <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                      {c.listeningAudioUrl && (
                        <span className="inline-flex items-center text-xs text-emerald-600 mt-1 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
                          <Music className="w-3 h-3 mr-1" /> {labels.originalAudio}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-indigo-500" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Listening View
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-slate-500">{labels.loading}</p>
      </div>
    );
  }

  // UPDATED LAYOUT WITH SIDEBAR
  return (
    <div className="h-[calc(100vh-140px)] flex flex-col max-w-6xl mx-auto w-full">
      <div className="mb-4 flex items-center">
        <button
          onClick={() => setActiveUnit(null)}
          className="text-sm text-slate-500 hover:text-indigo-600 font-medium flex items-center"
        >
          ← {labels.backToList}
        </button>
        <div className="mx-4 h-4 w-px bg-slate-300"></div>
        <span className="text-sm font-bold text-slate-700">
          {labels.unit} {activeUnit}
        </span>
      </div>

      <div className="flex gap-6 h-full min-h-0">
        {/* Main Content Area */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col min-h-0">
          {/* Header with title and controls */}
          <div className="border-b border-slate-100 p-4 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
            <h3 className="font-bold text-slate-800">{passage?.title || labels.listeningPractice || 'Listening Practice'}</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTranslation(!showTranslation)}
                className={`text-sm px-3 py-1.5 rounded-lg border transition-all ${showTranslation
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
              >
                {showTranslation ? labels.hideTrans : labels.showTrans}
              </button>
            </div>
          </div>

          {/* Audio Player */}
          {content?.listeningAudioUrl && (
            <audio
              ref={manualAudioRef}
              src={content.listeningAudioUrl}
              onEnded={() => setIsPlaying(false)}
              onPause={() => setIsPlaying(false)}
              onPlay={() => setIsPlaying(true)}
            />
          )}

          <div className="flex items-center justify-center space-x-6 py-6 border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white">
            <button
              onClick={restartAudio}
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              onClick={togglePlayback}
              className={`w-16 h-16 flex items-center justify-center rounded-full shadow-lg transition-all scale-100 hover:scale-105 active:scale-95 ${isPlaying ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-white text-indigo-600 border-2 border-indigo-100'
                }`}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 fill-current" />
              ) : (
                <Play className="w-6 h-6 fill-current ml-0.5" />
              )}
            </button>

            <div className="w-10"></div>
          </div>

          {/* Text Content - Same layout as ReadingModule */}
          <div className="flex-1 overflow-y-auto p-8 relative">
            <div className="flex gap-8 h-full">
              {/* Korean Text - Always Visible */}
              <div
                ref={contentRef}
                className={`transition-all duration-300 ${showTranslation ? 'w-1/2' : 'w-full max-w-5xl mx-auto'} ${selectedColor ? `selection-${selectedColor}` : ''}`}
                onMouseUp={handleTextSelection}
              >
                <div className="text-lg leading-loose text-slate-800 font-serif whitespace-pre-line select-text">
                  {passage && renderHighlightedText(passage.koreanText)}
                </div>
              </div>

              {/* Translation - Conditionally Visible */}
              {showTranslation && passage?.englishTranslation && (
                <div className="w-1/2 border-l border-slate-100 pl-8 overflow-y-auto">
                  <div className="text-slate-600 leading-relaxed whitespace-pre-line">
                    {passage.englishTranslation}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar - Annotations */}
        <div className="w-80 flex flex-col gap-4 min-h-0">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col min-h-0">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
              <h4 className="font-bold text-slate-700 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-500" />
                {labels.annotate}
              </h4>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {sidebarAnnotations.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm italic">
                  {labels.noNotes || 'No notes yet'}
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
                          {labels.editingNote || 'Editing note'}
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
                            {labels.cancel}
                          </button>
                          <button
                            onClick={() => handleUpdateNote(ann.id)}
                            className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" /> {labels.save}
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

                        // Scroll to text?
                        const el = document.getElementById(`annotation-${ann.id}`);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
                        <p className="text-xs text-slate-400 italic">{labels.clickToAddNote || 'Click to add note...'}</p>
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
        onHighlight={(color) => {
          saveAnnotation(color, undefined, true);
        }}
        selectedColor={selectedColor}
        setSelectedColor={setSelectedColor}
        // Save word usually not needed in listening but why not support it?
        onClose={cancelAnnotation}
        onDelete={deleteAnnotation}
        labels={labels}
      />
    </div>
  );
};

export default ListeningModule;
