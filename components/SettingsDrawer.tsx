
import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../context/Store';
import { X, Type, BookA, Mic, Globe, AlignRight, Search, Check, ChevronRight, ArrowLeft } from 'lucide-react';
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
  const [translationSearch, setTranslationSearch] = useState('');
  
  // Navigation State for Translation Selection
  const [selectionView, setSelectionView] = useState<'languages' | 'translators'>('languages');
  const [activeLanguage, setActiveLanguage] = useState<string | null>(null);

  useEffect(() => {
    if (isSettingsDrawerOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isSettingsDrawerOpen]);

  // Reset view when closing
  useEffect(() => {
      if (!isSettingsDrawerOpen) {
          setTimeout(() => {
              setSelectionView('languages');
              setActiveLanguage(null);
              setTranslationSearch('');
          }, 300);
      }
  }, [isSettingsDrawerOpen]);

  const toggleTranslation = (id: number) => {
      let current = [...settings.selectedTranslationIds];
      if (current.includes(id)) {
          current = current.filter(x => x !== id);
      } else {
          current.push(id);
      }
      updateSettings({ selectedTranslationIds: current });
  };

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
      return Object.keys(translationsByLanguage).sort();
  }, [translationsByLanguage]);

  // Filter Logic
  const filteredItems = useMemo(() => {
      const search = translationSearch.toLowerCase();
      
      if (selectionView === 'languages') {
          return sortedLanguages.filter(lang => 
              lang.toLowerCase().includes(search)
          );
      } else if (selectionView === 'translators' && activeLanguage) {
          return (translationsByLanguage[activeLanguage] || []).filter(tr => 
              tr.name.toLowerCase().includes(search) || 
              tr.author_name.toLowerCase().includes(search)
          );
      }
      return [];
  }, [selectionView, activeLanguage, translationSearch, sortedLanguages, translationsByLanguage]);

  const handleLanguageSelect = (lang: string) => {
      setActiveLanguage(lang);
      setSelectionView('translators');
      setTranslationSearch(''); // Clear search when diving in
  };

  const handleBackToLanguages = () => {
      setSelectionView('languages');
      setActiveLanguage(null);
      setTranslationSearch('');
  };

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

        <div className="space-y-6 overflow-y-auto flex-grow custom-scrollbar">
          
          {/* App Language */}
          <div className="space-y-3">
             <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
               <Globe size={16} />
               {t('appLanguage')}
             </div>
             <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-xl flex">
                 <button 
                     onClick={() => updateSettings({ appLanguage: 'en' })}
                     className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${settings.appLanguage === 'en' ? 'bg-white dark:bg-surface-dark text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                 >
                     English
                 </button>
                 <button 
                     onClick={() => updateSettings({ appLanguage: 'bn' })}
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
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                        <Globe size={16} />
                        {t('translationLanguage')}
                    </div>
                    {selectionView === 'translators' && (
                         <button 
                            onClick={handleBackToLanguages}
                            className="text-xs text-primary flex items-center gap-1 hover:underline"
                         >
                             <ArrowLeft size={12} />
                             Back to Languages
                         </button>
                    )}
                </div>
                
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                        type="text"
                        placeholder={selectionView === 'languages' ? "Search languages..." : `Search ${activeLanguage} translators...`}
                        value={translationSearch}
                        onChange={(e) => setTranslationSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                </div>

                {/* List Container */}
                <div className="h-48 overflow-y-auto border border-gray-100 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 p-2 space-y-1">
                    
                    {/* View: Languages List */}
                    {selectionView === 'languages' && (
                        <>
                            {filteredItems.length === 0 ? (
                                <div className="text-center text-xs text-gray-400 py-4">No languages found</div>
                            ) : (
                                (filteredItems as string[]).map(lang => {
                                    // Count selected in this language
                                    const count = (translationsByLanguage[lang] || []).filter(tr => 
                                        settings.selectedTranslationIds.includes(tr.id)
                                    ).length;

                                    return (
                                        <div 
                                            key={lang} 
                                            onClick={() => handleLanguageSelect(lang)}
                                            className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition text-sm group"
                                        >
                                            <span className="font-medium text-gray-900 dark:text-gray-100">{lang}</span>
                                            <div className="flex items-center gap-2">
                                                {count > 0 && (
                                                    <span className="bg-primary text-white text-[10px] px-2 py-0.5 rounded-full">
                                                        {count} selected
                                                    </span>
                                                )}
                                                <ChevronRight size={16} className="text-gray-400 group-hover:text-gray-600" />
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </>
                    )}

                    {/* View: Translators List */}
                    {selectionView === 'translators' && activeLanguage && (
                         <>
                            {filteredItems.length === 0 ? (
                                <div className="text-center text-xs text-gray-400 py-4">No translators found</div>
                            ) : (
                                (filteredItems as TranslationResource[]).map(tr => {
                                    const isSelected = settings.selectedTranslationIds.includes(tr.id);
                                    return (
                                        <div 
                                            key={tr.id} 
                                            onClick={() => toggleTranslation(tr.id)}
                                            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition text-sm ${isSelected ? 'bg-primary/10 border-primary/20' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                        >
                                            <div className="flex-1">
                                                <p className={`font-medium ${isSelected ? 'text-primary dark:text-primary-dark' : 'text-gray-900 dark:text-gray-100'}`}>
                                                    {tr.name}
                                                </p>
                                                {tr.author_name !== tr.name && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                        {tr.author_name}
                                                    </p>
                                                )}
                                            </div>
                                            {isSelected && <Check size={16} className="text-primary" />}
                                        </div>
                                    );
                                })
                            )}
                         </>
                    )}

                </div>
                {selectionView === 'languages' ? (
                     <p className="text-[10px] text-gray-400 text-center">Select a language to view translators.</p>
                ) : (
                     <p className="text-[10px] text-gray-400 text-center">Select multiple translators to view them side-by-side.</p>
                )}
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
