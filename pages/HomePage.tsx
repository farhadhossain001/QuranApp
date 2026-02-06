import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, ScrollText, ArrowRight } from 'lucide-react';
import { useAppStore } from '../context/Store';
import PrayerTimesWidget from '../components/PrayerTimesWidget';

const HomePage = () => {
  const { recentSurah, t, getSurahName } = useAppStore();

  return (
    <div className="space-y-6">
      
      {/* Prayer Times Section */}
      <PrayerTimesWidget />

      {/* Recent Reading - Kept for quick access */}
      {recentSurah && (
        <div className="bg-gradient-to-r from-primary to-primary-dark rounded-2xl p-6 text-white shadow-lg relative overflow-hidden mb-6">
          {/* Background decoration */}
          <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
             <BookOpen size={150} />
          </div>

          <div className="relative z-10">
            <h2 className="text-sm opacity-90 mb-2 uppercase tracking-wide font-medium">{t('continueReading')}</h2>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
              <div>
                <h3 className="text-3xl font-amiri font-bold mb-1">{recentSurah.name_arabic}</h3>
                <p className="text-xl font-bold">{getSurahName(recentSurah)}</p>
                <p className="text-sm opacity-80">{recentSurah.translated_name.name}</p>
              </div>
              <Link 
                to={`/surah/${recentSurah.id}`} 
                className="bg-white text-primary px-6 py-3 rounded-xl font-bold text-sm hover:bg-opacity-90 transition shadow-md flex items-center gap-2"
              >
                {t('readNow')} <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Categories Grid */}
      <div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          
          {/* Quran Category */}
          <Link to="/quran" className="group bg-white dark:bg-surface-dark p-6 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-primary dark:hover:border-primary-dark transition shadow-sm hover:shadow-md flex flex-col items-center text-center gap-4">
            <div className="p-4 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 group-hover:bg-primary group-hover:text-white transition-colors duration-300">
               <BookOpen size={32} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">{t('quran')}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('quranDesc')}</p>
            </div>
          </Link>

          {/* Prayer Times Category */}
          <Link to="/prayer-times" className="group bg-white dark:bg-surface-dark p-6 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-primary dark:hover:border-primary-dark transition shadow-sm hover:shadow-md flex flex-col items-center text-center gap-4">
            <div className="p-4 rounded-full bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 group-hover:bg-primary group-hover:text-white transition-colors duration-300">
               <Clock size={32} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">{t('prayerTimes')}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('currentPrayer')}</p>
            </div>
          </Link>

          {/* Hadith Category */}
          <Link to="/hadith" className="group bg-white dark:bg-surface-dark p-6 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-primary dark:hover:border-primary-dark transition shadow-sm hover:shadow-md flex flex-col items-center text-center gap-4">
            <div className="p-4 rounded-full bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 group-hover:bg-primary group-hover:text-white transition-colors duration-300">
               <ScrollText size={32} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">{t('hadith')}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('hadithDesc')}</p>
            </div>
          </Link>

        </div>
      </div>
    </div>
  );
};

export default HomePage;