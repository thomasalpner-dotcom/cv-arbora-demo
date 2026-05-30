import React, { useState } from 'react';
import { ArrowRight, Moon, Sun } from 'lucide-react';
import { AuthModal } from './AuthModal';
import { useTranslation, LANGUAGES, Language } from '../utils/translations';

interface Props {
  isDarkMode?: boolean;
  toggleDarkMode?: () => void;
  companyName?: string;
  title?: string;
  subtitle?: string;
  logoUrl?: string;
}

export const LandingPage: React.FC<Props> = ({
  isDarkMode,
  toggleDarkMode,
  companyName = 'Arbora',
  title = 'Arbora CV',
  subtitle,
  logoUrl
}) => {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const { t, currentLanguage, setLanguage } = useTranslation();

  const activeSubtitle = subtitle || t('subtitle');
  const activeTitle = title === 'Aventus CV' ? 'Arbora CV' : title;

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-100 dark:bg-gray-900 transition-colors duration-200 flex flex-col selection:bg-blue-500/30">

      {/* BACKGROUND IMAGE - Added this layer */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000"
        style={{
          backgroundImage: 'url("/images/Start.webp")',
          opacity: 0.40 // Increased from 0.15 for better visibility
        }}
      />


      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        companyName={companyName}
        logoUrl={logoUrl}
      />

      {/* Header */}
      <header className="fixed w-full bg-white/70 dark:bg-gray-900/70 backdrop-blur-md z-50 border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 flex items-center justify-center">
              {logoUrl ? (
                <img src={logoUrl} alt={companyName} className="max-w-full max-h-full object-contain" />
              ) : (
                <svg viewBox="0 0 100 100" className="w-full h-full text-brand-500" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="35" cy="35" r="9" fill="currentColor" />
                  <path d="M25 58 C35 54 45 45 60 35" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
                  <path d="M35 52 L39 65" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
                  <path d="M48 20 C68 30 72 60 68 70" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
                </svg>
              )}
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">{companyName}.cv</span>
          </div>

          <div className="flex items-center space-x-4">
            {/* Language Selector Dropdown */}
            <select
              value={currentLanguage}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-full px-3 py-1.5 text-sm focus:outline-none backdrop-blur-sm cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
            >
              {LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code} className="bg-white dark:bg-gray-800">
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>

            {toggleDarkMode && (
              <button
                onClick={toggleDarkMode}
                className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            )}
            <button onClick={() => setIsAuthOpen(true)} className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium text-sm">{t('login')}</button>
            <button onClick={() => setIsAuthOpen(true)} className="bg-brand-500 hover:bg-brand-500/90 text-white px-5 py-2.5 rounded-full font-medium text-sm transition-all shadow-lg shadow-brand-500/20 hover:shadow-brand-500/40">
              {t('create_cv_now')}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section - Centered */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center pt-20 relative z-10">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-brand-500 to-brand-300 blur-[60px] opacity-20 dark:opacity-40 rounded-full"></div>
          <h1 className="relative text-6xl md:text-7xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-6 drop-shadow-sm">
            {activeTitle}
          </h1>
        </div>
        <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto font-light leading-relaxed">
          {activeSubtitle}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button onClick={() => setIsAuthOpen(true)} className="group w-full sm:w-auto bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 text-lg px-8 py-4 rounded-full font-bold transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center justify-center">
            {t('create_cv_now')} <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>
    </div>
  );
};