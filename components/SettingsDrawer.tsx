
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../context/Store';
import { X, Type, BookA, Mic, Globe, AlignRight } from 'lucide-react';
import { RECITERS } from '../services/api';
import { HadithEdition } from '../types';

interface SettingsDrawerProps {
  type: 'surah' | 'hadith';
  hadithOptions?: {
    editions: HadithEdition[];
    selected: string;
    onSelect: (slug: string) => void;
  };
}

const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ type, hadithOptions }) => {
  const { isSettingsDrawerOpen, setSettingsDrawerOpen, settings, updateSettings, t } = useAppStore();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isSettingsDrawerOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isSettingsDrawerOpen]);

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
        className={`w-full max-w-lg bg-white dark:bg-surface-dark rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 pb-safe overflow-hidden relative z-10 max-h-[85vh] overflow-y-auto ${drawerAnimation}`}
        style={{ transformOrigin: 'bottom' }}
      >
        <div className="space-y-6">
          
          {/* Header */}
          <div className="flex justify-between items-center mb-2 sticky top-0 bg-white dark:bg-surface-dark z-20 pb-2 border-b border-transparent">
            <h3 className="text-lg font-bold">{t('settings')}</h3>
            <button 
              onClick={() => setSettingsDrawerOpen(false)}
              className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
              <X size={20} />
            </button>
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
              {/* Translation Language */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                   <Globe size={16} />
                   {t('translationLanguage')}
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <button 
                        onClick={() => updateSettings({ translationMode: 'en' })}
                        className={`p-2 rounded-lg border text-sm font-medium transition ${settings.translationMode === 'en' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 dark:border-gray-700'}`}
                    >
                        {t('english')}
                    </button>
                    <button 
                        onClick={() => updateSettings({ translationMode: 'bn' })}
                        className={`p-2 rounded-lg border text-sm font-medium transition ${settings.translationMode === 'bn' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 dark:border-gray-700'}`}
                    >
                        {t('bangla')}
                    </button>
                     <button 
                        onClick={() => updateSettings({ translationMode: 'both' })}
                        className={`p-2 rounded-lg border text-sm font-medium transition ${settings.translationMode === 'both' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 dark:border-gray-700'}`}
                    >
                        {t('both')}
                    </button>
                </div>
              </div>

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
                    {RECITERS.map((reciter) => (
                        <option key={reciter.id} value={reciter.id}>
                            {reciter.name}
                        </option>
                    ))}
                </select>
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
