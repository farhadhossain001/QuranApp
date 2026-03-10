
import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../context/Store';
import { X, Type, BookA, Mic, Globe, AlignRight, ChevronRight } from 'lucide-react';
import { HadithEdition, TranslationResource } from '../types';

interface SettingsDrawerProps {
  type: 'surah' | 'hadith' | 'common';
  hadithOptions?: {
    editions: HadithEdition[];
    selected: string;
    onSelect: (slug: string) => void;
  };
}

const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ type, hadithOptions }) => {
  const { isSettingsDrawerOpen, setSettingsDrawerOpen, settings, updateSettings, t, availableTranslations, reciters } = useAppStore();
  const [isVisible, setIsVisible] = useState(false);
  const [activeLanguage, setActiveLanguage] = useState<string | null>(null);

  useEffect(() => {
    if (isSettingsDrawerOpen) {
      setIsVisible(true);

      // Initialize activeLanguage based on current settings
      if (settings.selectedTranslationIds.length > 0 && availableTranslations.length > 0) {
        const selectedTr = availableTranslations.find(tr => tr.id === settings.selectedTranslationIds[0]);
        if (selectedTr && selectedTr.language_name) {
          setActiveLanguage(selectedTr.language_name);
        }
      }
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isSettingsDrawerOpen, settings.selectedTranslationIds, availableTranslations]);

  // Reset view when closing
  useEffect(() => {
    if (!isSettingsDrawerOpen) {
      setTimeout(() => {
        setActiveLanguage(null);
      }, 300);
    }
  }, [isSettingsDrawerOpen]);

  // Group translations by language
  const translationsByLanguage = useMemo(() => {
    const groups: Record<string, TranslationResource[]> = {};
    availableTranslations.forEach(tr => {
      const lang = tr.language_name; // e.g., "English", "Bengali"
      if (!groups[lang]) groups[lang] = [];
      groups[lang].push(tr);
    });
    return groups;
  }, [availableTranslations]);

  const sortedLanguages = useMemo(() => {
    return Object.keys(translationsByLanguage).sort((a, b) => a.localeCompare(b));
  }, [translationsByLanguage]);

  if (!isVisible) return null;

  const drawerAnimation = isSettingsDrawerOpen ? 'animate-slide-up' : 'animate-slide-down';
  const backdropAnimation = isSettingsDrawerOpen ? 'animate-fade-in' : 'animate-fade-out';

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 transition-opacity ${backdropAnimation}`}
        onClick={() => setSettingsDrawerOpen(false)}
      />

      {/* Drawer */}
      <div
        className={`w-full max-w-lg bg-white dark:bg-surface-dark rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 pb-safe overflow-hidden relative z-10 max-h-[85vh] flex flex-col ${drawerAnimation}`}
        style={{ transformOrigin: 'bottom' }}
      >

        {/* Header */}
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h3 className="text-lg font-bold">{t('settings')}</h3>
          <button
            onClick={() => setSettingsDrawerOpen(false)}
            className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6 overflow-y-auto flex-grow custom-scrollbar overscroll-contain">

          {/* App Language */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
              <Globe size={16} />
              {t('appLanguage')}
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-xl flex">
              <button
                onClick={() => {
                  updateSettings({ appLanguage: 'en' });
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${settings.appLanguage === 'en' ? 'bg-white dark:bg-surface-dark text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
              >
                English
              </button>
              <button
                onClick={() => {
                  updateSettings({ appLanguage: 'bn' });
                  // Auto-select Bengali translation if switching to Bengali
                  const bgTrans = availableTranslations.filter(t => t.language_name.toLowerCase() === 'bengali');
                  if (bgTrans.length > 0) {
                    const currentTr = availableTranslations.find(t => t.id === settings.selectedTranslationIds[0]);
                    if (!currentTr || currentTr.language_name.toLowerCase() !== 'bengali') {
                      updateSettings({ selectedTranslationIds: [bgTrans[0].id] });
                      setActiveLanguage(bgTrans[0].language_name);
                    }
                  }
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${settings.appLanguage === 'bn' ? 'bg-white dark:bg-surface-dark text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
              >
                বাংলা
              </button>
            </div>
          </div>

          {/* Font Size Control (Common) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
              <Type size={16} />
              {t('fontSize')}
            </div>
            <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
              <span className="text-xs px-2">A</span>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={settings.fontSize}
                onChange={(e) => updateSettings({ fontSize: parseInt(e.target.value) })}
                className="w-full mx-4 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <span className="text-xl px-2">A</span>
            </div>
          </div>

          {/* Arabic Toggle (Common) */}
          <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 font-medium">
              <AlignRight size={18} className="text-gray-500" />
              {t('showArabic')}
            </div>
            <button
              onClick={() => updateSettings({ showArabic: !settings.showArabic })}
              className={`w-12 h-6 rounded-full relative transition-colors ${settings.showArabic ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'}`}
            >
              <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.showArabic ? 'translate-x-6' : ''}`} />
            </button>
          </div>

          {/* Translation Toggle (Common) */}
          <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 font-medium">
              <BookA size={18} className="text-gray-500" />
              {t('showTranslation')}
            </div>
            <button
              onClick={() => updateSettings({ showTranslation: !settings.showTranslation })}
              className={`w-12 h-6 rounded-full relative transition-colors ${settings.showTranslation ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'}`}
            >
              <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.showTranslation ? 'translate-x-6' : ''}`} />
            </button>
          </div>

          {/* SURAH SPECIFIC */}
          {type === 'surah' && (
            <>
              {/* Reciter */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                  <Mic size={16} />
                  {t('reciter')}
                </div>
                <select
                  value={settings.reciterId}
                  onChange={(e) => updateSettings({ reciterId: parseInt(e.target.value) })}
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                >
                  {reciters.length > 0 ? (
                    reciters.map((reciter) => (
                      <option key={reciter.id} value={reciter.id}>
                        {reciter.reciter_name} {reciter.style ? `(${reciter.style})` : ''}
                      </option>
                    ))
                  ) : (
                    <option value={7}>Mishary Rashid Al-Afasy</option>
                  )}
                </select>
              </div>

              {/* Translation Selection */}
              <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                  <Globe size={16} />
                  {t('translationLanguage')}
                </div>

                <div className="space-y-3">
                  {/* Language Dropdown */}
                  <div className="relative">
                    <select
                      value={activeLanguage || ''}
                      onChange={(e) => {
                        const lang = e.target.value;
                        setActiveLanguage(lang);
                        // Auto-select the first translator of this language
                        const trans = translationsByLanguage[lang];
                        if (trans && trans.length > 0) {
                          updateSettings({ selectedTranslationIds: [trans[0].id] });
                        }
                      }}
                      className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm appearance-none"
                    >
                      <option value="" disabled>{settings.appLanguage === 'bn' ? 'ভাষা নির্বাচন করুন' : 'Select Language'}</option>
                      {sortedLanguages.map(lang => (
                        <option key={lang} value={lang}>{lang.charAt(0).toUpperCase() + lang.slice(1)}</option>
                      ))}
                    </select>
                    <ChevronRight size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none rotate-90" />
                  </div>

                  {/* Translator Dropdown */}
                  <div className="relative">
                    <select
                      value={settings.selectedTranslationIds[0] || ''}
                      onChange={(e) => updateSettings({ selectedTranslationIds: [parseInt(e.target.value)] })}
                      disabled={!activeLanguage}
                      className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm appearance-none disabled:opacity-50"
                    >
                      {activeLanguage ? (
                        (translationsByLanguage[activeLanguage] || []).map(tr => (
                          <option key={tr.id} value={tr.id}>
                            {tr.name} {tr.author_name !== tr.name ? `(${tr.author_name})` : ''}
                          </option>
                        ))
                      ) : (
                        <option value="">{settings.appLanguage === 'bn' ? 'অনুবাদক নির্বাচন করুন' : 'Select Translator'}</option>
                      )}
                    </select>
                    <ChevronRight size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none rotate-90" />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* HADITH SPECIFIC */}
          {type === 'hadith' && hadithOptions && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                <Globe size={16} />
                {t('translationLanguage')}
              </div>
              <select
                value={hadithOptions.selected}
                onChange={(e) => hadithOptions.onSelect(e.target.value)}
                className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              >
                {hadithOptions.editions.map((edition) => (
                  <option key={edition.name} value={edition.name}>
                    {edition.language} {edition.name.includes(edition.language.toLowerCase()) ? '' : `(${edition.name})`}
                  </option>
                ))}
                {hadithOptions.editions.length === 0 && <option>No translations available</option>}
              </select>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default SettingsDrawer;
