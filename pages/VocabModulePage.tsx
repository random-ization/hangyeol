import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ChevronLeft, ChevronDown, ChevronRight, Volume2, Check, X, Star
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLearning } from '../contexts/LearningContext';
import { useData } from '../contexts/DataContext';
import { VocabularyItem } from '../types';
import VocabQuiz from '../src/features/vocab/components/VocabQuiz';
import VocabMatch from '../src/features/vocab/components/VocabMatch';

interface ExtendedVocabItem extends VocabularyItem {
    id: string;
    unit: number;
    mastered?: boolean;
}

type ViewMode = 'flashcard' | 'quiz' | 'match' | 'list';

export default function VocabModulePage() {
    const navigate = useNavigate();
    const { instituteId } = useParams<{ instituteId: string }>();
    const { user, saveWord } = useAuth();
    const { setSelectedInstitute, selectedLevel, setSelectedLevel } = useLearning();
    const { institutes, textbookContexts } = useData();

    // Sync instituteId to context - only run when instituteId changes
    useEffect(() => {
        if (instituteId) {
            setSelectedInstitute(instituteId);
            // Only set level if it's not already set
            if (!selectedLevel) {
                setSelectedLevel(1);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [instituteId]); // Only depend on instituteId to prevent loops

    const course = institutes.find(i => i.id === instituteId);

    // State
    const [allWords, setAllWords] = useState<ExtendedVocabItem[]>([]);
    const [selectedUnitId, setSelectedUnitId] = useState<number | 'ALL'>('ALL');
    const [viewMode, setViewMode] = useState<ViewMode>('flashcard');
    const [cardIndex, setCardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set());
    const [starredIds, setStarredIds] = useState<Set<string>>(new Set());
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    // Parse words
    const parseWords = useCallback(() => {
        setLoading(true);
        const combined: ExtendedVocabItem[] = [];
        const level = selectedLevel || 1;
        const prefix = `${instituteId}-${level}-`;

        Object.keys(textbookContexts).forEach(key => {
            if (key.startsWith(prefix)) {
                const unitStr = key.slice(prefix.length);
                const unit = parseInt(unitStr, 10);
                const content = textbookContexts[key];
                if (content?.vocabularyList && content.vocabularyList.startsWith('[')) {
                    try {
                        const parsed: VocabularyItem[] = JSON.parse(content.vocabularyList);
                        parsed.forEach((item, idx) => {
                            combined.push({ ...item, unit, id: `${unit}-${idx}`, mastered: false });
                        });
                    } catch (e) {
                        console.warn(`Failed to parse vocab for ${key}`, e);
                    }
                }
            }
        });

        // Mock data if empty
        if (combined.length === 0) {
            const mockWords: ExtendedVocabItem[] = [
                // Unit 1: 名词 (Nouns)
                { id: '1-0', unit: 1, korean: '학교', english: '学校', partOfSpeech: 'NOUN', hanja: '學校', tips: { synonyms: ['학원'], nuance: '指正规教育机构，从小学到大学' }, exampleSentence: '학교에 가요.', exampleTranslation: '去学校。' },
                { id: '1-1', unit: 1, korean: '선생님', english: '老师', partOfSpeech: 'NOUN', hanja: '先生님', tips: { nuance: '尊称，可用于任何教导者' }, exampleSentence: '선생님이 가르쳐요.', exampleTranslation: '老师在教。' },
                { id: '1-2', unit: 1, korean: '학생', english: '学生', partOfSpeech: 'NOUN', hanja: '學生', exampleSentence: '저는 학생이에요.', exampleTranslation: '我是学生。' },
                { id: '1-3', unit: 1, korean: '친구', english: '朋友', partOfSpeech: 'NOUN', hanja: '親舊', tips: { synonyms: ['동료', '벗'], antonyms: ['적'] }, exampleSentence: '친구를 만나요.', exampleTranslation: '见朋友。' },
                { id: '1-4', unit: 1, korean: '가족', english: '家人', partOfSpeech: 'NOUN', hanja: '家族', exampleSentence: '가족이 좋아요.', exampleTranslation: '喜欢家人。' },
                // Unit 2: 名词 (Food/Drink)
                { id: '2-0', unit: 2, korean: '사과', english: '苹果', partOfSpeech: 'NOUN', hanja: '沙果', exampleSentence: '사과를 먹어요.', exampleTranslation: '吃苹果。' },
                { id: '2-1', unit: 2, korean: '물', english: '水', partOfSpeech: 'NOUN', tips: { synonyms: ['음료수'], nuance: '纯净水，与음료수(饮料)不同' }, exampleSentence: '물을 마셔요.', exampleTranslation: '喝水。' },
                { id: '2-2', unit: 2, korean: '밥', english: '饭', partOfSpeech: 'NOUN', tips: { nuance: '可指米饭，也泛指任何一餐' }, exampleSentence: '밥을 먹어요.', exampleTranslation: '吃饭。' },
                { id: '2-3', unit: 2, korean: '커피', english: '咖啡', partOfSpeech: 'NOUN', exampleSentence: '커피를 마셔요.', exampleTranslation: '喝咖啡。' },
                { id: '2-4', unit: 2, korean: '빵', english: '面包', partOfSpeech: 'NOUN', exampleSentence: '빵을 먹어요.', exampleTranslation: '吃面包。' },
                // Unit 3: 动词 (Verbs)
                { id: '3-0', unit: 3, korean: '가다', english: '去', partOfSpeech: 'VERB_INTRANSITIVE', tips: { antonyms: ['오다'], nuance: '自动词，表示离开说话者位置' }, exampleSentence: '집에 가요.', exampleTranslation: '回家。' },
                { id: '3-1', unit: 3, korean: '오다', english: '来', partOfSpeech: 'VERB_INTRANSITIVE', tips: { antonyms: ['가다'], nuance: '自动词，表示向说话者位置移动' }, exampleSentence: '여기 오세요.', exampleTranslation: '请过来。' },
                { id: '3-2', unit: 3, korean: '먹다', english: '吃', partOfSpeech: 'VERB_TRANSITIVE', tips: { synonyms: ['드시다'], nuance: '드시다是敬语形式' }, exampleSentence: '점심을 먹어요.', exampleTranslation: '吃午饭。' },
                { id: '3-3', unit: 3, korean: '마시다', english: '喝', partOfSpeech: 'VERB_TRANSITIVE', exampleSentence: '차를 마셔요.', exampleTranslation: '喝茶。' },
                { id: '3-4', unit: 3, korean: '보다', english: '看', partOfSpeech: 'VERB_TRANSITIVE', tips: { nuance: '也可表示"见面"，如 친구를 보다' }, exampleSentence: '영화를 봐요.', exampleTranslation: '看电影。' },
                // Unit 4: 形容词 (Adjectives)
                { id: '4-0', unit: 4, korean: '크다', english: '大', partOfSpeech: 'ADJECTIVE', tips: { antonyms: ['작다'] }, exampleSentence: '방이 커요.', exampleTranslation: '房间大。' },
                { id: '4-1', unit: 4, korean: '작다', english: '小', partOfSpeech: 'ADJECTIVE', tips: { antonyms: ['크다'] }, exampleSentence: '가방이 작아요.', exampleTranslation: '包小。' },
                { id: '4-2', unit: 4, korean: '좋다', english: '好', partOfSpeech: 'ADJECTIVE', hanja: '좋다', tips: { antonyms: ['나쁘다', '싫다'], nuance: '싫다侧重于主观不喜欢' }, exampleSentence: '날씨가 좋아요.', exampleTranslation: '天气好。' },
                { id: '4-3', unit: 4, korean: '나쁘다', english: '坏', partOfSpeech: 'ADJECTIVE', tips: { antonyms: ['좋다'] }, exampleSentence: '기분이 나빠요.', exampleTranslation: '心情不好。' },
                { id: '4-4', unit: 4, korean: '예쁘다', english: '漂亮', partOfSpeech: 'ADJECTIVE', tips: { synonyms: ['아름답다', '멋있다'], nuance: '예쁘다常用于形容可爱、精致的美' }, exampleSentence: '꽃이 예뻐요.', exampleTranslation: '花很漂亮。' },
            ];
            combined.push(...mockWords);
        }

        setAllWords(combined);
        setLoading(false);
    }, [instituteId, selectedLevel, textbookContexts]);

    useEffect(() => { parseWords(); }, [parseWords]);

    const filteredWords = useMemo(() => {
        if (selectedUnitId === 'ALL') return allWords;
        return allWords.filter(w => w.unit === selectedUnitId);
    }, [allWords, selectedUnitId]);

    useEffect(() => { setCardIndex(0); setIsFlipped(false); }, [selectedUnitId]);

    const availableUnits = useMemo(() => {
        const units = Array.from(new Set(allWords.map(w => w.unit)));
        return units.sort((a, b) => a - b);
    }, [allWords]);

    const currentCard = filteredWords[cardIndex];
    const masteryCount = useMemo(() => filteredWords.filter(w => masteredIds.has(w.id)).length, [filteredWords, masteredIds]);
    const progressPercent = filteredWords.length > 0 ? ((cardIndex + 1) / filteredWords.length) * 100 : 0;

    // Memoized words for Quiz/Match to prevent re-renders
    const gameWords = useMemo(() =>
        filteredWords.map(w => ({ id: w.id, korean: w.korean, english: w.english, unit: w.unit })),
        [filteredWords]
    );

    const handleKnow = () => { if (currentCard) setMasteredIds(prev => new Set([...prev, currentCard.id])); goToNext(); };
    const handleDontKnow = () => { goToNext(); };
    const goToNext = () => { setIsFlipped(false); if (cardIndex < filteredWords.length - 1) setCardIndex(cardIndex + 1); };
    const goToPrev = () => { setIsFlipped(false); if (cardIndex > 0) setCardIndex(cardIndex - 1); };
    const flipCard = () => { setIsFlipped(!isFlipped); };
    const toggleStar = (id: string) => { setStarredIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }); };
    const speakWord = (text: string) => { if ('speechSynthesis' in window) { const u = new SpeechSynthesisUtterance(text); u.lang = 'ko-KR'; u.rate = 0.8; speechSynthesis.speak(u); } };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') { e.preventDefault(); flipCard(); }
            else if (e.code === 'ArrowLeft') goToPrev();
            else if (e.code === 'ArrowRight') goToNext();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cardIndex, filteredWords.length]);

    const modeButtons = [
        { id: 'flashcard', label: '单词卡', emoji: '🎴' },
        { id: 'quiz', label: '测试', emoji: '⚡️' },
        { id: 'match', label: '配对', emoji: '🧩' },
        { id: 'list', label: '列表', emoji: '📝' },
    ];

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F0F4F8', backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}>
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-500 font-medium">加载词汇...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center py-6 px-4" style={{ backgroundColor: '#F0F4F8', backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}>
            <div className="w-full max-w-4xl mb-6">
                {/* Top Bar */}
                <div className="flex items-center justify-between mb-6 z-50 relative">
                    <div className="flex items-center gap-4">
                        {/* Back Button */}
                        <button onClick={() => navigate(`/course/${instituteId}`)} className="w-10 h-10 bg-white border-2 border-slate-200 rounded-xl flex items-center justify-center hover:border-slate-900 transition-colors shadow-sm text-slate-400 hover:text-slate-900">
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        {/* Scope Dropdown */}
                        <div className="relative">
                            <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-3 bg-white border-2 border-slate-900 rounded-xl px-4 py-2 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] transition-all active:translate-y-0 active:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
                                <div className="w-8 h-8 rounded-lg bg-green-100 border border-green-200 flex items-center justify-center text-lg">📚</div>
                                <div className="text-left mr-2">
                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Current Scope</div>
                                    <div className="font-black text-slate-900 leading-none">{selectedUnitId === 'ALL' ? '全册单词 (All Units)' : `第 ${selectedUnitId} 课`}</div>
                                </div>
                                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {dropdownOpen && (
                                <div className="absolute top-full left-0 mt-2 w-64 bg-white border-2 border-slate-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] overflow-hidden z-50">
                                    <div className="p-2 space-y-1">
                                        <button onClick={() => { setSelectedUnitId('ALL'); setDropdownOpen(false); }} className={`w-full text-left px-3 py-2 rounded-lg font-bold text-sm flex justify-between items-center ${selectedUnitId === 'ALL' ? 'bg-green-50 text-green-800 border border-green-200' : 'hover:bg-slate-50 text-slate-600'}`}>
                                            <span>📚 全册 (Level 1A)</span>
                                            <span className={`px-1.5 rounded text-[10px] ${selectedUnitId === 'ALL' ? 'bg-white border border-green-200' : 'text-slate-300'}`}>{allWords.length}</span>
                                        </button>
                                        <div className="h-px bg-slate-100 my-1" />
                                        {availableUnits.map(u => {
                                            const count = allWords.filter(w => w.unit === u).length;
                                            return (
                                                <button key={u} onClick={() => { setSelectedUnitId(u); setDropdownOpen(false); }} className={`w-full text-left px-3 py-2 rounded-lg font-medium text-sm flex justify-between items-center ${selectedUnitId === u ? 'bg-green-50 text-green-800 border border-green-200' : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'}`}>
                                                    <span>Unit {u}</span>
                                                    <span className="text-slate-300 text-xs">{count}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Mastery */}
                    <div className="hidden md:flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200">
                        <div className="text-right">
                            <div className="text-[10px] font-bold text-slate-400 uppercase">Mastery</div>
                            <div className="font-black text-sm text-slate-900">{masteryCount} / {filteredWords.length}</div>
                        </div>
                        <div className="w-10 h-10 relative">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                                <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#4ADE80" strokeWidth="4" strokeDasharray={`${(masteryCount / Math.max(filteredWords.length, 1)) * 100} 100`} />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Mode Tabs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {modeButtons.map(mode => (
                        <button key={mode.id} onClick={() => setViewMode(mode.id as ViewMode)} className={`bg-white border-2 rounded-xl p-3 flex items-center justify-center gap-2 relative overflow-hidden transition-all ${viewMode === mode.id ? 'border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]' : 'border-transparent hover:border-slate-900 shadow-sm hover:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]'}`}>
                            {viewMode === mode.id && <div className="absolute inset-0 bg-green-50 z-0" />}
                            {viewMode === mode.id && <div className="absolute bottom-0 left-0 w-full h-1 bg-[#4ADE80]" />}
                            <span className="relative z-10 text-xl">{mode.emoji}</span>
                            <span className={`relative z-10 font-black text-sm ${viewMode === mode.id ? 'text-slate-900' : 'text-slate-500'}`}>{mode.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Flashcard */}
            {viewMode === 'flashcard' && filteredWords.length > 0 && (
                <div className="w-full max-w-4xl mb-10 z-0">
                    <div className="bg-white rounded-[1.5rem] border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] overflow-hidden h-[450px] flex flex-col relative perspective-1000">
                        {/* Top Right: Unit + Star */}
                        <div className="absolute top-4 right-4 z-20 flex gap-2">
                            <span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold text-slate-400">Unit {currentCard?.unit}</span>
                            <button onClick={() => toggleStar(currentCard?.id || '')} className={`w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center ${starredIds.has(currentCard?.id || '') ? 'text-yellow-500' : 'text-slate-300'}`}>
                                <Star className="w-5 h-5" fill={starredIds.has(currentCard?.id || '') ? 'currentColor' : 'none'} />
                            </button>
                        </div>

                        {/* Card Content */}
                        <div onClick={flipCard} className="flex-1 relative cursor-pointer">
                            <div className={`card-content w-full h-full relative transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                                {/* Front */}
                                <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center backface-hidden bg-white">
                                    <h2 className="text-6xl font-black text-slate-900 mb-6">{currentCard?.korean}</h2>
                                </div>
                                {/* Back */}
                                <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center backface-hidden rotate-y-180 bg-green-50/50 p-6 overflow-y-auto">
                                    {/* POS Badge */}
                                    {currentCard?.partOfSpeech && (
                                        <div className={`mb-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${currentCard.partOfSpeech === 'VERB_TRANSITIVE' ? 'bg-blue-100 text-blue-700' :
                                            currentCard.partOfSpeech === 'VERB_INTRANSITIVE' ? 'bg-red-100 text-red-700' :
                                                currentCard.partOfSpeech === 'ADJECTIVE' ? 'bg-purple-100 text-purple-700' :
                                                    currentCard.partOfSpeech === 'NOUN' ? 'bg-green-100 text-green-700' :
                                                        currentCard.partOfSpeech === 'ADVERB' ? 'bg-orange-100 text-orange-700' :
                                                            currentCard.partOfSpeech === 'PARTICLE' ? 'bg-gray-100 text-gray-700' :
                                                                'bg-slate-100 text-slate-700'
                                            }`}>
                                            {currentCard.partOfSpeech === 'VERB_TRANSITIVE' ? 'v.t. 他动词' :
                                                currentCard.partOfSpeech === 'VERB_INTRANSITIVE' ? 'v.i. 自动词' :
                                                    currentCard.partOfSpeech === 'ADJECTIVE' ? 'adj. 形容词' :
                                                        currentCard.partOfSpeech === 'NOUN' ? 'n. 名词' :
                                                            currentCard.partOfSpeech === 'ADVERB' ? 'adv. 副词' :
                                                                currentCard.partOfSpeech === 'PARTICLE' ? 'particle 助词' :
                                                                    currentCard.partOfSpeech}
                                        </div>
                                    )}

                                    {/* Main Content */}
                                    <h3 className="font-bold text-4xl text-slate-900 mb-2">{currentCard?.english}</h3>

                                    {/* Hanja */}
                                    {currentCard?.hanja && (
                                        <p className="text-lg text-slate-500 mb-3">漢字: {currentCard.hanja}</p>
                                    )}

                                    {/* Tips Section (Yellow Background) */}
                                    {currentCard?.tips && (currentCard.tips.synonyms || currentCard.tips.antonyms || currentCard.tips.nuance) && (
                                        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg w-full max-w-md mb-3">
                                            {currentCard.tips.synonyms && currentCard.tips.synonyms.length > 0 && (
                                                <p className="text-sm text-yellow-800 mb-1">
                                                    <span className="font-bold">≈</span> {currentCard.tips.synonyms.join(', ')}
                                                </p>
                                            )}
                                            {currentCard.tips.antonyms && currentCard.tips.antonyms.length > 0 && (
                                                <p className="text-sm text-yellow-800 mb-1">
                                                    <span className="font-bold">≠</span> {currentCard.tips.antonyms.join(', ')}
                                                </p>
                                            )}
                                            {currentCard.tips.nuance && (
                                                <p className="text-sm text-yellow-700">
                                                    <span className="mr-1">💡</span>{currentCard.tips.nuance}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Example Sentence (Slate Background) */}
                                    {currentCard?.exampleSentence && (
                                        <div className="bg-slate-100 p-3 rounded-lg w-full max-w-md">
                                            <p className="text-slate-700 text-base">{currentCard.exampleSentence}</p>
                                            <p className="text-slate-500 text-sm mt-1">{currentCard.exampleTranslation}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Bottom Navigation Bar */}
                        <div className="bg-slate-100 border-t-2 border-slate-200 py-3 px-6 flex justify-between items-center text-xs font-bold text-slate-500">
                            <div className="flex items-center gap-2"><span>Space 翻转</span></div>
                            <div className="flex items-center gap-4">
                                <button onClick={goToPrev} disabled={cardIndex === 0} className="w-8 h-8 bg-white border border-slate-300 rounded-full hover:border-slate-900 disabled:opacity-30 flex items-center justify-center">
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="font-black text-slate-900">{cardIndex + 1} / {filteredWords.length}</span>
                                <button onClick={goToNext} disabled={cardIndex === filteredWords.length - 1} className="w-8 h-8 bg-white border border-slate-300 rounded-full hover:border-slate-900 disabled:opacity-30 flex items-center justify-center">
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex items-center gap-2"><span>快捷键支持</span></div>
                        </div>

                        {/* Progress Bar */}
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-200">
                            <div className="h-full bg-[#4ADE80] transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-between gap-4 mt-6 px-8">
                        <button onClick={handleDontKnow} className="flex-1 py-3 bg-white border-2 border-red-200 text-red-500 rounded-xl font-black shadow-sm hover:border-red-500 hover:shadow-md active:translate-y-1 transition-all">
                            ✕ 不认识
                        </button>
                        <button onClick={handleKnow} className="flex-1 py-3 bg-white border-2 border-green-200 text-green-600 rounded-xl font-black shadow-sm hover:border-green-500 hover:shadow-md active:translate-y-1 transition-all">
                            ✓ 认识
                        </button>
                    </div>
                </div>
            )}

            {/* Quick Learn List Mode */}
            {viewMode === 'list' && (
                <div className="w-full max-w-4xl">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-2xl font-black text-slate-900">
                            快速学习 <span className="text-slate-400 text-lg font-normal ml-2">({filteredWords.length})</span>
                        </h3>
                        <div className="text-xs font-bold bg-green-100 text-green-700 px-3 py-1 rounded-full border border-green-200">
                            点击例句揭示单词
                        </div>
                    </div>

                    <div className="space-y-3">
                        {filteredWords.map((word) => {
                            const isRevealed = masteredIds.has(word.id);

                            // Replace Korean word in example sentence with masked version
                            const maskedSentence = word.exampleSentence?.replace(
                                word.korean,
                                isRevealed ? word.korean : '█'.repeat(word.korean.length)
                            ) || '';

                            const handleReveal = () => {
                                if (!isRevealed) {
                                    setMasteredIds(prev => new Set([...prev, word.id]));
                                    // TTS: speak word first, then sentence
                                    speakWord(word.korean);
                                    setTimeout(() => {
                                        speakWord(word.exampleSentence || '');
                                    }, 800);
                                }
                            };

                            return (
                                <div
                                    key={word.id}
                                    onClick={handleReveal}
                                    className={`bg-white rounded-2xl border-2 p-5 cursor-pointer transition-all ${isRevealed
                                            ? 'border-green-300 bg-green-50/50'
                                            : 'border-slate-200 hover:border-slate-400 hover:shadow-md'
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            {/* Word + Meaning Row */}
                                            <div className="flex items-center gap-3 mb-3">
                                                <span className={`text-2xl font-black transition-all ${isRevealed ? 'text-green-600' : 'text-slate-900'
                                                    }`}>
                                                    {word.korean}
                                                </span>
                                                {isRevealed && (
                                                    <span className="text-slate-500 text-lg">{word.english}</span>
                                                )}
                                                {word.partOfSpeech && isRevealed && (
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${word.partOfSpeech === 'VERB_TRANSITIVE' ? 'bg-blue-100 text-blue-700' :
                                                            word.partOfSpeech === 'VERB_INTRANSITIVE' ? 'bg-red-100 text-red-700' :
                                                                word.partOfSpeech === 'ADJECTIVE' ? 'bg-purple-100 text-purple-700' :
                                                                    word.partOfSpeech === 'NOUN' ? 'bg-green-100 text-green-700' :
                                                                        'bg-slate-100 text-slate-700'
                                                        }`}>
                                                        {word.partOfSpeech === 'VERB_TRANSITIVE' ? 'v.t.' :
                                                            word.partOfSpeech === 'VERB_INTRANSITIVE' ? 'v.i.' :
                                                                word.partOfSpeech === 'ADJECTIVE' ? 'adj.' :
                                                                    word.partOfSpeech === 'NOUN' ? 'n.' :
                                                                        word.partOfSpeech}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Example Sentence with Masked Word */}
                                            <div className={`p-3 rounded-xl transition-all ${isRevealed ? 'bg-slate-100' : 'bg-slate-50'
                                                }`}>
                                                <p className={`text-lg leading-relaxed ${isRevealed ? 'text-slate-800' : 'text-slate-600'
                                                    }`}>
                                                    {maskedSentence || '例句待添加'}
                                                </p>
                                                {isRevealed && word.exampleTranslation && (
                                                    <p className="text-sm text-slate-500 mt-1">{word.exampleTranslation}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Status Indicator */}
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all ${isRevealed
                                                ? 'bg-green-500 text-white'
                                                : 'bg-slate-100 text-slate-400'
                                            }`}>
                                            {isRevealed ? '✓' : '?'}
                                        </div>
                                    </div>

                                    {/* Hint */}
                                    {!isRevealed && (
                                        <p className="text-xs text-slate-400 mt-3 text-center">点击揭示答案并播放发音</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Quiz Mode */}
            {viewMode === 'quiz' && (
                <div className="w-full max-w-4xl">
                    <VocabQuiz
                        key={`quiz-${selectedUnitId}-${gameWords.length}`}
                        words={gameWords}
                        onComplete={(stats) => console.log('Quiz completed:', stats)}
                    />
                </div>
            )}

            {/* Match Mode */}
            {viewMode === 'match' && (
                <div className="w-full max-w-4xl">
                    <VocabMatch
                        key={`match-${selectedUnitId}-${gameWords.length}`}
                        words={gameWords}
                        onComplete={(time, moves) => console.log('Match completed:', time, moves)}
                    />
                </div>
            )}

            <style>{`
                .perspective-1000 { perspective: 1000px; }
                .transform-style-3d { transform-style: preserve-3d; }
                .backface-hidden { backface-visibility: hidden; }
                .rotate-y-180 { transform: rotateY(180deg); }
            `}</style>
        </div>
    );
}
