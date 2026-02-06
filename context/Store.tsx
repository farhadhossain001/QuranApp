
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { UserSettings, Bookmark, Surah, TranslationResource, Reciter, Ayah } from '../types';
import { translations } from '../utils/translations';
import { getAvailableTranslations, getReciters } from '../services/api';
import { toBengaliNumber } from '../utils/numberUtils';
import { surahNamesBn } from '../utils/surahData';

interface AudioState {
  isPlaying: boolean;
  currentSurahId: number | null;
  currentAyahId: number | null;
  audioUrl: string | null;
  audioLookup: Record<string, string>; // Maps "surah:ayah" -> "url"
}

interface AppContextType {
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  bookmarks: Bookmark[];
  toggleBookmark: (bookmark: Bookmark) => void;
  audio: AudioState;
  playAyah: (surahId: number, ayahId: number, url: string) => void;
  registerAudioUrls: (ayahs: Ayah[]) => void;
  pauseAudio: () => void;
  stopAudio: () => void;
  resumeAudio: () => void;
  playNextAyah: () => void;
  playPrevAyah: () => void;
  recentSurah: Surah | null;
  setRecentSurah: (surah: Surah) => void;
  headerTitle: string;
  setHeaderTitle: (title: string) => void;
  t: (key: string) => string;
  formatNumber: (num: number | string) => string;
  getSurahName: (surah: Surah) => string;
  isSettingsDrawerOpen: boolean;
  setSettingsDrawerOpen: (isOpen: boolean) => void;
  availableTranslations: TranslationResource[];
  reciters: Reciter[];
}

