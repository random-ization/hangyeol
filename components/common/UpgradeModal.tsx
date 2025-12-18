import React from 'react';
import { useNavigate } from 'react-router-dom';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    message?: string;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({
    isOpen,
    onClose,
    title = 'Pro Member Content',
    message = 'This content is exclusive to Pro members. Upgrade to unlock all lessons and exams.',
}) => {
    const navigate = useNavigate();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header with gradient */}
                <div className="px-6 py-6 bg-gradient-to-r from-indigo-500 to-purple-600">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-white/20 rounded-full backdrop-blur-md">
                            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                    </div>
                    <h3 className="text-xl font-bold text-center text-white">{title}</h3>
                </div>

                {/* Body */}
                <div className="px-6 py-6 space-y-4">
                    <p className="text-center text-gray-600 dark:text-gray-300">
                        {message}
                    </p>

                    <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                        <li className="flex items-center space-x-2">
                            <span className="text-green-500">✓</span>
                            <span>Unlock all 800+ lessons</span>
                        </li>
                        <li className="flex items-center space-x-2">
                            <span className="text-green-500">✓</span>
                            <span>Unlimited TOPIK past exams (35-64)</span>
                        </li>
                        <li className="flex items-center space-x-2">
                            <span className="text-green-500">✓</span>
                            <span>Advanced note-taking & cloud sync</span>
                        </li>
                    </ul>

                    <div className="pt-2 flex flex-col gap-3">
                        <button
                            onClick={() => {
                                onClose();
                                navigate('/pricing');
                            }}
                            className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-indigo-500/30 active:scale-[0.98]"
                        >
                            Upgrade Now
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full py-2.5 px-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-medium transition-colors"
                        >
                            Maybe Later
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpgradeModal;
