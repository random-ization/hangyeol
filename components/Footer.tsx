import React from 'react';
import { Language } from '../types';
import { getLabels } from '../utils/i18n';

interface FooterProps {
  language: Language;
  onNavigate: (page: string) => void;
}

const Footer: React.FC<FooterProps> = ({ language, onNavigate }) => {
  const labels = getLabels(language);
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white py-12 border-t border-slate-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2">
          <img src="/logo.jpg" alt="Logo" className="w-8 h-8 rounded-lg" />
          <span className="font-bold text-slate-900">{labels.appName}</span>
        </div>

        <div className="text-slate-500 text-sm">
          © {currentYear} DuHan Learning. {labels.allRightsReserved}
        </div>

        <div className="flex gap-6 text-sm font-medium text-slate-600">
          <button
            onClick={() => onNavigate('privacy')}
            className="hover:text-indigo-600 transition-colors"
          >
            {labels.privacyPolicy}
          </button>
          <button
            onClick={() => onNavigate('terms')}
            className="hover:text-indigo-600 transition-colors"
          >
            {labels.termsOfService}
          </button>
          <button
            onClick={() => onNavigate('refund')}
            className="hover:text-indigo-600 transition-colors"
          >
            {labels.refundPolicy}
          </button>
          <button
            onClick={() => {
              if (window.confirm(labels.landing?.contactConfirm)) {
                window.location.href = 'mailto:support@koreanstudy.me';
              }
            }}
            className="hover:text-indigo-600 transition-colors"
          >
            {labels.landing?.contactUs || 'Contact Us'}
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
