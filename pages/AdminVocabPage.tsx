import React, { useState } from 'react';
import { LayoutDashboard, FileSpreadsheet } from 'lucide-react';
import VocabDashboard from '../components/admin/VocabDashboard';
import VocabImporter from '../components/admin/VocabImporter';

export default function AdminVocabPage() {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'import'>('dashboard');

    return (
        <div className="p-8 max-w-[1600px] mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 mb-2">词汇库管理</h1>
                    <p className="text-slate-500 font-medium">管理所有课程的词汇资产，支持批量导入和 TTS 生成</p>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-4 mb-8">
                <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold border-2 transition-all ${activeTab === 'dashboard'
                            ? 'bg-slate-900 border-slate-900 text-white shadow-[4px_4px_0px_0px_rgba(15,23,42,0.3)]'
                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-900 hover:text-slate-900'
                        }`}
                >
                    <LayoutDashboard className="w-5 h-5" />
                    资产大盘
                </button>
                <button
                    onClick={() => setActiveTab('import')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold border-2 transition-all ${activeTab === 'import'
                            ? 'bg-slate-900 border-slate-900 text-white shadow-[4px_4px_0px_0px_rgba(15,23,42,0.3)]'
                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-900 hover:text-slate-900'
                        }`}
                >
                    <FileSpreadsheet className="w-5 h-5" />
                    智能导入
                </button>
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-3xl border-2 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] overflow-hidden min-h-[600px]">
                {activeTab === 'dashboard' ? <VocabDashboard /> : <VocabImporter />}
            </div>
        </div>
    );
}
