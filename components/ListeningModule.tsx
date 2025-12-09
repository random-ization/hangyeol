import React, { useState, useEffect, useRef } from 'react';
import { generateReadingPassage } from '../services/geminiService';
import { CourseSelection, ReadingContent, Language, TextbookContent, Annotation } from '../types';
import { Play, Pause, RotateCcw, Volume2, ChevronRight, Music } from 'lucide-react';
import { getLabels } from '../utils/i18n';
import { useAnnotation } from '../hooks/useAnnotation';
import AnnotationMenu from './AnnotationMenu';

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
  const [activeUnit, setActiveUnit] = useState<number | null>(null);
  const [passage, setPassage] = useState<ReadingContent | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showScript, setShowScript] = useState(false);

  // Refs
  const manualAudioRef = useRef<HTMLAudioElement | null>(null);

  const contextKey = activeUnit
    ? `${course.instituteId}-${course.level}-${activeUnit}-LISTENING`
    : '';

  const {
    contentRef,
    handleTextSelection,
    saveAnnotation,
    cancelAnnotation,
    showAnnotationMenu,
    menuPosition,
    noteInput,
    setNoteInput,
    selectedColor,
    setSelectedColor,
    currentSelectionRange
  } = useAnnotation(contextKey, annotations, onSaveAnnotation);

  const labels = getLabels(language);
  const content = activeUnit ? levelContexts[activeUnit] : undefined;
  const isManualAudio = !!content?.listeningAudioUrl;

  // Filter annotations for rendering
  const currentAnnotations = annotations
    .filter(a => a.contextKey === contextKey && a.startOffset !== undefined && a.endOffset !== undefined)
    .sort((a, b) => (a.startOffset || 0) - (b.startOffset || 0));


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

  // Audio Controls
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
        const colorClass = currentAnn.color ? `highlight-${currentAnn.color}` : 'bg-slate-200';
        className += `${colorClass} cursor-pointer hover:brightness-95 `;
      }

      if (currentAnn) {
        result.push(
          <span key={i} id={`annotation-${currentAnn.id}`} className={className}>
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
              const title = c.listeningScript
                ? c.listeningScript.substring(0, 50) + '...'
                : `Track ${u}`;
              return (
                <button
                  key={u}
                  onClick={() => setActiveUnit(u)}
                  className="w-full bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all text-left flex justify-between items-center group"
                >
                  <div className="flex items-center">
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

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col max-w-4xl mx-auto w-full">
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

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 flex flex-col items-center transition-all">
        {content?.listeningAudioUrl && (
          <audio
            ref={manualAudioRef}
            src={content.listeningAudioUrl}
            onEnded={() => setIsPlaying(false)}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
          />
        )}

        <div className="flex items-center justify-center space-x-8 mb-8">
          <button
            onClick={restartAudio}
            className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all"
          >
            <RotateCcw className="w-6 h-6" />
          </button>

          <button
            onClick={togglePlayback}
            className={`w-20 h-20 flex items-center justify-center rounded-full shadow-lg transition-all scale-100 hover:scale-105 active:scale-95 ${isPlaying ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-white text-indigo-600 border-2 border-indigo-100'
              }`}
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 fill-current" />
            ) : (
              <Play className="w-8 h-8 fill-current ml-1" />
            )}
          </button>

          <div className="w-12"></div>
        </div>

        <div className="w-full">
          <button
            onClick={() => setShowScript(!showScript)}
            className="w-full py-3 px-4 flex items-center justify-center text-slate-600 font-medium bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {showScript ? labels.hideScript : labels.viewScript}
          </button>

          {showScript && passage && (
            <div className="mt-4 p-4 bg-slate-50 rounded-xl animate-in slide-in-from-top-4 relative">
              <div
                ref={contentRef}
                className="text-lg leading-relaxed text-slate-800 whitespace-pre-line select-text font-serif"
                onMouseUp={handleTextSelection}
              >
                {renderHighlightedText(passage.koreanText)}
              </div>
            </div>
          )}
        </div>
      </div>

      <AnnotationMenu
        visible={showAnnotationMenu}
        position={menuPosition}
        selectionText={currentSelectionRange?.text}
        noteInput={noteInput}
        setNoteInput={setNoteInput}
        selectedColor={selectedColor}
        setSelectedColor={setSelectedColor}
        onSave={saveAnnotation}
        onCancel={cancelAnnotation}
        labels={labels}
      />
    </div>
  );
};

export default ListeningModule;
