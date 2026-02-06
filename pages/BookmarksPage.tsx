import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import { Trash2, ArrowRight } from 'lucide-react';
import { surahNamesBn } from '../utils/surahData';

const BookmarksPage = () => {
  const { bookmarks, toggleBookmark, t, formatNumber, settings, setHeaderTitle } = useAppStore();

  useEffect(() => {
    setHeaderTitle(t('saved'));
  }, [t, setHeaderTitle]);

  const getLocalizedSurahName = (name: string, number: number) => {
    if (settings.appLanguage === 'bn') {
      return surahNamesBn[number] || name;
    }
    return name;
  };

  if (bookmarks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-full mb-6">
            <Trash2 size={40} className="text-gray-400" />
        </div>
        <h2 className="text-xl font-bold mb-2">{t('noBookmarks')}</h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-xs mb-6">
          {t('noBookmarksDesc')}
        </p>
        <Link to="/" className="text-primary font-medium hover:underline">
          {t('startReading')}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">{t('savedVerses')}</h1>
      <div className="grid gap-4">
        {bookmarks.map((bookmark) => (
          <div key={bookmark.id} className="bg-white dark:bg-surface-dark p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-bold text-lg text-primary dark:text-primary-dark">
                {getLocalizedSurahName(bookmark.surahName, bookmark.surahNumber)}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {t('surah')} {formatNumber(bookmark.surahNumber)} • {t('ayah')} {formatNumber(bookmark.ayahNumber)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {t('savedOn')} {formatNumber(new Date(bookmark.timestamp).toLocaleDateString())}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Link 
                to={`/surah/${bookmark.surahNumber}`}
                className="p-2 text-gray-500 hover:text-primary transition"
              >
                <ArrowRight size={20} />
              </Link>
              <button 
                onClick={() => toggleBookmark(bookmark)}
                className="p-2 text-red-400 hover:text-red-600 transition"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BookmarksPage;