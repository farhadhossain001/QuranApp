
import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ArrowRight } from 'lucide-react';
import { useAppStore } from '../context/Store';
import PrayerTimesWidget from '../components/PrayerTimesWidget';
import { PrayerTimeIcon, QuranIcon, HadithIcon, AsmaUlHusnaIcon, CalendarIcon, QiblaIcon, NamazIcon, kitabIcon, BisoyvittikIcon, RadioIcon } from '../components/CustomIcons';

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

      {/* Categories Grid - App Icon Style */}
      <div>
        <h2 className="text-lg font-bold mb-4 px-1">{t('categories')}</h2>
        
        <div className="grid grid-cols-4 gap-4 px-2 sm:px-0">
          
          {/* Prayer Times Category */}
          <Link to="/prayer-times" className="group flex flex-col items-center gap-2">
            <div className="w-[72px] h-[72px] sm:w-20 sm:h-20 bg-blue-50 dark:bg-blue-900/20 rounded-[24px] flex items-center justify-center shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:shadow-md group-active:scale-95">
               <PrayerTimeIcon size={45} className="text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-[11px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300 text-center leading-tight mt-1">{t('prayerTimes')}</span>
          </Link>

          {/* Quran Category */}
          <Link to="/quran" className="group flex flex-col items-center gap-2">
            <div className="w-[72px] h-[72px] sm:w-20 sm:h-20 bg-blue-50 dark:bg-blue-900/20 rounded-[24px] flex items-center justify-center shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:shadow-md group-active:scale-95">
               <QuranIcon size={45} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-[11px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300 text-center leading-tight mt-1">{t('quran')}</span>
          </Link>

          {/* Hadith Category */}
          <Link to="/hadith" className="group flex flex-col items-center gap-2">
            <div className="w-[72px] h-[72px] sm:w-20 sm:h-20 bg-blue-50 dark:bg-blue-900/20 rounded-[24px] flex items-center justify-center shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:shadow-md group-active:scale-95">
               <HadithIcon size={45} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="text-[11px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300 text-center leading-tight mt-1">{t('hadith')}</span>
          </Link>

           {/* Namaz Shikkha Category */}
           <Link to="/namaz-shikkha" className="group flex flex-col items-center gap-2">
            <div className="w-[72px] h-[72px] sm:w-20 sm:h-20 bg-blue-50 dark:bg-blue-900/20 rounded-[24px] flex items-center justify-center shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:shadow-md group-active:scale-95">
               <NamazIcon size={45} className="text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-[11px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300 text-center leading-tight mt-1">{t('namazShikkha')}</span>
          </Link>

           {/* Asma-ul-Husna Category */}
           <Link to="/asma-ul-husna" className="group flex flex-col items-center gap-2">
            <div className="w-[72px] h-[72px] sm:w-20 sm:h-20 bg-blue-50 dark:bg-blue-900/20 rounded-[24px] flex items-center justify-center shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:shadow-md group-active:scale-95">
               <AsmaUlHusnaIcon size={45} className="text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-[11px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300 text-center leading-tight mt-1">{t('asmaUlHusna')}</span>
          </Link>
          
          {/* Calendar Category */}
          <Link to="/calendar" className="group flex flex-col items-center gap-2">
            <div className="w-[72px] h-[72px] sm:w-20 sm:h-20 bg-blue-50 dark:bg-blue-900/20 rounded-[24px] flex items-center justify-center shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:shadow-md group-active:scale-95">
               <CalendarIcon size={45} className="text-cyan-600 dark:text-cyan-400" />
            </div>
            <span className="text-[11px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300 text-center leading-tight mt-1">{t('calendar')}</span>
          </Link>

          {/* Qibla Category */}
          <Link to="/qibla" className="group flex flex-col items-center gap-2">
            <div className="w-[72px] h-[72px] sm:w-20 sm:h-20 bg-blue-50 dark:bg-blue-900/20 rounded-[24px] flex items-center justify-center shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:shadow-md group-active:scale-95">
               <QiblaIcon size={45} className="text-orange-600 dark:text-orange-400" />
            </div>
            <span className="text-[11px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300 text-center leading-tight mt-1">{t('qibla')}</span>
          </Link>

          {/* Kitab Category */}
          <Link to="/kitab" className="group flex flex-col items-center gap-2">
            <div className="w-[72px] h-[72px] sm:w-20 sm:h-20 bg-blue-50 dark:bg-blue-900/20 rounded-[24px] flex items-center justify-center shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:shadow-md group-active:scale-95">
               {kitabIcon({ size: 45, className: "text-rose-600 dark:text-rose-400" })}
            </div>
            <span className="text-[11px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300 text-center leading-tight mt-1">{t('kitab')}</span>
          </Link>

          {/* Bisoyvittik Category */}
          <Link to="/bisoyvittik" className="group flex flex-col items-center gap-2">
            <div className="w-[72px] h-[72px] sm:w-20 sm:h-20 bg-blue-50 dark:bg-blue-900/20 rounded-[24px] flex items-center justify-center shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:shadow-md group-active:scale-95">
               <BisoyvittikIcon size={45} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-[11px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300 text-center leading-tight mt-1">{t('bisoyvittik')}</span>
          </Link>

          {/* Radio Category */}
          <Link to="/radio" className="group flex flex-col items-center gap-2">
            <div className="w-[72px] h-[72px] sm:w-20 sm:h-20 bg-blue-50 dark:bg-blue-900/20 rounded-[24px] flex items-center justify-center shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:shadow-md group-active:scale-95">
               <RadioIcon size={45} className="text-red-600 dark:text-red-400" />
            </div>
            <span className="text-[11px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300 text-center leading-tight mt-1">{t('radio')}</span>
          </Link>

        </div>
      </div>
    </div>
  );
};

export default HomePage;