const defaultSettings: UserSettings = {
  theme: 'light',
  fontSize: 3,
  showArabic: true,
  showTranslation: true,
  showTransliteration: false,
  reciterId: 7, // Default Mishary Rashid Alafasy (ID 7 in Quran.com API)
  appLanguage: 'en',
  selectedTranslationIds: [20], // Default Saheeh International
  location: {
    latitude: 23.8103, // Default Dhaka
    longitude: 90.4125,
    address: 'Dhaka (Default)'
  },
  volume: 1.0,
  playbackRate: 1.0,
  repeatMode: 'all', // Default to auto-play
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Settings State
  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
        const stored = localStorage.getItem('quran_settings');
        // Detect browser language if not stored
        const browserLang = (typeof navigator !== 'undefined' && navigator.language.startsWith('bn')) ? 'bn' : 'en';

        // Migration: merge defaults for new properties (like location, translation ids)
        const parsed = stored ? JSON.parse(stored) : {};
        
        // Handle migration from old translationMode if selectedTranslationIds missing
        let transIds = parsed.selectedTranslationIds;
        if (!transIds && parsed.translationMode) {
             if (parsed.translationMode === 'en') transIds = [20];
             else if (parsed.translationMode === 'bn') transIds = [161];
             else if (parsed.translationMode === 'both') transIds = [20, 161];
        }

        // Ensure merged settings have all required fields even if storage is partial or old
        return { 
            ...defaultSettings, 
            appLanguage: browserLang, // Set default based on browser first
            ...parsed, // Override with stored settings if they exist
            selectedTranslationIds: transIds || defaultSettings.selectedTranslationIds,
            location: (parsed.location && typeof parsed.location === 'object') ? parsed.location : defaultSettings.location 
        };
    } catch (e) {
        console.error("Failed to parse settings from local storage, using defaults", e);
        const browserLang = (typeof navigator !== 'undefined' && navigator.language.startsWith('bn')) ? 'bn' : 'en';
        return { ...defaultSettings, appLanguage: browserLang };
    }
  });

  // Resources State
  const [availableTranslations, setAvailableTranslations] = useState<TranslationResource[]>([]);
  const [reciters, setReciters] = useState<Reciter[]>([]);

  // Fetch API resources on mount
  useEffect(() => {
    const fetchResources = async () => {
        const transData = await getAvailableTranslations();
        setAvailableTranslations(transData);
        
        const recData = await getReciters();
        setReciters(recData);
    };
    fetchResources();
  }, []);

  // Header Title State
  const [headerTitle, setHeaderTitle] = useState("Qur'an Light");
  
  // Drawer State
  const [isSettingsDrawerOpen, setSettingsDrawerOpen] = useState(false);

  // Bookmarks State
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => {
    try {
        const stored = localStorage.getItem('quran_bookmarks');
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
  });

  // Recent Surah
  const [recentSurah, setRecentState] = useState<Surah | null>(() => {
      try {
        const stored = localStorage.getItem('quran_recent');
        return stored ? JSON.parse(stored) : null;
      } catch (e) {
        return null;
      }
  });

  // Audio State
  const [audio, setAudio] = useState<AudioState>({
    isPlaying: false,
    currentSurahId: null,
    currentAyahId: null,
    audioUrl: null,
    audioLookup: {}
  });

  // Effects for Persistence
  useEffect(() => {
    localStorage.setItem('quran_settings', JSON.stringify(settings));
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('quran_bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  useEffect(() => {
      if(recentSurah) {
          localStorage.setItem('quran_recent', JSON.stringify(recentSurah));
      }
  }, [recentSurah]);

  // Actions
  const updateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const toggleBookmark = (bookmark: Bookmark) => {
    setBookmarks((prev) => {
      const exists = prev.find((b) => b.id === bookmark.id);
      if (exists) {
        return prev.filter((b) => b.id !== bookmark.id);
      }
      return [...prev, bookmark];
    });
  };

  const setRecentSurah = (surah: Surah) => {
      setRecentState(surah);
  }

  // Audio Actions
  const registerAudioUrls = (ayahs: Ayah[]) => {
      setAudio(prev => {
          const newLookup = { ...prev.audioLookup };
          let surahId = null;
          ayahs.forEach(ayah => {
              // Parse surah ID from verse key if available "1:1"
              if (!surahId && ayah.verse_key) {
                  surahId = parseInt(ayah.verse_key.split(':')[0]);
              }
              // If not, we rely on current context, but usually register comes from page load
              // Let's assume ayah.verse_key exists.
              const key = ayah.verse_key; 
              if (key && ayah.audio?.url) {
                  newLookup[key] = ayah.audio.url;
              }
          });
          return { ...prev, audioLookup: newLookup };
      });
  };

  const playAyah = (surahId: number, ayahId: number, url: string) => {
    setAudio(prev => ({
      ...prev,
      isPlaying: true,
      currentSurahId: surahId,
      currentAyahId: ayahId,
      audioUrl: url,
    }));
  };

  const pauseAudio = () => {
    setAudio(prev => ({ ...prev, isPlaying: false }));
  };

  const resumeAudio = () => {
    if (audio.audioUrl) {
      setAudio(prev => ({ ...prev, isPlaying: true }));
    }
  };

  const stopAudio = () => {
      setAudio(prev => ({
          ...prev,
          isPlaying: false,
          currentSurahId: null,
          currentAyahId: null,
          audioUrl: null
      }))
  }

  const playNextAyah = () => {
    if (audio.currentSurahId && audio.currentAyahId) {
      const nextAyahId = audio.currentAyahId + 1;
      const key = `${audio.currentSurahId}:${nextAyahId}`;
      const url = audio.audioLookup[key];
      
      if (url) {
        playAyah(audio.currentSurahId, nextAyahId, url);
      } else {
        // If no URL found (e.g., end of page or surah), stop for now
        // In future: trigger load more
        stopAudio();
      }
    }
  };

  const playPrevAyah = () => {
    if (audio.currentSurahId && audio.currentAyahId && audio.currentAyahId > 1) {
      const prevAyahId = audio.currentAyahId - 1;
      const key = `${audio.currentSurahId}:${prevAyahId}`;
      const url = audio.audioLookup[key];
      
      if (url) {
        playAyah(audio.currentSurahId, prevAyahId, url);
      } else {
         stopAudio();
      }
    }
  };

  // Translation Helper
  const t = (key: string) => {
    return translations[settings.appLanguage]?.[key] || key;
  };

  // Number Formatter
  const formatNumber = (num: number | string): string => {
    if (settings.appLanguage === 'bn') {
      return toBengaliNumber(num);
    }
    return num.toString();
  };

  // Surah Name Helper
  const getSurahName = (surah: Surah): string => {
    if (settings.appLanguage === 'bn') {
      return surahNamesBn[surah.id] || surah.name_simple;
    }
    return surah.name_simple;
  };

  return (
    <AppContext.Provider
      value={{
        settings,
        updateSettings,
        bookmarks,
        toggleBookmark,
        audio,
        playAyah,
        registerAudioUrls,
        pauseAudio,
        stopAudio,
        resumeAudio,
        playNextAyah,
        playPrevAyah,
        recentSurah,
        setRecentSurah,
        headerTitle,
        setHeaderTitle,
        t,
        formatNumber,
        getSurahName,
        isSettingsDrawerOpen,
        setSettingsDrawerOpen,
        availableTranslations,
        reciters
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppStore must be used within AppProvider');
  return context;
};
