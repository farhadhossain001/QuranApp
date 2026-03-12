import React, { useEffect, useState } from 'react';
import { useAppStore } from '../context/Store';
import { getRandomAyah, getChapterInfo } from '../services/api';
import { Ayah, Surah } from '../types';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';

const RandomAyahWidget = () => {
  const { t, settings, getSurahName, setShowBottomNav } = useAppStore();
  const [ayah, setAyah] = useState<Ayah | null>(null);
  const [surah, setSurah] = useState<Surah | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAyah = async () => {
      setLoading(true);
      const currentHour = Math.floor(Date.now() / (1000 * 60 * 60));
      const cacheKey = 'ayahOfTheHour';
      const cached = localStorage.getItem(cacheKey);
      
      let fetchedAyah = null;

      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          // Check if we have the new format with both translations
          if (parsed.hour === currentHour && parsed.ayah && parsed.ayah.translations && parsed.ayah.translations.length >= 2) {
            fetchedAyah = parsed.ayah;
          }
        } catch (e) {
          // ignore cache error
        }
      }

      if (!fetchedAyah) {
        // Fetch both Bengali (161) and English Clear Quran (131)
        fetchedAyah = await getRandomAyah([161, 131]);
        if (fetchedAyah) {
          localStorage.setItem(cacheKey, JSON.stringify({
            hour: currentHour,
            ayah: fetchedAyah
          }));
        }
      }

      if (fetchedAyah) {
        setAyah(fetchedAyah);
        const surahId = parseInt(fetchedAyah.verse_key.split(':')[0]);
        const fetchedSurah = await getChapterInfo(surahId);
        setSurah(fetchedSurah);
      }
      
      setLoading(false);
    };

    fetchAyah();
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 shadow-sm animate-pulse mt-8">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
      </div>
    );
  }

  if (!ayah) return null;

  const surahId = parseInt(ayah.verse_key.split(':')[0]);
  const surahName = surah ? getSurahName(surah) : '';

  const targetResourceId = settings.appLanguage === 'bn' ? 161 : 131;
  const translation = ayah.translations?.find(t => t.resource_id === targetResourceId) || ayah.translations?.[0];

  return (
    <div className="bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 rounded-2xl p-6 shadow-sm border border-teal-100 dark:border-teal-800/30 relative overflow-hidden mt-8">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Sparkles size={80} />
      </div>
      
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4 text-teal-700 dark:text-teal-400">
          <Sparkles size={18} />
          <h2 className="text-sm font-bold uppercase tracking-wider">{settings.appLanguage === 'bn' ? 'এই মুহূর্তের আয়াত' : 'Ayah of the Hour'}</h2>
        </div>
        
        <p className="text-2xl font-amiri text-right mb-4 leading-loose text-gray-800 dark:text-gray-100" dir="rtl">
          {ayah.text_uthmani}
        </p>
        
        {translation && (
          <p className="text-gray-600 dark:text-gray-300 mb-6 italic">
            "{translation.text.replace(/<[^>]*>?/gm, '')}"
          </p>
        )}
        
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-teal-700 dark:text-teal-400">
            {surahName} • {settings.appLanguage === 'bn' ? 'আয়াত' : 'Ayah'} {ayah.verse_number}
          </span>
          
          <Link 
            to={`/surah/${surahId}`}
            onClick={() => setShowBottomNav(false)}
            className="flex items-center gap-1 text-sm font-bold text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 transition-colors"
          >
            {t('readNow')} <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RandomAyahWidget;
