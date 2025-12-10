import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import Konva from 'konva';

// 工具类型
export type ToolType = 'pen' | 'highlighter' | 'eraser';

// 单条线的数据结构
export interface LineData {
    id: string;
    tool: ToolType;
    points: number[];
    color: string;
    strokeWidth: number;
    opacity: number;
}

// 画板数据结构
export interface CanvasData {
    lines: LineData[];
    version: number;
}

interface CanvasLayerProps {
    // 数据
    data?: CanvasData | null;

    // 回调
    onSave?: (data: CanvasData) => void;
    onChange?: (data: CanvasData) => void;

    // 模式
    readOnly?: boolean;

    // 工具设置（外部控制）
    tool?: ToolType;
    color?: string;
    strokeWidth?: number;

    // 样式
    className?: string;
}

// 默认颜色
const DEFAULT_COLORS = {
    pen: '#1e293b',        // 深灰色
    highlighter: '#fde047', // 黄色高亮
    eraser: '#ffffff',
};

// 默认线宽
const DEFAULT_STROKE_WIDTH = {
    pen: 2,
    highlighter: 20,
    eraser: 20,
};

// 默认透明度
const DEFAULT_OPACITY = {
    pen: 1,
    highlighter: 0.4,
    eraser: 1,
};

/**
 * CanvasLayer - 通用画板组件
 * 
 * 使用 react-konva 实现的透明画板，支持：
 * - 普通画笔 (Pen)
 * - 高亮笔 (Highlighter, 半透明粗线)
 * - 橡皮擦 (Eraser)
 */
