
import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getChapterInfo, getVerses, getAyahAudioUrl } from '../services/api';
import { Surah, Ayah, ARABIC_FONT_SIZES, FONT_SIZES } from '../types';
import { Play, Pause, Bookmark as BookmarkIcon, Share2 } from 'lucide-react';
import { useAppStore } from '../context/Store';
import SettingsDrawer from '../components/SettingsDrawer';

const SurahPage = () => {
  const { id } = useParams<{ id: string }>();
  const [surah, setSurah] = useState<Surah | null>(null);
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { 
    settings, bookmarks, toggleBookmark, playAyah, audio, pauseAudio, resumeAudio, 
    setRecentSurah, t, formatNumber, getSurahName, setHeaderTitle 
  } = useAppStore();

  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Set initial title or update when Surah loads
  useEffect(() => {
    if (surah) {
      setHeaderTitle(getSurahName(surah));
    } else {
      setHeaderTitle(t('surah'));
    }
  }, [surah, settings.appLanguage, t, setHeaderTitle, getSurahName]);

  useEffect(() => {
    const fetchSurah = async () => {
      if (!id) return;
      const surahData = await getChapterInfo(parseInt(id));
      if (surahData) {
          setSurah(surahData);
          setRecentSurah(surahData);
          // Also set header title immediately after fetch
          setHeaderTitle(getSurahName(surahData));
      }
    };
    fetchSurah();
  }, [id, settings.appLanguage]); // Depend on language to refresh title if language changes

  useEffect(() => {
    const fetchAyahs = async () => {
      if (!id) return;
      setLoading(true);
      const data = await getVerses(parseInt(id), page);
      if (data) {
        setAyahs(prev => page === 1 ? data.verses : [...prev, ...data.verses]);
        setHasMore(page < data.total_pages);
      }
      setLoading(false);
    };
    fetchAyahs();
  }, [id, page]);

  // Load more trigger could be added here with IntersectionObserver
  // For MVP, a simple button

  const isBookmarked = (ayahId: number) => {
    if (!surah) return false;
    return bookmarks.some(b => b.id === `${surah.id}:${ayahId}`);
  };

  const handleBookmark = (ayah: Ayah) => {
    if (!surah) return;
    toggleBookmark({
      id: `${surah.id}:${ayah.verse_number}`,
      surahNumber: surah.id,
      ayahNumber: ayah.verse_number,
      surahName: surah.name_simple, // Keep simple name for internal reference or update to localized in display
      timestamp: Date.now()
    });
  };

  const handlePlay = (ayah: Ayah) => {
    if (!surah) return;
    const url = getAyahAudioUrl(surah.id, ayah.verse_number, settings.reciterId);
    if (audio.currentSurahId === surah.id && audio.currentAyahId === ayah.verse_number) {
        audio.isPlaying ? pauseAudio() : resumeAudio();
    } else {
        playAyah(surah.id, ayah.verse_number, url);
    }
  };

  if (!surah && loading && page === 1) return <div className="p-8 text-center">{t('loading')}</div>;

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <SettingsDrawer type="surah" />
      
      {/* Header */}
      {surah && (
        <div className="text-center mb-10 py-8 bg-surface-light dark:bg-surface-dark rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <h1 className="font-amiri text-5xl mb-2 text-primary dark:text-primary-dark">{surah.name_arabic}</h1>
          <h2 className="text-2xl font-semibold mb-1">{getSurahName(surah)}</h2>
          <p className="text-gray-500 text-sm mb-4">{surah.translated_name.name} • {formatNumber(surah.verses_count)} {t('verses')} • {surah.revelation_place}</p>
          
          {surah.bismillah_pre && (
             <div className="font-amiri text-3xl mt-6 text-gray-700 dark:text-gray-300">
               بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
             </div>
          )}
        </div>
      )}

      {/* Verses */}
      <div className="space-y-6">
        {ayahs.map((ayah) => {
            const isPlaying = audio.currentSurahId === surah?.id && audio.currentAyahId === ayah.verse_number && audio.isPlaying;
            const activeAyah = audio.currentSurahId === surah?.id && audio.currentAyahId === ayah.verse_number;
            
            // Extract Translations
            // English: 20
            const enTranslation = ayah.translations.find(tr => tr.resource_id === 20)?.text.replace(/<[^>]*>?/gm, '');
            // Bangla: Try 161 (Zakaria) first, then 131 (Taisirul)
            const bnTranslationObj = ayah.translations.find(tr => tr.resource_id === 161) || ayah.translations.find(tr => tr.resource_id === 131);
            const bnTranslation = bnTranslationObj?.text.replace(/<[^>]*>?/gm, '');

            return (
                <div 
                  key={ayah.id} 
                  id={`ayah-${ayah.verse_number}`}
                  className={`p-6 rounded-2xl bg-white dark:bg-surface-dark border transition-all duration-300 ${activeAyah ? 'border-primary dark:border-primary-dark shadow-md ring-1 ring-primary/20' : 'border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'}`}
                >
                    {/* Toolbar */}
                    <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">
                        <span className="bg-gray-100 dark:bg-gray-800 text-primary dark:text-primary-dark px-3 py-1 rounded-full text-xs font-bold">
                            {formatNumber(surah?.id || 0)}:{formatNumber(ayah.verse_number)}
                        </span>
                        <div className="flex gap-2">
                            <button onClick={() => handlePlay(ayah)} className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition ${isPlaying ? 'text-primary' : 'text-gray-500'}`}>
                                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                            </button>
                            <button onClick={() => handleBookmark(ayah)} className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition ${isBookmarked(ayah.verse_number) ? 'text-secondary fill-current' : 'text-gray-500'}`}>
                                <BookmarkIcon size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Arabic */}
                    {settings.showArabic && (
                        <p className={`font-amiri text-right leading-[2.2] mb-6 text-gray-900 dark:text-gray-100 ${ARABIC_FONT_SIZES[settings.fontSize as keyof typeof ARABIC_FONT_SIZES]}`}>
                            {ayah.text_uthmani}
                        </p>
                    )}

                    {/* Translations */}
                    {settings.showTranslation && (
                        <div className={`space-y-4 ${FONT_SIZES[settings.fontSize as keyof typeof FONT_SIZES]}`}>
                             {/* Bangla Translation */}
                             {(settings.translationMode === 'bn' || settings.translationMode === 'both') && bnTranslation && (
                                 <div className="text-gray-700 dark:text-gray-200 leading-relaxed font-normal" style={{ fontFamily: settings.appLanguage === 'bn' ? 'Hind Siliguri, sans-serif' : 'Inter, sans-serif' }}>
                                     {bnTranslation}
                                 </div>
                             )}

                             {/* English Translation */}
                             {(settings.translationMode === 'en' || settings.translationMode === 'both') && enTranslation && (
                                 <div className="text-gray-600 dark:text-gray-400 leading-relaxed font-light">
                                     {enTranslation}
                                 </div>
                             )}
                        </div>
                    )}
                </div>
            )
        })}
      </div>

      {hasMore && (
        <div className="mt-8 text-center">
          <button 
            onClick={() => setPage(p => p + 1)}
            disabled={loading}
            className="px-6 py-3 bg-primary dark:bg-primary-dark text-white rounded-full font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? t('loading') : t('loadMore')}
          </button>
        </div>
      )}
    </div>
  );
};

export default SurahPage;
