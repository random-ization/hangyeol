import React from 'react';
import { X, Check, BookOpen } from 'lucide-react';

interface AnnotationMenuProps {
    visible: boolean;
    position: { top: number; left: number } | null;
    selectionText?: string;
    noteInput: string;
    setNoteInput: (val: string) => void;
    selectedColor: string;
    setSelectedColor: (val: string) => void;
    onSave: () => void;
    onCancel: () => void;
    onSaveWord?: (text: string) => void;
    labels: { [key: string]: string };
}

const COLORS = [
    { name: 'yellow', bgClass: 'bg-yellow-300', ringClass: 'ring-yellow-500' },
    { name: 'green', bgClass: 'bg-green-300', ringClass: 'ring-green-500' },
    { name: 'blue', bgClass: 'bg-blue-300', ringClass: 'ring-blue-500' },
    { name: 'pink', bgClass: 'bg-pink-300', ringClass: 'ring-pink-500' },
];

const AnnotationMenu: React.FC<AnnotationMenuProps> = ({
    visible,
    position,
    selectionText,
    noteInput,
    setNoteInput,
    selectedColor,
    setSelectedColor,
    onSave,
    onCancel,
    labels,
}) => {
    if (!visible || !position) return null;

    return (
        <div
            className="annotation-menu fixed z-50 bg-white shadow-xl border border-slate-200 rounded-xl p-4 w-72 animate-in zoom-in-95 duration-200"
            style={{
                top: `${position.top}px`,
                left: `${position.left}px`,
                transform: 'translate(-50%, -100%)',
            }}
        >
            <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-slate-700 text-sm">{labels.annotate || 'Annotate'}</h4>
                <button
                    onClick={onCancel}
                    className="text-slate-400 hover:text-slate-600"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {selectionText && (
                <div className="text-xs text-slate-500 mb-3 italic border-l-2 border-yellow-400 pl-2 line-clamp-2">
                    "{selectionText}"
                </div>
            )}

            <div className="mb-3">
                <textarea
                    value={noteInput}
                    onChange={e => setNoteInput(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
                    rows={3}
                    placeholder={labels.addNote || 'Add a note...'}
                    autoFocus
                />
            </div>

            <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-slate-500">Color:</span>
                <div className="flex gap-1">
                    {COLORS.map((color) => (
                        <button
                            key={color.name}
                            onClick={() => setSelectedColor(color.name)}
                            className={`w-6 h-6 rounded-full ${color.bgClass} transition-all ${selectedColor === color.name ? `ring-2 ${color.ringClass} ring-offset-1` : 'hover:scale-110'
                                }`}
                            title={color.name}
                        />
                    ))}
                </div>
            </div>

            <div className="flex justify-end gap-2">
                <button
                    onClick={onCancel}
                    className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600"
                >
                    {labels.cancel || 'Cancel'}
                </button>
                <button
                    onClick={onSave}
                    className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1"
                >
                    <Check className="w-3 h-3" />
                    {labels.save || 'Save'}
                </button>
            </div>
        </div>
    );
};

export default AnnotationMenu;
