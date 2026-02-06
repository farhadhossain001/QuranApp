
import React, { useEffect, useState, useRef } from 'react';
import { useAppStore } from '../context/Store';
import { getAsmaUlHusna } from '../services/api';
import { NameOfAllah } from '../types';
import { Sparkles, Play, Pause, Volume2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SettingsDrawer from '../components/SettingsDrawer';

const AsmaUlHusnaPage = () => {
  const { t, setHeaderTitle, settings, formatNumber } = useAppStore();
  const [names, setNames] = useState<NameOfAllah[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  // Audio State for Names
  const [playingId, setPlayingId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setHeaderTitle(t('asmaUlHusna'));
    
    const fetchNames = async () => {
      setLoading(true);
      const data = await getAsmaUlHusna(settings.appLanguage);
      if (data && data.length > 0) {
        setNames(data);
        setError(false);
      } else {
        setError(true);
      }
      setLoading(false);
    };

    fetchNames();
  }, [t, setHeaderTitle, settings.appLanguage]);

  const toggleAudio = (id: number, url?: string) => {
      if (!url) return;

      if (playingId === id) {
          audioRef.current?.pause();
          setPlayingId(null);
      } else {
          if (audioRef.current) {
              audioRef.current.pause();
          }
          audioRef.current = new Audio(url);
          audioRef.current.play();
          setPlayingId(id);
          
          audioRef.current.onended = () => {
              setPlayingId(null);
          };
      }
  };

  useEffect(() => {
      return () => {
          if (audioRef.current) audioRef.current.pause();
      };
  }, []);

  return (
    <div className="pb-20">
        <SettingsDrawer type="common" />

        {/* Banner */}
        <div className="bg-purple-50 dark:bg-purple-900/10 p-6 rounded-2xl flex items-center gap-4 mb-8">
            <div className="p-4 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-full">
                <Sparkles size={32} />
            </div>
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('asmaUlHusna')}</h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{t('asmaUlHusnaDesc')}</p>
            </div>
        </div>

        {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[...Array(9)].map((_, i) => (
                    <div key={i} className="h-40 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse"></div>
                ))}
            </div>
        ) : error ? (
            <div className="text-center py-10">
                <p className="text-red-500 mb-2">Failed to load names.</p>
                <button 
                    onClick={() => window.location.reload()} 
                    className="text-primary hover:underline"
                >
                    Try again
                </button>
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {names.map((item) => (
                    <div 
                        key={item.id} 
                        className="bg-white dark:bg-surface-dark p-6 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-primary dark:hover:border-primary-dark transition shadow-sm hover:shadow-md flex flex-col items-center text-center relative overflow-hidden group"
                    >
                        <div className="absolute top-3 right-3 text-xs font-bold text-gray-300 dark:text-gray-600">
                            {formatNumber(item.id)}
                        </div>

                         {/* Audio Button */}
                         {item.audio && (
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleAudio(item.id, item.audio);
                                }}
                                className={`absolute top-3 left-3 p-2 rounded-full transition ${playingId === item.id ? 'bg-primary text-white' : 'text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                            >
                                {playingId === item.id ? <Pause size={14} /> : <Volume2 size={14} />}
                            </button>
                        )}
                        
                        <div className="mb-4 mt-4">
                             <h2 className="font-amiri text-4xl text-primary dark:text-primary-dark mb-2 group-hover:scale-110 transition-transform duration-300">
                                 {item.arabic}
                             </h2>
                        </div>
                        
                        <div className="w-full border-t border-gray-100 dark:border-gray-800 pt-3 flex flex-col items-center">
                            <h3 className="font-bold text-gray-900 dark:text-white mb-1">
                                {item.transliteration}
                            </h3>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                                {item.translation}
                            </p>
                            {/* Detailed Meaning */}
                            {item.meaning && item.meaning !== item.translation && (
                                <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-3 leading-relaxed">
                                    {item.meaning}
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
  );
};

export default AsmaUlHusnaPage;
