import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { useAnnotation } from '../../../hooks/useAnnotation';
import { generateReadingPassage } from '../../../services/geminiService';
import TextbookViewer from './components/TextbookViewer';
import AnnotationMenu from '../../../components/AnnotationMenu';
import { CanvasToolbar, ToolType } from '../annotation/components/CanvasLayer';
import { useCanvasAnnotation } from '../annotation/hooks/useCanvasAnnotation';
import {
    CourseSelection,
    ReadingContent,
    Language,
    TextbookContent,
    Annotation
} from '../../../types';
import { getLabels } from '../../../utils/i18n';
import {
    ChevronRight,
    ChevronLeft,
    BookOpen,
    ArrowLeft,
    Type,
    Languages,
    Highlighter,
    MessageSquare,
    Trash2,
    Check,
    Pencil,
    X,
} from 'lucide-react';

interface SelfStudyContainerProps {
    course: CourseSelection;
    instituteName: string;
    onSaveWord: (word: string, meaning: string) => void;
    onSaveAnnotation: (annotation: Annotation) => void;
    savedWordKeys: string[];
    annotations: Annotation[];
    language: Language;
    levelContexts: Record<number, TextbookContent>;
}

/**
 * SelfStudyContainer - 逻辑容器组件
 * 
 * 职责：
 * - 管理页面状态 (pageIndex)
 * - 通过 useApi 获取教材数据
 * - 管理标注状态
 * - 将数据传递给 TextbookViewer 展示
 */
