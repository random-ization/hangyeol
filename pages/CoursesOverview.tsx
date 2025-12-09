import React from 'react';
import { Language } from '../types';

interface CoursesOverviewProps {
    language: Language;
}

const CoursesOverview: React.FC<CoursesOverviewProps> = ({ language }) => {
    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-4xl mx-auto px-4 py-16">
                <h1 className="text-4xl font-bold text-slate-900 mb-8">课程体系介绍</h1>
                <p className="text-lg text-slate-600">
                    该页面正在建设中，敬请期待...
                </p>
            </div>
        </div>
    );
};

export default CoursesOverview;
