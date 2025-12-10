import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../../../services/api';
import { CanvasData } from '../components/CanvasLayer';

interface UseCanvasAnnotationOptions {
    targetId: string;
    targetType: 'TEXTBOOK' | 'EXAM';
    pageIndex: number;
    debounceMs?: number;  // 防抖延迟，默认 1000ms
    autoSave?: boolean;   // 是否自动保存，默认 true
}

interface UseCanvasAnnotationReturn {
    // 数据
    canvasData: CanvasData | null;
    loading: boolean;
    saving: boolean;
    error: Error | null;

    // 操作
    handleCanvasChange: (data: CanvasData) => void;
    handleCanvasSave: (data: CanvasData) => void;
    refresh: () => Promise<void>;
}

/**
 * useCanvasAnnotation - 画板笔记 Hook
 * 
 * 功能：
 * - 翻页时自动获取当前页的笔记数据
 * - 支持防抖保存，避免频繁请求
 * - 自动保存 / 手动保存
 */
export const useCanvasAnnotation = (
    options: UseCanvasAnnotationOptions
): UseCanvasAnnotationReturn => {
    const {
        targetId,
        targetType,
        pageIndex,
        debounceMs = 1000,
        autoSave = true
    } = options;

    // 状态
    const [canvasData, setCanvasData] = useState<CanvasData | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // 防抖定时器
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // 保存待保存的数据（用于防抖）
    const pendingDataRef = useRef<CanvasData | null>(null);

    // 获取笔记数据
    const fetchAnnotation = useCallback(async () => {
        if (!targetId) return;

        setLoading(true);
        setError(null);

        try {
            const annotations = await api.getCanvasAnnotations({
                targetId,
                targetType,
                pageIndex,
            });

            // 取第一条（同一页应该只有一条记录）
            if (annotations && annotations.length > 0) {
                const annotation = annotations[0];
                setCanvasData(annotation.data as CanvasData);
            } else {
                setCanvasData(null);
            }
        } catch (err) {
            console.error('Failed to fetch canvas annotation:', err);
            setError(err instanceof Error ? err : new Error('Failed to fetch annotation'));
            setCanvasData(null);
        } finally {
            setLoading(false);
        }
    }, [targetId, targetType, pageIndex]);

    // 保存笔记数据（实际执行）
    const doSave = useCallback(async (data: CanvasData) => {
        if (!targetId) return;

        setSaving(true);
        setError(null);

        try {
            await api.saveCanvasAnnotation({
                targetId,
                targetType,
                pageIndex,
                data,
                visibility: 'PRIVATE',
            });
            console.log('[useCanvasAnnotation] Saved successfully');
        } catch (err) {
            console.error('Failed to save canvas annotation:', err);
            setError(err instanceof Error ? err : new Error('Failed to save annotation'));
        } finally {
            setSaving(false);
        }
    }, [targetId, targetType, pageIndex]);

    // 防抖保存
    const debouncedSave = useCallback((data: CanvasData) => {
        pendingDataRef.current = data;

        // 清除之前的定时器
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        // 设置新的定时器
        debounceTimerRef.current = setTimeout(() => {
            if (pendingDataRef.current) {
                doSave(pendingDataRef.current);
                pendingDataRef.current = null;
            }
        }, debounceMs);
    }, [doSave, debounceMs]);

    // 处理画板变化（自动保存时使用防抖）
    const handleCanvasChange = useCallback((data: CanvasData) => {
        setCanvasData(data);

        if (autoSave) {
            debouncedSave(data);
        }
    }, [autoSave, debouncedSave]);

    // 手动保存（立即执行，不防抖）
    const handleCanvasSave = useCallback((data: CanvasData) => {
        // 清除待执行的防抖保存
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }
        pendingDataRef.current = null;

        // 立即保存
        doSave(data);
    }, [doSave]);

    // 刷新数据
    const refresh = useCallback(async () => {
        await fetchAnnotation();
    }, [fetchAnnotation]);

    // 翻页时自动获取数据
    useEffect(() => {
        fetchAnnotation();
    }, [fetchAnnotation]);

    // 组件卸载时清理定时器，并保存未保存的数据
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            // 保存待保存的数据
            if (pendingDataRef.current) {
                doSave(pendingDataRef.current);
            }
        };
    }, [doSave]);

    return {
        canvasData,
        loading,
        saving,
        error,
        handleCanvasChange,
        handleCanvasSave,
        refresh,
    };
};

export default useCanvasAnnotation;
