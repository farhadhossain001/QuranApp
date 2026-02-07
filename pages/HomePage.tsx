
import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ArrowRight } from 'lucide-react';
import { useAppStore } from '../context/Store';
import PrayerTimesWidget from '../components/PrayerTimesWidget';
import { PrayerTimeIcon, QuranIcon, HadithIcon, AsmaUlHusnaIcon } from '../components/CustomIcons';

const HomePage = () => {
  const { recentSurah, t, getSurahName } = useAppStore();

  return (
    <div className="space-y-8 pb-20">
      
      {/* Prayer Times Section */}
      <PrayerTimesWidget />

      {/* Recent Reading */}
      {recentSurah && (
        <div className="bg-gradient-to-r from-primary to-primary-dark rounded-2xl p-6 text-white shadow-lg relative overflow-hidden mb-6">
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

      {/* Categories Grid - Updated to match visual reference (Icon + Label only) */}
      <div>
        <h2 className="text-lg font-bold mb-4 px-1">{t('categories')}</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-6">
          
          {/* Prayer Times Category */}
          <Link to="/prayer-times" className="group flex flex-col items-center gap-2">
            <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
               <PrayerTimeIcon size={64} />
            </div>
            <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 text-center leading-tight">{t('prayerTimes')}</span>
          </Link>

          {/* Quran Category */}
          <Link to="/quran" className="group flex flex-col items-center gap-2">
            <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
               <QuranIcon size={64} />
            </div>
            <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 text-center leading-tight">{t('quran')}</span>
          </Link>

          {/* Hadith Category */}
          <Link to="/hadith" className="group flex flex-col items-center gap-2">
            <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
               <HadithIcon size={64} />
            </div>
            <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 text-center leading-tight">{t('hadith')}</span>
          </Link>

           {/* Asma-ul-Husna Category */}
           <Link to="/asma-ul-husna" className="group flex flex-col items-center gap-2">
            <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
               <AsmaUlHusnaIcon size={64} />
            </div>
            <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 text-center leading-tight">{t('asmaUlHusna')}</span>
          </Link>

        </div>
      </div>
    </div>
  );
};

export default HomePage;
