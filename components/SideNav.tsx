import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X, Heart } from 'lucide-react';
import { useAppStore } from '../context/Store';
import { 
  PrayerTimeIcon, QuranIcon, HadithIcon, AsmaUlHusnaIcon, 
  CalendarIcon, QiblaIcon, NamazIcon, kitabIcon, 
  BisoyvittikIcon, RadioIcon, DuaIcon 
} from './CustomIcons';

interface SideNavProps {
  isOpen: boolean;
  onClose: () => void;
}

const SideNav: React.FC<SideNavProps> = ({ isOpen, onClose }) => {
  const { t, setShowBottomNav } = useAppStore();
  const location = useLocation();

  const handleCategoryClick = () => {
    setShowBottomNav(false);
    onClose();
  };

  const categories = [
    { path: '/prayer-times', icon: <PrayerTimeIcon size={22} className="text-blue-600 dark:text-blue-400" />, label: t('prayerTimes') },
    { path: '/quran', icon: <QuranIcon size={22} className="text-emerald-600 dark:text-emerald-400" />, label: t('quran') },
    { path: '/hadith', icon: <HadithIcon size={22} className="text-indigo-600 dark:text-indigo-400" />, label: t('hadith') },
    { path: '/kitab', icon: kitabIcon({ size: 22, className: "text-rose-600 dark:text-rose-400" }), label: t('kitab') },
    { path: '/namaz-shikkha', icon: <NamazIcon size={22} className="text-blue-600 dark:text-blue-400" />, label: t('namazShikkha') },
    { path: '/asma-ul-husna', icon: <AsmaUlHusnaIcon size={22} className="text-purple-600 dark:text-purple-400" />, label: t('asmaUlHusna') },
    { path: '/calendar', icon: <CalendarIcon size={22} className="text-cyan-600 dark:text-cyan-400" />, label: t('calendar') },
    { path: '/qibla', icon: <QiblaIcon size={22} className="text-orange-600 dark:text-orange-400" />, label: t('qibla') },
    { path: '/bisoyvittik', icon: <BisoyvittikIcon size={22} className="text-emerald-600 dark:text-emerald-400" />, label: t('bisoyvittik') },
    { path: '/radio', icon: <RadioIcon size={22} className="text-red-600 dark:text-red-400" />, label: t('radio') },
    { path: '/dua', icon: <DuaIcon size={22} className="text-teal-600 dark:text-teal-400" />, label: t('dua') },
  ];

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Side Panel */}
      <div 
        className={`fixed top-0 left-0 h-full w-[85%] max-w-[320px] bg-gray-50 dark:bg-background-dark shadow-2xl z-[70] transform transition-transform duration-300 ease-out flex flex-col rounded-r-3xl overflow-hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-primary to-emerald-700 p-6 pb-8 text-white flex-shrink-0 overflow-hidden">
          {/* Islamic Geometric Pattern Overlay */}
          <div 
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              backgroundSize: '30px 30px'
            }}
          />
          
          <div className="absolute -right-10 -top-10 opacity-10 pointer-events-none">
            <QuranIcon size={150} className="text-white" />
          </div>
          
          <div className="relative z-10 flex items-start justify-between">
            <div className="flex flex-col gap-4">
              <div className="w-14 h-14 bg-white rounded-2xl p-1.5 shadow-lg">
                <img src="/logo.png" alt="NoorQuran Logo" className="w-full h-full object-contain rounded-xl" />
              </div>
              <div>
                <h2 className="font-bold text-2xl tracking-tight">NoorQuran</h2>
                <p className="text-emerald-100 text-sm font-medium mt-0.5 opacity-90">Your Digital Islamic Companion</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-full bg-black/10 hover:bg-black/20 transition-colors text-white backdrop-blur-md"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Categories List */}
        <div className="flex-1 overflow-y-auto py-2 custom-scrollbar bg-white dark:bg-surface-dark">
          <div className="px-4">
            {categories.map((cat, index) => {
              const isActive = location.pathname === cat.path;
              const isLast = index === categories.length - 1;
              
              return (
                <React.Fragment key={index}>
                  <Link
                    to={cat.path}
                    onClick={handleCategoryClick}
                    className={`flex items-center gap-4 py-3.5 transition-all duration-200 group ${
                      isActive 
                        ? 'bg-primary/5 dark:bg-primary/10 -mx-4 px-4 border-l-4 border-primary' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 -mx-4 px-4 border-l-4 border-transparent'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-110 ${
                      isActive 
                        ? 'bg-white dark:bg-gray-800 border border-primary/20' 
                        : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50'
                    }`}>
                      {cat.icon}
                    </div>
                    <span className={`font-semibold transition-colors ${
                      isActive 
                        ? 'text-primary dark:text-primary-dark' 
                        : 'text-gray-700 dark:text-gray-200 group-hover:text-primary dark:group-hover:text-primary-dark'
                    }`}>
                      {cat.label}
                    </span>
                  </Link>
                  {/* Horizontal Divider */}
                  {!isLast && (
                    <div className="h-[1px] bg-gray-100 dark:bg-gray-800/60 ml-14" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-surface-dark flex-shrink-0">
          <p className="text-xs text-center text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
            Made with <Heart size={12} className="text-red-500 fill-red-500" /> for Muslim Ummah
          </p>
        </div>
      </div>
    </>
  );
};

export default SideNav;
