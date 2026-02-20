
import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getChapterInfo, getVerses, getTafsirForAyah, getAvailableTafsirs } from '../services/api';
import { Surah, Ayah, ARABIC_FONT_SIZES, FONT_SIZES, TafsirResource } from '../types';
import { Play, Pause, Bookmark as BookmarkIcon, Share2, BookOpen, X } from 'lucide-react';
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
    setRecentSurah, t, formatNumber, getSurahName, setHeaderTitle, availableTranslations,
    registerAudioUrls 
  } = useAppStore();

  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Tafsir state
  const [showTafsirModal, setShowTafsirModal] = useState(false);
  const [selectedAyahForTafsir, setSelectedAyahForTafsir] = useState<Ayah | null>(null);
  const [tafsirContent, setTafsirContent] = useState<string>('');
  const [tafsirLoading, setTafsirLoading] = useState(false);
  const [availableTafsirs, setAvailableTafsirs] = useState<TafsirResource[]>([]);
  const [selectedTafsirId, setSelectedTafsirId] = useState<number>(() => {
    // Set default tafsir based on app language
    // Bengali: 165 (Tafsir Ahsanul Bayaan), English: 169 (Ibn Kathir Abridged)
    return settings.appLanguage === 'bn' ? 165 : 169;
  });
  const [selectedLanguage, setSelectedLanguage] = useState<string>(() => {
    // Set default language based on app language
    return settings.appLanguage === 'bn' ? 'bengali' : 'english';
  });

  // Fetch available tafsirs on mount
  useEffect(() => {
    const fetchTafsirs = async () => {
      const tafsirs = await getAvailableTafsirs();
      setAvailableTafsirs(tafsirs);
    };
    fetchTafsirs();
  }, []);

  // Update tafsir when app language changes
  useEffect(() => {
    // Bengali: 165 (Tafsir Ahsanul Bayaan), English: 169 (Ibn Kathir Abridged)
    const defaultLanguage = settings.appLanguage === 'bn' ? 'bengali' : 'english';
    const defaultTafsirId = settings.appLanguage === 'bn' ? 165 : 169;
    setSelectedLanguage(defaultLanguage);
    setSelectedTafsirId(defaultTafsirId);
  }, [settings.appLanguage]);

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
  }, [id, settings.appLanguage]);

  // Fetch Verses when ID, Page, Translation, or Reciter changes
  useEffect(() => {
    const fetchAyahs = async () => {
      if (!id) return;
      setLoading(true);
      
      const data = await getVerses(
          parseInt(id), 
          page, 
          20, 
          settings.selectedTranslationIds,
          settings.reciterId // Pass Reciter ID for Audio
      );
      
      if (data) {
        setAyahs(prev => page === 1 ? data.verses : [...prev, ...data.verses]);
        setHasMore(page < data.total_pages);
        
        // Register audio URLs with the store for playlist management
        registerAudioUrls(data.verses);
      }
      setLoading(false);
    };
    fetchAyahs();
  }, [id, page, settings.selectedTranslationIds.join(','), settings.reciterId]); 

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
      surahName: surah.name_simple, 
      timestamp: Date.now()
    });
  };

  const handlePlay = (ayah: Ayah) => {
    if (!surah) return;
    
    if (audio.currentSurahId === surah.id && audio.currentAyahId === ayah.verse_number) {
        audio.isPlaying ? pauseAudio() : resumeAudio();
    } else {
        if (ayah.audio?.url) {
            playAyah(surah.id, ayah.verse_number, ayah.audio.url);
        } else {
            console.warn("No audio URL found for this ayah");
        }
    }
  };

  const getTranslatorName = (resourceId: number) => {
      const resource = availableTranslations.find(r => r.id === resourceId);
      return resource ? resource.name : 'Unknown';
  };

  // Handle Tafsir
  const handleTafsir = async (ayah: Ayah) => {
    setSelectedAyahForTafsir(ayah);
    setShowTafsirModal(true);
    setTafsirLoading(true);
    setTafsirContent('');
    
    const tafsir = await getTafsirForAyah(ayah.verse_key, selectedTafsirId);
    if (tafsir) {
      setTafsirContent(tafsir.text);
    }
    setTafsirLoading(false);
  };

  // Handle tafsir selection change
  const handleTafsirChange = async (tafsirId: number) => {
    setSelectedTafsirId(tafsirId);
    if (selectedAyahForTafsir) {
      setTafsirLoading(true);
      const tafsir = await getTafsirForAyah(selectedAyahForTafsir.verse_key, tafsirId);
      if (tafsir) {
        setTafsirContent(tafsir.text);
      }
      setTafsirLoading(false);
    }
  };

  // Group tafsirs by language
  const groupedTafsirs = availableTafsirs.reduce((acc, tafsir) => {
    const lang = tafsir.language_name;
    if (!acc[lang]) {
      acc[lang] = [];
    }
    acc[lang].push(tafsir);
    return acc;
  }, {} as Record<string, TafsirResource[]>);

  // Sort languages: Bengali first if app is Bangla, English first otherwise
  const sortedLanguages = Object.keys(groupedTafsirs).sort((a, b) => {
    if (settings.appLanguage === 'bn') {
      if (a.toLowerCase() === 'bengali') return -1;
      if (b.toLowerCase() === 'bengali') return 1;
    }
    if (a.toLowerCase() === 'english') return -1;
    if (b.toLowerCase() === 'english') return 1;
    return a.localeCompare(b);
  });

  // Get tafsirs for selected language
  const tafsirsForSelectedLanguage = groupedTafsirs[selectedLanguage] || [];

  // Handle language change
  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
    // Auto-select first tafsir of the new language
    const tafsirsForLang = groupedTafsirs[language] || [];
    if (tafsirsForLang.length > 0) {
      const newTafsirId = tafsirsForLang[0].id;
      setSelectedTafsirId(newTafsirId);
      // Fetch tafsir content for the new selection
      if (selectedAyahForTafsir) {
        setTafsirLoading(true);
        getTafsirForAyah(selectedAyahForTafsir.verse_key, newTafsirId).then((tafsir) => {
          if (tafsir) {
            setTafsirContent(tafsir.text);
          }
          setTafsirLoading(false);
        });
      }
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
                            <button onClick={() => handleTafsir(ayah)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition text-gray-500 hover:text-primary dark:hover:text-primary-dark" title="Tafsir">
                                <BookOpen size={18} />
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
                        <div className={`space-y-6 ${FONT_SIZES[settings.fontSize as keyof typeof FONT_SIZES]}`}>
                             {ayah.translations.map((tr) => (
                                 <div key={tr.id} className="border-l-2 border-gray-100 dark:border-gray-700 pl-4">
                                     <div className="text-gray-600 dark:text-gray-300 leading-relaxed font-light mb-1" 
                                          dangerouslySetInnerHTML={{ __html: tr.text }} 
                                     />
                                     <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                                         {getTranslatorName(tr.resource_id)}
                                     </p>
                                 </div>
                             ))}
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

      {/* Tafsir Modal */}
      {showTafsirModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <BookOpen className="text-primary dark:text-primary-dark" size={24} />
                <div>
                  <h3 className="font-semibold text-lg">
                    {t('tafsir')} - {surah?.name_simple} {selectedAyahForTafsir?.verse_number}
                  </h3>
                  <p className="text-xs text-gray-500">{selectedAyahForTafsir?.verse_key}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowTafsirModal(false)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tafsir Selector */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
              {/* Language Selector */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('selectLanguage') || 'Language'}</label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="w-full p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {sortedLanguages.map((language) => (
                    <option key={language} value={language}>
                      {language}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Tafsir Selector */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('selectTafsir') || 'Tafsir'}</label>
                <select
                  value={selectedTafsirId}
                  onChange={(e) => handleTafsirChange(parseInt(e.target.value))}
                  className="w-full p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {tafsirsForSelectedLanguage.map((tafsir) => (
                    <option key={tafsir.id} value={tafsir.id}>
                      {tafsir.name} - {tafsir.author_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {tafsirLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : tafsirContent ? (
                <div 
                  className="prose dark:prose-invert max-w-none text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: tafsirContent }}
                />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  {t('noTafsirFound') || 'No tafsir available for this verse'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SurahPage;
