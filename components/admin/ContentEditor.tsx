import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Institute,
  Language,
  TextbookContextMap,
  TextbookContent,
  LevelConfig,
} from '../../types';
import { getLabels } from '../../utils/i18n';
import { api } from '../../services/api';
import {
  Plus,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  BookOpen,
  ChevronDown,
  Eye,
  Trash2,
  Upload,
  Play,
  Pause,
} from 'lucide-react';

interface ContentEditorProps {
  institutes: Institute[];
  textbookContexts: TextbookContextMap;
  language: Language;
  onSaveContext: (key: string, content: TextbookContent) => void;
  onAddInstitute: (name: string, levels?: LevelConfig[]) => void | Promise<void>;
  onDeleteInstitute?: (id: string) => void;
}

type ContentTab = 'vocab' | 'reading' | 'listening' | 'grammar';
type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

// Helper: Parse levels from Institute (supports both old number[] and new LevelConfig[] formats)
const parseLevels = (levels: LevelConfig[] | number[]): LevelConfig[] => {
  if (!levels || levels.length === 0) return [];
  if (typeof levels[0] === 'number') {
    // Old format: number[]
    return (levels as number[]).map(l => ({ level: l, units: 10 }));
  }
  return levels as LevelConfig[];
};

const ContentEditor: React.FC<ContentEditorProps> = ({
  institutes,
  textbookContexts,
  language,
  onSaveContext,
  onAddInstitute,
  onDeleteInstitute,
}) => {
  const labels = getLabels(language);

  // Textbook selection state
  const [selectedInstitute, setSelectedInstitute] = useState<Institute | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [selectedUnit, setSelectedUnit] = useState<number>(1);

  // Content entry state
  const [activeTab, setActiveTab] = useState<ContentTab>('vocab');
  const [textInput, setTextInput] = useState('');
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  // Reading/Listening entries (supports multiple entries)
  interface ContentEntry {
    text: string;
    translation: string;
    audioUrl?: string; // Restored
  }
  const [readingEntries, setReadingEntries] = useState<ContentEntry[]>([{ text: '', translation: '' }]);
  const [listeningEntries, setListeningEntries] = useState<ContentEntry[]>([{ text: '', translation: '' }]);
  const [listeningAudioUrl, setListeningAudioUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [entryUploadingIndex, setEntryUploadingIndex] = useState<number | null>(null); // Restored
  const [entryPlayingIndex, setEntryPlayingIndex] = useState<number | null>(null); // Restored
  const [isPlaying, setIsPlaying] = useState(false);

  // Title states for reading and listening
  const [readingTitle, setReadingTitle] = useState('');
  const [listeningTitle, setListeningTitle] = useState('');

  // ... (activeTab state and others remain)

  // Audio refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const entryAudioRefs = useRef<Record<number, HTMLAudioElement | null>>({}); // Restored

  // ... (useEffect remains)

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setIsUploading(true);
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.uploadFile(formData);
      setListeningAudioUrl(response.url);
    } catch (error) {
      console.error('Failed to upload audio', error);
      alert('Failed to upload audio');
    } finally {
      setIsUploading(false);
    }
  };

  const handleEntryAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setEntryUploadingIndex(index);
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.uploadFile(formData);
      const newEntries = [...listeningEntries];
      newEntries[index] = { ...newEntries[index], audioUrl: response.url };
      setListeningEntries(newEntries);
    } catch (error) {
      console.error('Failed to upload entry audio', error);
      alert('Failed to upload audio');
    } finally {
      setEntryUploadingIndex(null);
    }
  };

  const toggleAudioPlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleEntryAudioPlayback = (index: number) => {
    const audio = entryAudioRefs.current[index];
    if (audio) {
      if (entryPlayingIndex === index) {
        audio.pause();
        setEntryPlayingIndex(null);
      } else {
        // Pause others
        Object.values(entryAudioRefs.current).forEach(a => (a as HTMLAudioElement)?.pause());
        if (audioRef.current) {
          audioRef.current.pause();
          setIsPlaying(false);
        }

        audio.play();
        setEntryPlayingIndex(index);
      }
    }
  };

  // ... (handleSave logic - will be updated implicitly if it treats entries as JSON, which it does)

  // ...

  // Inside the render,specifically the Listening Tab part:
  /*
  The following replacement targets the rendering logic for listening entries.
  We need to inject the audio control UI for each entry.
  */


  // Add textbook modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTextbookName, setNewTextbookName] = useState('');
  const [newLevelCount, setNewLevelCount] = useState(6);
  const [newUnitsPerLevel, setNewUnitsPerLevel] = useState(10);

  // Get available levels and units for selected institute
  const availableLevels = useMemo(() => {
    if (!selectedInstitute) return [];
    return parseLevels(selectedInstitute.levels);
  }, [selectedInstitute]);

  const availableUnits = useMemo(() => {
    const level = availableLevels.find(l => l.level === selectedLevel);
    return level ? level.units : 10;
  }, [availableLevels, selectedLevel]);

  // Get current content key
  const contentKey = selectedInstitute
    ? `${selectedInstitute.id}-${selectedLevel}-${selectedUnit}`
    : null;

  // Get existing content for current selection
  const existingContent = contentKey ? textbookContexts[contentKey] : null;

  // Load existing content into entries when switching units (contentKey changes)
  useEffect(() => {
    const content = contentKey ? textbookContexts[contentKey] : null;

    if (content) {
      // Load titles
      setReadingTitle(content.readingTitle || '');
      setListeningTitle(content.listeningTitle || '');

      // Try to parse as JSON array, fallback to single entry
      try {
        const readingData = content.readingText;
        if (readingData && readingData.startsWith('[')) {
          setReadingEntries(JSON.parse(readingData));
        } else {
          setReadingEntries([{
            text: content.readingText || '',
            translation: content.readingTranslation || ''
          }]);
        }
      } catch {
        setReadingEntries([{
          text: content.readingText || '',
          translation: content.readingTranslation || ''
        }]);
      }

      try {
        const listeningData = content.listeningScript;
        if (listeningData && listeningData.startsWith('[')) {
          setListeningEntries(JSON.parse(listeningData));
        } else {
          setListeningEntries([{
            text: content.listeningScript || '',
            translation: content.listeningTranslation || ''
          }]);
        }
      } catch {
        setListeningEntries([{
          text: content.listeningScript || '',
          translation: content.listeningTranslation || ''
        }]);
      }

      setListeningAudioUrl(content.listeningAudioUrl || null);
    } else {
      // Only reset when switching to a new empty unit
      setReadingTitle('');
      setListeningTitle('');
      setReadingEntries([{ text: '', translation: '' }]);
      setListeningEntries([{ text: '', translation: '' }]);
      setListeningAudioUrl(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentKey]); // Only run when switching units, not when textbookContexts updates

  // Tab configuration
  const tabs: { id: ContentTab; label: string; icon: string; format: string; placeholder: string }[] = [
    {
      id: 'vocab',
      label: String(labels.vocabulary || 'Vocabulary'),
      icon: '📚',
      format: '단어 | 품사 | 뜻 | 예문',
      placeholder: '사과 | 명사 | apple | 사과를 먹어요\n바나나 | 명사 | banana | 바나나가 맛있어요',
    },
    {
      id: 'reading',
      label: String(labels.reading || 'Reading'),
      icon: '📖',
      format: '', // Two-column layout, no format hint needed
      placeholder: '',
    },
    {
      id: 'listening',
      label: String(labels.listening || 'Listening'),
      icon: '🎧',
      format: '', // Two-column layout, no format hint needed
      placeholder: '',
    },
    {
      id: 'grammar',
      label: String(labels.grammar || 'Grammar'),
      icon: '📝',
      format: '패턴 | 설명 | 예문 | 예문번역',
      placeholder: '-아/어요 | 현재 시제 동사 어미 | 먹어요 | I eat\n-았/었어요 | 과거 시제 동사 어미 | 먹었어요 | I ate',
    },
  ];

  const currentTab = tabs.find(t => t.id === activeTab)!;



  // Parse input based on active tab
  const parseInput = (input: string): any[] => {
    const lines = input.trim().split('\n').filter(l => l.trim());

    if (activeTab === 'vocab') {
      return lines.map(line => {
        const parts = line.split('|').map(p => p.trim());
        return {
          korean: parts[0] || '',
          pos: parts[1] || '',
          english: parts[2] || '',
          exampleSentence: parts[3] || '',
          exampleTranslation: '',
        };
      });
    }

    if (activeTab === 'reading' || activeTab === 'listening') {
      // Split by --- separator
      const sections = input.split('---').map(s => s.trim());
      return [{
        text: sections[0] || '',
        translation: sections[1] || '',
      }];
    }

    if (activeTab === 'grammar') {
      return lines.map(line => {
        const parts = line.split('|').map(p => p.trim());
        return {
          pattern: parts[0] || '',
          explanation: parts[1] || '',
          usages: [{
            situation: 'General',
            example: parts[2] || '',
            translation: parts[3] || '',
          }],
        };
      });
    }

    return [];
  };

  // Handle preview
  const handlePreview = () => {
    const parsed = parseInput(textInput);
    setPreviewData(parsed);
    setShowPreview(true);
  };

  // Handle save
  const handleSave = async () => {
    if (!contentKey || !selectedInstitute) return;

    // Validate: for vocab/grammar, need textInput; for reading/listening, check entries
    if (activeTab === 'vocab' || activeTab === 'grammar') {
      if (!textInput.trim()) return;
    } else if (activeTab === 'reading') {
      const hasContent = readingEntries.some(e => e.text.trim() || e.translation.trim());
      if (!hasContent) return;
    } else if (activeTab === 'listening') {
      const hasContent = listeningEntries.some(e => e.text.trim() || e.translation.trim()) || listeningAudioUrl;
      if (!hasContent) return;
    }

    setSaveStatus('saving');

    try {
      const content: TextbookContent = existingContent
        ? { ...existingContent }
        : {
          generalContext: '',
          vocabularyList: '',
          readingText: '',
          readingTranslation: '',
          readingTitle: `Level ${selectedLevel} Unit ${selectedUnit}`,
          listeningScript: '',
          listeningTranslation: '',
          listeningTitle: `Level ${selectedLevel} Unit ${selectedUnit}`,
          listeningAudioUrl: null,
          grammarList: '',
        };

      if (activeTab === 'vocab') {
        const parsed = parseInput(textInput);
        content.vocabularyList = JSON.stringify(parsed);
      } else if (activeTab === 'reading') {
        // Store as JSON array for multiple entries
        const validEntries = readingEntries.filter(e => e.text.trim() || e.translation.trim());
        content.readingText = JSON.stringify(validEntries);
        content.readingTranslation = ''; // Not used when storing as JSON
        content.readingTitle = readingTitle || `Level ${selectedLevel} Unit ${selectedUnit}`;
      } else if (activeTab === 'listening') {
        // Store as JSON array for multiple entries
        const validEntries = listeningEntries.filter(e => e.text.trim() || e.translation.trim());
        content.listeningScript = JSON.stringify(validEntries);
        content.listeningTranslation = ''; // Not used when storing as JSON
        content.listeningAudioUrl = listeningAudioUrl;
        content.listeningTitle = listeningTitle || `Level ${selectedLevel} Unit ${selectedUnit}`;
      } else if (activeTab === 'grammar') {
        const parsed = parseInput(textInput);
        content.grammarList = JSON.stringify(parsed);
      }

      await onSaveContext(contentKey, content);
      setSaveStatus('success');
      setShowPreview(false);

      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Save error:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // Handle add textbook
  const handleAddTextbook = async () => {
    if (!newTextbookName.trim()) return;

    // Defensive check
    if (typeof onAddInstitute !== 'function') {
      console.error('onAddInstitute is not a function:', onAddInstitute);
      alert('Error: Add function not available. Please refresh the page.');
      return;
    }

    const levels: LevelConfig[] = Array.from({ length: newLevelCount }, (_, i) => ({
      level: i + 1,
      units: newUnitsPerLevel,
    }));

    try {
      await onAddInstitute(newTextbookName.trim(), levels);
      setNewTextbookName('');
      setNewLevelCount(6);
      setNewUnitsPerLevel(10);
      setShowAddModal(false);
    } catch (err) {
      console.error('Failed to create textbook:', err);
      alert('Failed to create textbook. Please check if the backend server is running.');
    }
  };

  // Helper: Convert content object to text format
  const getContentText = (content: any, tab: ContentTab): string => {
    if (!content) return '';

    if (tab === 'vocab' && content.vocabularyList) {
      try {
        const vocab = JSON.parse(content.vocabularyList);
        return vocab.map((v: any) =>
          `${v.korean} | ${v.pos || ''} | ${v.english} | ${v.exampleSentence || ''}`
        ).join('\n');
      } catch { return ''; }
    }

    if (tab === 'reading') {
      const text = content.readingText || '';
      const trans = content.readingTranslation || '';
      return text && trans ? `${text}\n---\n${trans}` : text || trans;
    }

    if (tab === 'listening') {
      const text = content.listeningScript || '';
      const trans = content.listeningTranslation || '';
      return text && trans ? `${text}\n---\n${trans}` : text || trans;
    }

    if (tab === 'grammar' && content.grammarList) {
      try {
        const grammar = JSON.parse(content.grammarList);
        return grammar.map((g: any) => {
          const usage = g.usages?.[0] || {};
          return `${g.pattern} | ${g.explanation} | ${usage.example || ''} | ${usage.translation || ''}`;
        }).join('\n');
      } catch { return ''; }
    }

    return '';
  };

  // State tracking to prevent overwriting user input on spurious re-renders
  const lastState = React.useRef({ key: '', tab: '', text: '' });

  // Load existing content when tab or selection changes
  React.useEffect(() => {
    const formattedText = getContentText(existingContent, activeTab);
    const currentKeyStr = contentKey || '';

    const isContextChange =
      currentKeyStr !== lastState.current.key ||
      activeTab !== lastState.current.tab;

    // Only update if context changed OR the underlying content actually changed (external update)
    // Note: We check formattedText against lastState.text (the prop value), not textInput (the user value)
    const isExternalUpdate = formattedText !== lastState.current.text;

    if (isContextChange || isExternalUpdate) {
      setTextInput(formattedText);
      lastState.current = {
        key: currentKeyStr,
        tab: activeTab,
        text: formattedText
      };
    }
  }, [activeTab, contentKey, existingContent]);

  return (
    <div className="p-6 space-y-6 h-full overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {labels.contentManagement || 'Content Management'}
          </h2>
          <p className="text-gray-600">Manage textbooks and add content via copy-paste</p>
        </div>
      </div>

      {/* Textbook Selection */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Textbook Dropdown */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <BookOpen className="inline w-4 h-4 mr-1" />
              Textbook
            </label>
            <div className="relative">
              <select
                value={selectedInstitute?.id || ''}
                onChange={e => {
                  const inst = institutes.find(i => i.id === e.target.value);
                  setSelectedInstitute(inst || null);
                  setSelectedLevel(1);
                  setSelectedUnit(1);
                }}
                className="w-full p-2.5 pr-8 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                <option value="">-- Select Textbook --</option>
                {institutes.map(inst => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Level Dropdown */}
          {selectedInstitute && (
            <div className="w-32">
              <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
              <select
                value={selectedLevel}
                onChange={e => {
                  setSelectedLevel(Number(e.target.value));
                  setSelectedUnit(1);
                }}
                className="w-full p-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
              >
                {availableLevels.map(l => (
                  <option key={l.level} value={l.level}>Level {l.level}</option>
                ))}
              </select>
            </div>
          )}

          {/* Unit Dropdown */}
          {selectedInstitute && (
            <div className="w-32">
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select
                value={selectedUnit}
                onChange={e => setSelectedUnit(Number(e.target.value))}
                className="w-full p-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: availableUnits }, (_, i) => (
                  <option key={i + 1} value={i + 1}>Unit {i + 1}</option>
                ))}
              </select>
            </div>
          )}

          {/* Add Textbook Button */}
          <div className="flex items-end gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Textbook
            </button>

            {selectedInstitute && onDeleteInstitute && (
              <button
                onClick={() => {
                  if (confirm(`Delete "${selectedInstitute.name}"?`)) {
                    onDeleteInstitute(selectedInstitute.id);
                    setSelectedInstitute(null);
                  }
                }}
                className="p-2.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete textbook"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content Entry Section */}
      {selectedInstitute ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-4 py-3 font-medium transition-colors ${activeTab === tab.id
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500'
                  : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content Entry Area */}
          <div className="p-4 space-y-4">
            {/* Format Hint - only for vocab and grammar */}
            {(activeTab === 'vocab' || activeTab === 'grammar') && currentTab.format && (
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-800">Format:</p>
                <p className="text-sm text-blue-700 font-mono whitespace-pre-wrap">{currentTab.format}</p>
              </div>
            )}

            {/* Audio Upload - Listening only */}
            {activeTab === 'listening' && (
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <p className="text-sm font-medium text-purple-800 mb-3">🎧 音频文件</p>
                <div className="flex items-center gap-3">
                  <label className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 cursor-pointer transition-colors flex items-center gap-2">
                    {isUploading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> 上传中...</>
                    ) : (
                      <><Upload className="w-4 h-4" /> 上传音频</>
                    )}
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleAudioUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </label>

                  {listeningAudioUrl && (
                    <>
                      <button
                        onClick={toggleAudioPlayback}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        {isPlaying ? '暂停' : '播放'}
                      </button>
                      <button
                        onClick={() => setListeningAudioUrl(null)}
                        className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <span className="text-sm text-gray-500 truncate max-w-xs">
                        {listeningAudioUrl.split('/').pop()}
                      </span>
                      <audio
                        id="preview-audio"
                        src={listeningAudioUrl}
                        onEnded={() => setIsPlaying(false)}
                        className="hidden"
                      />
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Multi-entry layout for Reading/Listening */}
            {(activeTab === 'reading' || activeTab === 'listening') ? (
              <div className="space-y-4">
                {/* Title Input */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <label className="block text-sm font-medium text-blue-800 mb-2">
                    📝 {activeTab === 'reading' ? '阅读标题 (Reading Title)' : '听力标题 (Listening Title)'}
                  </label>
                  <input
                    type="text"
                    value={activeTab === 'reading' ? readingTitle : listeningTitle}
                    onChange={(e) => {
                      if (activeTab === 'reading') {
                        setReadingTitle(e.target.value);
                      } else {
                        setListeningTitle(e.target.value);
                      }
                    }}
                    placeholder={`Level ${selectedLevel} Unit ${selectedUnit} - ${activeTab === 'reading' ? '阅读练习' : '听力练习'}`}
                    className="w-full p-2.5 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                {(activeTab === 'reading' ? readingEntries : listeningEntries).map((entry, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-600">
                        {activeTab === 'reading' ? `📖 阅读 #${index + 1}` : `🎧 听力 #${index + 1}`}
                      </span>
                      {(activeTab === 'reading' ? readingEntries : listeningEntries).length > 1 && (
                        <button
                          onClick={() => {
                            if (activeTab === 'reading') {
                              setReadingEntries(prev => prev.filter((_, i) => i !== index));
                            } else {
                              setListeningEntries(prev => prev.filter((_, i) => i !== index));
                            }
                          }}
                          className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Audio Controls for Listening Entry */}
                    {activeTab === 'listening' && (
                      <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {entry.audioUrl ? (
                            <>
                              <button
                                onClick={() => toggleEntryAudioPlayback(index)}
                                className="w-8 h-8 flex items-center justify-center bg-purple-100 text-purple-600 rounded-full hover:bg-purple-200 transition-colors"
                              >
                                {entryPlayingIndex === index ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 text-purple-600 ml-0.5" />}
                              </button>
                              <span className="text-xs text-purple-700 font-medium">
                                音频已上传
                              </span>
                              <audio
                                ref={el => { entryAudioRefs.current[index] = el; }}
                                src={entry.audioUrl}
                                onEnded={() => setEntryPlayingIndex(null)}
                              />
                            </>
                          ) : (
                            <span className="text-xs text-gray-400 italic">暂无音频</span>
                          )}
                        </div>

                        <label className={`
                          flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors
                          ${entryUploadingIndex === index
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-white border border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300'
                          }
                        `}>
                          <input
                            type="file"
                            accept="audio/*"
                            className="hidden"
                            disabled={entryUploadingIndex === index}
                            onChange={(e) => handleEntryAudioUpload(e, index)}
                          />
                          {entryUploadingIndex === index ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Upload className="w-3 h-3" />
                          )}
                          {entryUploadingIndex === index
                            ? '上传中...'
                            : (entry.audioUrl ? '更换音频' : '上传音频')
                          }
                        </label>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      {/* Left: Original text */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">原文</label>
                        <textarea
                          value={entry.text}
                          onChange={e => {
                            if (activeTab === 'reading') {
                              setReadingEntries(prev => prev.map((item, i) =>
                                i === index ? { ...item, text: e.target.value } : item
                              ));
                            } else {
                              setListeningEntries(prev => prev.map((item, i) =>
                                i === index ? { ...item, text: e.target.value } : item
                              ));
                            }
                          }}
                          placeholder={activeTab === 'reading'
                            ? '오늘 날씨가 좋습니다...'
                            : '안녕하세요?...'
                          }
                          rows={6}
                          className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-y"
                        />
                      </div>
                      {/* Right: Translation */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">翻译</label>
                        <textarea
                          value={entry.translation}
                          onChange={e => {
                            if (activeTab === 'reading') {
                              setReadingEntries(prev => prev.map((item, i) =>
                                i === index ? { ...item, translation: e.target.value } : item
                              ));
                            } else {
                              setListeningEntries(prev => prev.map((item, i) =>
                                i === index ? { ...item, translation: e.target.value } : item
                              ));
                            }
                          }}
                          placeholder="今天天气很好..."
                          rows={6}
                          className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-y"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {/* Add Entry Button */}
                <button
                  onClick={() => {
                    if (activeTab === 'reading') {
                      setReadingEntries(prev => [...prev, { text: '', translation: '' }]);
                    } else {
                      setListeningEntries(prev => [...prev, { text: '', translation: '' }]);
                    }
                  }}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  添加第 {(activeTab === 'reading' ? readingEntries : listeningEntries).length + 1} 条
                </button>
              </div>
            ) : (
              /* Single textarea for vocab and grammar */
              <textarea
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                placeholder={currentTab.placeholder}
                rows={10}
                className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 resize-y"
              />
            )}

            {/* Actions */}
            <div className="flex items-center gap-3">
              {/* Preview button - only for vocab and grammar */}
              {(activeTab === 'vocab' || activeTab === 'grammar') && (
                <button
                  onClick={handlePreview}
                  disabled={!textInput.trim()}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={saveStatus === 'saving'}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {saveStatus === 'saving' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                ) : saveStatus === 'success' ? (
                  <><CheckCircle className="w-4 h-4" /> Saved!</>
                ) : saveStatus === 'error' ? (
                  <><AlertCircle className="w-4 h-4" /> Error</>
                ) : (
                  <><Save className="w-4 h-4" /> Save</>
                )}
              </button>
              {(activeTab === 'vocab' || activeTab === 'grammar') && textInput && (
                <button
                  onClick={() => { setTextInput(''); setShowPreview(false); }}
                  className="px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Preview */}
            {showPreview && previewData.length > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                  <span className="font-medium text-gray-700">Preview ({previewData.length} items)</span>
                </div>
                <div className="max-h-60 overflow-auto">
                  <table className="w-full text-sm">
                    <tbody>
                      {previewData.slice(0, 10).map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-500 w-8">{idx + 1}</td>
                          <td className="px-3 py-2">
                            <pre className="whitespace-pre-wrap font-mono text-xs">
                              {JSON.stringify(item, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {previewData.length > 10 && (
                    <div className="px-3 py-2 bg-gray-50 text-center text-sm text-gray-600">
                      ... and {previewData.length - 10} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 p-8 rounded-xl border-2 border-amber-300 border-dashed text-center">
          <div className="text-4xl mb-3">☝️</div>
          <p className="text-amber-800 font-medium text-lg">Select a textbook to add content</p>
          <p className="text-amber-600 text-sm mt-2">
            Or click "Add Textbook" to create a new one
          </p>
        </div>
      )}

      {/* Add Textbook Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Add New Textbook</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Textbook Name</label>
                <input
                  type="text"
                  value={newTextbookName}
                  onChange={e => setNewTextbookName(e.target.value)}
                  placeholder="e.g., Yonsei, Sogang, Ewha"
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Number of Levels</label>
                  <input
                    type="number"
                    value={newLevelCount}
                    onChange={e => setNewLevelCount(Math.max(1, parseInt(e.target.value) || 1))}
                    min={1}
                    max={20}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Units per Level</label>
                  <input
                    type="number"
                    value={newUnitsPerLevel}
                    onChange={e => setNewUnitsPerLevel(Math.max(1, parseInt(e.target.value) || 1))}
                    min={1}
                    max={50}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <p className="text-sm text-gray-500">
                This will create {newLevelCount} levels with {newUnitsPerLevel} units each ({newLevelCount * newUnitsPerLevel} total units)
              </p>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTextbook}
                disabled={!newTextbookName.trim()}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Textbook
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentEditor;
