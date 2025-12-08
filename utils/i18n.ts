import { Language } from '../types';
import enTranslations from '../locales/en.json';
import zhTranslations from '../locales/zh.json';
import viTranslations from '../locales/vi.json';
import mnTranslations from '../locales/mn.json';

// Type for translation object - exported so components can use it
export type TranslationObject = {
  [key: string]: string | TranslationObject;
};

// Type for accessing labels - allows any string key access
export type Labels = {
  [key: string]: any;
};

// Load translations from JSON files
export const translations: Record<Language, TranslationObject> = {
  en: enTranslations,
  zh: zhTranslations,
  vi: viTranslations,
  mn: mnTranslations,
};

export const getLabels = (language: Language): Labels => {
  return translations[language] || translations.en;
};

export default translations;