const SelfStudyContainer: React.FC<SelfStudyContainerProps> = ({
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
    const labels = getLabels(language);

    // 页面状态
    const [pageIndex, setPageIndex] = useState(0);
    const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');
    const [showTranslation, setShowTranslation] = useState(false);

    // 句子悬停状态（用于翻译对照）
    const [hoveredSentenceIndex, setHoveredSentenceIndex] = useState<number | null>(null);

    // 侧边栏标注编辑状态
    const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
    const [editNoteInput, setEditNoteInput] = useState('');
    const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);
    const [hoveredAnnotationId, setHoveredAnnotationId] = useState<string | null>(null);

    // 画板模式状态
    const [canvasEnabled, setCanvasEnabled] = useState(false);
    const [canvasTool, setCanvasTool] = useState<ToolType>('pen');
    const [canvasColor, setCanvasColor] = useState('#1e293b');

    // 设置活动单元
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
        setPageIndex(0); // 切换单元时重置页码
    };

    // 上下文 Key
    const contextKey = activeUnit
        ? `${course.instituteId}-${course.level}-${activeUnit}-READING`
        : '';

    // 使用 useApi 获取教材数据
    const { data: passage, loading, execute: fetchPassage } = useApi<ReadingContent | null>(
        generateReadingPassage
    );

    // 当单元改变时获取数据
    useEffect(() => {
        if (activeUnit) {
            const content = levelContexts[activeUnit];
            fetchPassage(instituteName, course.level, activeUnit, language, content);
        }
    }, [activeUnit, instituteName, course.level, language, levelContexts, fetchPassage]);

    // Canvas 画板笔记 Hook - 带防抖保存
    const {
        canvasData,
        loading: canvasLoading,
        saving: canvasSaving,
        handleCanvasChange,
        handleCanvasSave,
    } = useCanvasAnnotation({
        targetId: contextKey,
        targetType: 'TEXTBOOK',
        pageIndex,
        debounceMs: 1000,  // 1秒防抖
        autoSave: true,
    });

    // 标注 Hook
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
        currentSelectionRange,
    } = useAnnotation(contextKey, annotations, onSaveAnnotation);

    // 处理文本选择
    const handleTextSelection = (e: React.MouseEvent) => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
            setActiveAnnotationId(null);
            setEditingAnnotationId(null);
        }
        originalHandleTextSelection(e);
    };

    // 当前页的标注
    const currentAnnotations = annotations
        .filter(a => a.contextKey === contextKey && a.startOffset !== undefined && a.endOffset !== undefined)
        .sort((a, b) => (a.startOffset || 0) - (b.startOffset || 0));

    // 侧边栏显示的标注（有笔记的）
    const sidebarAnnotations = currentAnnotations.filter(
        a => (a.note && a.note.trim().length > 0) || a.id === editingAnnotationId
    );

    // 句子范围（用于翻译对照）
    const sentenceRanges = useMemo(() => {
        if (!passage?.koreanText) return [];
        const ranges: { start: number; end: number }[] = [];
        const regex = /[^.!?\n]+[.!?\n]*/g;
        let match;
        while ((match = regex.exec(passage.koreanText)) !== null) {
            ranges.push({ start: match.index, end: match.index + match[0].length });
        }
        return ranges;
    }, [passage]);

    // 翻译句子列表
    const translationSentences = useMemo(() => {
        if (!passage?.englishTranslation) return [];
        return passage.englishTranslation.match(/[^.!?\n]+[.!?\n]*/g) || [passage.englishTranslation];
    }, [passage]);

    // 处理标注点击
    const handleAnnotationClick = (annotationId: string) => {
        setActiveAnnotationId(annotationId);
        const el = document.getElementById(`sidebar-card-${annotationId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    // 删除标注
    const handleDeleteAnnotation = (id: string) => {
        const ann = currentAnnotations.find(a => a.id === id);
        if (ann) {
            onSaveAnnotation({ ...ann, color: null, note: '' });
        }
    };

    // 更新笔记
    const handleUpdateNote = (id: string) => {
        const ann = currentAnnotations.find(a => a.id === id);
        if (ann) {
            onSaveAnnotation({ ...ann, note: editNoteInput });
        }
        setEditingAnnotationId(null);
        setActiveAnnotationId(null);
    };

    // 翻页控制
    const totalPages = 1; // 目前每个单元只有一页，后续可扩展
    const canGoPrev = pageIndex > 0;
    const canGoNext = pageIndex < totalPages - 1;

    const goToPrevPage = () => {
        if (canGoPrev) setPageIndex(prev => prev - 1);
    };

    const goToNextPage = () => {
        if (canGoNext) setPageIndex(prev => prev + 1);
    };

    // --- 目录视图 ---
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
                            return (
                                <button
                                    key={u}
                                    onClick={() => setActiveUnit(u)}
                                    className="group relative w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all text-left flex justify-between items-center overflow-hidden"
                                >
                                    <div className="absolute inset-y-0 left-0 w-1 bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
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

    // --- 加载视图 ---
    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center">
                <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
                <p className="text-slate-500 font-medium animate-pulse">{labels.loadingReading}</p>
            </div>
        );
    }

    // --- 阅读视图 ---
    return (
        <div className="h-[calc(100vh-100px)] flex flex-col w-full max-w-[1800px] mx-auto relative bg-slate-50">
            {/* 顶部工具栏 */}
            <div className="flex items-center justify-between py-4 px-6 bg-white border-b border-slate-200 shrink-0 sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setActiveUnit(null)}
                        className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold transition-colors px-3 py-1.5 hover:bg-slate-50 rounded-lg"
                    >
                        <ArrowLeft className="w-4 h-4" /> {labels.backToList}
                    </button>
                    <div className="h-6 w-px bg-slate-200" />
                    <div className="flex items-baseline gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            {labels.unit} {activeUnit}
                        </span>
                        <h1 className="text-lg font-bold text-slate-800 truncate max-w-md">
                            {passage?.title || labels.readingPassage}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* 翻页控制 */}
                    {totalPages > 1 && (
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 mr-2">
                            <button
                                onClick={goToPrevPage}
                                disabled={!canGoPrev}
                                className={`p-1.5 rounded ${canGoPrev ? 'text-slate-600 hover:bg-white' : 'text-slate-300 cursor-not-allowed'}`}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="px-2 text-sm font-medium text-slate-600">
                                {pageIndex + 1} / {totalPages}
                            </span>
                            <button
                                onClick={goToNextPage}
                                disabled={!canGoNext}
                                className={`p-1.5 rounded ${canGoNext ? 'text-slate-600 hover:bg-white' : 'text-slate-300 cursor-not-allowed'}`}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* 字体大小切换 */}
                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 mr-2">
                        <button
                            onClick={() => setFontSize('sm')}
                            className={`p-1.5 rounded ${fontSize === 'sm' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Type className="w-3 h-3" />
                        </button>
                        <button
                            onClick={() => setFontSize('base')}
                            className={`p-1.5 rounded ${fontSize === 'base' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Type className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setFontSize('lg')}
                            className={`p-1.5 rounded ${fontSize === 'lg' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Type className="w-5 h-5" />
                        </button>
                    </div>

                    {/* 翻译切换 */}
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

                    {/* 画板模式切换 */}
                    <button
                        onClick={() => setCanvasEnabled(!canvasEnabled)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${canvasEnabled
                            ? 'bg-amber-500 text-white shadow-md shadow-amber-200'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        {canvasEnabled ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                        {canvasEnabled ? '退出画板' : '板书'}
                    </button>
                </div>
            </div>

            {/* 画板工具栏 - 固定在底部 */}
            {canvasEnabled && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
                    <CanvasToolbar
                        tool={canvasTool}
                        onToolChange={setCanvasTool}
                        color={canvasColor}
                        onColorChange={setCanvasColor}
                        onUndo={() => {/* TODO: 实现撤销 */ }}
                        onClear={() => handleCanvasChange({ lines: [], version: Date.now() })}
                        onSave={() => canvasData && handleCanvasSave(canvasData)}
                        disabled={canvasSaving}
                    />
                    {canvasSaving && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                            保存中...
                        </div>
                    )}
                </div>
            )}

            <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* 主内容区域 */}
                <div className="flex-1 overflow-y-auto p-6 md:p-10 relative">
                    <TextbookViewer
                        content={passage?.koreanText || ''}
                        translation={passage?.englishTranslation}
                        title={passage?.title}
                        pageIndex={pageIndex}
                        fontSize={fontSize}
                        showTranslation={showTranslation}
                        annotations={currentAnnotations}
                        activeAnnotationId={activeAnnotationId}
                        hoveredAnnotationId={hoveredAnnotationId}
                        hoveredSentenceIndex={hoveredSentenceIndex}
                        sentenceRanges={sentenceRanges}
                        translationSentences={translationSentences}
                        onAnnotationClick={handleAnnotationClick}
                        onSentenceHover={setHoveredSentenceIndex}
                        contentRef={contentRef}
                        onTextSelection={canvasEnabled ? undefined : handleTextSelection}
                        selectedColor={selectedColor}
                        // Canvas 画板相关
                        canvasEnabled={canvasEnabled}
                        canvasData={canvasData}
                        onCanvasChange={handleCanvasChange}
                        onCanvasSave={handleCanvasSave}
                        canvasTool={canvasTool}
                        canvasColor={canvasColor}
                        canvasReadOnly={false}
                    />
                </div>

                {/* 右侧边栏 - 笔记 */}
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
                                        className={`group p-4 rounded-xl border transition-all cursor-pointer relative scroll-mt-24 ${isActive || isEditing
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
                                        onMouseEnter={() => setHoveredAnnotationId(ann.id)}
                                        onMouseLeave={() => setHoveredAnnotationId(null)}
                                    >
                                        <div className="flex items-start gap-2 mb-2">
                                            <div
                                                className={`w-1.5 h-1.5 mt-1.5 rounded-full shrink-0 ${{
                                                    yellow: 'bg-yellow-400',
                                                    green: 'bg-green-400',
                                                    blue: 'bg-blue-400',
                                                    pink: 'bg-pink-400',
                                                }[ann.color || 'yellow'] || 'bg-yellow-400'}`}
                                            />
                                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider line-clamp-1 flex-1">
                                                {ann.text}
                                            </div>
                                        </div>

                                        {isEditing ? (
                                            <div className="mt-2 animate-in fade-in zoom-in-95 duration-200">
                                                <textarea
                                                    value={editNoteInput}
                                                    onChange={e => setEditNoteInput(e.target.value)}
                                                    className="w-full border border-slate-200 rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none mb-3 bg-slate-50"
                                                    rows={3}
                                                    autoFocus
                                                    placeholder="输入笔记内容..."
                                                    onClick={e => e.stopPropagation()}
                                                />
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            setEditingAnnotationId(null);
                                                        }}
                                                        className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                                                    >
                                                        {labels.cancel}
                                                    </button>
                                                    <button
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            handleUpdateNote(ann.id);
                                                        }}
                                                        className="px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-1.5 transition-colors shadow-sm"
                                                    >
                                                        <Check className="w-3 h-3" /> {labels.save}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                {ann.note ? (
                                                    <p className="text-sm text-slate-800 leading-relaxed pl-3.5 border-l-2 border-slate-100">
                                                        {ann.note}
                                                    </p>
                                                ) : (
                                                    <p className="text-xs text-slate-400 italic pl-3.5">
                                                        {labels.clickToAddNote}
                                                    </p>
                                                )}
                                                <button
                                                    onClick={e => {
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

            {/* 标注菜单 */}
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
                onHighlight={color => saveAnnotation(color, undefined, true)}
                selectedColor={selectedColor}
                setSelectedColor={setSelectedColor}
                onSaveWord={text => {
                    onSaveWord(text, '');
                    cancelAnnotation();
                }}
                onClose={cancelAnnotation}
                onDelete={deleteAnnotation}
                labels={labels}
            />
        </div>
    );
};

export default SelfStudyContainer;