const CanvasLayer: React.FC<CanvasLayerProps> = ({
    data,
    onSave,
    onChange,
    readOnly = false,
    tool = 'pen',
    color,
    strokeWidth,
    className = '',
}) => {
    // 容器尺寸
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    // 画线状态
    const [lines, setLines] = useState<LineData[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const stageRef = useRef<Konva.Stage>(null);

    // 初始化数据
    useEffect(() => {
        if (data?.lines) {
            setLines(data.lines);
        }
    }, [data]);

    // 监听容器尺寸变化
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const { offsetWidth, offsetHeight } = containerRef.current;
                setDimensions({ width: offsetWidth, height: offsetHeight });
            }
        };

        updateDimensions();

        const resizeObserver = new ResizeObserver(updateDimensions);
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    // 获取当前工具的样式
    const getCurrentStyle = useCallback(() => {
        return {
            color: color || DEFAULT_COLORS[tool],
            strokeWidth: strokeWidth || DEFAULT_STROKE_WIDTH[tool],
            opacity: DEFAULT_OPACITY[tool],
        };
    }, [tool, color, strokeWidth]);

    // 生成唯一 ID
    const generateId = () => `line-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 通知数据变化
    const notifyChange = useCallback((newLines: LineData[]) => {
        const newData: CanvasData = {
            lines: newLines,
            version: Date.now(),
        };
        onChange?.(newData);
    }, [onChange]);

    // 鼠标按下 - 开始画线
    const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        if (readOnly) return;

        setIsDrawing(true);
        const pos = e.target.getStage()?.getPointerPosition();
        if (!pos) return;

        const style = getCurrentStyle();
        const newLine: LineData = {
            id: generateId(),
            tool,
            points: [pos.x, pos.y],
            color: style.color,
            strokeWidth: style.strokeWidth,
            opacity: style.opacity,
        };

        setLines(prev => [...prev, newLine]);
    };

    // 鼠标移动 - 继续画线
    const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        if (!isDrawing || readOnly) return;

        const stage = e.target.getStage();
        const pos = stage?.getPointerPosition();
        if (!pos) return;

        setLines(prev => {
            const lastLine = prev[prev.length - 1];
            if (!lastLine) return prev;

            const newPoints = [...lastLine.points, pos.x, pos.y];
            const updated = prev.slice(0, -1);
            updated.push({ ...lastLine, points: newPoints });
            return updated;
        });
    };

    // 鼠标抬起 - 结束画线
    const handleMouseUp = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        notifyChange(lines);
    };

    // 清空画板
    const handleClear = useCallback(() => {
        setLines([]);
        notifyChange([]);
    }, [notifyChange]);

    // 撤销
    const handleUndo = useCallback(() => {
        setLines(prev => {
            const newLines = prev.slice(0, -1);
            notifyChange(newLines);
            return newLines;
        });
    }, [notifyChange]);

    // 保存
    const handleSave = useCallback(() => {
        const canvasData: CanvasData = {
            lines,
            version: Date.now(),
        };
        onSave?.(canvasData);
    }, [lines, onSave]);

    // 暴露方法给父组件
    useEffect(() => {
        // 可以通过 ref 暴露更多方法
    }, []);

    return (
        <div
            ref={containerRef}
            className={`absolute inset-0 ${className}`}
            style={{
                pointerEvents: readOnly ? 'none' : 'auto',
                touchAction: 'none', // 防止触摸滚动
            }}
        >
            <Stage
                ref={stageRef}
                width={dimensions.width}
                height={dimensions.height}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleMouseDown}
                onTouchMove={handleMouseMove}
                onTouchEnd={handleMouseUp}
                style={{
                    cursor: readOnly ? 'default' : (tool === 'eraser' ? 'cell' : 'crosshair'),
                }}
            >
                <Layer>
                    {lines.map((line) => (
                        <Line
                            key={line.id}
                            points={line.points}
                            stroke={line.color}
                            strokeWidth={line.strokeWidth}
                            opacity={line.opacity}
                            tension={0.5}
                            lineCap="round"
                            lineJoin="round"
                            globalCompositeOperation={
                                line.tool === 'eraser' ? 'destination-out' : 'source-over'
                            }
                        />
                    ))}
                </Layer>
            </Stage>
        </div>
    );
};

// 导出工具栏组件
export interface CanvasToolbarProps {
    tool: ToolType;
    onToolChange: (tool: ToolType) => void;
    color: string;
    onColorChange: (color: string) => void;
    onUndo: () => void;
    onClear: () => void;
    onSave?: () => void;
    disabled?: boolean;
}

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
    tool,
    onToolChange,
    color,
    onColorChange,
    onUndo,
    onClear,
    onSave,
    disabled = false,
}) => {
    const colors = ['#1e293b', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6'];
    const highlightColors = ['#fde047', '#86efac', '#93c5fd', '#fca5a5'];

    return (
        <div className="flex items-center gap-2 p-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-slate-200">
            {/* 工具切换 */}
            <div className="flex bg-slate-100 rounded-lg p-0.5">
                <button
                    onClick={() => onToolChange('pen')}
                    disabled={disabled}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${tool === 'pen'
                            ? 'bg-white shadow-sm text-indigo-600'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    ✏️ 画笔
                </button>
                <button
                    onClick={() => onToolChange('highlighter')}
                    disabled={disabled}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${tool === 'highlighter'
                            ? 'bg-white shadow-sm text-yellow-600'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    🖍️ 高亮
                </button>
                <button
                    onClick={() => onToolChange('eraser')}
                    disabled={disabled}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${tool === 'eraser'
                            ? 'bg-white shadow-sm text-red-600'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    🧹 橡皮
                </button>
            </div>

            {/* 分隔线 */}
            <div className="w-px h-6 bg-slate-200" />

            {/* 颜色选择 */}
            <div className="flex gap-1">
                {(tool === 'highlighter' ? highlightColors : colors).map(c => (
                    <button
                        key={c}
                        onClick={() => onColorChange(c)}
                        disabled={disabled || tool === 'eraser'}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${color === c ? 'border-indigo-500 scale-110' : 'border-transparent hover:scale-105'
                            } ${tool === 'eraser' ? 'opacity-30' : ''}`}
                        style={{ backgroundColor: c }}
                    />
                ))}
            </div>

            {/* 分隔线 */}
            <div className="w-px h-6 bg-slate-200" />

            {/* 操作按钮 */}
            <button
                onClick={onUndo}
                disabled={disabled}
                className="px-2 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-all"
            >
                ↩️ 撤销
            </button>
            <button
                onClick={onClear}
                disabled={disabled}
                className="px-2 py-1.5 text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-all"
            >
                🗑️ 清空
            </button>

            {onSave && (
                <button
                    onClick={onSave}
                    disabled={disabled}
                    className="px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-all shadow-sm"
                >
                    💾 保存
                </button>
            )}
        </div>
    );
};

export default CanvasLayer;
